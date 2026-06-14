'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Lock, Mail, User, AlertCircle, Loader2, CheckCircle, Building2, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InviteData {
  email: string;
  role: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  expiresAt: string;
}

type TokenState = 'valid' | 'expiring' | 'expired';

const tokens = {
  border: 'var(--border)',
  text: 'var(--foreground)',
  muted: 'var(--muted-foreground)',
  radius: '16px',
  space: {
    md: 16,
  },
};

/**
 * Invitation Acceptance Page
 * 
 * Users click the invite link to set their password and activate their account.
 * Updated with clean, professional design system.
 */
export default function InviteAcceptTokenView() {
  const router = useRouter();
  const params = useParams();
  const token = typeof params?.token === 'string'
    ? params.token
    : Array.isArray(params?.token)
      ? (params.token[0] ?? '')
      : '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteData, setInviteData] = useState<InviteData | null>(null);
  const [success, setSuccess] = useState(false);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Compute invite token health so we can set user expectations and reduce confusion/support tickets.
  const tokenState: TokenState = useMemo(() => {
    if (!inviteData?.expiresAt) return 'valid';
    const expires = new Date(inviteData.expiresAt).getTime();
    const now = Date.now();
    const diffHours = (expires - now) / (1000 * 60 * 60);
    if (diffHours <= 0) return 'expired';
    if (diffHours <= 24) return 'expiring';
    return 'valid';
  }, [inviteData?.expiresAt]);

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
      } catch {
        setError('Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    }

    if (token) {
      validateToken();
      return;
    }

    setError('Invalid invitation link.');
    setLoading(false);
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
          router.push('/onboarding');
        } else if (data.needsEmployeeOnboarding) {
          router.push('/employee/onboarding');
        } else {
          router.push('/employee/dashboard');
        }
      }, 2000);
    } catch {
      setError('An unexpected error occurred');
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-6">
        <div className="text-center card p-8">
          <Loader2 className="w-10 h-10 text-primary animate-spin mx-auto" />
          <p className="text-muted-foreground mt-4">Validating invitation...</p>
        </div>
      </div>
    );
  }

  // Error state (invalid or expired invite)
  if (error && !inviteData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-destructive/20">
              <AlertCircle className="w-8 h-8 text-destructive" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Invalid Invitation</h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <a href="/sign-in" className="btn btn-secondary inline-flex items-center justify-center">
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
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] p-4">
        <div className="max-w-md w-full">
          <div className="card p-8 text-center">
            <div className="w-16 h-16 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-success/20">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
            <h1 className="text-2xl font-semibold text-foreground mb-2">Welcome to Continuum!</h1>
            <p className="text-muted-foreground mb-6">Your account has been set up successfully. Redirecting you now...</p>
            <Loader2 className="w-6 h-6 text-success animate-spin mx-auto" />
          </div>
        </div>
      </div>
    );
  }

  // Main form
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--background)]">
      <div className="max-w-xl w-full space-y-10">
        {/* Header: sets context and reduces uncertainty */}
        <div className="text-left space-y-3">
          <div className="w-14 h-14 flex items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
            <User className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-2xl font-semibold text-foreground">
            Accept your invitation
          </h1>
          <p className="text-sm leading-relaxed text-muted-foreground">
            Join your workspace with the right role and finish in under a minute.
          </p>
        </div>

        {/* Invite Context Card: builds trust without visual noise */}
        {/* Invite Context Card: builds trust without visual noise; border-only keeps it calm. */}
        <section className="card space-y-4 p-7">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">
                Invitation details
              </p>
              <p className="text-base font-semibold text-foreground">
                {inviteData?.companyName ?? 'Your organization'}
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock3 className="w-4 h-4" />
              <TokenBadge state={tokenState} expiresAt={inviteData?.expiresAt} />
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <FieldRow icon={<Mail className="w-4 h-4 text-primary" />} label="Email" value={inviteData?.email} />
            <FieldRow
              icon={<User className="w-4 h-4 text-accent" />}
              label="Role"
              value={inviteData?.role.replace('_', ' ')}
            />
            {inviteData?.companyName && (
              <FieldRow
                icon={<Building2 className="w-4 h-4 text-success" />}
                label="Company"
                value={inviteData.companyName}
              />
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Invited by your administrator</span>
            <a href="/support" className="hover:underline text-primary">
              Need help?
            </a>
          </div>
        </section>

        {/* Action block: minimalist, border-only card */}
        {/* Action block: minimalist, border-only card with generous spacing to lower cognitive load. */}
        <form
          onSubmit={handleSubmit}
          className="card space-y-6 p-7"
          aria-live="polite"
        >
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              Set your password
            </h3>
            <p className="text-sm text-muted-foreground">
              Keep it secure; you can enable SSO later in settings.
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl border border-destructive/20 bg-destructive/5">
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-destructive" />
              <span className="text-sm text-destructive">{error}</span>
            </div>
          )}

          <LabeledInput
            label="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password"
          />

          <LabeledInput
            label="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm password"
          />

          <div className="text-sm rounded-xl border border-[var(--border)] bg-[var(--muted)] p-4">
            <p className="font-medium text-foreground">
              Password requirements
            </p>
            <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground">
              <li>At least 8 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={submitting || tokenState === 'expired'}
            className="btn-primary w-full flex items-center justify-center gap-2"
            style={{ boxShadow: 'none' }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Setting up account...
              </>
            ) : tokenState === 'expired' ? (
              'Request a new invite'
            ) : (
              'Complete setup'
            )}
          </Button>

          <div className="flex items-center justify-between text-sm" style={{ color: tokens.muted }}>
            <a href="/sign-in" className="hover:underline text-primary">
              Use a different account
            </a>
            <a href="/support" className="hover:underline text-primary">
              Contact support
            </a>
          </div>
        </form>

        {/* Footer with calm spacing */}
        <p className="text-center text-sm" style={{ color: tokens.muted }}>
          Already have an account?{' '}
          <a href="/sign-in" className="text-primary hover:underline">
            Sign in
          </a>
        </p>
      </div>
    </div>
  );
}

// Small, memoized row for invite context to keep layout tidy and readable.
function FieldRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'rgba(37,99,235,0.06)' }}>
        {icon}
      </div>
      <div className="space-y-0.5">
        <p className="text-xs font-medium text-muted-foreground">
          {label}
        </p>
        <p className="text-sm font-semibold text-foreground">
          {value ?? '—'}
        </p>
      </div>
    </div>
  );
}

// Token badge shows validity/expiry to reduce confusion and unnecessary support tickets.
function TokenBadge({ state, expiresAt }: { state: TokenState; expiresAt?: string }) {
  if (state === 'expired') {
    return <span className="text-error font-semibold">Expired</span>;
  }
  if (state === 'expiring') {
    return (
      <span className="text-amber-600 font-semibold">
        Expires soon{expiresAt ? ` · ${new Date(expiresAt).toLocaleDateString()}` : ''}
      </span>
    );
  }
  return (
    <span className="text-success font-semibold">
      Valid{expiresAt ? ` · ${new Date(expiresAt).toLocaleDateString()}` : ''}
    </span>
  );
}

// Labeled input with icon space reserved to keep alignment consistent; improves readability and reduces cognitive load.
function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-foreground">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
        <input
          type="password"
          required
          value={value}
          onChange={onChange}
          className="input pl-10"
          placeholder={placeholder}
          style={{ boxShadow: 'none', borderRadius: tokens.radius }}
        />
      </div>
    </div>
  );
}
