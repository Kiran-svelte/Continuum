/**
 * Client-side helper to get the current authenticated employee via cookies.
 *
 * Auth resolution order:
 * 1. Try /api/auth/me with existing session cookie.
 * 2. If the access token expired, refresh once and retry.
 * 3. If refresh fails, clear client-visible session state.
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

export async function tryRefreshSession(): Promise<boolean> {
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
 * 1. Try /api/auth/me with existing session cookie.
 * 2. Refresh the HTTP-only session once on 401.
 * 3. Clear stale auth state if refresh fails.
 */
export async function ensureMe(): Promise<MeResponse | null> {
  // First attempt: existing session cookie
  const res = await fetchMe();
  if (res.ok) {
    return res.me;
  }

  if (res.status === 401 && await tryRefreshSession()) {
    const second = await fetchMe();
    if (second.ok) {
      return second.me;
    }
  }

  if (res.status === 401) {
    await forceClientSignOut({ redirect: true });
  }

  return null;
}

export async function forceClientSignOut(options: { redirect?: boolean } = {}): Promise<void> {
  try {
    await fetch('/api/auth/sign-out', {
      method: 'POST',
      credentials: 'include',
    });
  } catch {
    // Client sign-out should continue locally even if the network request fails.
  }

  try {
    await fetch('/api/auth/session', { method: 'DELETE', credentials: 'include' });
  } catch {
    // Cookie cleanup is best effort when the browser is already offline.
  }

  if (options.redirect && typeof window !== 'undefined') {
    window.location.replace('/sign-in');
  }
}
