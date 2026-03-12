import { NextRequest, NextResponse } from 'next/server';
import { verifySupabaseToken } from '@/lib/supabase-server';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
  getSessionFromCookies,
} from '@/lib/session';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * POST /api/auth/session
 *
 * Creates a server-side session after Supabase sign-in.
 * 1. Verifies the Supabase access token via Admin API
 * 2. Looks up the Employee record (if exists)
 * 3. Creates a signed session JWT with user identity + role info
 * 4. Sets it as an HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    const { accessToken } = await request.json();

    if (!accessToken) {
      return NextResponse.json({ error: 'Access token required' }, { status: 400 });
    }

    // Verify the Supabase access token server-side
    const supabaseUser = await verifySupabaseToken(accessToken);

    if (!supabaseUser || !supabaseUser.id || !supabaseUser.email) {
      return NextResponse.json({ error: 'Invalid token: missing uid or email' }, { status: 401 });
    }

    // Look up employee record (may not exist yet for new sign-ups)
    const employee = await prisma.employee.findUnique({
      where: { auth_id: supabaseUser.id },
      select: {
        id: true,
        primary_role: true,
        secondary_roles: true,
        org_id: true,
      },
    });

    // Build all roles list
    const allRoles: string[] = employee ? [employee.primary_role] : [];
    if (employee?.secondary_roles && Array.isArray(employee.secondary_roles)) {
      for (const r of employee.secondary_roles) {
        if (typeof r === 'string' && !allRoles.includes(r)) {
          allRoles.push(r);
        }
      }
    }

    // Create signed session JWT
    const sessionToken = await createSessionToken({
      uid: supabaseUser.id,
      email: supabaseUser.email,
      emp_id: employee?.id,
      role: employee?.primary_role,
      roles: allRoles.length > 0 ? allRoles : undefined,
      org_id: employee?.org_id,
    });

    // Build response
    const response = NextResponse.json({
      success: true,
      uid: supabaseUser.id,
      email: supabaseUser.email,
      has_employee: !!employee,
    });

    // Set session cookie (signed JWT)
    const opts = getSessionCookieOptions();
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, opts);

    // Also set role cookies for middleware portal enforcement
    if (employee) {
      const cookieOpts = {
        path: '/',
        sameSite: 'lax' as const,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 24 hours
        httpOnly: true,
      };
      response.cookies.set('continuum-role', employee.primary_role, cookieOpts);
      response.cookies.set('continuum-roles', allRoles.join(','), cookieOpts);
    }

    return response;
  } catch (error) {
    console.error('[AUTH SESSION] Error setting session:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to create session', details: errorMessage },
      { status: 401 }
    );
  }
}

/**
 * GET /api/auth/session
 *
 * Returns the current session status. If the session cookie exists and is valid,
 * returns session info. Otherwise returns unauthenticated status.
 */
export async function GET() {
  const session = await getSessionFromCookies();

  if (session) {
    return NextResponse.json({
      status: 'authenticated',
      uid: session.uid,
      email: session.email,
      role: session.role,
      has_employee: !!session.emp_id,
    });
  }

  return NextResponse.json({
    status: 'unauthenticated',
    endpoint: 'session',
    methods: ['GET', 'POST', 'DELETE'],
  });
}

/**
 * DELETE /api/auth/session
 *
 * Clears all auth cookies (sign out).
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  // Clear session cookie
  response.cookies.set(SESSION_COOKIE_NAME, '', {
    ...getSessionCookieOptions(0),
    maxAge: 0,
  });

  // Clear role cookies
  const cookiesToClear = [
    'continuum-role',
    'continuum-roles',
  ];

  cookiesToClear.forEach((name) => {
    response.cookies.set(name, '', {
      path: '/',
      maxAge: 0,
    });
  });

  return response;
}
