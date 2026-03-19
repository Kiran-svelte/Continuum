'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { StaggerContainer, FadeIn } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  UserPlus, 
  Mail, 
  User, 
  Building2, 
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
    <StaggerContainer className="space-y-6 p-6">
      <FadeIn>
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            onClick={() => router.push('/hr/employees')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </Button>
        </div>

        <PageHeader
          icon={<UserPlus className="h-6 w-6" />}
          title="Invite Employees"
          description="Send invitations to new team members. They'll receive an email to set up their account."
        />
      </FadeIn>

      <FadeIn delay={0.1}>
        <div className="flex gap-2 mb-6">
          <Button
            variant={mode === 'single' ? 'default' : 'outline'}
            onClick={() => setMode('single')}
            className="gap-2"
          >
            <User className="h-4 w-4" />
            Single Invite
          </Button>
          <Button
            variant={mode === 'bulk' ? 'default' : 'outline'}
            onClick={() => setMode('bulk')}
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            Bulk Invite
          </Button>
        </div>
      </FadeIn>

      {error && (
        <FadeIn>
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <p className="text-red-300">{error}</p>
          </div>
        </FadeIn>
      )}

      {showSuccess && results.length > 0 && (
        <FadeIn>
          <GlassPanel className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="h-6 w-6 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Invitations Sent</h3>
            </div>
            
            <div className="space-y-3">
              {results.map((result, i) => (
                <div 
                  key={i}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    result.success ? 'bg-green-500/10' : 'bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle className="h-5 w-5 text-green-400" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    )}
                    <span className="text-white">{result.email}</span>
                    {result.error && (
                      <span className="text-red-400 text-sm">- {result.error}</span>
                    )}
                  </div>
                  {result.success && result.inviteLink && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyInviteLink(result.inviteLink!)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </Button>
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowSuccess(false);
                  setResults([]);
                }}
              >
                Invite More
              </Button>
              <Button onClick={() => router.push('/hr/employees')}>
                View All Employees
              </Button>
            </div>
          </GlassPanel>
        </FadeIn>
      )}

      {!showSuccess && mode === 'single' && (
        <FadeIn delay={0.2}>
          <GlassPanel className="p-6">
            <h3 className="text-lg font-semibold text-white mb-6">Employee Details</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                  <Input
                    type="email"
                    placeholder="employee@company.com"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Role *
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => handleInputChange('role', e.target.value)}
                  className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-white"
                >
                  {availableRoles.map(role => (
                    <option key={role.value} value={role.value} className="bg-slate-800">
                      {role.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  First Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                  <Input
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange('firstName', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                  <Input
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange('lastName', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Department
                </label>
                <select
                  value={formData.department}
                  onChange={(e) => handleInputChange('department', e.target.value)}
                  className="w-full h-10 rounded-md border border-white/10 bg-white/5 px-3 text-white"
                >
                  <option value="" className="bg-slate-800">Select department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.name} className="bg-slate-800">
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">
                  Designation
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
                  <Input
                    placeholder="Software Engineer"
                    value={formData.designation}
                    onChange={(e) => handleInputChange('designation', e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <Button
                onClick={handleSendInvite}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Invitation
              </Button>
            </div>
          </GlassPanel>
        </FadeIn>
      )}

      {!showSuccess && mode === 'bulk' && (
        <FadeIn delay={0.2}>
          <GlassPanel className="p-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">Bulk Invite</h3>
                <p className="text-white/60 text-sm mt-1">
                  Enter one employee per line in CSV format
                </p>
              </div>
              <Badge variant="info" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" />
                CSV Format
              </Badge>
            </div>

            <div className="bg-white/5 rounded-lg p-4 mb-4">
              <p className="text-sm text-white/70 font-mono">
                Format: email,firstName,lastName,role,department
              </p>
              <p className="text-xs text-white/50 mt-2">
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
              className="w-full rounded-md border border-white/10 bg-white/5 px-4 py-3 text-white font-mono text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            />

            <div className="mt-6 flex justify-between items-center">
              <Button variant="outline" className="gap-2">
                <Upload className="h-4 w-4" />
                Upload CSV
              </Button>
              <Button
                onClick={handleBulkInvite}
                disabled={loading}
                className="gap-2"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send All Invitations
              </Button>
            </div>
          </GlassPanel>
        </FadeIn>
      )}

      <FadeIn delay={0.3}>
        <GlassPanel className="p-6">
          <h3 className="text-lg font-semibold text-white mb-4">How It Works</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-blue-400 font-semibold">1</span>
              </div>
              <div>
                <p className="text-white font-medium">Send Invitation</p>
                <p className="text-white/60 text-sm">
                  Enter employee details and send an invite link
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-blue-400 font-semibold">2</span>
              </div>
              <div>
                <p className="text-white font-medium">Employee Accepts</p>
                <p className="text-white/60 text-sm">
                  Employee clicks the link and sets their password
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                <span className="text-blue-400 font-semibold">3</span>
              </div>
              <div>
                <p className="text-white font-medium">Ready to Go</p>
                <p className="text-white/60 text-sm">
                  Employee can log in and access the system
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </FadeIn>
    </StaggerContainer>
  );
}
