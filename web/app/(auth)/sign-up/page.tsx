'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseSignIn } from '@/lib/supabase';
import { CheckCircle, Building2, Users, Mail, ArrowRight, Loader2 } from 'lucide-react';
import { validatePassword } from '@/lib/password-validation';
import { cn } from '@/lib/utils';

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

  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch('/api/auth/me', { credentials: 'include' });
        if (meRes.ok) {
          router.replace('/onboarding');
          return;
        }
      } catch { } finally {
        setCheckingAuth(false);
      }
    })();
  }, [router]);

  useEffect(() => {
    if (!inviteToken) return;
    (async () => {
      try {
        const res = await fetch(`/api/auth/invite?token=${encodeURIComponent(inviteToken)}`);
        if (!res.ok) {
          setInviteError('Invalid or expired invite link');
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

  async function createSession(accessToken: string): Promise<boolean> {
    try {
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken }),
      });
      return sessionRes.ok;
    } catch { return false; }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) { setError(passwordValidation.errors[0]); return; }
    setLoading(true);

    try {
      if (mode === 'employee') {
        const codeRes = await fetch(`/api/company/validate-code?code=${encodeURIComponent(companyCode)}`);
        const codeData = await codeRes.json().catch(() => ({ valid: false }));
        if (!codeData.valid) {
          setError('Invalid company code.');
          setCompanyCodeValid(false);
          setLoading(false);
          return;
        }
      }

      const intent = mode === 'admin' ? 'hr' : 'employee';
      const inviteParam = inviteToken ? `&invite=${encodeURIComponent(inviteToken)}` : '';
      const onboardingUrl = `/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}${inviteParam}`;

      const signupRes = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName }),
      });
      const signupData = await signupRes.json();

      if (!signupRes.ok) {
        if (signupData.code === 'USER_EXISTS') {
          const { data: signInData, error: signInError } = await supabaseSignIn(email, password);
          if (!signInError && signInData.session) {
            await createSession(signInData.session.access_token);
            router.push(onboardingUrl);
            return;
          }
          setError('This email is already registered.');
          setLoading(false);
          return;
        }
        setError(signupData.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      if (signupData.emailConfirmationRequired) { setSuccess(true); setLoading(false); return; }

      const { data: signInData, error: signInError } = await supabaseSignIn(email, password);
      if (signInError || !signInData.session) { setSuccess(true); setLoading(false); return; }
      await createSession(signInData.session.access_token);
      router.push(onboardingUrl);
    } catch (err) {
      setError('Registration failed. Please try again.');
    } finally { setLoading(false); }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Check Your Email</h1>
          <p className="text-muted-foreground mb-6">
            We sent a verification link to <strong>{email}</strong>. Please check your inbox and click the link to activate your account.
          </p>
          <button onClick={() => router.push('/sign-in')} className="btn-primary w-full">
            Go to Sign In
          </button>
        </div>
      </div>
    );
  }

  if (mode === 'select') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <div className="text-center mb-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-xl bg-primary/10 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Create Your Account</h1>
            <p className="text-muted-foreground">Choose how you want to get started with Continuum</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('admin')}
              className="card p-6 text-left hover:border-primary hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <Building2 className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Create a Company</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Set up a new company workspace, manage employees, and configure HR policies.
              </p>
              <div className="flex items-center gap-2 text-primary text-sm font-medium group-hover:gap-3 transition-all">
                Get Started <ArrowRight className="w-4 h-4" />
              </div>
            </button>

            <button
              onClick={() => setMode('employee')}
              className="card p-6 text-left hover:border-violet-500 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center mb-4 group-hover:bg-violet-200 dark:group-hover:bg-violet-900/30 transition-colors">
                <Users className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-lg font-semibold text-foreground mb-2">Join a Company</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Join an existing company using an invite link or company code from your employer.
              </p>
              <div className="flex items-center gap-2 text-violet-600 dark:text-violet-400 text-sm font-medium group-hover:gap-3 transition-all">
                Join Now <ArrowRight className="w-4 h-4" />
              </div>
            </button>
          </div>

          <div className="mt-8 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/sign-in" className="text-primary font-medium hover:underline">Sign in</Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className={cn(
            'w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center',
            mode === 'admin' ? 'bg-primary/10' : 'bg-violet-100 dark:bg-violet-900/20'
          )}>
            {mode === 'admin' ? (
              <Building2 className="w-7 h-7 text-primary" />
            ) : (
              <Users className="w-7 h-7 text-violet-600 dark:text-violet-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {mode === 'admin' ? 'Create Your Company' : 'Join a Company'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === 'admin' ? 'Set up your company workspace' : 'Enter your details to join'}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {inviteData && (
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900 dark:text-blue-100">Invite Validated</p>
                  <p className="text-blue-700 dark:text-blue-300">Joining: {inviteData.company_name}</p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="input-label">First Name</label>
                <input
                  type="text"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  className="input"
                  placeholder="John"
                  required
                />
              </div>
              <div>
                <label className="input-label">Last Name</label>
                <input
                  type="text"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  className="input"
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div>
              <label className="input-label">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                disabled={!!inviteData}
                className={cn('input', inviteData && 'opacity-60')}
                placeholder="name@company.com"
                required
              />
            </div>

            <div>
              <label className="input-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="input-label">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="input"
                placeholder="••••••••"
                required
              />
            </div>

            {mode === 'employee' && !inviteToken && (
              <div className="p-4 bg-violet-50 dark:bg-violet-900/20 rounded-lg border border-violet-200 dark:border-violet-800">
                <label className="text-xs font-medium text-violet-700 dark:text-violet-300 uppercase tracking-wide">
                  Company Join Code
                </label>
                <input
                  type="text"
                  value={companyCode}
                  onChange={e => setCompanyCode(e.target.value.toUpperCase())}
                  className="input mt-2 text-center font-mono text-lg tracking-wider"
                  placeholder="ABC-1234"
                  required
                  maxLength={8}
                />
                {companyCodeValid === true && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-2 text-center font-medium">
                    ✓ Found: {companyCodeName}
                  </p>
                )}
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-700 dark:text-red-400 text-center">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Create Account'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => setMode('select')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change selection
          </button>
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-primary font-medium hover:underline">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
