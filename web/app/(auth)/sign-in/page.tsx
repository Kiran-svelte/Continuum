'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseSignIn, supabaseSignInWithGoogle } from '@/lib/supabase';
import { Zap, AlertCircle, Lock, ShieldCheck, Users, UserCheck, Shield, Briefcase, ChevronRight, Gogle as GoogleIcon } from 'lucide-react';
import { AmbientBackground, TiltCard, FadeIn, MagneticButton, GlowCard, StaggerContainer } from '@/components/motion';

// Portal definitions for the picker
const PORTALS = [
  { key: 'admin', label: 'Admin Portal', description: 'System settings, RBAC, health monitoring', href: '/admin/dashboard', icon: Shield, roles: ['admin'], color: '#EF4444', bg: 'bg-red-500/10', border: 'border-red-500/20' },
  { key: 'hr', label: 'HR Portal', description: 'Employees, payroll, policies, reports', href: '/hr/dashboard', icon: Users, roles: ['admin', 'hr'], color: '#A855F7', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  { key: 'manager', label: 'Manager Portal', description: 'Team, approvals, attendance, calendar', href: '/manager/dashboard', icon: UserCheck, roles: ['admin', 'hr', 'director', 'manager', 'team_lead'], color: '#3B82F6', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  { key: 'employee', label: 'Employee Portal', description: 'Leave, attendance, payslips, documents', href: '/employee/dashboard', icon: Briefcase, roles: ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'], color: '#10B981', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
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

        void fetch('/api/auth/failed-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, reason }),
        }).catch(() => { });

        setError(message);
        return;
      }

      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: data.session.access_token }),
      });

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
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto shadow-[0_0_20px_rgba(0,255,255,0.4)]" />
          <p className="mt-6 text-white/40 font-black uppercase tracking-[0.3em] text-xs">Synchronizing Neural Link</p>
        </div>
      </div>
    );
  }

  if (showPortalPicker) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
        <AmbientBackground />
        <FadeIn className="w-full max-w-xl z-20" direction="up">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-primary/10 rounded-3xl mb-6 border border-primary/20 shadow-[0_0_30px_rgba(0,255,255,0.1)]">
              <Zap className="w-10 h-10 text-primary animate-pulse" />
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter mb-4">Command Center</h1>
            <p className="text-white/40 text-lg font-medium">Select your operational theater to continue.</p>
          </div>

          <StaggerContainer className="grid gap-4">
            {availablePortals.map((portal) => {
              const Icon = portal.icon;
              return (
                <FadeIn key={portal.key}>
                  <TiltCard>
                    <GlowCard
                      className="p-1"
                      color={portal.color}
                    >
                      <button
                        onClick={() => {
                          if (rememberMe) localStorage.setItem('preferred_portal', portal.key);
                          router.replace(portal.href);
                        }}
                        className={`flex items-center gap-6 w-full p-6 bg-black/40 rounded-2xl hover:bg-black/60 transition-all text-left group`}
                      >
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${portal.bg} border border-white/5 transition-transform group-hover:scale-110 shadow-inner`}>
                          <Icon className="w-8 h-8" style={{ color: portal.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-xl font-black text-white group-hover:text-primary transition-colors">{portal.label}</h3>
                          <p className="text-sm text-white/40 font-medium truncate">{portal.description}</p>
                        </div>
                        <ChevronRight className="w-6 h-6 text-white/10 group-hover:text-white group-hover:translate-x-2 transition-all" />
                      </button>
                    </GlowCard>
                  </TiltCard>
                </FadeIn>
              );
            })}
          </StaggerContainer>

          <FadeIn className="mt-10 flex justify-center">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-5 h-5 rounded-lg border-white/10 text-primary bg-white/5 focus:ring-primary focus:ring-offset-0 transition-all cursor-pointer"
              />
              <span className="text-sm text-white/30 font-black uppercase tracking-widest group-hover:text-white/60 transition-colors">Remember my preference</span>
            </label>
          </FadeIn>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-black">
      <AmbientBackground />
      <FadeIn className="w-full max-w-md z-20" direction="up">
        {/* Logo & Title */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary rounded-3xl mb-8 shadow-[0_0_40px_rgba(0,255,255,0.4)] relative border border-white/20 overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 translate-x-full group-hover:translate-x-0 transition-transform duration-500" />
            <Zap className="w-10 h-10 text-primary-foreground relative z-10" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2 shadow-sm">Continuum</h1>
          <p className="text-white/30 text-base font-black uppercase tracking-[0.2em]">Enterprise OS Sync</p>
        </div>

        {/* Card */}
        <TiltCard>
          <GlowCard className="p-8 pb-10" color="rgba(0, 255, 255, 0.2)">
            {error && (
              <div className="mb-8 flex items-start gap-4 p-5 bg-red-500/10 border border-red-500/20 rounded-3xl animate-in fade-in slide-in-from-top-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-400 font-black uppercase tracking-tighter leading-relaxed">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-xs font-black text-white/40 uppercase tracking-widest ml-1">
                  Neural ID (Email)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-14 px-5 bg-white/5 text-white border border-white/10 rounded-2xl text-base placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
                  placeholder="name@enterprise.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between ml-1">
                  <label className="block text-xs font-black text-white/40 uppercase tracking-widest">
                    Access Code
                  </label>
                  <Link href="/forgot-password" title="Recover Access" className="text-[10px] text-primary hover:text-white font-black uppercase tracking-widest transition-colors">
                    Reset
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-14 px-5 bg-white/5 text-white border border-white/10 rounded-2xl text-base placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-5 h-5 rounded-lg border-white/10 text-primary bg-white/5 focus:ring-primary focus:ring-offset-0 transition-all"
                  />
                  <span className="text-xs text-white/20 font-black uppercase tracking-widest group-hover:text-white/40 transition-colors">Maintain Link</span>
                </label>
              </div>

              <MagneticButton
                disabled={loading}
                variant="gradient"
                className="w-full h-14 !rounded-2xl shadow-[0_20px_40px_rgba(0,255,255,0.2)] hover:shadow-[0_20px_40px_rgba(0,255,255,0.4)] transition-all !text-base !font-black !uppercase !tracking-widest"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  'Authorize Sync'
                )}
              </MagneticButton>
            </form>

            <div className="mt-8 text-center pt-8 border-t border-white/5">
              <p className="text-sm text-white/20 font-black uppercase tracking-widest">
                New Operative?{' '}
                <Link href="/sign-up" className="text-primary hover:text-white transition-colors">
                  Initialize Account
                </Link>
              </p>
            </div>
          </GlowCard>
        </TiltCard>

        {/* Global Nav Bottom */}
        <div className="flex items-center justify-center gap-8 mt-12">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
            <Lock className="w-3.5 h-3.5 text-primary" />
            <span>Encrypted</span>
          </div>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Verified Hardware</span>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
