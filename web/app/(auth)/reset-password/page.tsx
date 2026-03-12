'use client';

import { useState, useEffect, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { getSupabaseBrowserClient, supabaseUpdatePassword } from '@/lib/supabase';
import { FadeIn, TiltCard, AmbientBackground } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  if (!pw) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score: 3, label: 'Good', color: 'bg-yellow-500' };
  if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-emerald-400' };
}

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validCode, setValidCode] = useState<boolean | null>(null);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  useEffect(() => {
    // Supabase sends the user back with tokens in the URL hash fragment.
    // The Supabase client automatically picks those up and establishes a session.
    // We just need to verify there's a session present.
    async function checkSession() {
      const supabase = getSupabaseBrowserClient();
      // Listen for the PASSWORD_RECOVERY event
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event: string) => {
        if (event === 'PASSWORD_RECOVERY') {
          setValidCode(true);
        }
      });

      // Also check if already in a password recovery session
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setValidCode(true);
      } else {
        // Give some time for the hash to be parsed
        setTimeout(async () => {
          const { data: { session: s } } = await supabase.auth.getSession();
          if (s) {
            setValidCode(true);
          } else {
            setValidCode(false);
          }
        }, 1000);
      }

      return () => subscription.unsubscribe();
    }
    checkSession();
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const { error: updateError } = await supabaseUpdatePassword(password);

      if (updateError) {
        setError(updateError.message || 'Failed to reset password. Please try again.');
        return;
      }

      setSuccess(true);
      setTimeout(() => router.push('/sign-in'), 2500);
    } catch {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // Loading state while verifying the code
  if (validCode === null) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-hidden relative">
        <AmbientBackground />
        <FadeIn className="text-center z-20" direction="up">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-white/60">Verifying reset link...</p>
        </FadeIn>
      </div>
    );
  }

  // Invalid / expired code state
  if (validCode === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <AmbientBackground />
        <FadeIn className="w-full max-w-md z-20" direction="up">
          <TiltCard>
            <GlassPanel className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-destructive/10 rounded-full mb-4">
                <svg className="w-8 h-8 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white dark:text-white">Invalid or expired link</h2>
              <p className="text-sm text-white/60 dark:text-white/60 mt-2">
                This password reset link is invalid or has expired. Please request a new one.
              </p>
              <Link
                href="/forgot-password"
                className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Request a new link
              </Link>
            </GlassPanel>
          </TiltCard>
        </FadeIn>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <AmbientBackground />
      <FadeIn className="w-full max-w-md z-20" direction="up">
        {/* Logo & Title */}
        <div className="text-center mb-8 relative z-10">
          <div className="inline-block mb-4">
            <TiltCard>
              <div className="flex items-center justify-center w-14 h-14 bg-primary/20 backdrop-blur-md border border-primary/30 rounded-2xl shadow-[0_0_25px_rgba(var(--primary-rgb),0.4)]">
                <svg className="w-8 h-8 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
            </TiltCard>
          </div>
          <h1 className="text-2xl font-bold text-white dark:text-white">Set a new password</h1>
          <p className="text-white/60 dark:text-white/60 mt-1">Choose a strong password for your account</p>
        </div>

        {/* Card */}
        <TiltCard>
          <GlassPanel className="p-8">
            {success ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white dark:text-white">Password updated!</h2>
                <p className="text-sm text-white/60 dark:text-white/60 mt-2">Redirecting you to sign in...</p>
                <div className="mt-4">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
                    <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="password" className="block text-sm font-medium text-white/90 dark:text-white/90">
                      New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full h-11 px-4 bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 text-white dark:text-white rounded-xl text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 dark:focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] transition-all"
                      placeholder="••••••••"
                      required
                      minLength={8}
                      autoComplete="new-password"
                    />
                    {/* Password strength indicator */}
                    {password && (
                      <div className="space-y-1 pt-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-white/50">Password strength</span>
                          <span className={`text-xs font-medium ${
                            strength.score >= 4 ? 'text-emerald-400' : strength.score >= 3 ? 'text-yellow-400' : strength.score >= 2 ? 'text-orange-400' : 'text-red-400'
                          }`}>
                            {strength.label}
                          </span>
                        </div>
                        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ease-out ${strength.color} ${
                              strength.score >= 4 ? 'shadow-[0_0_10px_rgba(52,211,153,0.5)]' : ''
                            }`}
                            style={{ width: `${(strength.score / 5) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirm" className="block text-sm font-medium text-white/90 dark:text-white/90">
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full h-11 px-4 bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 text-white dark:text-white rounded-xl text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 dark:focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] transition-all"
                      placeholder="••••••••"
                      required
                      autoComplete="new-password"
                    />
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] rounded-xl py-2.5 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      'Update Password'
                    )}
                  </button>
                </form>
              </>
            )}

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 text-white/60 bg-black/40 backdrop-blur-sm rounded-full text-xs">or</span>
              </div>
            </div>

            {/* Back to sign in */}
            <p className="text-center text-sm text-white/60 dark:text-white/60">
              Remember your password?{' '}
              <Link href="/sign-in" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </GlassPanel>
        </TiltCard>

        {/* Trust badges */}
        <div className="flex items-center justify-center gap-6 mt-8 text-xs text-white/60">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>Secure reset</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>256-bit encryption</span>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="mt-4 text-white/60">Loading...</p>
        </div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
