/**
 * Client-side helper to get the current authenticated employee via cookies.
 *
 * Supports:
 * - Supabase auth cookie (sb-*-auth-token)
 * - Legacy Firebase auth cookie (firebase-auth-token)
 * - Legacy Firebase *client* session by minting the HTTP-only cookie via /api/auth/session
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
 * Returns the /api/auth/me payload if authenticated, otherwise null.
 *
 * Cookie-first. If missing cookies but Firebase client is logged in,
 * it will set the legacy session cookie and retry.
 */
export async function ensureMe(): Promise<MeResponse | null> {
  const first = await fetchMe();
  if (first.ok) {
    return first.me;
  }

  // If cookie auth failed, try to mint the Firebase HTTP-only cookie (legacy flows)
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

    const second = await fetchMe();
    return second.ok ? second.me : null;
  } catch {
    return null;
  }
}
