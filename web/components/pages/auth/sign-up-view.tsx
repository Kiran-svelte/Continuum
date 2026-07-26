'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Check,
  Loader2,
  Lock,
  Mail,
  Shield,
  UserPlus,
} from 'lucide-react';
import { AuthShell } from '@/components/design-system';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { isPublicSignupEnabled } from '@/lib/public-signup';
import { validatePassword } from '@/lib/password-validation';

const CREATION_MESSAGES = [
  'Creating your workspace...',
  'Setting up your company profile...',
  'Configuring leave policies...',
  'Initializing payroll defaults...',
  'Almost ready - one moment...',
];

const MESSAGE_ROTATION_INTERVAL_MS = 5_500;

const ACCESS_STEPS = [
  {
    title: 'Request an invitation',
    body: 'Contact your organization administrator or HR department to request access.',
  },
  {
    title: 'Check your email',
    body: 'You will receive an invitation email with a secure link to create your account.',
  },
  {
    title: 'Set up your account',
    body: 'Follow the link to set your password and complete your profile.',
  },
] as const;

const INVITER_ROLES = [
  'Super Administrators',
  'Company Administrators',
  'Authorized Managers',
] as const;

function InvitationRequiredView() {
  return (
    <AuthShell
      eyebrow="Sign up"
      title="Invitation Required"
      subtitle="Continuum is invitation-only. Ask your organization admin for access, then use the link in your email to join."
      aside={
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Enterprise access control</h2>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            Every workspace member is invited by an authorized administrator. No public self-signup in production.
          </p>
        </div>
      }
      footer={
        <p className="text-center text-xs text-[var(--text-secondary)]">
          For technical issues, contact your IT administrator or{' '}
          <Link href="/support" className="text-[var(--primary)] no-underline hover:underline">
            reach out to support
          </Link>
          .
        </p>
      }
    >
      <div className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--card))] text-[var(--primary)] shadow-[var(--shadow-sm)]">
          <Mail className="h-7 w-7" aria-hidden />
        </div>
      </div>

      <div className="space-y-4">
        <section className="auth-panel">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">How to get access</h2>
          <ol className="auth-step-list mt-4">
            {ACCESS_STEPS.map((step, index) => (
              <li key={step.title}>
                <span className="step-index" aria-hidden>
                  {index + 1}
                </span>
                <div>
                  <p className="step-title">{step.title}</p>
                  <p className="text-caption mt-1">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="auth-panel">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">Who can send invitations</h2>
          <ul className="auth-checklist mt-4">
            {INVITER_ROLES.map((role) => (
              <li key={role}>
                <Check className="h-4 w-4" aria-hidden />
                <span>{role}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="auth-panel-emphasis">
          <div className="flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
            <div className="text-left">
              <h2 className="text-sm font-semibold text-[var(--foreground)]">Secure by design</h2>
              <p className="text-caption mt-1">
                Invitation-only access protects your organization data and ensures only authorized personnel join your workspace.
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 pt-2">
          <Link
            href="/sign-in"
            className="btn btn-primary inline-flex h-11 w-full items-center justify-center gap-2 text-base no-underline"
          >
            Already have an account?
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/support"
            className="btn btn-outline inline-flex h-11 w-full items-center justify-center text-base no-underline"
          >
            Contact support
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}

function CredentialSignUpView() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressMessage, setProgressMessage] = useState(CREATION_MESSAGES[0]);
  const [infoMessage, setInfoMessage] = useState('');
  const [submittedEmail, setSubmittedEmail] = useState('');
  const [emailDelivered, setEmailDelivered] = useState(true);
  const messageIndexRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function startProgressMessages() {
    messageIndexRef.current = 0;
    setProgressMessage(CREATION_MESSAGES[0]);
    timerRef.current = setInterval(() => {
      messageIndexRef.current = (messageIndexRef.current + 1) % CREATION_MESSAGES.length;
      setProgressMessage(CREATION_MESSAGES[messageIndexRef.current]);
    }, MESSAGE_ROTATION_INTERVAL_MS);
  }

  function stopProgressMessages() {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }

  useEffect(() => () => stopProgressMessages(), []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyToken = params.get('verify_token');
    if (!verifyToken) return;
    void fetch('/api/auth/email-verification/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: verifyToken }),
    })
      .then(async (res) => {
        if (res.ok) {
          setInfoMessage('Email verified. You can sign in now.');
        } else {
          const payload = await res.json().catch(() => ({}));
          setInfoMessage(payload.error || 'Verification link invalid or expired.');
        }
      })
      .finally(() => {
        const cleanUrl = new URL(window.location.href);
        cleanUrl.searchParams.delete('verify_token');
        window.history.replaceState({}, '', cleanUrl.toString());
      });
  }, []);

  const handleSignUp = async (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;

    const normalizedEmail = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setError('Enter a valid work email address.');
      return;
    }

    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      setError(pwResult.errors[0]);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    const nameParts = fullName.trim().split(/\s+/).filter(Boolean);
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ');

    setLoading(true);
    setError('');
    startProgressMessages();

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          companyName: companyName.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => ({} as { error?: string; emailDelivered?: boolean }));
      if (!response.ok) {
        setError(payload.error || 'Unable to create account. Please try again.');
        return;
      }

      // Account created — email must be verified before first sign-in, so we
      // land on a "check your inbox" state instead of auto-signing in (the
      // middleware verification gate would bounce an unverified session).
      setEmailDelivered(payload.emailDelivered !== false);
      setSubmittedEmail(normalizedEmail);
    } catch {
      setError('Sign up failed. Please check your network and try again.');
    } finally {
      stopProgressMessages();
      setLoading(false);
    }
  };

  if (submittedEmail) {
    return (
      <AuthShell
        eyebrow="Sign up"
        title="Verify your email"
        subtitle="Your workspace account is created. One step left before you can sign in."
        footer={
          <p className="text-xs text-[var(--text-secondary)]">
            Wrong email?{' '}
            <button
              type="button"
              onClick={() => setSubmittedEmail('')}
              className="text-[var(--primary)] hover:underline"
            >
              Start over
            </button>
          </p>
        }
      >
        <div className="space-y-4">
          <section className="auth-panel">
            <div className="flex items-start gap-3">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-[var(--primary)]" aria-hidden />
              <div>
                <h2 className="text-sm font-semibold text-[var(--foreground)]">
                  {emailDelivered ? 'Check your inbox' : 'Verification email delayed'}
                </h2>
                <p className="text-caption mt-1">
                  {emailDelivered
                    ? `We sent a verification link to ${submittedEmail}. Click it to activate your account, then sign in to start guided company setup.`
                    : `Your account for ${submittedEmail} was created, but the verification email could not be sent right now. Sign in with your new credentials and a fresh verification link will be emailed to you automatically.`}
                </p>
              </div>
            </div>
          </section>

          <Link
            href="/sign-in"
            className="btn btn-primary inline-flex h-11 w-full items-center justify-center gap-2 text-base no-underline"
          >
            Go to sign in
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      eyebrow="Sign up"
      title="Create your workspace account"
      subtitle="Start with your work email and a password. Verify your email, then guided onboarding sets up your company."
      aside={
        <div className="space-y-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)]">
            <UserPlus className="h-6 w-6" aria-hidden />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Credential-first onboarding</h2>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            Dev and demo environments can enable public signup. Production uses invitation-only access.
          </p>
        </div>
      }
      footer={
        <p className="text-xs text-[var(--text-secondary)]">
          Already have credentials?{' '}
          <Link href="/sign-in" className="text-[var(--primary)] no-underline hover:underline">
            Sign in
          </Link>
        </p>
      }
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="rounded-lg bg-[var(--muted)] p-2">
          <Shield className="h-5 w-5 text-[var(--foreground)]" aria-hidden />
        </div>
        <div>
          <p className="text-kicker">Secure account setup</p>
          <h2 className="text-h3">Credential-first onboarding</h2>
        </div>
      </div>

      <form onSubmit={handleSignUp} className="space-y-4">
        <Input
          label="Work email"
          type="email"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (error) setError('');
          }}
          required
          autoComplete="email"
        />
        <Input
          label="Your name (optional)"
          placeholder="Aarav Sharma"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            if (error) setError('');
          }}
          autoComplete="name"
        />
        <Input
          label="Company name (optional now)"
          placeholder="Acme Labs"
          value={companyName}
          onChange={(e) => {
            setCompanyName(e.target.value);
            if (error) setError('');
          }}
        />
        <Input
          label="Password"
          type="password"
          placeholder="8+ chars with upper, lower, number, symbol"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (error) setError('');
          }}
          required
          autoComplete="new-password"
        />
        <Input
          label="Confirm password"
          type="password"
          value={confirmPassword}
          onChange={(e) => {
            setConfirmPassword(e.target.value);
            if (error) setError('');
          }}
          required
          autoComplete="new-password"
        />

        {error && (
          <div className="rounded-xl border border-[var(--destructive)]/35 bg-[var(--destructive)]/10 px-3 py-2 text-sm text-[var(--destructive)]">
            {error}
          </div>
        )}
        {infoMessage && (
          <div className="rounded-xl border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-3 py-2 text-sm text-[var(--foreground)]">
            {infoMessage}
          </div>
        )}

        <Button type="submit" disabled={loading} className="h-11 w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {progressMessage}
            </>
          ) : (
            <>
              Create account
              <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>
    </AuthShell>
  );
}

/**
 * Public sign-up route: invitation gate by default; credential form when explicitly enabled.
 */
export default function SignUpView() {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteToken = params.get('invite') || params.get('token');
    if (inviteToken) {
      router.replace(`/invite/accept?token=${encodeURIComponent(inviteToken)}`);
      return;
    }
    setShowCredentialForm(isPublicSignupEnabled());
    setReady(true);
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" aria-label="Loading" />
      </div>
    );
  }

  if (showCredentialForm) {
    return <CredentialSignUpView />;
  }

  return <InvitationRequiredView />;
}
