import { NextRequest, NextResponse } from 'next/server';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { signOut, clearAuthCookies } from '@/lib/auth-service';
import { getRefreshTokenFromCookies } from '@/lib/jwt-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/sign-out
 *
 * Server-side sign-out that:
 * 1. Identifies the user BEFORE clearing cookies (for audit log)
 * 2. Revokes the refresh token
 * 3. Logs the sign-out event to audit trail
 * 4. Clears all auth cookies
 * 5. Returns success
 */
export async function POST(request: NextRequest) {
  try {
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

    // Revoke refresh token if present
    try {
      const refreshToken = await getRefreshTokenFromCookies();
      if (refreshToken) {
        await signOut(refreshToken);
      }
    } catch {
      // Ignore revocation errors - sign-out should still succeed
    }

    // Get IP and user agent for audit
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Build response and clear cookies
    const response = NextResponse.json({ success: true });
    clearAuthCookies(response);

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
    clearAuthCookies(response);
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
