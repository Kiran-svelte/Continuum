import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import {
  createSessionToken,
  SESSION_COOKIE_NAME,
  getSessionCookieOptions,
} from '@/lib/session';
import prisma from '@/lib/prisma';

/**
 * GET /auth/callback
 *
 * Handles Supabase OAuth callback redirects (e.g., Google sign-in).
 * 1. Exchanges the auth code for a Supabase session
 * 2. Creates a continuum-session JWT cookie
 * 3. Redirects to the appropriate page
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/sign-in';

  // Security: prevent open redirect attacks
  if (!next.startsWith('/') || next.startsWith('//') || next.includes('..')) {
    next = '/sign-in';
  }

  const redirectBase = process.env.NEXT_PUBLIC_APP_URL || origin;

  if (!code) {
    return NextResponse.redirect(`${redirectBase}${next}`);
  }

  // Create a Supabase server client that can set cookies on the response
  const response = NextResponse.redirect(`${redirectBase}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.headers.get('cookie')
            ?.split('; ')
            .map(c => {
              const [name, ...val] = c.split('=');
              return { name, value: val.join('=') };
            }) ?? [];
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Exchange auth code for session
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.session || !data.user?.email) {
    console.error('[Auth Callback] Code exchange failed:', error?.message);
    return NextResponse.redirect(
      `${redirectBase}/sign-in?error=auth_callback_failed`
    );
  }

  // Look up employee record
  const employee = await prisma.employee.findUnique({
    where: { auth_id: data.user.id },
    select: {
      id: true,
      primary_role: true,
      secondary_roles: true,
      org_id: true,
    },
  }).catch(() => null);

  // Build roles
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
    uid: data.user.id,
    email: data.user.email,
    emp_id: employee?.id,
    role: employee?.primary_role,
    roles: allRoles.length > 0 ? allRoles : undefined,
    org_id: employee?.org_id,
  });

  // Set session cookie
  const opts = getSessionCookieOptions();
  response.cookies.set(SESSION_COOKIE_NAME, sessionToken, opts);

  // Set role cookies
  if (employee) {
    const cookieOpts = {
      path: '/',
      sameSite: 'lax' as const,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24,
      httpOnly: true,
    };
    response.cookies.set('continuum-role', employee.primary_role, cookieOpts);
    response.cookies.set('continuum-roles', allRoles.join(','), cookieOpts);
  }

  // Redirect: if employee exists, go to their dashboard; otherwise onboarding
  if (employee) {
    const role = employee.primary_role;
    let portal = '/employee/dashboard';
    if (role === 'admin') portal = '/admin/dashboard';
    else if (role === 'hr') portal = '/hr/dashboard';
    else if (['manager', 'director', 'team_lead'].includes(role)) portal = '/manager/dashboard';

    return NextResponse.redirect(`${redirectBase}${portal}`);
  }

  return NextResponse.redirect(`${redirectBase}/onboarding?intent=hr`);
}
