// ─── Supabase Client (Browser) ─────────────────────────────────────────────
//
// Supabase is the PRIMARY authentication provider.
// This browser client handles:
//   - Email/password sign-up & sign-in
//   - Google OAuth sign-in
//   - Password reset
//   - Sign-out
//   - Realtime subscriptions & Storage (if used)
//

import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create browser client (singleton)
let browserClient: ReturnType<typeof createBrowserClient> | null = null;

export function getSupabaseBrowserClient() {
  if (!browserClient) {
    browserClient = createBrowserClient(supabaseUrl, supabaseAnonKey);
  }
  return browserClient;
}

// ─── Auth Helper Functions ──────────────────────────────────────────────────

/**
 * Sign up with email and password via Supabase Auth.
 */
export async function supabaseSignUp(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signUp({ email, password });
}

/**
 * Sign in with email and password via Supabase Auth.
 */
export async function supabaseSignIn(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * Sign in with Google OAuth via Supabase Auth.
 * Redirects the browser to Google's consent screen.
 */
export async function supabaseSignInWithGoogle() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  });
}

/**
 * Sign out via Supabase Auth (clears Supabase session).
 */
export async function supabaseSignOut() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signOut();
}

/**
 * Send password reset email via Supabase Auth.
 */
export async function supabaseSendPasswordResetEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
}

/**
 * Update password (used during password reset flow after user clicks email link).
 */
export async function supabaseUpdatePassword(newPassword: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.updateUser({ password: newPassword });
}

/**
 * Get current Supabase session (access token + refresh token).
 */
export async function supabaseGetSession() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.getSession();
}

/**
 * Get current authenticated user from Supabase.
 */
export async function supabaseGetUser() {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

/**
 * Listen for auth state changes (sign-in, sign-out, token refresh).
 */
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.onAuthStateChange(callback);
}
