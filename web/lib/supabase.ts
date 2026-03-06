// ─── Supabase Client (Browser) ─────────────────────────────────────────────
import { createBrowserClient } from '@supabase/ssr';

// Supabase configuration
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

export async function supabaseSignUp(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    },
  });
}

export async function supabaseSignIn(email: string, password: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function supabaseSignOut() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.signOut();
}

export async function supabaseGetSession() {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.getSession();
}

export async function supabaseGetUser() {
  const supabase = getSupabaseBrowserClient();
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

export async function supabaseSendPasswordResetEmail(email: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_APP_URL}/reset-password`,
  });
}

export async function supabaseResetPassword(newPassword: string) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.updateUser({ password: newPassword });
}

// For listening to auth state changes
export function onAuthStateChange(callback: (event: string, session: unknown) => void) {
  const supabase = getSupabaseBrowserClient();
  return supabase.auth.onAuthStateChange(callback);
}
