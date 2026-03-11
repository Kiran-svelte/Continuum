import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  type: z.enum(['reset', 'change']).default('reset'),
});

/**
 * POST /api/auth/password-change
 *
 * Logs a password change/reset event to the audit trail.
 * Called after successful password reset to maintain security audit.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, type } = schema.parse(body);

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Find the employee by email to get their company for the audit log
    const employee = await prisma.employee.findFirst({
      where: { email: email.toLowerCase() },
      select: { id: true, org_id: true, email: true },
    });

    if (employee) {
      // Log to the company's audit trail
      await createAuditLog({
        companyId: employee.org_id,
        actorId: employee.id, // User who changed their own password
        action: AUDIT_ACTIONS.PASSWORD_CHANGE,
        entityType: 'Employee',
        entityId: employee.id,
        ipAddress: ip,
        userAgent,
        newState: {
          email: employee.email,
          type: type === 'reset' ? 'password_reset' : 'password_change',
          changed_at: new Date().toISOString(),
        },
      });
    }
    // If employee doesn't exist in our system, we don't log
    // (they may have reset Firebase/Supabase password for account that isn't in our DB)

    return NextResponse.json({ logged: true });
  } catch (err) {
    // Always return success to avoid leaking information
    // about whether the audit succeeded
    return NextResponse.json({ logged: true });
  }
}
