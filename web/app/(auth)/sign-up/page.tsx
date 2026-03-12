'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseSignUp, supabaseSignIn, supabaseSignInWithGoogle, supabaseGetSession } from '@/lib/supabase';
import { Zap, CheckCircle, Building2, Users, Check, X, Mail, ArrowRight } from 'lucide-react';
import { validatePassword, getPasswordRequirements } from '@/lib/password-validation';
import { AmbientBackground, TiltCard, FadeIn } from '@/components/motion';

type Mode = 'select' | 'admin' | 'employee';

interface InviteData {
  email: string;
  role: string;
  department: string | null;
  company_name: string;
  company_join_code: string | null;
}

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [mode, setMode] = useState<Mode>(inviteToken ? 'employee' : 'select');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [companyCodeValid, setCompanyCodeValid] = useState<boolean | null>(null);
  const [companyCodeName, setCompanyCodeName] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [inviteError, setInviteError] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    const sessionController = new AbortController();
    const timeout = setTimeout(() => sessionController.abort(), 8000);

    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', {
          credentials: 'include',
          signal: sessionController.signal,
        });
        if (meRes.ok) {
          router.replace('/onboarding');
          return;
        }
      } catch {
        // If the auth check times out (AbortError) or fails, still allow sign-up.
      } finally {
        clearTimeout(timeout);
        setCheckingAuth(false);
      }
    })();

    return () => {
      clearTimeout(timeout);
      sessionController.abort();
    };
  }, [router]);

  // Validate invite token if present
  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/auth/invite?token=${encodeURIComponent(inviteToken)}`);
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setInviteError(data.error || 'Invalid or expired invite link');
          return;
        }
        const data = await res.json();
        if (data.valid && data.invite) {
          setInviteData(data.invite);
          setEmail(data.invite.email);
          if (data.invite.company_join_code) {
            setCompanyCode(data.invite.company_join_code);
            setCompanyCodeValid(true);
            setCompanyCodeName(data.invite.company_name);
          }
          setMode('employee');
        }
      } catch {
        setInviteError('Failed to validate invite. Please try again.');
      }
    })();
  }, [inviteToken]);

  /**
   * Creates a server session by sending the Supabase access token to the server.
   * Returns true if session was created successfully.
   */
  async function createSession(accessToken: string): Promise<boolean> {
    const sessionController = new AbortController();
    const sessionTimeout = setTimeout(() => sessionController.abort(), 8000);
    try {
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
        signal: sessionController.signal,
      });
      return sessionRes.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(sessionTimeout);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password strength (enterprise requirements)
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      setError(passwordValidation.errors[0]);
      return;
    }

    setLoading(true);

    try {
      // Validate company code before creating auth account (employee mode)
      if (mode === 'employee') {
        const codeRes = await fetch(`/api/company/validate-code?code=${encodeURIComponent(companyCode)}`);
        const codeData = await codeRes.json().catch(() => ({ valid: false }));
        if (!codeData.valid) {
          setError('Invalid company code. Please check with your HR and try again.');
          setCompanyCodeValid(false);
          setLoading(false);
          return;
        }
        setCompanyCodeValid(true);
        setCompanyCodeName(codeData.companyName || '');
      }

      const intent = mode === 'admin' ? 'hr' : 'employee';
      const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
      const onboardingUrl = `/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}${inviteParam}`;

      // Use Supabase for sign-up
      try {
        const { data, error: signUpError } = await supabaseSignUp(email, password);

        if (signUpError) {
          // If user already exists, try signing in
          if (signUpError.message?.includes('already registered') || signUpError.message?.includes('already been registered')) {
            try {
              const { data: signInData, error: signInError } = await supabaseSignIn(email, password);
              if (signInError) {
                if (signInError.message?.includes('Invalid login credentials')) {
                  setError('This email is already registered with a different password. Please sign in instead.');
                } else {
                  setError('This email is already registered. Please sign in instead.');
                }
                setLoading(false);
                return;
              }
              if (signInData.session) {
                await createSession(signInData.session.access_token);
                router.push(onboardingUrl);
              }
              return;
            } catch {
              setError('This email is already registered. Please sign in instead.');
              setLoading(false);
              return;
            }
          }

          // Handle other Supabase errors
          setError(signUpError.message || 'Registration failed. Please try again.');
          setLoading(false);
          return;
        }

        if (data.session) {
          // Session exists = email confirmation not required
          await createSession(data.session.access_token);
          router.push(onboardingUrl);
        } else if (data.user && !data.session) {
          // Email confirmation required — auto sign-in since we just created the account
          const { data: signInData, error: signInError } = await supabaseSignIn(email, password);
          if (signInError || !signInData.session) {
            // If auto-confirm is off, user needs to verify email first
            setSuccess(true);
            setLoading(false);
            return;
          }
          await createSession(signInData.session.access_token);
          router.push(onboardingUrl);
        }
        return;
      } catch (err) {
        console.error('Sign-up error:', err);
        setError('Registration failed. Please try again.');
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error('Sign up error:', err);
      setError('Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Loading state while checking auth
  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary" />
      </div>
    );
  }

  // Success state (only shown if somehow needed for email verification)
  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Account created!</h1>
          <p className="text-white/60 mb-4">
            Your account for <span className="text-white font-medium">{email}</span> has been created.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all"
          >
            Sign in to continue
          </Link>
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (mode === 'select') {
    return (
      <>
      <AmbientBackground />
        <FadeIn className="w-full max-w-2xl px-4">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/20 backdrop-blur-xl flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]">
              <Zap className="w-6 h-6 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
            </div>
            <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-primary/80 drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)] mb-2">Create your account</h1>
            <p className="text-white/60 text-lg">Get started with Continuum today</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TiltCard>
              <button
                onClick={() => setMode('admin')}
                className="group w-full glass-panel hover:bg-white/10 dark:hover:bg-slate-800/80 border border-white/20 dark:border-slate-800/50 hover:border-primary/50 dark:hover:border-primary/50 hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)] rounded-3xl p-8 transition-all text-left relative overflow-hidden h-full flex flex-col items-start justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-primary/20 group-hover:border-primary/50 transition-colors">
                  <Building2 className="w-7 h-7 text-primary group-hover:drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)] transition-all" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">Start a Company</h3>
                <p className="text-white/60 text-sm mb-6 relative z-10 font-medium leading-relaxed flex-grow">
                  For HR/Admin. Create your company workspace and invite employees.
                </p>
                <div className="text-primary text-sm font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform duration-300 relative z-10">
                  <span>Get started</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </TiltCard>

            <TiltCard>
              <button
                onClick={() => setMode('employee')}
                className="group w-full glass-panel hover:bg-white/10 dark:hover:bg-slate-800/80 border border-white/20 dark:border-slate-800/50 hover:border-cyan-500/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.2)] rounded-3xl p-8 transition-all text-left relative overflow-hidden h-full flex flex-col items-start justify-center"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-14 h-14 bg-cyan-500/10 rounded-2xl flex items-center justify-center mb-6 relative z-10 border border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors">
                  <Users className="w-7 h-7 text-cyan-500 group-hover:drop-shadow-[0_0_8px_rgba(34,211,238,0.8)] transition-all" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3 relative z-10">Join a Company</h3>
                <p className="text-white/60 text-sm mb-6 relative z-10 font-medium leading-relaxed flex-grow">
                  For Employees. Join your company using the code from HR.
                </p>
                <div className="text-cyan-500 text-sm font-bold flex items-center gap-2 group-hover:translate-x-2 transition-transform duration-300 relative z-10">
                  <span>Join team</span>
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </button>
            </TiltCard>
          </div>

          <p className="text-center mt-12 text-white/60 text-sm font-medium">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary hover:text-primary/80 font-bold hover:underline underline-offset-4 transition-all">
              Sign in
            </Link>
          </p>
        </FadeIn>
      </>
    );
  }

  // Sign-up form
  return (
    <>
    <AmbientBackground />
      <FadeIn className="w-full max-w-md px-4 mt-8 md:mt-24 mb-16 relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary/20 backdrop-blur-xl flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)]">
            <Zap className="w-8 h-8 text-primary drop-shadow-[0_0_8px_rgba(var(--primary-rgb),0.8)]" />
          </div>
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-primary/80 drop-shadow-[0_0_10px_rgba(var(--primary-rgb),0.5)]">Create your account</h1>
          <p className="text-white/60 text-lg mt-3">
            {mode === 'admin' ? 'Register your company' : 'Join your team'}
          </p>
        </div>

        <TiltCard>
          <div className="glass-panel p-8 md:p-10 rounded-3xl relative overflow-hidden shadow-2xl dark:shadow-black/50 border border-white/20 dark:border-white/10">
            {/* Ambient inner glow */}
            <div className={`absolute top-0 right-0 w-64 h-64 ${mode === 'admin' ? 'bg-primary/10' : 'bg-cyan-500/10'} rounded-full blur-3xl -z-10 transform translate-x-1/2 -translate-y-1/2`} />
            
            {/* Mode Tabs */}
            <div className="flex mb-8 bg-black/20 dark:bg-black/40 backdrop-blur-md rounded-xl p-1.5 border border-white/10">
              <button
                type="button"
                onClick={() => setMode('admin')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
                  mode === 'admin'
                    ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.4)] relative z-10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Start a Company
              </button>
              <button
                type="button"
                onClick={() => setMode('employee')}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-bold transition-all duration-300 ${
                  mode === 'employee'
                    ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.4)] relative z-10'
                    : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
              >
                Join a Company
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Invite Banner */}
              {inviteData && (
                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl flex items-start gap-3 backdrop-blur-sm">
                  <Mail className="w-5 h-5 text-blue-400 mt-0.5 shrink-0 drop-shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <div className="text-sm">
                    <p className="font-bold text-white mb-1">Invited to {inviteData.company_name}</p>
                    <p className="text-blue-200/80 font-medium">
                      Role: <span className="text-white">{inviteData.role.replace(/_/g, ' ')}</span>
                      {inviteData.department && <> &middot; Dept: <span className="text-white">{inviteData.department}</span></>}
                    </p>
                  </div>
                </div>
              )}
              {inviteError && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
                  <p className="text-sm text-red-400 font-medium flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {inviteError}
                  </p>
                </div>
              )}
              {/* Name Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 dark:bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner"
                    placeholder="John"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-white/80">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 bg-black/20 dark:bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner"
                    placeholder="Doe"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">Email address</label>
                <div className="relative group">
                  <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-primary transition-colors" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-black/20 dark:bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner disabled:opacity-60 disabled:cursor-not-allowed"
                    placeholder="you@company.com"
                    required
                    disabled={!!inviteData}
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 dark:bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
                {password && (
                  <div className="mt-4 space-y-2 bg-black/20 p-3 rounded-xl border border-white/5">
                    {getPasswordRequirements().map((req, i) => {
                      const checks = [
                        password.length >= 8,
                        /[A-Z]/.test(password),
                        /[a-z]/.test(password),
                        /[0-9]/.test(password),
                        /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password),
                      ];
                      const passed = checks[i];
                      return (
                        <div key={i} className={`flex items-center gap-2 text-xs font-medium transition-colors ${passed ? 'text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]' : 'text-white/40'}`}>
                          {passed ? <CheckCircle className="w-3.5 h-3.5" /> : <div className="w-1.5 h-1.5 rounded-full bg-white/20 ml-1" />}
                          {req}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <label className="block text-sm font-bold text-white/80">Confirm Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-black/20 dark:bg-black/40 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all backdrop-blur-sm shadow-inner"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>

              {/* Company Code (for employee mode) */}
              {mode === 'employee' && !inviteToken && (
                <div className="space-y-2">
                  <label className="block text-sm font-bold text-cyan-400">Company Access Code</label>
                  <input
                    type="text"
                    value={companyCode}
                    onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-cyan-950/30 border border-cyan-500/30 rounded-xl text-white placeholder:text-cyan-500/50 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all backdrop-blur-sm shadow-inner uppercase font-mono tracking-widest text-center text-lg"
                    placeholder="ABCD1234"
                    required
                    maxLength={8}
                  />
                  <p className="mt-2 text-xs text-cyan-200/60 font-medium text-center">
                    Enter the 8-character code from your HR team
                    {companyCodeValid === true && companyCodeName && (
                      <span className="text-green-400 ml-2 drop-shadow-[0_0_5px_rgba(74,222,128,0.8)]">&mdash; {companyCodeName}</span>
                    )}
                    {companyCodeValid === false && (
                      <span className="text-red-400 ml-2 drop-shadow-[0_0_5px_rgba(248,113,113,0.8)]">&mdash; Invalid code</span>
                    )}
                  </p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl backdrop-blur-sm">
                  <p className="text-sm text-red-400 font-medium flex items-center gap-2">
                    <X className="w-4 h-4" />
                    {error}
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 group relative overflow-hidden ${
                  mode === 'admin'
                    ? 'bg-primary hover:bg-white text-white hover:text-primary shadow-[0_0_20px_rgba(var(--primary-rgb),0.5)] hover:shadow-[0_0_30px_rgba(255,255,255,0.8)]'
                    : 'bg-cyan-500 hover:bg-white text-white hover:text-cyan-600 shadow-[0_0_20px_rgba(6,182,212,0.5)] hover:shadow-[0_0_30px_rgba(255,255,255,0.8)]'
                } disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary disabled:hover:text-white`}
              >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                <span className="relative z-10 flex items-center gap-2">
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      Create account
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </button>
            </form>

            <div className="mt-8 text-center pt-6 border-t border-white/10">
              <p className="text-white/60 text-sm font-medium">
                Already have an account?{' '}
                <Link href="/sign-in" className="text-primary hover:text-white font-bold transition-colors underline-offset-4 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </TiltCard>

        <p className="mt-8 text-center text-xs text-white/60/60 font-medium pb-8">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-white/60 hover:text-white transition-colors underline underline-offset-4">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-white/60 hover:text-white transition-colors underline underline-offset-4">Privacy Policy</Link>
        </p>
      </FadeIn>
    </>
  );
}
