import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import prisma from '@/lib/prisma';
import { getAuthUserFromRequest } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
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
 * 4. Does NOT seed leave types, balances, or constraint rules — those are
 *    configured by HR during the onboarding wizard (config-driven approach).
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

    // Ensure this auth_id is not already linked to an employee
    const existing = await prisma.employee.findUnique({ where: { auth_id: user.uid } });

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
    const timezone = data.timezone ? sanitizeInput(data.timezone) : undefined;

    // Generate a unique join code for this company with collision detection
    let joinCode = generateJoinCode();
    let attempts = 0;
    const MAX_ATTEMPTS = 5;
    while (attempts < MAX_ATTEMPTS) {
      const conflict = await prisma.company.findUnique({ where: { join_code: joinCode } });
      if (!conflict) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    // If all attempts failed, return error instead of trying with collided code
    if (attempts >= MAX_ATTEMPTS) {
      return NextResponse.json(
        { error: 'Unable to generate unique company code. Please try again.' },
        { status: 500 }
      );
    }

    // Create company with onboarding_completed = false.
    // Leave types, balances, and constraint rules will be configured during
    // the onboarding wizard — the system is fully config-driven.
    // Wrap in transaction to prevent orphan Company records on failure.
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: companyName,
          industry,
          size,
          timezone,
          join_code: joinCode,
          onboarding_completed: false,
        },
      });

      const employee = await tx.employee.create({
        data: {
          auth_id: user.uid,
          email: user.email!,
          first_name: firstName,
          last_name: lastName,
          org_id: company.id,
          primary_role: 'admin',
          date_of_joining: new Date(),
          gender: 'other',
          status: 'onboarding',
        },
      });

      return { company, employee };
    });

    // Audit log (outside transaction - best effort)
    await createAuditLog({
      companyId: result.company.id,
      actorId: result.employee.id,
      action: AUDIT_ACTIONS.COMPANY_REGISTER,
      entityType: 'Company',
      entityId: result.company.id,
      newState: { company_name: companyName, admin_id: result.employee.id },
    });

    // Send welcome email (non-blocking)
    void sendWelcomeEmail(user.email!, `${firstName} ${lastName}`, companyName).catch(
      (emailError) => {
        console.error('[Register] Welcome email failed:', emailError);
      }
    );

    return NextResponse.json({
      success: true,
      company_id: result.company.id,
      employee_id: result.employee.id,
      join_code: joinCode,
      onboarding_required: true,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Registration failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
