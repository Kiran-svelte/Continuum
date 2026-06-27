'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Send, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { fetchWithTimeout, mapFetchErrorMessage } from '@/lib/fetch-with-timeout';
import { Input, Select } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PendingInviteActions } from '@/components/invite/pending-invite-actions';

interface ManagerOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

const REQUEST_TIMEOUT_MS = 15_000;

interface PendingInvite {
  id: string;
  email: string;
  role: string;
  department: string | null;
  expires_at: string;
  used_at: string | null;
}

interface CompanyRolesResponse {
  invitePolicy?: {
    allowedRoles: string[];
    defaultRole: string;
    note?: string;
  };
}

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Admin' },
] as const;

export default function PeopleInviteView() {
  const [authMode, setAuthMode] = useState<'invite' | 'direct'>('invite');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('employee');
  const [department, setDepartment] = useState('');
  const [managerId, setManagerId] = useState('');
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [availableRoles, setAvailableRoles] = useState(ROLE_OPTIONS.map((option) => option.value));
  const [policyNote, setPolicyNote] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function loadPendingInvites() {
    try {
      const policyResponse = await fetchWithTimeout('/api/company/roles', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
      if (policyResponse.ok) {
        const policyData = await policyResponse.json().catch(() => ({} as CompanyRolesResponse));
        const allowedRoles = policyData.invitePolicy?.allowedRoles ?? [];
        if (allowedRoles.length > 0) {
          setAvailableRoles(allowedRoles);
          if (!allowedRoles.includes(role)) {
            setRole(policyData.invitePolicy?.defaultRole || allowedRoles[0]);
          }
        }
        setPolicyNote(policyData.invitePolicy?.note || null);
      }

      const response = await fetchWithTimeout('/api/hr/invites', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
      if (!response.ok) {
        return;
      }
      const payload = await response.json().catch(() => ({}));
      setPendingInvites(payload.invites ?? []);
    } catch {
      // Keep page usable if pending list fails.
    }
  }

  useEffect(() => {
    void loadPendingInvites();
    void loadManagers();
  }, []);

  async function loadManagers() {
    try {
      const res = await fetchWithTimeout(
        '/api/employees?limit=500&roles=admin,hr,manager,director,team_lead',
        { credentials: 'include' },
        REQUEST_TIMEOUT_MS
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const list = data.employees || data.data || [];
        setManagers(
          list.map((employee: Record<string, unknown>) => ({
            id: employee.id as string,
            first_name: employee.first_name as string,
            last_name: employee.last_name as string,
            email: employee.email as string,
          }))
        );
      }
    } catch {
      // Keep form usable if manager list fails.
    }
  }

  const activePending = useMemo(
    () => pendingInvites.filter((invite) => !invite.used_at && new Date(invite.expires_at).getTime() > Date.now()),
    [pendingInvites]
  );

  const roleOptions = useMemo(
    () => ROLE_OPTIONS.filter((option) => availableRoles.includes(option.value)),
    [availableRoles]
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetchWithTimeout('/api/hr/invites', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authMode,
          email,
          username: username.trim() || undefined,
          password: authMode === 'direct' ? password : undefined,
          firstName: authMode === 'direct' ? firstName.trim() : undefined,
          lastName: authMode === 'direct' ? lastName.trim() : undefined,
          phone: phone.trim() || undefined,
          role,
          department: department.trim() || undefined,
          managerId: managerId || undefined,
        }),
      }, REQUEST_TIMEOUT_MS);

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const errorMessage = payload.error || 'Failed to create invite.';
        setError(errorMessage);
        toast.error(errorMessage);
        return;
      }

      const successMessage =
        authMode === 'direct'
          ? 'User created. They can sign in immediately with the provided credentials.'
          : 'Invitation created and queued for delivery.';
      setSuccess(successMessage);
      toast.success(successMessage, {
        description: authMode === 'direct'
          ? `${firstName} ${lastName} (${email || username}) has been provisioned as ${role}.`
          : `Invitation sent to ${email}.`,
        duration: 6000,
      });
      setEmail('');
      setUsername('');
      setPassword('');
      setFirstName('');
      setLastName('');
      setPhone('');
      setRole('employee');
      setDepartment('');
      setManagerId('');
      await loadPendingInvites();
    } catch (submitError) {
      const errorMessage = mapFetchErrorMessage(submitError, 'Unable to reach invite service.');
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-[980px] flex-col gap-6 p-4 md:p-8">
      <Link href="/admin/people" className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
        <ArrowLeft className="h-4 w-4" />
        Back To People Operations
      </Link>

      <header className="flex items-center gap-3">
        <div className="rounded-xl bg-[var(--primary)]/15 p-3 text-[var(--primary)]">
          <UserPlus className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-h2">Provision User</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Capability-owner provisioning surface for People Operations.
          </p>
        </div>
      </header>

      <section className="card p-6">
        <form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
          <div className="md:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 px-3 py-3 text-sm text-[var(--muted-foreground)]">
            Choose Invite Link to email a secure onboarding link, or Direct Credentials to create a login immediately.
          </div>

          {policyNote && (
            <div className="md:col-span-2 rounded-lg border border-[var(--border)] bg-[var(--accent)]/40 px-3 py-3 text-sm text-[var(--foreground)]">
              {policyNote}
            </div>
          )}

          <div className="md:col-span-2 flex flex-wrap gap-2">
            <Button
              type="button"
              variant={authMode === 'invite' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setAuthMode('invite')}
            >
              Invite Link (Recommended)
            </Button>
            <Button
              type="button"
              variant={authMode === 'direct' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setAuthMode('direct')}
            >
              Direct Credentials
            </Button>
          </div>

          <div className="md:col-span-2 text-xs text-[var(--muted-foreground)]">
            {authMode === 'invite'
              ? 'User receives an invitation email and sets their own password.'
              : 'You provide username/password now and can share credentials securely with the user.'}
          </div>

          {authMode === 'direct' && (
            <>
              <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
                First Name
                <Input
                  required
                  type="text"
                  className="input"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  placeholder="Alex"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
                Last Name
                <Input
                  required
                  type="text"
                  className="input"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  placeholder="Johnson"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-2 text-sm text-[var(--foreground)] md:col-span-2">
            Email Address {authMode === 'invite' ? '' : '(optional when username is set)'}
            <Input
              required={authMode === 'invite' && !username.trim()}
              type="email"
              className="input"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="employee@company.com"
            />
          </label>

          {authMode === 'direct' && (
            <>
              <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
                Username (optional)
                <Input
                  type="text"
                  className="input"
                  helperText="If blank, the user can sign in with email."
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase())}
                  placeholder="alex.johnson"
                />
              </label>

              <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
                Password
                <Input
                  required
                  type="password"
                  className="input"
                  helperText="Use a temporary strong password; user should reset after first sign-in."
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Create a secure password"
                />
              </label>
            </>
          )}

          <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
            Role
            <Select
              className="input"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              title="Role"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
            Department
            <Input
              type="text"
              className="input"
              helperText="Optional. Helps route approvals and reporting automatically."
              value={department}
              onChange={(event) => setDepartment(event.target.value)}
              placeholder="Engineering"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
            Mobile (WhatsApp)
            <Input
              type="tel"
              className="input"
              helperText="Used for WhatsApp HR verification. Enter with country code."
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="+91 98765 43210"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm text-[var(--foreground)]">
            Reporting Manager
            <Select
              className="input"
              value={managerId}
              onChange={(event) => setManagerId(event.target.value)}
              title="Reporting Manager"
            >
              <option value="">No manager (direct to HR)</option>
              {managers.map((manager) => (
                <option key={manager.id} value={manager.id}>
                  {manager.first_name} {manager.last_name} ({manager.email})
                </option>
              ))}
            </Select>
          </label>

          <div className="md:col-span-2 flex items-center justify-between gap-3 pt-2">
            <div>
              {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
              {success && <p className="text-sm text-[var(--success)]">{success}</p>}
            </div>
            <Button type="submit" disabled={loading} variant="primary" size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {authMode === 'direct' ? 'Create User' : 'Send Invitation'}
            </Button>
          </div>
        </form>
      </section>

      <section className="card p-0 overflow-hidden">
        <div className="border-b border-[var(--border)] px-4 py-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Pending Invitations ({activePending.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--border)]">
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Email</th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Role</th>
                <th className="hidden md:table-cell px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Department</th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Expires</th>
                <th className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activePending.map((invite) => (
                <tr key={invite.id} className="border-b border-[var(--border)] last:border-0">
                  <td className="px-4 py-2 max-w-[180px] truncate">{invite.email}</td>
                  <td className="px-4 py-2 capitalize">{invite.role}</td>
                  <td className="hidden md:table-cell px-4 py-2">{invite.department || 'Unassigned'}</td>
                  <td className="px-4 py-2 text-xs text-[var(--muted-foreground)]">
                    {new Date(invite.expires_at).toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-2">
                    <PendingInviteActions
                      inviteId={invite.id}
                      email={invite.email}
                      backend="employee-invite"
                      onChanged={loadPendingInvites}
                    />
                  </td>
                </tr>
              ))}
              {activePending.length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-sm text-[var(--muted-foreground)]" colSpan={5}>
                    No pending invitations. Invited employees will appear here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
