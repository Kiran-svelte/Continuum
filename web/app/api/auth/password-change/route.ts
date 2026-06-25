import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { signOutAll } from '@/lib/auth-service';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const schema = z.object({
  type: z.enum(['reset', 'change']).default('reset'),
});

/**
 * POST /api/auth/password-change
 *
 * Logs a password change/reset event to the audit trail.
 * Called after successful password reset to maintain security audit.
 * Requires the actor to be authenticated; unauthenticated calls are silently
 * rejected with {logged: false} to prevent spoofed audit writes.
 */
export async function POST(request: NextRequest) {
  try {
    // Resolve the authenticated actor — prevents spoofed audit writes
    let employee: Awaited<ReturnType<typeof getAuthEmployee>> | null = null;
    try {
      employee = await getAuthEmployee();
    } catch {
      // Not authenticated — do not write audit log
      return NextResponse.json({ logged: false });
    }

    const body = await request.json();
    const { type } = schema.parse(body);

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Find the employee DB record (the JWT actor may not have org_id on a super-admin)
    const employeeRecord = await prisma.employee.findFirst({
      where: { id: employee.id },
      select: { id: true, org_id: true, email: true },
    });

    if (employeeRecord) {
      // Log to the company's audit trail
      await createAuditLog({
        companyId: employeeRecord.org_id!,
        actorId: employeeRecord.id,
        action: AUDIT_ACTIONS.PASSWORD_CHANGE,
        entityType: 'Employee',
        entityId: employeeRecord.id,
        ipAddress: ip,
        userAgent,
        newState: {
          email: employeeRecord.email,
          type: type === 'reset' ? 'password_reset' : 'password_change',
          changed_at: new Date().toISOString(),
        },
      });

      // Revoke all refresh tokens for the affected employee
      await signOutAll(employee.id);
    }

    return NextResponse.json({ logged: true });
  } catch (err) {
    // Always return success to avoid leaking information
    return NextResponse.json({ logged: false });
  }
}
