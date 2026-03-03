'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createBrowserClient } from '@supabase/ssr';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Continuum</h1>
          <p className="text-gray-500 mt-2">Reset your password</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {sent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">📧</div>
                <h2 className="text-lg font-semibold text-gray-900">Check your email</h2>
                <p className="text-sm text-gray-500 mt-2">
                  We&apos;ve sent a password reset link to{' '}
                  <span className="font-medium text-gray-900">{email}</span>.
                  The link expires in 1 hour.
                </p>
                <p className="text-xs text-gray-400 mt-3">
                  Didn&apos;t receive it? Check your spam folder, or{' '}
                  <button
                    onClick={() => setSent(false)}
                    className="text-blue-600 hover:underline"
                  >
                    try again
                  </button>
                  .
                </p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <p className="text-sm text-gray-500 mb-4">
                  Enter the email address associated with your account and we&apos;ll send you a link to reset your password.
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email address
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Sending…' : 'Send Reset Link'}
                  </Button>
                </form>
              </>
            )}

            <div className="mt-6 text-center text-sm text-gray-500">
              Remember your password?{' '}
              <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign in
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
