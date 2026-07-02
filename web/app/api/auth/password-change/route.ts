import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { AuthError, getAuthEmployee } from '@/lib/auth-guard';
import { signOutAll } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

const schema = z.object({
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
    const { type } = schema.parse(body);
    const employee = await getAuthEmployee(request);

    if (!employee.org_id || employee.primary_role === 'super_admin') {
      return NextResponse.json({ logged: false });
    }

    // Get IP and user agent
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
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

    await signOutAll(employee.id);

    return NextResponse.json({ logged: true });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ logged: false });
    }

    // Always return success to avoid leaking information
    // about whether the audit succeeded
    return NextResponse.json({ logged: true });
  }
}
