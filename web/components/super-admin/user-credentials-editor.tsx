'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound, Loader2, Mail } from 'lucide-react';

type Props = {
  userId: string;
  initialEmail: string;
};

export default function UserCredentialsEditor({ userId, initialEmail }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const trimmedEmail = email.trim().toLowerCase();
    const hasEmailChange = trimmedEmail !== initialEmail.toLowerCase();
    const hasPasswordChange = password.length > 0;

    if (!hasEmailChange && !hasPasswordChange) {
      setError('No credential changes to save.');
      return;
    }

    if (hasPasswordChange && password !== confirmPassword) {
      setError('Password confirmation does not match.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/super-admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(hasEmailChange ? { email: trimmedEmail } : {}),
          ...(hasPasswordChange ? { password } : {}),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        setError(data.error || 'Failed to update credentials');
        return;
      }

      setSuccess(
        hasPasswordChange
          ? 'Credentials updated. User will be asked to change password at next sign-in.'
          : 'Email updated successfully.'
      );
      setPassword('');
      setConfirmPassword('');
    } catch {
      setError('Failed to update credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="card p-6 space-y-4">
      <h2 className="text-lg font-semibold text-foreground">Edit Credentials</h2>
      <p className="text-sm text-muted">
        Update user sign-in email and reset password from one place.
      </p>

      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label className="input-label flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Login Email
          </label>
          <input
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="user@company.com"
          />
        </div>

        <div>
          <label className="input-label flex items-center gap-2">
            <KeyRound className="w-4 h-4" />
            New Password
          </label>
          <input
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Leave blank to keep existing password"
          />
        </div>

        <div>
          <label className="input-label">Confirm New Password</label>
          <input
            type="password"
            className="input"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat new password"
            disabled={password.length === 0}
          />
        </div>

        {error && (
          <div className="rounded-md border border-error/30 bg-error/5 p-3 text-sm text-error flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-md border border-success/30 bg-success/5 p-3 text-sm text-success flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            {success}
          </div>
        )}

        <button type="submit" disabled={loading} className="btn-primary w-full sm:w-auto inline-flex items-center gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Credentials
        </button>
      </form>
    </section>
  );
}
