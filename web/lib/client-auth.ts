/**
 * Client-side helper to get the current authenticated employee via cookies.
 *
 * Supports (in order of priority):
 * 1. Keycloak auth cookies (kc-access-token, kc-refresh-token)
 * 2. Supabase auth cookie (sb-*-auth-token)
 * 3. Legacy Firebase auth cookie (firebase-auth-token)
 * 4. Legacy Firebase *client* session by minting the HTTP-only cookie via /api/auth/session
 */

import { getCurrentUser } from '@/lib/firebase';

export type MeResponse = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_role?: string | null;
  company?: {
    id: string;
    name?: string | null;
    onboarding_completed?: boolean | null;
    join_code?: string | null;
  } | null;
};

async function fetchMe(): Promise<{ ok: true; me: MeResponse } | { ok: false; status: number }> {
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (!res.ok) {
    return { ok: false, status: res.status };
  }
  const me = (await res.json()) as MeResponse;
  return { ok: true, me };
}

/**
 * Check if the Keycloak access token expiry hint cookie indicates the token is expired.
 * The kc-token-exp cookie contains a unix timestamp.
 */
function isKeycloakTokenExpired(): boolean {
  const expCookie = document.cookie
    .split('; ')
    .find((c) => c.startsWith('kc-token-exp='));
  if (!expCookie) return true;
  const exp = parseInt(expCookie.split('=')[1], 10);
  // Expired if within 30 seconds of expiry
  return isNaN(exp) || exp < Math.floor(Date.now() / 1000) + 30;
}

/**
 * Check if any Keycloak cookie is present (indicates this user authenticated via Keycloak).
 */
function hasKeycloakSession(): boolean {
  return document.cookie.includes('kc-token-exp=') || document.cookie.includes('kc-refresh-token=');
}

/**
 * Attempt to refresh the Keycloak access token using the refresh token cookie.
 * Returns true if refresh succeeded.
 */
async function refreshKeycloakToken(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/keycloak/refresh', {
      method: 'POST',
      credentials: 'include',
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Returns the /api/auth/me payload if authenticated, otherwise null.
 *
 * Auth resolution order:
 * 1. Try /api/auth/me with existing cookies (Keycloak, Supabase, or Firebase)
 * 2. If Keycloak session exists but token expired, refresh and retry
 * 3. If Firebase client is logged in, mint the legacy session cookie and retry
 */
export async function ensureMe(): Promise<MeResponse | null> {
  // First attempt: any valid cookie
  const first = await fetchMe();
  if (first.ok) {
    return first.me;
  }

  // Second attempt: Keycloak token refresh
  if (hasKeycloakSession() && isKeycloakTokenExpired()) {
    const refreshed = await refreshKeycloakToken();
    if (refreshed) {
      const second = await fetchMe();
      if (second.ok) return second.me;
    }
  }

  // Third attempt: Firebase legacy flow — mint HTTP-only cookie from client token
  try {
    const user = await getCurrentUser();
    if (!user) {
      return null;
    }

    const idToken = await user.getIdToken();
    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    });

    if (!sessionRes.ok) {
      return null;
    }

    const third = await fetchMe();
    return third.ok ? third.me : null;
  } catch {
    return null;
  }
}
