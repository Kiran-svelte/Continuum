'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { firebaseSignIn, getIdToken } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      // Sign in with Firebase
      await firebaseSignIn(email, password);
      
      // Get the ID token
      const idToken = await getIdToken();
      if (!idToken) {
        setError('Failed to get authentication token');
        return;
      }

      // Set the session cookie via API
      const sessionController = new AbortController();
      const sessionTimeoutId = setTimeout(() => sessionController.abort(), 30000); // 30 second timeout
      const sessionRes = await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
        signal: sessionController.signal,
      });
      clearTimeout(sessionTimeoutId);
      
      if (!sessionRes.ok) {
        const sessionData = await sessionRes.json().catch(() => ({}));
        setError(sessionData.details || sessionData.error || 'Failed to create session');
        return;
      }

      // Fetch the user's role and redirect to the appropriate portal
      const meController = new AbortController();
      const meTimeoutId = setTimeout(() => meController.abort(), 15000); // 15 second timeout
      const meRes = await fetch('/api/auth/me', {
        signal: meController.signal,
      });
      clearTimeout(meTimeoutId);

      if (meRes.ok) {
        const me = await meRes.json();
        const role: string = me.primary_role ?? 'employee';
        if (role === 'admin' || role === 'hr') {
          router.push('/hr/dashboard');
        } else if (role === 'manager' || role === 'team_lead' || role === 'director') {
          router.push('/manager/dashboard');
        } else {
          router.push('/employee/dashboard');
        }
      } else {
        // Fallback: redirect to employee dashboard
        router.push('/employee/dashboard');
      }
    } catch (err) {
      const firebaseErr = err as { code?: string; message?: string; name?: string };
      let message = firebaseErr.message || 'Sign in failed';
      if (firebaseErr.name === 'AbortError') {
        message = 'Request timed out. Please check your connection and try again.';
      } else if (firebaseErr.code === 'auth/wrong-password' || firebaseErr.code === 'auth/invalid-credential') {
        message = 'Invalid email or password.';
      } else if (firebaseErr.code === 'auth/user-not-found') {
        message = 'No account found with this email. Please sign up first.';
      } else if (firebaseErr.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please try again later.';
      } else if (firebaseErr.code === 'auth/invalid-email') {
        message = 'Invalid email address.';
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-blue-600">Continuum</h1>
          <p className="text-gray-500 mt-2">Sign in to your account</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}

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

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  placeholder="••••••••"
                  required
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                  Remember me
                </label>
                <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
                  Forgot password?
                </a>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign In'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-gray-500">
              Don&apos;t have an account?{' '}
              <Link href="/sign-up" className="text-blue-600 hover:text-blue-700 font-medium">
                Sign up
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
