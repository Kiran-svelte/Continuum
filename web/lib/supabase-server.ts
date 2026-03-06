// ─── Supabase Server Client (SSR / API Routes) ────────────────────────────
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Creates a Supabase server client for Server Components and Route Handlers
 * Uses cookies for session management
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
 * Creates a Supabase server client for Middleware
 * Handles session refresh and cookie management
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
 * Creates an admin Supabase client with service role key
 * Use only for server-side operations that need elevated privileges
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
 * Gets the current user from request cookies
 * For use in API routes
 */
export async function getUserFromRequest(request: NextRequest): Promise<{
  user: { uid: string; email: string | undefined } | null;
  error: Error | null;
}> {
  try {
    // Create a minimal response to read cookies
    const response = NextResponse.next();
    const supabase = createMiddlewareClient(request, response);
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { user: null, error: error || new Error('No user found') };
    }
    
    return {
      user: {
        uid: user.id,
        email: user.email,
      },
      error: null,
    };
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
    };
  }
}

/**
 * Gets the current authenticated user from cookies
 * For use in Server Components and Server Actions
 */
export async function getUser() {
  const supabase = await getSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return user;
}
