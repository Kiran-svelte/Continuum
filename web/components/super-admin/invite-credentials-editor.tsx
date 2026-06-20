'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PendingInviteActions } from '@/components/invite/pending-invite-actions';

type Props = {
  inviteId: string;
  initialEmail: string;
  initialFirstName: string;
  initialLastName: string;
  initialRole: 'admin' | 'hr' | 'director' | 'manager';
};

export default function InviteCredentialsEditor({
  inviteId,
  initialEmail,
  initialFirstName,
  initialLastName,
  initialRole,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [role, setRole] = useState<Props['initialRole']>(initialRole);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/super-admin/user-invites/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || 'Failed to update invite');
        return;
      }

      setSuccess('Invite details updated successfully.');
      router.refresh();
    } catch {
      setError('Failed to update invite. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="card p-6 space-y-4" onSubmit={onSubmit}>
      <h2 className="text-lg font-semibold text-foreground">Edit Invite Credentials</h2>
      <p className="text-sm text-muted">
        Update pending invite details before the user accepts the invitation.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="input-label">First Name</label>
          <input className="input" title="First Name" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label className="input-label">Last Name</label>
          <input className="input" title="Last Name" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="input-label">Email</label>
        <input type="email" className="input" title="Email" placeholder="user@company.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div>
        <label className="input-label">Role</label>
        <select className="input" title="Role" value={role} onChange={(e) => setRole(e.target.value as Props['initialRole'])}>
          <option value="admin">Company Admin</option>
          <option value="hr">HR Manager</option>
          <option value="director">Director</option>
          <option value="manager">Manager</option>
        </select>
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

      <button className="btn-primary inline-flex items-center gap-2" disabled={loading} type="submit">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save Invite
      </button>

      <div className="pt-4 border-t border-border">
        <h3 className="text-sm font-semibold text-foreground mb-2">Invite Management</h3>
        <PendingInviteActions
          inviteId={inviteId}
          apiBase="/api/super-admin/user-invites"
          onComplete={() => router.push('/super-admin/users')}
        />
      </div>
    </form>
  );
}
