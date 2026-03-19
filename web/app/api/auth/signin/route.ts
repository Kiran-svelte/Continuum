import { NextRequest, NextResponse } from 'next/server';
import { signIn, signInSuperAdmin, setAuthCookies } from '@/lib/auth-service';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/auth/signin
 *
 * Custom JWT-based sign-in (replaces Supabase auth).
 * Supports both regular employees and super admins.
 *
 * Body:
 *   - email: string
 *   - password: string
 *   - is_super_admin?: boolean (optional, for super admin login)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, is_super_admin } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Get IP and user agent for audit
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    let result;

    if (is_super_admin) {
      // Super admin login
      result = await signInSuperAdmin(email, password);
    } else {
      // Regular employee login
      result = await signIn(email, password);
    }

    if (!result.success) {
      // Log failed login attempt (only for employees, not super admins)
      if (result.employee?.id && result.employee?.org_id) {
        void createAuditLog({
          companyId: result.employee.org_id!,
          actorId: result.employee.id,
          action: AUDIT_ACTIONS.LOGIN_FAILED,
          entityType: 'Employee',
          entityId: result.employee.id,
          ipAddress: ip,
          userAgent,
          newState: {
            email,
            reason: result.error,
            attempted_at: new Date().toISOString(),
          },
        }).catch(() => {});
      }

      return NextResponse.json(
        { error: result.error || 'Authentication failed' },
        { status: 401 }
      );
    }

    // Build response
    const response = NextResponse.json({
      success: true,
      user: result.user,
      requires_password_change: result.requires_password_change,
      tutorial_completed: result.tutorial_completed,
    });

    // Set auth cookies
    if (result.accessToken && result.refreshToken) {
      setAuthCookies(response, result.accessToken, result.refreshToken);
    }

    // Log successful login
    if (result.user) {
      const auditCompanyId = result.user.org_id || 'platform';
      const auditActorId = result.user.id;

      void createAuditLog({
        companyId: auditCompanyId,
        actorId: auditActorId,
        action: AUDIT_ACTIONS.LOGIN,
        entityType: is_super_admin ? 'SuperAdmin' : 'Employee',
        entityId: auditActorId,
        ipAddress: ip,
        userAgent,
        newState: {
          email: result.user.email,
          role: result.user.role,
          logged_in_at: new Date().toISOString(),
        },
      }).catch(() => {});
    }

    return response;
  } catch (error) {
    console.error('[AUTH SIGNIN] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Sign-in failed', details: errorMessage },
      { status: 500 }
    );
  }
}
