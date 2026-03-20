'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Lock, Mail, Loader2, Shield, Users, UserCheck, Briefcase, ChevronRight, Eye, EyeOff, CheckCircle2, Building2, Calendar, BarChart3 } from 'lucide-react';

// Portal definitions for the picker
const PORTALS = [
  { key: 'admin', label: 'Admin Portal', description: 'System settings, RBAC, health monitoring', href: '/admin/dashboard', icon: Shield, roles: ['admin'] },
  { key: 'hr', label: 'HR Portal', description: 'Employees, payroll, policies, reports', href: '/hr/dashboard', icon: Users, roles: ['admin', 'hr'] },
  { key: 'manager', label: 'Manager Portal', description: 'Team, approvals, attendance, calendar', href: '/manager/dashboard', icon: UserCheck, roles: ['admin', 'hr', 'director', 'manager', 'team_lead'] },
  { key: 'employee', label: 'Employee Portal', description: 'Leave, attendance, payslips, documents', href: '/employee/dashboard', icon: Briefcase, roles: ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'] },
];

// Feature highlights for sidebar
const FEATURES = [
  { icon: Building2, title: 'Multi-Company Support', description: 'Manage multiple organizations from one platform' },
  { icon: Users, title: 'Team Management', description: 'Hierarchical roles with dynamic approval chains' },
  { icon: Calendar, title: 'Smart Leave Management', description: 'AI-powered leave recommendations and forecasting' },
  { icon: BarChart3, title: 'Real-time Analytics', description: 'Comprehensive dashboards and reporting' },
];

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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

  async function redirectByMe() {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include',
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (!data.user) return false;

      const availablePortals = PORTALS.filter(portal =>
        portal.roles.includes(data.user.role)
      );
      setAvailablePortals(availablePortals);

      // Check if user has multiple portal options
      if (availablePortals.length > 1) {
        setShowPortalPicker(true);
        return true;
      }

      // Single portal - redirect directly
      const defaultPortal = getDefaultPortal(data.user.role);
      router.replace(defaultPortal);
      return true;
    } catch (error) {
      return false;
    }
  }

  useEffect(() => {
    redirectByMe().finally(() => setCheckingAuth(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#6C63FF] to-[#4A90E2] flex items-center justify-center mx-auto shadow-lg shadow-[#6C63FF]/20">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="mt-6 text-secondary font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (showPortalPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-[#6C63FF] to-[#4A90E2] rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#6C63FF]/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-h1">Welcome Back</h1>
            <p className="text-body mt-2">Select your portal to continue</p>
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
                  className="card w-full p-5 flex items-center gap-4 hover:scale-[1.02] transition-all text-left group"
                >
                  <div className="w-14 h-14 rounded-xl bg-[var(--bg-input)] flex items-center justify-center text-[var(--accent)]">
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-h4 group-hover:text-[var(--accent)] transition-colors">
                      {portal.label}
                    </h3>
                    <p className="text-sm text-muted truncate">{portal.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted group-hover:text-[var(--accent)] group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
              />
              <span className="text-sm text-secondary group-hover:text-primary transition-colors">
                Remember my preference
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Apex Dark Gradient */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#6C63FF] via-[#4A90E2] to-[#2D1B69] p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">Continuum</span>
          </div>
          
          {/* Headline */}
          <div className="mt-20">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Enterprise HR & Leave Management
            </h1>
            <p className="mt-4 text-lg text-blue-100/90 leading-relaxed max-w-md">
              Streamline your workforce operations with AI-powered insights, dynamic approval chains, and comprehensive analytics.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {FEATURES.map((feature, i) => (
            <div key={i} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4 hover:bg-white/20 transition-all">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-blue-100/80">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="relative z-10 flex items-center gap-6 pt-8 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/80">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">256-bit SSL</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">GDPR Ready</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Dark Form */}
      <div className="flex-1 flex flex-col">
        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-[#6C63FF] to-[#4A90E2] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-[#6C63FF]/20">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-h2 text-primary">Continuum</h1>
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h2 className="text-h1">Welcome back</h2>
              <p className="text-body mt-1">Sign in to access your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 p-4 rounded-xl bg-[var(--danger-bg)] border border-[var(--danger-border)] flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[var(--danger)] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-[var(--danger)]">Authentication failed</p>
                  <p className="text-sm text-[var(--danger)] mt-1">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="input-group">
                <label className="input-label">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="input pl-11"
                    placeholder="Enter your email"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <div className="input-group">
                <label className="input-label">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input pl-11 pr-11"
                    placeholder="Enter your password"
                    required
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted hover:text-primary transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                    disabled={loading}
                  />
                  <span className="text-sm text-secondary group-hover:text-primary transition-colors">
                    Remember me
                  </span>
                </label>
                <a 
                  href="/forgot-password" 
                  className="text-sm text-[var(--accent)] hover:text-[var(--accent-2)] transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-block btn-lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>

            {/* Register Disabled Notice */}
            <div className="mt-8 text-center">
              <div className="p-4 rounded-xl bg-[var(--info-bg)] border border-[var(--info-border)]">
                <Shield className="w-5 h-5 text-[var(--info)] mx-auto mb-2" />
                <p className="text-sm text-[var(--info)] font-medium">Invitation Required</p>
                <p className="text-sm text-[var(--info)] mt-1">
                  New accounts are created by invitation only. Contact your administrator.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center mx-auto shadow-lg shadow-blue-600/20">
              <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
          </div>
          <p className="mt-6 text-slate-600 dark:text-slate-400 font-medium">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (showPortalPicker) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-xl">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/20">
              <Shield className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Welcome Back</h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">Select your portal to continue</p>
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
                  className="w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 flex items-center gap-4 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-lg hover:shadow-blue-600/5 transition-all duration-200 text-left group"
                >
                  <div className={`w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center ${portal.color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {portal.label}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{portal.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-center">
            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                Remember my preference
              </span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-12 flex-col justify-between relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-white rounded-full -translate-x-1/2 -translate-y-1/2" />
          <div className="absolute bottom-0 right-0 w-[32rem] h-[32rem] bg-white rounded-full translate-x-1/3 translate-y-1/3" />
        </div>
        
        {/* Content */}
        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur rounded-xl flex items-center justify-center">
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-white">Continuum</span>
          </div>
          
          {/* Headline */}
          <div className="mt-20">
            <h1 className="text-4xl font-bold text-white leading-tight">
              Enterprise HR & Leave Management
            </h1>
            <p className="mt-4 text-lg text-blue-100/90 leading-relaxed max-w-md">
              Streamline your workforce operations with AI-powered insights, dynamic approval chains, and comprehensive analytics.
            </p>
          </div>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-4">
          {FEATURES.map((feature, i) => (
            <div key={i} className="flex items-start gap-4 bg-white/10 backdrop-blur-sm rounded-xl p-4">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white">{feature.title}</h3>
                <p className="text-sm text-blue-100/80">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Trust badges */}
        <div className="relative z-10 flex items-center gap-6 pt-8 border-t border-white/20">
          <div className="flex items-center gap-2 text-white/80">
            <Shield className="w-4 h-4" />
            <span className="text-sm font-medium">SOC 2 Compliant</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <Lock className="w-4 h-4" />
            <span className="text-sm font-medium">256-bit SSL</span>
          </div>
          <div className="flex items-center gap-2 text-white/80">
            <CheckCircle2 className="w-4 h-4" />
            <span className="text-sm font-medium">GDPR Ready</span>
          </div>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900">
        {/* Theme Toggle */}
        {mounted && (
          <div className="flex justify-end p-4">
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-slate-600 dark:text-slate-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>
          </div>
        )}

        {/* Form Container */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <div className="lg:hidden text-center mb-10">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-600/20">
                <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Continuum</h1>
            </div>

            {/* Welcome Text */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Welcome back</h2>
              <p className="text-slate-600 dark:text-slate-400 mt-1">Sign in to access your account</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mb-6 flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                    Password
                  </label>
                  <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium">
                    Forgot password?
                  </a>
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  Keep me signed in
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all duration-200 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign in</span>
                )}
              </button>
            </form>

            {/* Contact Admin */}
            <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
              Don&apos;t have an account?{' '}
              <span className="text-slate-700 dark:text-slate-300 font-medium">Contact your administrator</span>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4">
          <div className="max-w-md mx-auto flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" />
                <span>Encrypted</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>Secure</span>
              </div>
            </div>
            <span>© 2024 Continuum</span>
          </div>
        </div>
      </div>
    </div>
  );
}
