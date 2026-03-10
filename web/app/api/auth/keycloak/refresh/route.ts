import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const KEYCLOAK_URL = process.env.KEYCLOAK_URL || '';
const KEYCLOAK_REALM = process.env.KEYCLOAK_REALM || 'continuum';
const KEYCLOAK_CLIENT_ID = process.env.KEYCLOAK_CLIENT_ID || 'continuum-web';
const KEYCLOAK_CLIENT_SECRET = process.env.KEYCLOAK_CLIENT_SECRET || '';

/**
 * POST /api/auth/keycloak/refresh
 *
 * Refreshes the Keycloak access token using the refresh token cookie.
 * Called by ensureMe() when the access token is expired.
 */
export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('kc-refresh-token')?.value;

    if (!refreshToken) {
      return NextResponse.json({ error: 'No refresh token' }, { status: 401 });
    }

    const tokenUrl = `${KEYCLOAK_URL}/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;

    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: KEYCLOAK_CLIENT_ID,
      refresh_token: refreshToken,
      ...(KEYCLOAK_CLIENT_SECRET ? { client_secret: KEYCLOAK_CLIENT_SECRET } : {}),
    });

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (!res.ok) {
      // Refresh token expired or revoked — user must re-authenticate
      const response = NextResponse.json({ error: 'Refresh failed' }, { status: 401 });
      response.cookies.set('kc-access-token', '', { maxAge: 0, path: '/' });
      response.cookies.set('kc-refresh-token', '', { maxAge: 0, path: '/' });
      response.cookies.set('kc-token-exp', '', { maxAge: 0, path: '/' });
      return response;
    }

    const tokens = await res.json();
    const { access_token, refresh_token: newRefreshToken, expires_in } = tokens;

    const response = NextResponse.json({ success: true, expires_in });

    response.cookies.set('kc-access-token', access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in || 300,
    });

    if (newRefreshToken) {
      response.cookies.set('kc-refresh-token', newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 60 * 60,
      });
    }

    response.cookies.set('kc-token-exp', String(Math.floor(Date.now() / 1000) + (expires_in || 300)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expires_in || 300,
    });

    return response;
  } catch (err) {
    console.error('[Keycloak Refresh] Error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
