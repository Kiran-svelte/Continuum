import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-out
 *
 * Server-side sign-out that:
 * 1. Identifies the user BEFORE clearing cookies (for audit log)
 * 2. Logs the sign-out event to audit trail
 * 3. Clears all auth cookies
 * 4. Returns success
 */
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    // Try to identify the user BEFORE clearing cookies (for audit log)
    let employeeId: string | null = null;
    let companyId: string | null = null;
    let userEmail: string | null = null;

    // Best-effort user identification for audit logging
    try {
      const employee = await getAuthEmployee();
      employeeId = employee.id;
      companyId = employee.org_id;
      userEmail = employee.email;
    } catch (err) {
      // User may already be partially signed out or cookies expired
      // Sign-out should still succeed - audit is best effort
      if (!(err instanceof AuthError)) {
        console.warn('[Sign-out] Could not identify user for audit:', err);
      }
    }

    // Get IP and user agent for audit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Clear all auth-related cookies
    const cookiesToClear = [
      'continuum-role',
      'continuum-roles',
      'firebase-auth-token',
      'kc-access-token',
      'kc-refresh-token',
      'kc-token-exp',
    ];

    const response = NextResponse.json({ success: true });

    cookiesToClear.forEach((name) => {
      response.cookies.set(name, '', {
        path: '/',
        maxAge: 0,
        httpOnly: name !== 'continuum-role' && name !== 'continuum-roles', // Keep role cookies readable for now
      });
    });

    // If we identified the employee, log the sign-out (best effort)
    if (employeeId && companyId) {
      void createAuditLog({
        companyId,
        actorId: employeeId,
        action: AUDIT_ACTIONS.LOGOUT,
        entityType: 'Employee',
        entityId: employeeId,
        ipAddress: ip,
        userAgent,
        newState: {
          email: userEmail,
          signed_out_at: new Date().toISOString(),
        },
      }).catch(() => {
        // Ignore audit failures - sign-out should always succeed
      });
    }

    return response;
  } catch {
    // Sign-out should never fail - just clear cookies and return success
    const response = NextResponse.json({ success: true });
    return response;
  }
}

/**
 * DELETE /api/auth/sign-out
 * Alias for POST - some clients may prefer DELETE for sign-out
 */
export async function DELETE(request: NextRequest) {
  return POST(request);
}
