'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { firebaseSignIn } from '@/lib/firebase';
import { getSupabaseBrowserClient } from '@/lib/supabase';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');

  async function redirectByMe() {
    const meController = new AbortController();
    const timeout = setTimeout(() => meController.abort(), 8000);

    let meRes: Response;
    try {
      meRes = await fetch('/api/auth/me', {
        credentials: 'include',
        signal: meController.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof Error && err.name === 'AbortError') {
        return false;
      }
      return false;
    } finally {
      clearTimeout(timeout);
    }

    if (!meRes.ok) return false;

    const me = await meRes.json();
    const role: string = me.primary_role ?? 'employee';
    const onboardingCompleted = me.company?.onboarding_completed ?? false;

    if ((role === 'admin' || role === 'hr') && !onboardingCompleted) {
      router.replace('/onboarding');
      return true;
    }

    if (role === 'admin' || role === 'hr') {
      router.replace('/hr/dashboard');
    } else if (role === 'manager' || role === 'team_lead' || role === 'director') {
      router.replace('/manager/dashboard');
    } else {
      router.replace('/employee/dashboard');
    }
    return true;
  }

  // Check if user is already logged in
  useEffect(() => {
    (async () => {
      try {
        const redirected = await redirectByMe();
        if (redirected) return;
      } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      // 1) Supabase first
      const supabase = getSupabaseBrowserClient();
      const { error: supaErr } = await supabase.auth.signInWithPassword({ email, password });
      if (!supaErr) {
        const redirected = await redirectByMe();
        if (!redirected) {
          router.push('/onboarding');
        }
        return;
      }

      // 2) Firebase fallback (preserve legacy accounts)
      const userCredential = await firebaseSignIn(email, password);
      const token = await userCredential.user.getIdToken();
      const sessionController = new AbortController();
      const sessionTimeout = setTimeout(() => sessionController.abort(), 8000);
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
        signal: sessionController.signal,
      }).finally(() => {
        clearTimeout(sessionTimeout);
      });
      if (!sessionRes.ok) {
        console.error('[SignIn] Failed to set session cookie');
      }
      const redirected = await redirectByMe();
      if (!redirected) {
        router.push('/onboarding');
      }
    } catch (err) {
      const authErr = err as { code?: string; message?: string };
      let message = 'Sign in failed. Please try again.';

      if (err instanceof Error && err.name === 'AbortError') {
        message = 'Request timed out. Please try again.';
      }
      
      if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-email') {
        message = 'Invalid email or password.';
      } else if (authErr.code === 'auth/user-not-found') {
        message = 'No account found with this email. Please sign up.';
      } else if (authErr.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
      } else if (authErr.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      } else if (authErr.code === 'auth/user-disabled') {
        message = 'This account has been disabled. Contact support.';
      } else if (authErr.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-muted-foreground">Checking session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/25 animate-float">
            <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Sign in to your Continuum account</p>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6 card-lift">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl animate-slide-up">
              <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 bg-background text-foreground border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-medium text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-background text-foreground border border-input rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-input text-primary bg-background focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 btn-press"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card px-4 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-primary hover:text-primary/80 font-medium transition-colors">
              Create one now
            </Link>
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure login</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
