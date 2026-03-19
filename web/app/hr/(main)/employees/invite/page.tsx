'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface InviteFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  department: string;
  designation: string;
}

interface InviteResult {
  email: string;
  success: boolean;
  inviteLink?: string;
  error?: string;
}

interface CompanyRoles {
  enabledRoles: string[];
  requiresHR: boolean;
  requiresManager: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const EMPTY_FORM: InviteFormData = {
  email: '',
  firstName: '',
  lastName: '',
  role: 'employee',
  department: '',
  designation: '',
};

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee', description: 'Standard employee access' },
  { value: 'team_lead', label: 'Team Lead', description: 'Can manage their team' },
  { value: 'manager', label: 'Manager', description: 'Can approve leaves, manage department' },
  { value: 'director', label: 'Director', description: 'Senior management access' },
  { value: 'hr', label: 'HR', description: 'Full HR management access' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function InviteEmployeesPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'single' | 'bulk'>('single');
  const [formData, setFormData] = useState<InviteFormData>(EMPTY_FORM);
  const [bulkData, setBulkData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<InviteResult[]>([]);
  const [companyRoles, setCompanyRoles] = useState<CompanyRoles | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [error, setError] = useState('');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    ensureMe().then(() => {
      fetchCompanyRoles();
      fetchDepartments();
    });
  }, []);

  async function fetchCompanyRoles() {
    try {
      const res = await fetch('/api/company/roles');
      if (res.ok) {
        const data = await res.json();
        setCompanyRoles(data);
      }
    } catch (err) {
      console.error('Failed to fetch company roles:', err);
    }
  }

  async function fetchDepartments() {
    try {
      const res = await fetch('/api/hr/departments');
      if (res.ok) {
        const data = await res.json();
        setDepartments(data.departments || []);
      }
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    }
  }

  function handleInputChange(field: keyof InviteFormData, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  }

  async function handleSendInvite() {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      setError('Please fill in all required fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/company/invite-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          role: formData.role,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to send invitation');
        return;
      }

      setResults([{
        email: formData.email,
        success: true,
        inviteLink: data.inviteLink,
      }]);
      setShowSuccess(true);
      setFormData(EMPTY_FORM);
    } catch (err) {
      setError('An error occurred. Please try again.');
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

    // Parse CSV-like data: email,firstName,lastName,role,department
    const lines = bulkData.trim().split('\n').filter(line => line.trim());
    
    for (const line of lines) {
      const [email, firstName, lastName, role = 'employee', department = ''] = line.split(',').map(s => s.trim());
      
      if (!email || !firstName || !lastName) {
        newResults.push({ email: email || 'Unknown', success: false, error: 'Invalid data' });
        continue;
      }

      try {
        const res = await fetch('/api/company/invite-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, firstName, lastName, role, department }),
        });

        const data = await res.json();

        if (res.ok) {
          newResults.push({ email, success: true, inviteLink: data.inviteLink });
        } else {
          newResults.push({ email, success: false, error: data.error });
        }
      } catch (err) {
        newResults.push({ email, success: false, error: 'Request failed' });
      }
    }

    setResults(newResults);
    setShowSuccess(true);
    setBulkData('');
    setLoading(false);
  }

  function copyInviteLink(link: string) {
    navigator.clipboard.writeText(link);
  }

  const availableRoles = companyRoles 
    ? ROLE_OPTIONS.filter(r => 
        r.value === 'employee' || 
        companyRoles.enabledRoles.includes(r.value)
      )
    : ROLE_OPTIONS;

  return (
    <div className="space-y-6 p-6">
      {/* Back button */}
      <button
        onClick={() => router.push('/hr/employees')}
        className="inline-flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Employees
      </button>

      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
          <UserPlus className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Invite Employees</h1>
          <p className="text-muted mt-1">
            Send invitations to new team members. They'll receive an email to set up their account.
          </p>
        </div>
      </div>

      {/* Mode Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode('single')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'single' 
              ? 'bg-primary text-white' 
              : 'bg-surface-alt text-foreground-secondary hover:bg-hover'
          }`}
        >
          <User className="h-4 w-4" />
          Single Invite
        </button>
        <button
          onClick={() => setMode('bulk')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'bulk' 
              ? 'bg-primary text-white' 
              : 'bg-surface-alt text-foreground-secondary hover:bg-hover'
          }`}
        >
          <Users className="h-4 w-4" />
          Bulk Invite
        </button>
      </div>

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
            <h3 className="text-lg font-semibold text-foreground">Invitations Sent</h3>
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
                  {result.error && (
                    <span className="text-error text-sm">- {result.error}</span>
                  )}
                </div>
                {result.success && result.inviteLink && (
                  <button
                    onClick={() => copyInviteLink(result.inviteLink!)}
                    className="btn-secondary inline-flex items-center gap-1 text-xs"
                  >
                    <Copy className="h-3 w-3" />
                    Copy Link
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => {
                setShowSuccess(false);
                setResults([]);
              }}
              className="btn-secondary"
            >
              Invite More
            </button>
            <button 
              onClick={() => router.push('/hr/employees')}
              className="btn-primary"
            >
              View All Employees
            </button>
          </div>
        </div>
      )}

      {/* Single Invite Form */}
      {!showSuccess && mode === 'single' && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold text-foreground mb-6">Employee Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="input-label">Email Address *</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  type="email"
                  placeholder="employee@company.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Role *</label>
              <select
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                className="input"
              >
                {availableRoles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="input-label">First Name *</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
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
                <input
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="input-label">Department</label>
              <select
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
              </select>
            </div>

            <div>
              <label className="input-label">Designation</label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted" />
                <input
                  placeholder="Software Engineer"
                  value={formData.designation}
                  onChange={(e) => handleInputChange('designation', e.target.value)}
                  className="input pl-10"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={handleSendInvite}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send Invitation
            </button>
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
                Enter one employee per line in CSV format
              </p>
            </div>
            <span className="status-badge status-pending inline-flex items-center gap-1">
              <FileSpreadsheet className="h-3 w-3" />
              CSV Format
            </span>
          </div>

          <div className="bg-surface-alt rounded-lg p-4 mb-4">
            <p className="text-sm text-foreground font-mono">
              Format: email,firstName,lastName,role,department
            </p>
            <p className="text-xs text-muted mt-2">
              Example: john@company.com,John,Doe,employee,Engineering
            </p>
          </div>
          
          <textarea
            value={bulkData}
            onChange={(e) => setBulkData(e.target.value)}
            placeholder="john@company.com,John,Doe,employee,Engineering
jane@company.com,Jane,Smith,team_lead,Engineering
bob@company.com,Bob,Wilson,manager,Sales"
            rows={8}
            className="input font-mono text-sm"
          />

          <div className="mt-6 flex justify-between items-center">
            <button className="btn-secondary inline-flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload CSV
            </button>
            <button
              onClick={handleBulkInvite}
              disabled={loading}
              className="btn-primary inline-flex items-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send All Invitations
            </button>
          </div>
        </div>
      )}

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
              <p className="text-foreground font-medium">Send Invitation</p>
              <p className="text-muted text-sm">
                Enter employee details and send an invite link
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold">2</span>
            </div>
            <div>
              <p className="text-foreground font-medium">Employee Accepts</p>
              <p className="text-muted text-sm">
                Employee clicks the link and sets their password
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-primary font-semibold">3</span>
            </div>
            <div>
              <p className="text-foreground font-medium">Ready to Go</p>
              <p className="text-muted text-sm">
                Employee can log in and access the system
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
