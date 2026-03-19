'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Mail, User, AlertCircle, Loader2, CheckCircle, Building2 } from 'lucide-react';

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
 * Updated with clean, professional design system.
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
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-center">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted mt-4">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid or expired invite)
  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Invalid Invitation</h1>
            <p className="text-muted mb-6">{error}</p>
            <a
              href="/sign-in"
              className="btn-secondary inline-flex items-center justify-center"
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
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Continuum!</h1>
            <p className="text-muted mb-6">
              Your account has been set up successfully. Redirecting you now...
            </p>
            <Loader2 className="w-6 h-6 text-success animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-4">
            <User className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">Welcome to Continuum</h1>
          <p className="text-muted mt-1">Complete your account setup</p>
        </div>

        {/* Invite Info Card */}
        <div className="card p-5 mb-6">
          <h2 className="text-sm font-medium text-muted mb-3">You've been invited as:</h2>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Mail className="w-4 h-4 text-primary" />
              </div>
              <span className="text-foreground">{inviteData?.email}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-accent/10 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-accent" />
              </div>
              <span className="text-foreground capitalize">{inviteData?.role.replace('_', ' ')}</span>
            </div>
            {inviteData?.companyName && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-success/10 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-success" />
                </div>
                <span className="text-foreground">{inviteData.companyName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <h3 className="text-lg font-semibold text-foreground">Set Your Password</h3>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-error/5 border border-error/20 text-error">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label className="input-label">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input pl-10"
                placeholder="Enter password"
              />
            </div>
          </div>

          <div>
            <label className="input-label">Confirm Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input pl-10"
                placeholder="Confirm password"
              />
            </div>
          </div>

          <div className="bg-surface-alt rounded-lg p-4 text-sm">
            <p className="font-medium text-foreground mb-2">Password requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-muted text-xs">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn-primary w-full flex items-center justify-center gap-2"
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
        <p className="text-center text-sm text-muted mt-6">
          Already have an account?{' '}
          <a href="/sign-in" className="text-primary hover:underline">
            Sign In
          </a>
        </p>
      </div>
    </div>
  );
}
