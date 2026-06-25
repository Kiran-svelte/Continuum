/**
 * Client-side helper to get the current authenticated employee via cookies.
 *
 * Auth resolution order:
 * 1. Try /api/auth/me with existing access token cookie
 * 2. On 401, call /api/auth/refresh (tryRefreshSession) to rotate tokens
 * 3. On refresh failure, clear cookies and redirect to sign-in
 */

export type MeResponse = {
  id: string;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  primary_role?: string | null;
  permissions?: string[];
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
 * Attempts to refresh the session by calling /api/auth/refresh.
 * Returns true when a new token was set, false on failure.
 */
async function tryRefreshSession(): Promise<boolean> {
  try {
    const res = await fetch('/api/auth/refresh', {
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
 * 1. Try /api/auth/me with existing access token cookie
 * 2. On 401, call /api/auth/refresh to rotate tokens, then retry
 */
export async function ensureMe(): Promise<MeResponse | null> {
  // First attempt: existing access token cookie
  const res = await fetch('/api/auth/me', { credentials: 'include' });
  if (res.ok) {
    const me = (await res.json()) as MeResponse;
    return me;
  }

  // On 401, attempt token refresh via tryRefreshSession
  if (res.status === 401) {
    const refreshed = await tryRefreshSession();
    if (refreshed) {
      const second = await fetchMe();
      return second.ok ? second.me : null;
    }
    // Refresh failed — clear cookies and force re-authentication
    await clearSessionAndRedirect();
    return null;
  }

  return null;
}

/**
 * Clears all auth cookies and redirects to sign-in.
 * Called when refresh cannot recover the session.
 */
async function clearSessionAndRedirect(): Promise<void> {
  try {
    await fetch('/api/auth/sign-out', { method: 'POST', credentials: 'include' });
  } catch {
    // Best-effort
  }
  try {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
  } catch {
    // Best-effort
  }
  window.location.replace('/sign-in');
}

export async function forceClientSignOut(): Promise<void> {
  try {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Client sign-out should continue locally even if the network request fails.
  }
  window.location.replace('/sign-in');
}
