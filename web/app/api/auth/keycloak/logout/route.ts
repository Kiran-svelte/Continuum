import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || '';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'continuum';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'continuum-web';

/**
 * POST /api/auth/keycloak/logout
 *
 * Clears Keycloak session cookies. The client should then redirect
 * to the Keycloak end-session URL for full SSO logout.
 */
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true });

  // Clear all Keycloak cookies
  response.cookies.set('kc-access-token', '', { maxAge: 0, path: '/' });
  response.cookies.set('kc-refresh-token', '', { maxAge: 0, path: '/' });
  response.cookies.set('kc-token-exp', '', { maxAge: 0, path: '/' });

  return response;
}

/**
 * GET /api/auth/keycloak/logout
 *
 * Returns the Keycloak end-session URL for redirect-based logout.
 */
export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const logoutUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/logout?` +
    new URLSearchParams({
      client_id: KEYCLOAK_CLIENT_ID,
      post_logout_redirect_uri: `${origin}/sign-in`,
    }).toString();

  return NextResponse.json({ logout_url: logoutUrl });
}
