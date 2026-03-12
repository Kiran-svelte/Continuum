'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseSignIn, supabaseSignInWithGoogle } from '@/lib/supabase';
import { Zap, AlertCircle, Lock, ShieldCheck, Users, UserCheck, Shield, Briefcase } from 'lucide-react';
import { AmbientBackground, TiltCard, FadeIn } from '@/components/motion';

// Portal definitions for the picker
const PORTALS = [
  { key: 'admin', label: 'Admin Portal', description: 'System settings, RBAC, health monitoring', href: '/admin/dashboard', icon: Shield, roles: ['admin'], color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-200 dark:border-red-900' },
  { key: 'hr', label: 'HR Portal', description: 'Employees, payroll, policies, reports', href: '/hr/dashboard', icon: Users, roles: ['admin', 'hr'], color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-200 dark:border-purple-900' },
  { key: 'manager', label: 'Manager Portal', description: 'Team, approvals, attendance, calendar', href: '/manager/dashboard', icon: UserCheck, roles: ['admin', 'hr', 'director', 'manager', 'team_lead'], color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-200 dark:border-blue-900' },
  { key: 'employee', label: 'Employee Portal', description: 'Leave, attendance, payslips, documents', href: '/employee/dashboard', icon: Briefcase, roles: ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'], color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-200 dark:border-emerald-900' },
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');

  // Portal picker state
  const [showPortalPicker, setShowPortalPicker] = useState(false);
  const [availablePortals, setAvailablePortals] = useState<typeof PORTALS>([]);

  function getDefaultPortal(role: string): string {
    if (role === 'admin') return '/admin/dashboard';
    if (role === 'hr') return '/hr/dashboard';
    if (['manager', 'director', 'team_lead'].includes(role)) return '/manager/dashboard';
    return '/employee/dashboard';
  }

  function getAllRoles(me: { primary_role?: string; secondary_roles?: string[] | null }): string[] {
    const roles: string[] = [me.primary_role || 'employee'];
    if (Array.isArray(me.secondary_roles)) {
      me.secondary_roles.forEach((r) => {
        if (typeof r === 'string' && !roles.includes(r)) roles.push(r);
      });
    }
    return roles;
  }

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

    // Check for ?redirect= param from middleware bounce
    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirect');
    if (redirectTo && redirectTo.startsWith('/')) {
      router.replace(redirectTo);
      return true;
    }

    // Determine all roles and accessible portals
    const allRoles = getAllRoles(me);
    const accessible = PORTALS.filter((p) => p.roles.some((r) => allRoles.includes(r)));

    // If only 1 portal → auto-redirect
    if (accessible.length <= 1) {
      router.replace(getDefaultPortal(role));
      return true;
    }

    // Check for preferred portal in localStorage
    const preferred = localStorage.getItem('preferred_portal');
    if (preferred) {
      const match = accessible.find((p) => p.key === preferred);
      if (match) {
        router.replace(match.href);
        return true;
      }
    }

    // Multiple portals, no preference → show picker
    setAvailablePortals(accessible);
    setShowPortalPicker(true);
    return true;
  }

  // Check if user is already logged in and handle URL error params
  useEffect(() => {
    // Check for error in URL params (from auth callback failures)
    const params = new URLSearchParams(window.location.search);
    const urlError = params.get('error');
    if (urlError) {
      const errorMessages: Record<string, string> = {
        auth_callback_failed: 'Authentication failed. Please try again.',
        auth_required: 'Please sign in to continue.',
        access_denied: "You don't have access to that portal.",
        session_expired: 'Your session has expired. Please sign in again.',
      };
      setError(errorMessages[urlError] || 'An error occurred. Please try again.');
      // Clean up the URL
      window.history.replaceState({}, '', '/sign-in');
    }

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
      // Supabase sign-in (primary auth provider)
      const { data, error: signInError } = await supabaseSignIn(email, password);

      if (signInError || !data.session) {
        let message = 'Sign in failed. Please try again.';
        let reason = 'Unknown error';

        const errMsg = signInError?.message || '';
        if (errMsg.includes('Invalid login credentials')) {
          message = 'Invalid email or password.';
          reason = 'Invalid credentials';
        } else if (errMsg.includes('Email not confirmed')) {
          message = 'Please verify your email address first.';
          reason = 'Email not confirmed';
        } else if (errMsg.includes('Too many requests') || errMsg.includes('rate limit')) {
          message = 'Too many failed attempts. Please try again later.';
          reason = 'Rate limited';
        } else if (errMsg.includes('User not found')) {
          message = 'No account found with this email. Please sign up.';
          reason = 'User not found';
        }

        // Log failed login attempt (non-blocking)
        void fetch('/api/auth/failed-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, reason }),
        }).catch(() => {});

        setError(message);
        return;
      }

      // Create server-side session (signed JWT cookie)
      const sessionController = new AbortController();
      const sessionTimeout = setTimeout(() => sessionController.abort(), 8000);
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token }),
        signal: sessionController.signal,
      }).finally(() => {
        clearTimeout(sessionTimeout);
      });

      if (!sessionRes.ok) {
        console.error('[SignIn] Failed to set session cookie');
      }

      // Redirect based on role/onboarding status
      const redirected = await redirectByMe();
      if (!redirected) {
        router.push('/onboarding');
      }
    } catch (err) {
      const message = err instanceof Error && err.name === 'AbortError'
        ? 'Request timed out. Please try again.'
        : 'Sign in failed. Please try again.';
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
          <p className="mt-4 text-white/60">Checking session...</p>
        </div>
      </div>
    );
  }

  // Portal picker screen (shown after successful auth for multi-role users)
  if (showPortalPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
        <AmbientBackground />
        <FadeIn className="w-full max-w-lg z-20" direction="up">
          <TiltCard>
          <div className="glass-panel p-8 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-primary/10 rounded-2xl mb-4">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-black text-white tracking-tight">Choose Portal</h1>
              <p className="text-white/60 mt-2 font-medium">You have access to multiple portals. Where would you like to go?</p>
            </div>

            <div className="grid gap-3">
              {availablePortals.map((portal) => {
                const Icon = portal.icon;
                return (
                  <button
                    key={portal.key}
                    onClick={() => {
                      if (rememberMe) {
                        localStorage.setItem('preferred_portal', portal.key);
                      }
                      router.replace(portal.href);
                    }}
                    className={`flex items-center gap-4 w-full p-4 bg-white/5 rounded-xl border ${portal.border} shadow-sm hover:shadow-[0_0_15px_rgba(0,255,255,0.2)] transition-all hover:-translate-y-0.5 text-left group`}
                  >
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${portal.bg} transition-transform group-hover:scale-110`}>
                      <Icon className={`w-6 h-6 ${portal.color}`} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-white">{portal.label}</h3>
                      <p className="text-sm text-white/60">{portal.description}</p>
                    </div>
                    <div className="text-white/60 group-hover:text-primary transition-colors translate-x-0 group-hover:translate-x-1 duration-300">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                    </div>
                  </button>
                );
              })}
            </div>

            <label className="flex items-center justify-center gap-2 mt-6 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 text-primary bg-black focus:ring-primary focus:ring-offset-0"
              />
              <span className="text-sm text-white/60 font-medium">Remember my choice</span>
            </label>
          </div>
          </TiltCard>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      <AmbientBackground />
      <FadeIn className="w-full max-w-md z-20" direction="up">
        {/* Logo & Title */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-[0_0_20px_rgba(0,255,255,0.4)] animate-pulse">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Welcome back</h1>
          <p className="text-white/60 mt-2 font-medium">Sign in to your Continuum account</p>
        </div>

        {/* Card */}
        <TiltCard>
        <div className="glass-panel p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 relative z-10">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl animate-in fade-in slide-in-from-top-4">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-semibold text-white">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 bg-white/5 text-white border border-white/10 rounded-lg text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-sm font-semibold text-white">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 px-4 bg-white/5 text-white border border-white/10 rounded-lg text-sm placeholder:text-white/60 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all shadow-inner"
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
                  className="w-4 h-4 rounded border-white/20 text-primary bg-black focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm text-white/60 font-medium">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 font-bold transition-colors hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,255,0.3)] hover:shadow-[0_0_30px_rgba(0,255,255,0.5)] active:scale-95"
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
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-black px-4 text-white/60 font-medium rounded-full text-xs">or</span>
            </div>
          </div>

          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={() => supabaseSignInWithGoogle()}
            className="w-full h-12 mb-4 bg-white/5 hover:bg-white/5 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 border border-white/10 shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <svg className="w-5 h-5 drop-shadow-sm" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign in with Google
          </button>

          {/* Sign up link */}
          <p className="text-center text-sm text-white/60 mt-6 font-medium">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-primary hover:text-primary/80 font-bold transition-colors hover:underline">
              Create one now
            </Link>
          </p>
        </div>
        </TiltCard>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-white/60 font-medium relative z-10 glass-panel py-2 px-6 rounded-full mx-auto w-max border border-white/10">
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-primary" />
            <span>Secure login</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>256-bit encryption</span>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
