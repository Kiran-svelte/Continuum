'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Mail, User, AlertCircle, Loader2, CheckCircle } from 'lucide-react';

interface InviteData {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  expiresAt: string;
}

/**
 * Invitation Acceptance Page
 * 
 * Users click the invite link to set their password and activate their account.
 */
export default function AcceptInvitePage() {
  const router = useRouter();
  const params = useParams();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [success, setSuccess] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validate token on load
  useEffect(() => {
    async function validateToken() {
      try {
        const response = await fetch(`/api/invite/accept?token=${token}`);
        const data = await response.json();

        if (!response.ok || !data.valid) {
          setError(data.error || 'Invalid invitation');
          setLoading(false);
          return;
        }

        setInviteData(data.invite);
      } catch (err) {
        setError('Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      validateToken();
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/invite/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          password,
          confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation');
        setSubmitting(false);
        return;
      }

      setSuccess(true);

      // Redirect based on whether company setup is needed
      setTimeout(() => {
        if (data.needsCompanySetup) {
          router.push('/onboarding/company');
        } else {
          router.push('/employee/dashboard');
        }
      }, 2000);
    } catch (err) {
      setError('An unexpected error occurred');
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
          <p className="text-slate-400 mt-4">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid or expired invite)
  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-red-900/20 to-slate-900">
        <div className="max-w-md w-full mx-4 p-8 bg-slate-800 rounded-xl border border-red-500/30">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Invalid Invitation</h1>
            <p className="text-slate-400 mb-6">{error}</p>
            <a
              href="/sign-in"
              className="inline-block px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
            >
              Go to Sign In
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-green-900/20 to-slate-900">
        <div className="max-w-md w-full mx-4 p-8 bg-slate-800 rounded-xl border border-green-500/30">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Welcome to Continuum!</h1>
            <p className="text-slate-400 mb-6">
              Your account has been set up successfully. Redirecting you now...
            </p>
            <Loader2 className="w-6 h-6 text-green-400 animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Welcome to Continuum</h1>
          <p className="text-slate-400 mt-2">Complete your account setup</p>
        </div>

        {/* Invite Info Card */}
        <div className="bg-slate-800/50 rounded-xl p-6 mb-6 border border-slate-700">
          <h2 className="text-sm font-medium text-slate-400 mb-3">You've been invited as:</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <span className="text-white">{inviteData?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-purple-400" />
              <span className="text-white capitalize">{inviteData?.role.replace('_', ' ')}</span>
            </div>
            {inviteData?.companyName && (
              <div className="flex items-center gap-3">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <span className="text-white">{inviteData.companyName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="bg-slate-800 rounded-xl p-6 border border-slate-700 space-y-6">
          <h3 className="text-lg font-semibold text-white">Set Your Password</h3>

          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter password"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <div className="bg-slate-700/50 rounded-lg p-3 text-sm text-slate-400">
            <p className="font-medium mb-1">Password requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up account...
              </>
            ) : (
              'Complete Setup'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <a href="/sign-in" className="text-blue-400 hover:text-blue-300">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
