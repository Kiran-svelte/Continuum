'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { firebaseVerifyPasswordResetCode, firebaseConfirmPasswordReset } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [validCode, setValidCode] = useState<boolean | null>(null);
  const [oobCode, setOobCode] = useState<string | null>(null);

  useEffect(() => {
    // Firebase sends the oobCode as a query parameter
    async function verifyCode() {
      const code = searchParams.get('oobCode');
      if (!code) {
        setValidCode(false);
        return;
      }
      
      try {
        await firebaseVerifyPasswordResetCode(code);
        setOobCode(code);
        setValidCode(true);
      } catch {
        setValidCode(false);
      }
    }
    verifyCode();
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
    if (!oobCode) {
      setError('Invalid reset code');
      return;
    }

    setLoading(true);
    try {
      await firebaseConfirmPasswordReset(oobCode, password);
      setSuccess(true);
      setTimeout(() => router.push('/sign-in'), 2500);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to reset password';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  if (validCode === null) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Verifying reset link…</p>
      </div>
    );
  }

  if (validCode === false) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-700 font-medium">This reset link is invalid or has expired.</p>
          <a href="/forgot-password" className="mt-3 inline-block text-blue-600 text-sm hover:underline">
            Request a new link →
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Continuum</h1>
          <p className="text-gray-500 mt-2">Set a new password</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {success ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">✅</div>
                <h2 className="text-lg font-semibold text-gray-900">Password updated!</h2>
                <p className="text-sm text-gray-500 mt-2">Redirecting you to sign in…</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                      New Password
                    </label>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="••••••••"
                      required
                      minLength={8}
                    />
                    <p className="text-xs text-gray-400 mt-1">At least 8 characters</p>
                  </div>

                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm Password
                    </label>
                    <input
                      id="confirm"
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      placeholder="••••••••"
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Updating…' : 'Update Password'}
                  </Button>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Loading...</p>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
