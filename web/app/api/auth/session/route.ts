import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookies } from '@/lib/auth-service';
import { getAccessTokenFromCookies, verifyAccessToken } from '@/lib/jwt-service';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * GET /api/auth/session
 *
 * Returns the current session status from JWT tokens.
 * If the access token exists and is valid, returns session info.
 * Otherwise returns unauthenticated status.
 */
export async function GET() {
  try {
    const accessToken = await getAccessTokenFromCookies();
    
    if (!accessToken) {
      return NextResponse.json({
        status: 'unauthenticated',
        endpoint: 'session',
        methods: ['GET', 'DELETE'],
      });
    }

    // Verify and decode the access token
    let payload;
    try {
      payload = await verifyAccessToken(accessToken);
    } catch {
      return NextResponse.json({
        status: 'unauthenticated',
        reason: 'invalid_token',
      });
    }

    return NextResponse.json({
      status: 'authenticated',
      uid: payload.sub,
      email: payload.email,
      role: payload.role,
      roles: payload.roles || [payload.role],
      org_id: payload.org_id,
      has_employee: !!payload.sub,
      is_super_admin: payload.role === 'super_admin',
    });
  } catch (error) {
    console.error('[AUTH SESSION GET] Error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Failed to get session',
    }, { status: 500 });
  }
}

/**
 * DELETE /api/auth/session
 *
 * Clears all auth cookies (sign out).
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  clearAuthCookies(response);
  return response;
}
