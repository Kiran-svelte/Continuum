'use client';

import { useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

type Props = {
  inviteId: string;
  initialEmail: string;
  initialFirstName: string;
  initialLastName: string;
  initialRole: 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee';
  initialDepartment: string;
};

export default function HrInviteCredentialsEditor({
  inviteId,
  initialEmail,
  initialFirstName,
  initialLastName,
  initialRole,
  initialDepartment,
}: Props) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail);
  const [firstName, setFirstName] = useState(initialFirstName);
  const [lastName, setLastName] = useState(initialLastName);
  const [role, setRole] = useState<Props['initialRole']>(initialRole);
  const [department, setDepartment] = useState(initialDepartment);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      const response = await fetch(`/api/company/invite-user/${inviteId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim().toLowerCase(),
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          role,
          department: department.trim() || null,
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
      <h2 className="text-lg font-semibold text-foreground">Edit Invite</h2>
      <p className="text-sm text-muted">Update pending invite credentials before acceptance.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="input-label">First Name</label>
          <input title="First Name" placeholder="First name" className="input" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
        </div>
        <div>
          <label className="input-label">Last Name</label>
          <input title="Last Name" placeholder="Last name" className="input" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
        </div>
      </div>

      <div>
        <label className="input-label">Email</label>
        <input title="Email" placeholder="user@company.com" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="input-label">Role</label>
          <select title="Role" className="input" value={role} onChange={(e) => setRole(e.target.value as Props['initialRole'])}>
            <option value="employee">Employee</option>
            <option value="team_lead">Team Lead</option>
            <option value="manager">Manager</option>
            <option value="director">Director</option>
            <option value="hr">HR</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <div>
          <label className="input-label">Department</label>
          <input title="Department" placeholder="Department" className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
        </div>
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
    </form>
  );
}
