'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabaseSendPasswordResetEmail } from '@/lib/supabase';
import { FadeIn, TiltCard, AmbientBackground } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabaseSendPasswordResetEmail(email);
      if (resetError) {
        setError(resetError.message || 'Failed to send reset email. Please try again.');
        return;
      }
      setSent(true);
    } catch (err) {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
            </TiltCard>
          </div>
          <h1 className="text-2xl font-bold text-white dark:text-white">Reset your password</h1>
          <p className="text-white/60 dark:text-white/60 mt-1">We&apos;ll send you a link to get back in</p>
        </div>

        {/* Card */}
        <TiltCard>
          <GlassPanel className="p-8">
            {sent ? (
              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
                  <svg className="w-8 h-8 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white dark:text-white">Check your email</h2>
                <p className="text-sm text-white/60 dark:text-white/60 mt-2">
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-medium text-white dark:text-white">{email}</span>.
                  The link expires in 1 hour.
                </p>
                <p className="text-xs text-white/60 dark:text-white/60 mt-3">
                  Didn&apos;t receive it? Check your spam folder, or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-primary hover:text-primary/80 font-medium transition-colors"
                  >
                    try again
                  </button>
                  .
                </p>
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

                <p className="text-sm text-white/60 dark:text-white/60 mb-5">
                  Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label htmlFor="email" className="block text-sm font-medium text-white/90 dark:text-white/90">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full h-11 px-4 bg-white/5 dark:bg-white/5 border border-white/10 dark:border-white/10 text-white dark:text-white rounded-xl text-sm placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 dark:focus:shadow-[0_0_15px_rgba(var(--primary-rgb),0.15)] transition-all"
                      placeholder="you@company.com"
                      required
                      autoComplete="email"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-primary text-primary-foreground hover:shadow-[0_0_25px_rgba(var(--primary-rgb),0.5)] rounded-xl py-2.5 font-semibold transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                        <span>Sending...</span>
                      </>
                    ) : (
                      'Send Reset Link'
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
