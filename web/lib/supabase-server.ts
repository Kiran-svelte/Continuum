// ─── Supabase Server Client (SSR / API Routes) ────────────────────────────
//
// Supabase is the PRIMARY authentication provider.
//
// This file provides:
// 1. getSupabaseServerClient() — Server Components / Route Handlers (cookie-based session)
// 2. createMiddlewareClient() — Middleware (request/response-based session refresh)
// 3. getSupabaseAdmin() — Service role client for admin operations (bypasses RLS)
// 4. verifySupabaseToken() — Verify a Supabase access token server-side
//

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Creates a Supabase server client for Server Components and Route Handlers.
 * Uses cookies for session management.
 */
export async function getSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing sessions.
        }
      },
    },
  });
}

/**
 * Creates a Supabase server client for Middleware.
 * Handles session refresh and cookie management.
 */
export function createMiddlewareClient(request: NextRequest, response: NextResponse) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });
}

/**
 * Creates an admin Supabase client with service role key.
 * Use only for server-side operations that need elevated privileges
 * (e.g., admin DB operations, bypassing RLS).
 */
export function getSupabaseAdmin() {
  if (!supabaseServiceKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

/**
 * Verify a Supabase access token (JWT) server-side using the Admin client.
 * Returns the authenticated user or null.
 */
export async function verifySupabaseToken(accessToken: string) {
  const admin = getSupabaseAdmin();
  const { data: { user }, error } = await admin.auth.getUser(accessToken);
  if (error || !user) return null;
  return user;
}
