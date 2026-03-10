import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import { sendWelcomeEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const joinSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  company_code: z.string().min(1).max(20),
  role: z.enum(['employee', 'manager', 'hr', 'team_lead', 'director']).optional().default('employee'),
  department: z.string().max(100).optional(),
  gender: z.enum(['male', 'female', 'other']).optional().default('other'),
});

/**
 * Calculate pro-rated leave entitlement for a mid-year join.
 *
 * Employees who join part-way through the leave year receive a proportional
 * balance: `annual_quota × (months_remaining_in_year / 12)`, rounded up to
 * the nearest half-day so employees are never penalised for joining on an
 * awkward date.
 *
 * Leave types that do NOT accrue (e.g. LWP / unpaid) always receive the
 * full quota regardless of join date.
 *
 * @param annualQuota  Full-year entitlement in days.
 * @param joinDate     Date the employee is joining.
 * @param paid         Whether this is a paid leave type (unpaid types skip proration).
 * @returns            Pro-rated balance, minimum 1 if quota > 0.
 */
function computeProRatedQuota(annualQuota: number, joinDate: Date, paid: boolean): number {
  // Unpaid leave-without-pay types are never pro-rated — the full quota
  // is always available because they represent balance-agnostic days off.
  if (!paid || annualQuota === 0) return annualQuota;

  const year = joinDate.getFullYear();
  // Normalize to midnight to avoid time-of-day effects
  const joinDay = new Date(year, joinDate.getMonth(), joinDate.getDate());
  // Dec 31 at midnight (inclusive last day of year)
  const yearEnd = new Date(year, 11, 31);
  const totalDaysInYear = 365 + (isLeapYear(year) ? 1 : 0);
  // +1 to count both endpoints (Jan 1 → Dec 31 = 365 days inclusive in a non-leap year)
  const remainingDays =
    Math.round((yearEnd.getTime() - joinDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const ratio = remainingDays / totalDaysInYear;
  const raw = annualQuota * ratio;

  // Round to nearest 0.5 (half-day granularity), minimum 1 if quota > 0
  const rounded = Math.ceil(raw * 2) / 2;
  return Math.max(1, rounded);
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/**
 * POST /api/auth/join
 *
 * Employee join flow via company code:
 * 1. Authenticates via Firebase token (client must call Firebase signUp first)
 * 2. Validates the company_code against Company.join_code
 * 3. Creates an Employee record linked to the company
 * 4. Seeds leave balances (pro-rated for mid-year joins) based on the
 *    company's active leave types
 * 5. Creates an audit log entry
 */
export async function POST(request: NextRequest) {
  // Rate limit by IP
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimit = checkApiRateLimit(ip, 'auth');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    // Resolve the authenticated Firebase user from Bearer token or session cookie
    const { user, error: authError } = await getAuthUserFromRequest(request);

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure this auth_id is not already registered
    const existing = await prisma.employee.findUnique({ where: { auth_id: user.uid } });
    if (existing) {
      return NextResponse.json({ error: 'Account already registered' }, { status: 409 });
    }

    const body = await request.json();
    const parsed = joinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const firstName = sanitizeInput(data.first_name);
    const lastName = sanitizeInput(data.last_name);
    const companyCode = sanitizeInput(data.company_code).toUpperCase();
    const department = data.department ? sanitizeInput(data.department) : undefined;

    // Look up company by join code
    const company = await prisma.company.findUnique({
      where: { join_code: companyCode },
      select: {
        id: true,
        name: true,
        leave_types: {
          where: { is_active: true, deleted_at: null },
          select: { code: true, default_quota: true, gender_specific: true, paid: true },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Invalid company code' }, { status: 404 });
    }

    // Transactionally create employee and seed leave balances
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          auth_id: user.uid,
          email: user.email!,
          first_name: firstName,
          last_name: lastName,
          org_id: company.id,
          primary_role: data.role,
          department,
          date_of_joining: new Date(),
          gender: data.gender,
          status: 'onboarding',
        },
      });

      const joinDate = new Date();
      const year = joinDate.getFullYear();

      // Seed leave balances from company's active leave types only.
      // Balances are pro-rated for mid-year joins: employees who start
      // part-way through the year receive a proportional entitlement.
      // No catalog fallback — the system is config-driven; leave types must
      // be configured during company onboarding.
      const leaveTypesToSeed = company.leave_types
        .filter((lt) => {
          // Filter gender-specific leave types
          const genderFilter = lt.gender_specific;
          if (!genderFilter || genderFilter === 'all') return true;
          if (data.gender === 'other') return true;
          return genderFilter === data.gender;
        })
        .map((lt) => ({
          code: lt.code,
          annualQuota: lt.default_quota,
          proRatedQuota: computeProRatedQuota(lt.default_quota, joinDate, lt.paid ?? true),
        }));

      const balanceInserts = leaveTypesToSeed.map(({ code, annualQuota, proRatedQuota }) => ({
        emp_id: employee.id,
        company_id: company.id,
        leave_type: code,
        year,
        annual_entitlement: annualQuota,
        remaining: proRatedQuota,
      }));
      await tx.leaveBalance.createMany({ data: balanceInserts });

      return employee;
    });

    // Audit log
    await createAuditLog({
      companyId: company.id,
      actorId: result.id,
      action: AUDIT_ACTIONS.EMPLOYEE_JOIN,
      entityType: 'Employee',
      entityId: result.id,
      newState: {
        company_id: company.id,
        role: data.role,
        date_of_joining: result.date_of_joining,
        balances_pro_rated: true,
      },
    });

    // Send welcome email (non-blocking)
    void sendWelcomeEmail(user.email!, `${firstName} ${lastName}`, company.name).catch(
      (emailError) => {
        console.error('[Join] Welcome email failed:', emailError);
      }
    );

    return NextResponse.json({
      success: true,
      employee_id: result.id,
      company_id: company.id,
      company_name: company.name,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Join failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
