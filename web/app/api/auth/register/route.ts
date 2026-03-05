import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import { LEAVE_TYPE_CATALOG } from '@/lib/leave-types-config';
import { DEFAULT_CONSTRAINT_RULES } from '@/lib/constraint-rules-config';
import { sendWelcomeEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const registerSchema = z.object({
  first_name: z.string().min(1).max(100),
  last_name: z.string().min(1).max(100),
  company_name: z.string().min(1).max(200),
  industry: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  timezone: z.string().max(60).optional(),
});

/** Generates a unique 8-character alphanumeric company join code */
function generateJoinCode(): string {
  return randomBytes(4).toString('hex').toUpperCase();
}

/**
 * POST /api/auth/register
 *
 * Company admin registration flow:
 * 1. Authenticates via Firebase token (client must call Firebase signUp first)
 * 2. Creates a Company record with a unique join_code for employees
 * 3. Creates an Employee record with `admin` role
 * 4. Seeds default leave types for the company
 * 5. Seeds leave balances for the admin employee
 * 6. Seeds default constraint rules
 * 7. Creates an audit log entry
 */
export async function POST(request: NextRequest) {
  console.log('[REGISTER] Started');
  
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
    console.log('[REGISTER] Verifying auth...');
    // Resolve the authenticated Firebase user from Bearer token or session cookie
    const { user, error: authError } = await getAuthUserFromRequest(request);
    console.log('[REGISTER] Auth result:', user?.uid, authError?.message);

    if (authError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('[REGISTER] Checking existing employee...');
    // Ensure this auth_id is not already linked to an employee
    const existing = await prisma.employee.findUnique({ where: { auth_id: user.uid } });
    console.log('[REGISTER] Existing employee:', existing?.id);
    
    if (existing) {
      return NextResponse.json({ error: 'Account already registered' }, { status: 409 });
    }

    const body = await request.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const firstName = sanitizeInput(data.first_name);
    const lastName = sanitizeInput(data.last_name);
    const companyName = sanitizeInput(data.company_name);
    const industry = data.industry ? sanitizeInput(data.industry) : undefined;
    const size = data.size ? sanitizeInput(data.size) : undefined;
    const timezone = data.timezone ? sanitizeInput(data.timezone) : 'Asia/Kolkata';

    // Generate a unique join code for this company
    let joinCode = generateJoinCode();
    let attempts = 0;
    while (attempts < 5) {
      const conflict = await prisma.company.findUnique({ where: { join_code: joinCode } });
      if (!conflict) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    const year = new Date().getFullYear();

    // NOTE: Avoid interactive transactions in serverless + PgBouncer setups.
    // Use sequential writes; these operations are small and should complete well
    // within the function timeout.
    console.log('[REGISTER] Creating company...');
    const company = await prisma.company.create({
      data: {
        name: companyName,
        industry,
        size,
        timezone,
        join_code: joinCode,
      },
    });

    console.log('[REGISTER] Creating employee...');
    const employee = await prisma.employee.create({
      data: {
        auth_id: user.uid,
        email: user.email!,
        first_name: firstName,
        last_name: lastName,
        org_id: company.id,
        primary_role: 'admin',
        date_of_joining: new Date(),
        gender: 'other',
        status: 'active',
      },
    });

    console.log('[REGISTER] Seeding leave types...');
    const leaveTypeInserts = LEAVE_TYPE_CATALOG.map((lt) => ({
      company_id: company.id,
      code: lt.code,
      name: lt.name,
      category: lt.category as 'common' | 'statutory' | 'special' | 'unpaid',
      default_quota: lt.defaultQuota,
      carry_forward: lt.carryForward,
      max_carry_forward: lt.maxCarryForward,
      encashment_enabled: lt.encashmentEnabled,
      encashment_max_days: lt.encashmentMaxDays,
      paid: lt.paid,
      gender_specific: lt.genderSpecific as 'male' | 'female' | 'all' | undefined,
    }));
    await prisma.leaveType.createMany({ data: leaveTypeInserts });

    console.log('[REGISTER] Seeding leave balances...');
    const balanceInserts = LEAVE_TYPE_CATALOG.map((lt) => ({
      emp_id: employee.id,
      company_id: company.id,
      leave_type: lt.code,
      year,
      annual_entitlement: lt.defaultQuota,
      remaining: lt.defaultQuota,
    }));
    await prisma.leaveBalance.createMany({ data: balanceInserts });

    console.log('[REGISTER] Seeding constraint rules...');
    const ruleInserts = DEFAULT_CONSTRAINT_RULES.map((rule) => ({
      company_id: company.id,
      rule_id: rule.rule_id,
      rule_type: rule.category,
      name: rule.name,
      description: rule.description,
      category: rule.category as 'validation' | 'business' | 'compliance',
      is_blocking: rule.is_blocking,
      priority: rule.priority,
      config: rule.config as Prisma.InputJsonValue,
      applies_to_all: true,
    }));
    await prisma.leaveRule.createMany({ data: ruleInserts });

    // 6. Audit log
    console.log('[REGISTER] Writing audit log...');
    await createAuditLog({
      companyId: company.id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_REGISTER,
      entityType: 'Company',
      entityId: company.id,
      newState: { company_name: companyName, admin_id: employee.id },
    });

    // 7. Send welcome email (non-blocking)
    void sendWelcomeEmail(user.email!, `${firstName} ${lastName}`, companyName).catch(
      (emailError) => {
        console.error('[Register] Welcome email failed:', emailError);
      }
    );

    console.log('[REGISTER] Completed');
    return NextResponse.json({
      success: true,
      company_id: company.id,
      employee_id: employee.id,
      join_code: joinCode,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
