import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || '';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'continuum';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'continuum-web';
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || '';

/**
 * GET /api/auth/keycloak/callback
 *
 * OIDC Authorization Code callback. Keycloak redirects here after login/registration.
 * Exchanges the code for tokens, looks up or creates the Employee record,
 * sets HTTP-only cookies, and redirects to the appropriate portal.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      console.error('[Keycloak Callback] Error from IdP:', error, errorDescription);
      return NextResponse.redirect(
        new URL(`/sign-in?error=${encodeURIComponent(errorDescription || error)}`, request.url)
      );
    }

    if (!code) {
      return NextResponse.redirect(new URL('/sign-in?error=missing_code', request.url));
    }

    // Exchange authorization code for tokens
    const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
    const origin = new URL(request.url).origin;
    const redirectUri = `${origin}/api/auth/keycloak/callback`;

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KEYCLOAK_CLIENT_ID,
      code,
      redirect_uri: redirectUri,
      ...(KEYCLOAK_CLIENT_SECRET ? { client_secret: KEYCLOAK_CLIENT_SECRET } : {}),
    });

    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });

    if (!tokenRes.ok) {
      const errBody = await tokenRes.text();
      console.error('[Keycloak Callback] Token exchange failed:', tokenRes.status, errBody);
      return NextResponse.redirect(new URL('/sign-in?error=token_exchange_failed', request.url));
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, id_token, expires_in } = tokens;

    // Decode the access token to get user info
    const payload = JSON.parse(
      Buffer.from(access_token.split('.')[1], 'base64url').toString('utf-8')
    );

    const sub: string = payload.sub;
    const email: string = payload.email || payload.preferred_username;
    const name: string = payload.name || '';
    const givenName: string = payload.given_name || name.split(' ')[0] || '';
    const familyName: string = payload.family_name || name.split(' ').slice(1).join(' ') || '';

    if (!email) {
      return NextResponse.redirect(new URL('/sign-in?error=no_email_in_token', request.url));
    }

    // Look up employee by auth_id (Keycloak sub) or by email
    let employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { auth_id: sub },
          { email: email.toLowerCase() },
        ],
      },
      select: {
        id: true,
        auth_id: true,
        primary_role: true,
        org_id: true,
        company: {
          select: { onboarding_completed: true },
        },
      },
    });

    // If found by email but auth_id doesn't match, link the Keycloak account
    if (employee && employee.auth_id !== sub) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { auth_id: sub },
      });
    }

    // Set cookies
    const response = NextResponse.redirect(new URL(getRedirectPath(employee), request.url));

    // Access token - HTTP-only, secure
    response.cookies.set('kc-access-token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in || 300,
    });

    // Refresh token - HTTP-only, secure, longer-lived
    if (refresh_token) {
      response.cookies.set('kc-refresh-token', refresh_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60, // 30 days
      });
    }

    // Token expiry hint for client-side (NOT the actual token)
    response.cookies.set('kc-token-exp', String(Math.floor(Date.now() / 1000) + (expires_in || 300)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in || 300,
    });

    // Audit log
    if (employee) {
      await createAuditLog({
        companyId: employee.org_id,
        actorId: employee.id,
        action: AUDIT_ACTIONS.LOGIN,
        entityType: 'Employee',
        entityId: employee.id,
        newState: { provider: 'keycloak', email },
      }).catch(() => {});
    }

    return response;
  } catch (err) {
    console.error('[Keycloak Callback] Unexpected error:', err);
    return NextResponse.redirect(new URL('/sign-in?error=callback_failed', request.url));
  }
}

function getRedirectPath(employee: { primary_role: string; company: { onboarding_completed: boolean } | null } | null): string {
  if (!employee) return '/onboarding';
  if (!employee.company?.onboarding_completed) return '/onboarding';

  switch (employee.primary_role) {
    case 'admin': return '/admin/dashboard';
    case 'hr': return '/hr/dashboard';
    case 'manager':
    case 'director':
    case 'team_lead': return '/manager/dashboard';
    default: return '/employee/dashboard';
  }
}
