import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createSupabaseServerClient } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import { LEAVE_TYPE_CATALOG } from '@/lib/leave-types-config';

export const dynamic = 'force-dynamic';

const joinSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  company_code: z.string().min(1).max(20),
  role: z.enum(['employee', 'manager', 'hr', 'team_lead', 'director']).optional().default('employee'),
  department: z.string().max(100).optional(),
  gender: z.enum(['male', 'female', 'other']).optional().default('other'),
});

/**
 * POST /api/auth/join
 *
 * Employee join flow via company code:
 * 1. Authenticates via Supabase session (client must call supabase.auth.signUp first)
 * 2. Validates the company_code against Company.join_code
 * 3. Creates an Employee record linked to the company
 * 4. Seeds leave balances based on the company's active leave types
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
    // Resolve the authenticated Supabase user
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Ensure this auth_id is not already registered
    const existing = await prisma.employee.findUnique({ where: { auth_id: user.id } });
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
      select: { id: true, name: true, leave_types: { where: { is_active: true } } },
    });

    if (!company) {
      return NextResponse.json({ error: 'Invalid company code' }, { status: 404 });
    }

    const year = new Date().getFullYear();

    // Transactionally create employee and seed leave balances
    const result = await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.create({
        data: {
          auth_id: user.id,
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

      // Seed leave balances from company's active leave types,
      // falling back to catalog defaults if no custom types exist
      const leaveTypesToSeed =
        company.leave_types.length > 0
          ? company.leave_types.map((lt) => ({
              code: lt.code,
              quota: lt.default_quota,
            }))
          : LEAVE_TYPE_CATALOG.map((lt) => ({
              code: lt.code,
              quota: lt.defaultQuota,
            }));

      const balanceInserts = leaveTypesToSeed.map(({ code, quota }) => ({
        emp_id: employee.id,
        company_id: company.id,
        leave_type: code,
        year,
        annual_entitlement: quota,
        remaining: quota,
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
      newState: { company_id: company.id, role: data.role },
    });

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
