'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { firebaseSignIn } from '@/lib/firebase';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { isKeycloakClientEnabled, keycloakSignIn } from '@/lib/keycloak-client';
import { Zap, AlertCircle, Lock, ShieldCheck, KeyRound, Users, UserCheck, Shield, Briefcase } from 'lucide-react';

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
      let reason = 'Unknown error';

      if (err instanceof Error && err.name === 'AbortError') {
        message = 'Request timed out. Please try again.';
        reason = 'Request timeout';
      }

      if (authErr.code === 'auth/invalid-credential' || authErr.code === 'auth/invalid-email') {
        message = 'Invalid email or password.';
        reason = 'Invalid credentials';
      } else if (authErr.code === 'auth/user-not-found') {
        message = 'No account found with this email. Please sign up.';
        reason = 'User not found';
      } else if (authErr.code === 'auth/wrong-password') {
        message = 'Incorrect password. Please try again.';
        reason = 'Wrong password';
      } else if (authErr.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
        reason = 'Rate limited';
      } else if (authErr.code === 'auth/user-disabled') {
        message = 'This account has been disabled. Contact support.';
        reason = 'Account disabled';
      } else if (authErr.code === 'auth/network-request-failed') {
        message = 'Network error. Please check your connection.';
        reason = 'Network error';
      }

      // Log failed login attempt (non-blocking)
      void fetch('/api/auth/failed-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason }),
      }).catch(() => {});

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

  // Portal picker screen (shown after successful auth for multi-role users)
  if (showPortalPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-lg animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/25">
              <Zap className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Choose Portal</h1>
            <p className="text-muted-foreground mt-1">You have access to multiple portals. Where would you like to go?</p>
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
                  className={`flex items-center gap-4 w-full p-4 bg-card dark:bg-slate-900/80 dark:backdrop-blur-xl rounded-xl border ${portal.border} shadow-sm hover:shadow-md transition-all hover:scale-[1.01] text-left group`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${portal.bg} transition-transform group-hover:scale-110`}>
                    <Icon className={`w-6 h-6 ${portal.color}`} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground">{portal.label}</h3>
                    <p className="text-sm text-muted-foreground">{portal.description}</p>
                  </div>
                  <div className="text-muted-foreground group-hover:text-foreground transition-colors">
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
              className="w-4 h-4 rounded border-input text-primary bg-background focus:ring-primary focus:ring-offset-0"
            />
            <span className="text-sm text-muted-foreground">Remember my choice</span>
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/25 dark:shadow-primary/40 animate-float">
            <Zap className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Sign in to your Continuum account</p>
        </div>

        {/* Card */}
        <div className="bg-card dark:bg-slate-900/80 dark:backdrop-blur-xl rounded-2xl shadow-xl dark:shadow-2xl dark:shadow-black/30 border border-border dark:border-slate-800/50 p-6 card-lift">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl animate-slide-up">
              <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
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
                className="w-full h-11 px-4 bg-background dark:bg-slate-800/50 text-foreground border border-input dark:border-slate-700 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-500/50 focus:border-transparent transition-all"
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
                className="w-full h-11 px-4 bg-background dark:bg-slate-800/50 text-foreground border border-input dark:border-slate-700 rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary dark:focus:ring-blue-500/50 focus:border-transparent transition-all"
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
                  className="w-4 h-4 rounded border-input dark:border-slate-600 text-primary bg-background dark:bg-slate-800 focus:ring-primary focus:ring-offset-0"
                />
                <span className="text-sm text-muted-foreground">Remember me</span>
              </label>
              <Link href="/forgot-password" className="text-sm text-primary dark:text-blue-400 hover:text-primary/80 dark:hover:text-blue-300 font-medium transition-colors">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-primary/25 dark:shadow-primary/30 dark:hover:shadow-primary/40 btn-press"
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
              <div className="w-full border-t border-border dark:border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-card dark:bg-slate-900/80 px-4 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Keycloak SSO Button */}
          {isKeycloakClientEnabled() && (
            <button
              type="button"
              onClick={() => keycloakSignIn()}
              className="w-full h-12 mb-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-medium rounded-xl transition-all flex items-center justify-center gap-2 border border-border dark:border-slate-700"
            >
              <KeyRound className="w-5 h-5 text-primary" />
              Sign in with SSO
            </button>
          )}

          {/* Sign up link */}
          <p className="text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href="/sign-up" className="text-primary dark:text-blue-400 hover:text-primary/80 dark:hover:text-blue-300 font-medium transition-colors">
              Create one now
            </Link>
          </p>
        </div>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Lock className="w-4 h-4" />
            <span>Secure login</span>
          </div>
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
