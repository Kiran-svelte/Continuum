/**
 * Client-side helper to get the current authenticated employee via cookies.
 *
 * Auth resolution order:
 * 1. Try /api/auth/me with existing session cookie (continuum-session JWT)
 * 2. If Supabase client has a session, mint session cookie via /api/auth/session and retry
 */

import { supabaseGetSession } from '@/lib/supabase';

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
 * Auth resolution order:
 * 1. Try /api/auth/me with existing session cookie (continuum-session JWT)
 * 2. If Supabase client has a session, create server-side session cookie and retry
 */
export async function ensureMe(): Promise<MeResponse | null> {
  // First attempt: existing session cookie
  const first = await fetchMe();
  if (first.ok) {
    return first.me;
  }

  // Second attempt: Supabase client session — mint session cookie
  try {
    const { data } = await supabaseGetSession();
    if (!data.session) {
      return null;
    }

    const sessionRes = await fetch('/api/auth/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: data.session.access_token }),
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
