'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';
import { isKeycloakClientEnabled, keycloakSignUp } from '@/lib/keycloak-client';
import { useSearchParams } from 'next/navigation';
import { Zap, CheckCircle, Building2, Users, KeyRound, Check, X, Mail } from 'lucide-react';
import { validatePassword, getPasswordRequirements } from '@/lib/password-validation';

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

  const supabase = getSupabaseBrowserClient();

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

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const intent = mode === 'admin' ? 'hr' : 'employee';
      const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
      const redirectUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(`/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}${inviteParam}`)}`;
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: `${firstName} ${lastName}`,
            role: intent,
          },
          emailRedirectTo: redirectUrl,
        },
      });

      if (signUpError) {
        const code = (signUpError as unknown as { code?: string }).code;
        if (code === 'auth/network-request-failed') {
          setError('Network error. Please check your connection.');
          setLoading(false);
          return;
        }
        if (code === 'auth/too-many-requests') {
          setError('Too many failed attempts. Please try again later.');
          setLoading(false);
          return;
        }

        // Check if user already exists
        if (signUpError.message.includes('already registered')) {
          // Try to sign in instead
          const { error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (signInError) {
            const signInCode = (signInError as unknown as { code?: string }).code;
            if (signInCode === 'auth/network-request-failed') {
              setError('Network error. Please check your connection.');
              setLoading(false);
              return;
            }
            if (signInCode === 'auth/too-many-requests') {
              setError('Too many failed attempts. Please try again later.');
              setLoading(false);
              return;
            }
            if (signInError.message.includes('Invalid login credentials')) {
              setError('This email is already registered with a different password. Please sign in instead.');
            } else {
              setError(signInError.message);
            }
            setLoading(false);
            return;
          }

          // Successfully signed in - redirect to onboarding
          router.push(`/onboarding?intent=${intent}`);
          return;
        }

        // Check if email sending failed - fallback to dev API
        if (
          signUpError.message.includes('sending confirmation email') ||
          signUpError.message.includes('email not confirmed')
        ) {
          // Try dev-create-user API (auto-confirms user)
          try {
            const devRes = await fetch('/api/auth/dev-create-user', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, password }),
            });

            if (devRes.ok) {
              // User created with auto-confirm, now sign them in
              const { error: signInErr } = await supabase.auth.signInWithPassword({
                email,
                password,
              });
              if (!signInErr) {
                router.push(`/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}`);
                return;
              }
            }

            const devData = await devRes.json().catch(() => ({}));
            if (devRes.status === 404) {
              // Fallback endpoint not available
              setError('Account creation temporarily unavailable. Please contact support or try again later.');
            } else if (devRes.status === 501 && devData.error?.includes('SUPABASE_SERVICE_ROLE_KEY')) {
              // Service role key missing
              setError('Email service configuration incomplete. Please contact your administrator.');
            } else if (devData.error) {
              setError(devData.error);
            } else {
              setError('Failed to create account. Please try again.');
            }
          } catch {
            setError('Failed to create account. Please try again.');
          }
          setLoading(false);
          return;
        }

        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Supabase signUp succeeded — but confirmation email is unreliable (Supabase free tier).
      // Auto-confirm via admin API and sign in immediately for a seamless experience.
      // (reuse `intent` declared above)
      const onboardingUrl = `/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}${inviteParam}`;

      try {
        // Try to auto-confirm via admin API
        const confirmRes = await fetch('/api/auth/dev-create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        if (confirmRes.ok || confirmRes.status === 409) {
          // User auto-confirmed (or already existed) — sign in now
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInErr) {
            router.push(onboardingUrl);
            return;
          }
        }
      } catch {
        // Auto-confirm failed — fall through to email verification screen
      }

      // If auto-confirm path failed, try direct sign-in (in case Supabase auto-confirmed)
      try {
        const { error: directSignInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (!directSignInErr) {
          router.push(onboardingUrl);
          return;
        }
      } catch {
        // Fall through to email screen
      }

      // Last resort: show email verification screen with resend option
      setSuccess(true);
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

  // Success state - email verification (last resort, rarely shown now)
  if (success) {
    const intent = mode === 'admin' ? 'hr' : 'employee';

    async function handleResend() {
      setError('');
      setLoading(true);
      try {
        // Try auto-confirm path again
        const res = await fetch('/api/auth/dev-create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        if (res.ok || res.status === 409) {
          const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
          if (!signInErr) {
            router.push(`/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}`);
            return;
          }
        }
        // Fallback: resend Supabase confirmation
        await supabase.auth.resend({ type: 'signup', email });
        setError('Verification email resent! Check your inbox and spam folder.');
      } catch {
        setError('Failed to resend. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Almost there!</h1>
          <p className="text-muted-foreground mb-4">
            We&apos;re setting up your account for <span className="text-foreground font-medium">{email}</span>.
            If you&apos;re not redirected automatically, click the button below.
          </p>
          {error && (
            <p className="text-sm text-yellow-600 dark:text-yellow-400 mb-4">{error}</p>
          )}
          <button
            onClick={handleResend}
            disabled={loading}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl transition-all disabled:opacity-50 mb-3"
          >
            {loading ? 'Retrying...' : 'Continue to Onboarding'}
          </button>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium text-sm"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  // Mode selection screen
  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create your account</h1>
            <p className="text-muted-foreground">Get started with Continuum today</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('admin')}
              className="group bg-card dark:bg-slate-900/80 dark:backdrop-blur-xl hover:bg-muted/50 dark:hover:bg-slate-800/80 border border-border dark:border-slate-800/50 hover:border-primary/50 dark:hover:border-blue-500/50 rounded-2xl p-6 transition-all text-left shadow-lg dark:shadow-black/20"
            >
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mb-4">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Start a Company</h3>
              <p className="text-muted-foreground text-sm mb-3">
                For HR/Admin. Create your company workspace and invite employees.
              </p>
              <span className="text-primary text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Get started →
              </span>
            </button>

            <button
              onClick={() => setMode('employee')}
              className="group bg-card dark:bg-slate-900/80 dark:backdrop-blur-xl hover:bg-muted/50 dark:hover:bg-slate-800/80 border border-border dark:border-slate-800/50 hover:border-cyan-500/50 rounded-2xl p-6 transition-all text-left shadow-lg dark:shadow-black/20"
            >
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Join a Company</h3>
              <p className="text-muted-foreground text-sm mb-3">
                For Employees. Join your company using the code from HR.
              </p>
              <span className="text-cyan-600 dark:text-cyan-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Join team →
              </span>
            </button>
          </div>

          <p className="text-center mt-8 text-muted-foreground text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary hover:text-primary/80 font-medium">
              Sign in
            </Link>
          </p>

          {isKeycloakClientEnabled() && (
            <div className="mt-4 text-center">
              <button
                onClick={() => keycloakSignUp()}
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-medium rounded-lg transition-colors border border-border dark:border-slate-700 text-sm"
              >
                <KeyRound className="w-4 h-4 text-primary" />
                Sign up with SSO
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Sign-up form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 dark:bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))]">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-primary/20 flex items-center justify-center">
            <Zap className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm">
            {mode === 'admin' ? 'Register your company' : 'Join your team'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex mb-6 bg-muted rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'admin'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Start a Company
          </button>
          <button
            type="button"
            onClick={() => setMode('employee')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'employee'
                ? 'bg-cyan-600 text-white dark:bg-cyan-600'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Join a Company
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Invite Banner */}
          {inviteData && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-start gap-3">
              <Mail className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">Invited to {inviteData.company_name}</p>
                <p className="text-muted-foreground">
                  Role: <span className="text-foreground">{inviteData.role.replace(/_/g, ' ')}</span>
                  {inviteData.department && <> &middot; Dept: <span className="text-foreground">{inviteData.department}</span></>}
                </p>
              </div>
            </div>
          )}
          {inviteError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{inviteError}</p>
            </div>
          )}
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-60 disabled:cursor-not-allowed"
              placeholder="you@company.com"
              required
              disabled={!!inviteData}
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
              required
              minLength={8}
            />
            {password && (
              <div className="mt-2 space-y-1">
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
                    <div key={i} className={`flex items-center gap-1.5 text-xs ${passed ? 'text-green-500' : 'text-muted-foreground'}`}>
                      {passed ? <Check className="w-3 h-3" /> : <X className="w-3 h-3 opacity-50" />}
                      {req}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="••••••••"
              required
              minLength={8}
            />
          </div>

          {/* Company Code (for employee mode) */}
          {mode === 'employee' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Company Code</label>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent uppercase"
                placeholder="ABCD1234"
                required
                maxLength={8}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Enter the 8-character code from your HR
                {companyCodeValid === true && companyCodeName && (
                  <span className="text-green-500 ml-1">— {companyCodeName}</span>
                )}
                {companyCodeValid === false && (
                  <span className="text-red-400 ml-1">— Invalid code</span>
                )}
              </p>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
              mode === 'admin'
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-foreground border-t-transparent" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-muted-foreground text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary hover:text-primary/80 font-medium">
              Sign in
            </Link>
          </p>
          {isKeycloakClientEnabled() && (
            <button
              type="button"
              onClick={() => keycloakSignUp()}
              className="mt-3 inline-flex items-center gap-2 px-5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-foreground font-medium rounded-lg transition-colors border border-border dark:border-slate-700 text-sm"
            >
              <KeyRound className="w-4 h-4 text-primary" />
              Sign up with SSO
            </button>
          )}
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-muted-foreground hover:text-foreground">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-muted-foreground hover:text-foreground">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
