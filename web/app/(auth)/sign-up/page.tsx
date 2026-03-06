'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase';

type Mode = 'select' | 'admin' | 'employee';

export default function SignUpPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('select');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    // Validate password strength
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const intent = mode === 'admin' ? 'hr' : 'employee';
      const redirectUrl = `${baseUrl}/auth/callback?next=${encodeURIComponent(`/onboarding?intent=${intent}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}${mode === 'employee' ? `&companyCode=${encodeURIComponent(companyCode)}` : ''}`)}`;

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
        
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      // Show success message - user needs to verify email
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500" />
      </div>
    );
  }

  // Success state - email verification required
  if (success) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
            <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check your email!</h1>
          <p className="text-slate-400 mb-6">
            We&apos;ve sent a confirmation link to <span className="text-white font-medium">{email}</span>.
            Click the link to verify your account.
          </p>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-2 text-blue-400 hover:text-blue-300 font-medium"
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl">
          <div className="text-center mb-8">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create your account</h1>
            <p className="text-slate-400">Get started with Continuum today</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <button
              onClick={() => setMode('admin')}
              className="group bg-slate-900/50 hover:bg-slate-800/50 border border-slate-700 hover:border-blue-500/50 rounded-2xl p-6 transition-all text-left"
            >
              <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Start a Company</h3>
              <p className="text-slate-400 text-sm mb-3">
                For HR/Admin. Create your company workspace and invite employees.
              </p>
              <span className="text-blue-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Get started →
              </span>
            </button>

            <button
              onClick={() => setMode('employee')}
              className="group bg-slate-900/50 hover:bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 rounded-2xl p-6 transition-all text-left"
            >
              <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Join a Company</h3>
              <p className="text-slate-400 text-sm mb-3">
                For Employees. Join your company using the code from HR.
              </p>
              <span className="text-cyan-400 text-sm font-medium group-hover:translate-x-1 transition-transform inline-flex items-center gap-1">
                Join team →
              </span>
            </button>
          </div>

          <p className="text-center mt-8 text-slate-400 text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    );
  }

  // Sign-up form
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-slate-400 text-sm">
            {mode === 'admin' ? 'Register your company' : 'Join your team'}
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="flex mb-6 bg-slate-900 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setMode('admin')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'admin'
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Start a Company
          </button>
          <button
            type="button"
            onClick={() => setMode('employee')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              mode === 'employee'
                ? 'bg-cyan-600 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Join a Company
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="John"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Doe"
                required
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="you@company.com"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {/* Company Code (for employee mode) */}
          {mode === 'employee' && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Company Code</label>
              <input
                type="text"
                value={companyCode}
                onChange={(e) => setCompanyCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent uppercase"
                placeholder="ABCD1234"
                required
                maxLength={8}
              />
              <p className="mt-1 text-xs text-slate-500">Enter the 8-character code from your HR</p>
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
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-500 text-white'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-slate-400 text-sm">
            Already have an account?{' '}
            <Link href="/sign-in" className="text-blue-400 hover:text-blue-300 font-medium">
              Sign in
            </Link>
          </p>
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-slate-400 hover:text-white">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-slate-400 hover:text-white">Privacy Policy</Link>
        </p>
      </div>
    </div>
  );
}
