'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft, Loader2 } from 'lucide-react';
import { jwtSendPasswordResetEmail } from '@/lib/auth-client';
import { ModernFormCard } from '@/components/ui/modern-form-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function ForgotPasswordView() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [delivered, setDelivered] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await jwtSendPasswordResetEmail(email);
      // `delivered` is only present in non-production API responses (anti-enumeration in prod).
      setDelivered(response?.delivered === true);
      setSent(true);
    } catch {
      setError('Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <ModernFormCard
      title={sent ? (delivered ? 'Check your email' : 'Request received') : 'Reset your password'}
      description={sent ? (delivered ? 'We&apos;ve sent a password reset link' : 'We&apos;ll process the request without confirming account status') : 'We&apos;ll send you a link to get back in'}
    >
      {sent ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary/10 rounded-full mb-4">
            <Mail className="w-8 h-8 text-primary" />
          </div>
          {delivered ? (
            <>
              <p className="text-sm text-muted-foreground mt-2">
                We&apos;ve sent a password reset link to{' '}
                <span className="font-medium text-foreground">{email}</span>.
                The link expires in 1 hour.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Didn&apos;t receive it? Check your spam folder, or{' '}
                <Button
                  onClick={() => setSent(false)}
                  type="button"
                  className="text-primary hover:text-primary/80 font-medium transition-colors"
                >
                  try again
                </Button>
                .
              </p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground mt-2">
              The request was accepted. If email delivery is configured for this environment, the reset link will be delivered shortly.
            </p>
          )}
        </div>
      ) : (
        <>
          {error && (
            <div className="mb-5 flex items-start gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-sm text-destructive flex-1">{error}</p>
            </div>
          )}

          <p className="text-sm text-muted-foreground mb-5">
            Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-sm font-medium text-foreground">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 px-4 bg-input border border-border text-foreground rounded-lg text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                placeholder="you@company.com"
                required
                autoComplete="email"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-primary-foreground rounded-lg py-3 font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
          </form>

          {/* Back to sign in */}
          <div className="pt-5 border-t border-border">
            <Link
              href="/sign-in"
              className="flex items-center justify-center gap-2 text-sm text-primary hover:text-primary/80 font-medium transition"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to sign in
            </Link>
          </div>
        </>
      )}
    </ModernFormCard>
  );
}
