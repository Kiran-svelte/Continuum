'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, Mail, Loader2, Shield, Users, UserCheck, Briefcase, ChevronRight } from 'lucide-react';

// Portal definitions for the picker
const PORTALS = [
  { key: 'admin', label: 'Admin Portal', description: 'System settings, RBAC, health monitoring', href: '/admin/dashboard', icon: Shield, roles: ['admin'], color: 'text-error' },
  { key: 'hr', label: 'HR Portal', description: 'Employees, payroll, policies, reports', href: '/hr/dashboard', icon: Users, roles: ['admin', 'hr'], color: 'text-accent' },
  { key: 'manager', label: 'Manager Portal', description: 'Team, approvals, attendance, calendar', href: '/manager/dashboard', icon: UserCheck, roles: ['admin', 'hr', 'director', 'manager', 'team_lead'], color: 'text-primary' },
  { key: 'employee', label: 'Employee Portal', description: 'Leave, attendance, payslips, documents', href: '/employee/dashboard', icon: Briefcase, roles: ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'], color: 'text-success' },
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

    const params = new URLSearchParams(window.location.search);
    const redirectTo = params.get('redirect');
    if (redirectTo && redirectTo.startsWith('/')) {
      router.replace(redirectTo);
      return true;
    }

    const allRoles = getAllRoles(me);
    const accessible = PORTALS.filter((p) => p.roles.some((r) => allRoles.includes(r)));

    if (accessible.length <= 1) {
      router.replace(getDefaultPortal(role));
      return true;
    }

    const preferred = localStorage.getItem('preferred_portal');
    if (preferred) {
      const match = accessible.find((p) => p.key === preferred);
      if (match) {
        router.replace(match.href);
        return true;
      }
    }

    setAvailablePortals(accessible);
    setShowPortalPicker(true);
    return true;
  }

  useEffect(() => {
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
      // Use custom JWT auth instead of Supabase
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Sign in failed. Please try again.');
        setLoading(false);
        return;
      }

      const redirected = await redirectByMe();
      if (!redirected) {
        router.push('/onboarding');
      }
    } catch (err) {
      setError('Sign in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="mt-4 text-muted">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (showPortalPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground">Select Portal</h1>
            <p className="text-muted mt-1">Choose where you&apos;d like to go</p>
          </div>

          <div className="space-y-3">
            {availablePortals.map((portal) => {
              const Icon = portal.icon;
              return (
                <button
                  key={portal.key}
                  onClick={() => {
                    if (rememberMe) localStorage.setItem('preferred_portal', portal.key);
                    router.replace(portal.href);
                  }}
                  className="card w-full p-4 flex items-center gap-4 hover:bg-hover transition-colors text-left group"
                >
                  <div className={`w-12 h-12 bg-surface-alt rounded-xl flex items-center justify-center ${portal.color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-foreground group-hover:text-primary transition-colors">
                      {portal.label}
                    </h3>
                    <p className="text-sm text-muted truncate">{portal.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted group-hover:text-foreground group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary bg-background focus:ring-primary"
              />
              <span className="text-sm text-muted group-hover:text-foreground transition-colors">
                Remember my preference
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <div className="w-full max-w-md">
        {/* Logo & Title */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Continuum</h1>
          <p className="text-muted mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="card p-6">
          {error && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-error/5 border border-error/20 rounded-lg text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="input-label">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="name@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="input-label mb-0">Password</label>
                <Link href="/forgot-password" className="text-xs text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-border text-primary bg-background focus:ring-primary"
              />
              <label htmlFor="remember" className="text-sm text-muted cursor-pointer">
                Remember me
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted">
            Don&apos;t have an account?{' '}
            <span className="text-foreground-secondary">Contact your administrator</span>
          </p>
        </div>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Lock className="w-3.5 h-3.5" />
            <span>Encrypted</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Shield className="w-3.5 h-3.5" />
            <span>Secure</span>
          </div>
        </div>
      </div>
    </div>
  );
}
