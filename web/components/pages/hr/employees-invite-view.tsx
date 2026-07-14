'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  UserPlus, 
  Mail, 
  User, 
  Briefcase,
  Users,
  ArrowLeft,
  Send,
  CheckCircle,
  Copy,
  Upload,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  Lightbulb,
} from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';
import { fetchWithTimeout, mapFetchErrorMessage } from '@/lib/fetch-with-timeout';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';

// ─── Types ────────────────────────────────────────────────────────────────────

interface InviteFormData {
  email: string;
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  designation: string;
  managerId: string;
}

interface ManagerOption {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface InviteResult {
  email: string;
  success: boolean;
  mode?: 'invite' | 'direct';
  inviteLink?: string;
  error?: string;
}

interface CompanyRoles {
  enabledRoles: string[];
  requiresHR: boolean;
  requiresManager: boolean;
  invitePolicy?: {
    allowedRoles: string[];
    defaultRole: string;
    note?: string;
  };
}

interface PendingInvite {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  status: string;
  expires_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: InviteFormData = {
  email: '',
  username: '',
  password: '',
  firstName: '',
  lastName: '',
  role: 'employee',
  department: '',
  designation: '',
  managerId: '',
};

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee', description: 'Standard employee access' },
  { value: 'team_lead', label: 'Team Lead', description: 'Can manage their team' },
  { value: 'manager', label: 'Manager', description: 'Can approve leaves, manage department' },
  { value: 'director', label: 'Director', description: 'Senior management access' },
  { value: 'hr', label: 'HR', description: 'Full HR management access' },
];

const REQUEST_TIMEOUT_MS = 15_000;

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmployeesInviteView() {
  const router = useRouter();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [accountMode, setAccountMode] = useState<'invite' | 'direct'>('invite');
  const [bulkAccountMode, setBulkAccountMode] = useState<'invite' | 'direct'>('invite');
  const [formData, setFormData] = useState<InviteFormData>(EMPTY_FORM);
  const [bulkData, setBulkData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [companyRoles, setCompanyRoles] = useState<CompanyRoles | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [managers, setManagers] = useState<ManagerOption[]>([]);
  const csvInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    ensureMe().then(() => {
      fetchCompanyRoles();
      fetchDepartments();
      fetchPendingInvites();
      fetchManagers();
    });
  }, []);

  async function fetchCompanyRoles() {
    try {
      const res = await fetchWithTimeout('/api/company/roles', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setCompanyRoles(data);
        if (data.invitePolicy?.defaultRole) {
          setFormData((prev) => ({ ...prev, role: data.invitePolicy.defaultRole }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch company roles:', err);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetchWithTimeout('/api/hr/departments', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }

  async function fetchPendingInvites() {
    try {
      const res = await fetchWithTimeout('/api/company/invite-user?status=pending', { credentials: 'include' }, REQUEST_TIMEOUT_MS);
      if (!res.ok) {
        console.error('Failed to fetch pending invites:', res.status);
        return;
      }
      const data = await res.json().catch(() => ({}));
      setPendingInvites(data.invites || []);
    } catch (err) {
      console.error('Failed to fetch pending invites:', err);
    }
  }

  async function fetchManagers() {
    try {
      const res = await fetchWithTimeout(
        '/api/employees?limit=500&role=admin,hr,manager,director,team_lead',
        { credentials: 'include' },
        REQUEST_TIMEOUT_MS
      );
      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        const employeeList = data.employees || data.data || [];
        setManagers(
          employeeList.map((employee: Record<string, unknown>) => ({
            id: employee.id as string,
            first_name: employee.first_name as string,
            last_name: employee.last_name as string,
            email: employee.email as string,
          }))
        );
      }
    } catch (err) {
      console.error('Failed to fetch managers:', err);
    }
  }

  function handleInputChange(field: keyof InviteFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSendInvite() {
    const missingBaseFields = !formData.firstName || !formData.lastName;
    const missingInviteFields = accountMode === 'invite' && !formData.email;
    const missingDirectFields = accountMode === 'direct' && (!formData.username || !formData.password);

    if (missingBaseFields || missingInviteFields || missingDirectFields) {
      setError('Please fill in all required fields');
      return;
    }

    if (formData.role !== 'admin' && !formData.managerId) {
      setError('Reporting manager is required for every invited user.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetchWithTimeout('/api/company/invite-user', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authMode: accountMode,
          email: formData.email || undefined,
          username: accountMode === 'direct' ? formData.username || undefined : undefined,
          password: accountMode === 'direct' ? formData.password || undefined : undefined,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
          managerId: formData.managerId || undefined,
        }),
      }, REQUEST_TIMEOUT_MS);

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || 'Failed to create account');
        return;
      }

      const identifier = formData.email || formData.username;

      setResults([{
        email: identifier,
        success: true,
        mode: data.mode,
        inviteLink: data.inviteLink,
      }]);
      setShowSuccess(true);
      setFormData(EMPTY_FORM);
      await fetchPendingInvites();
    } catch (inviteError) {
      setError(mapFetchErrorMessage(inviteError, 'An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkInvite() {
    if (!bulkData.trim()) {
      setError('Please enter employee data');
      return;
    }

    setLoading(true);
    setError('');
    const newResults: InviteResult[] = [];

    try {
      // Parse CSV-like data based on selected bulk account mode.
      const lines = bulkData.trim().split('\n').filter(line => line.trim());

      for (const line of lines) {
        const values = line.split(',').map(s => s.trim());

        let payload: Record<string, string | undefined> = {
          authMode: bulkAccountMode,
        };
        let identifier = 'Unknown';

        if (bulkAccountMode === 'invite') {
          const [email, firstName, lastName, role = 'employee', department = '', managerId = ''] = values;

          if (!email || !firstName || !lastName) {
            newResults.push({ email: email || 'Unknown', success: false, error: 'Invalid invite CSV row' });
            continue;
          }

          identifier = email;
          payload = {
            ...payload,
            email,
            firstName,
            lastName,
            role,
            department,
            ...(managerId ? { managerId } : {}),
          };
        } else {
          const [username, email, firstName, lastName, role = 'employee', department = '', password] = values;

          if ((!username && !email) || !firstName || !lastName || !password) {
            newResults.push({
              email: username || email || 'Unknown',
              success: false,
              error: 'Invalid direct CSV row',
            });
            continue;
          }

          identifier = username || email;
          payload = {
            ...payload,
            username: username || undefined,
            email: email || undefined,
            password,
            firstName,
            lastName,
            role,
            department,
          };
        }

        try {
          const res = await fetchWithTimeout('/api/company/invite-user', {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          }, REQUEST_TIMEOUT_MS);

          const data = await res.json().catch(() => ({}));

          if (res.ok) {
            newResults.push({ email: identifier, success: true, mode: data.mode, inviteLink: data.inviteLink });
          } else {
            newResults.push({ email: identifier, success: false, error: data.error });
          }
        } catch (bulkError) {
          newResults.push({
            email: identifier,
            success: false,
            error: mapFetchErrorMessage(bulkError, 'Request failed'),
          });
        }
      }

      setResults(newResults);
      setShowSuccess(true);
      setBulkData('');
      await fetchPendingInvites();
    } finally {
      setLoading(false);
    }
  }

  function copyInviteLink(link: string) {
    navigator.clipboard.writeText(link);
  }

  async function handleCsvUpload(file: File | undefined) {
    if (!file) return;
    const text = await file.text();
    setBulkData(text);
    setMode('bulk');
    setError('');
  }

  const availableRoles = companyRoles 
    ? ROLE_OPTIONS.filter((r) =>
        (companyRoles.invitePolicy?.allowedRoles ?? [
          'employee',
          ...companyRoles.enabledRoles,
        ]).includes(r.value)
      )
    : ROLE_OPTIONS;

  const hierarchyNote = companyRoles?.invitePolicy?.note;

  return (
    <div className="space-y-6 p-6">
      {/* Back button */}
      <Button
        onClick={() => router.push('/hr/employees')}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employees
      </Button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invite Employees</h1>
          <p className="text-muted mt-1">
            Send invitation links or create employee credentials directly for your team.
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <Button
          onClick={() => setMode('single')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'single' 
              ? 'bg-primary text-foreground' 
              : 'bg-surface-alt text-foreground-secondary hover:bg-hover'
          }`}
        >
          <User className="h-4 w-4" />
          Single Invite
        </Button>
        <Button
          onClick={() => setMode('bulk')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'bulk' 
              ? 'bg-primary text-foreground' 
              : 'bg-surface-alt text-foreground-secondary hover:bg-hover'
          }`}
        >
          <Users className="h-4 w-4" />
          Bulk Invite
        </Button>
      </div>

      {hierarchyNote && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--accent)]/40 px-4 py-3 text-sm text-[var(--foreground)]">
          {hierarchyNote}
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-error/5 border border-error/20 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-error flex-shrink-0" />
          <p className="text-error">{error}</p>
        </div>
      )}

      {/* Success Results */}
      {showSuccess && results.length > 0 && (
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
              <CheckCircle className="h-5 w-5 text-success" />
            </div>
            <h3 className="text-lg font-semibold text-foreground">Request Completed</h3>
          </div>
          
          <div className="space-y-2">
            {results.map((result, i) => (
              <div 
                key={i}
                className={`flex items-center justify-between p-3 rounded-lg ${
                  result.success ? 'bg-success/5 border border-success/20' : 'bg-error/5 border border-error/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.success ? (
                    <CheckCircle className="h-5 w-5 text-success" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-error" />
                  )}
                  <span className="text-foreground">{result.email}</span>
                  {result.success && result.mode && (
                    <span className="text-xs text-muted uppercase tracking-wide">
                      {result.mode === 'direct' ? 'Account created' : 'Invitation sent'}
                    </span>
                  )}
                  {result.error && (
                    <span className="text-error text-sm">- {result.error}</span>
                  )}
                </div>
                {result.success && result.inviteLink && (
                  <Button
                    onClick={() => copyInviteLink(result.inviteLink!)}
                    className="btn-secondary inline-flex items-center gap-1 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                    Copy Link
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <Button
              onClick={() => {
                setShowSuccess(false);
                setResults([]);
              }}
              className="btn-secondary"
            >
              Invite More
            </Button>
            <Button 
              onClick={() => router.push('/hr/employees')}
              className="btn-primary"
            >
              View All Employees
            </Button>
          </div>
        </div>
      )}

      {/* Single Invite Form */}
      {!showSuccess && mode === 'single' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-4">Employee Details</h3>

          <div className="mb-6 rounded-lg border border-border p-1 inline-flex gap-1">
            <Button
              onClick={() => setAccountMode('invite')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                accountMode === 'invite'
                  ? 'bg-primary text-foreground'
                  : 'text-foreground-secondary hover:bg-surface-alt'
              }`}
            >
              Invite Link
            </Button>
            <Button
              onClick={() => setAccountMode('direct')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                accountMode === 'direct'
                  ? 'bg-primary text-foreground'
                  : 'text-foreground-secondary hover:bg-surface-alt'
              }`}
            >
              Direct Credentials
            </Button>
          </div>

          <p className="text-sm text-muted mb-6">
            {accountMode === 'invite'
              ? 'Employee receives an email invitation and sets password later.'
              : 'Create username/password now and share the credentials securely with the employee.'}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="input-label">Email Address {accountMode === 'invite' ? '*' : '(optional)'}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <Input
                  type="email"
                  placeholder="employee@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            {accountMode === 'direct' && (
              <>
                <div>
                  <label className="input-label">Username *</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                    <Input
                      placeholder="john.doe"
                      value={formData.username}
                      onChange={(e) => handleInputChange('username', e.target.value)}
                      className="input pl-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="input-label">Password *</label>
                  <Input
                    type="password"
                    placeholder="Set a secure password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className="input"
                  />
                </div>
              </>
            )}

            <div>
              <label className="input-label">Role *</label>
              <Select
                title="Role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="input"
              >
                {availableRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="input-label">First Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <Input
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Last Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <Input
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Department</label>
              <Select
                title="Department"
                value={formData.department}
                onChange={(e) => handleInputChange('department', e.target.value)}
                className="input"
              >
                <option value="">Select department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </Select>
            </div>

            <div>
              <label className="input-label">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <Input
                  placeholder="Software Engineer"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Reporting Manager</label>
              <Select
                title="Reporting Manager"
                value={formData.managerId}
                onChange={(e) => handleInputChange('managerId', e.target.value)}
                className="input"
              >
                <option value="">No manager (direct to HR)</option>
                {managers.map(manager => (
                  <option key={manager.id} value={manager.id}>
                    {manager.first_name} {manager.last_name} ({manager.email})
                  </option>
                ))}
              </Select>
              <p className="text-xs text-muted mt-1">
                Who will this employee report to? Leave empty if they report directly to HR.
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <Button
              onClick={handleSendInvite}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {accountMode === 'direct' ? 'Create Account' : 'Send Invitation'}
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Invite Form */}
      {!showSuccess && mode === 'bulk' && (
        <div className="card p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Bulk Invite</h3>
              <p className="text-muted text-sm mt-1">
                Enter one employee per line in CSV format.
              </p>
            </div>
            <span className="status-badge status-pending inline-flex items-center gap-1">
              <FileSpreadsheet className="h-3 w-3" />
              CSV Format
            </span>
          </div>

          <div className="mb-4 rounded-lg border border-border p-1 inline-flex gap-1">
            <Button
              onClick={() => setBulkAccountMode('invite')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                bulkAccountMode === 'invite'
                  ? 'bg-primary text-foreground'
                  : 'text-foreground-secondary hover:bg-surface-alt'
              }`}
            >
              Invite Link
            </Button>
            <Button
              onClick={() => setBulkAccountMode('direct')}
              className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                bulkAccountMode === 'direct'
                  ? 'bg-primary text-foreground'
                  : 'text-foreground-secondary hover:bg-surface-alt'
              }`}
            >
              Direct Credentials
            </Button>
          </div>

          <div className="bg-surface-alt rounded-lg p-4 mb-4">
            {bulkAccountMode === 'invite' ? (
              <>
                <p className="text-sm text-foreground font-mono">
                  Format: email,firstName,lastName,role,department,managerId
                </p>
                <p className="text-xs text-muted mt-2">
                  Example: john@company.com,John,Doe,employee,Engineering,&lt;manager-employee-id&gt;
                </p>
                <p className="text-xs text-muted mt-1">
                  managerId is optional for admin role; required for all other roles. Find it from the employee directory.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm text-foreground font-mono">
                  Format: username,email,firstName,lastName,role,department,password
                </p>
                <p className="text-xs text-muted mt-2">
                  Username or email can identify the account. Password is required.
                </p>
                <p className="text-xs text-muted mt-1 font-mono">
                  Example: john.doe,john@company.com,John,Doe,employee,Engineering,SecurePass123!
                </p>
              </>
            )}
          </div>
          
          <Textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder={
              bulkAccountMode === 'invite'
                ? 'john@company.com,John,Doe,employee,Engineering\njane@company.com,Jane,Smith,team_lead,Engineering\nbob@company.com,Bob,Wilson,manager,Sales'
                : 'john.doe,john@company.com,John,Doe,employee,Engineering,SecurePass123!\njane.smith,jane@company.com,Jane,Smith,team_lead,Engineering,SecurePass123!\nbob.wilson,bob@company.com,Bob,Wilson,manager,Sales,SecurePass123!'
            }
            rows={8}
            className="input font-mono text-sm"
          />

          <div className="mt-6 flex justify-between items-center">
            <input
              ref={csvInputRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(event) => void handleCsvUpload(event.target.files?.[0])}
            />
            <Button
              type="button"
              className="btn-secondary inline-flex items-center gap-2"
              onClick={() => csvInputRef.current?.click()}
            >
              <Upload className="h-4 w-4" />
              Upload CSV
            </Button>
            <Button
              onClick={handleBulkInvite}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {bulkAccountMode === 'direct' ? 'Create All Accounts' : 'Send All Invitations'}
            </Button>
          </div>
        </div>
      )}

      {/* Pending Invites */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Pending Invites</h3>
          <span className="status-badge status-pending">{pendingInvites.length}</span>
        </div>

        {pendingInvites.length === 0 ? (
          <p className="text-sm text-muted">No pending invites for this company.</p>
        ) : (
          <div className="space-y-2">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{invite.email}</p>
                  <p className="text-xs text-muted">
                    {invite.first_name} {invite.last_name} · {invite.role} · expires {new Date(invite.expires_at).toLocaleDateString()}
                  </p>
                </div>
                <Link
                  href={`/hr/employees/invite/${invite.id}`}
                  className="btn-secondary text-xs"
                >
                  Edit
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How It Works */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-warning" />
          How It Works
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold">1</span>
            </div>
            <div>
              <p className="text-foreground font-medium">Choose Access Setup</p>
              <p className="text-muted text-sm">
                Invite by email or create direct credentials
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold">2</span>
            </div>
            <div>
              <p className="text-foreground font-medium">Assign Role</p>
              <p className="text-muted text-sm">
                Role and department are applied during onboarding
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold">3</span>
            </div>
            <div>
              <p className="text-foreground font-medium">Account Ready</p>
              <p className="text-muted text-sm">
                Employee can sign in and access permitted modules
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


