'use client';

import { useEffect, useState, useCallback, Fragment } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { TabButton } from '@/components/tab-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Users, CheckCircle2, CheckCircle, AlertCircle, UserPlus, Pencil, Trash2, Loader2, X } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  primary_role: string;
  secondary_roles: string[] | null;
  department: string | null;
  designation: string | null;
  status: string;
  date_of_joining: string;
  manager_id: string | null;
  created_at?: string;
  manager: { first_name: string; last_name: string } | null;
}

interface PendingRegistration {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  primary_role: string;
  department: string | null;
  date_of_joining: string;
  created_at: string;
}

interface EmployeeFormData {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  department: string;
  designation: string;
  role: string;
  gender: string;
  dateOfJoining: string;
  managerId: string;
  status: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EMPTY_FORM: EmployeeFormData = {
  email: '',
  firstName: '',
  lastName: '',
  phone: '',
  department: '',
  designation: '',
  role: 'employee',
  gender: '',
  dateOfJoining: '',
  managerId: '',
  status: 'active',
};

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  active: 'success',
  onboarding: 'info',
  probation: 'warning',
  on_notice: 'warning',
  suspended: 'danger',
  resigned: 'danger',
  terminated: 'danger',
  exited: 'default',
};

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-purple-300 bg-purple-500/20',
  hr: 'text-blue-300 bg-blue-500/20',
  director: 'text-indigo-300 bg-indigo-500/20',
  manager: 'text-orange-300 bg-orange-500/20',
  team_lead: 'text-cyan-300 bg-cyan-500/20',
  employee: 'text-white/70 bg-white/5',
};

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'team_lead', label: 'Team Lead' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'hr', label: 'HR' },
  { value: 'admin', label: 'Admin' },
];

const GENDER_OPTIONS = [
  { value: '', label: 'Select gender' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'probation', label: 'Probation' },
  { value: 'on_notice', label: 'On Notice' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'resigned', label: 'Resigned' },
  { value: 'terminated', label: 'Terminated' },
  { value: 'exited', label: 'Exited' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95, y: 20 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } },
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function EmployeesPage() {
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [pendingRegistrations, setPendingRegistrations] = useState<PendingRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [approving, setApproving] = useState<string | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Join code panel state
  const [showJoinCode, setShowJoinCode] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joinCodeLoading, setJoinCodeLoading] = useState(false);
  const [joinCodeCopied, setJoinCodeCopied] = useState(false);

  // Expandable row state
  const [expandedEmployeeId, setExpandedEmployeeId] = useState<string | null>(null);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [formData, setFormData] = useState<EmployeeFormData>(EMPTY_FORM);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [deactivatingEmployee, setDeactivatingEmployee] = useState<Employee | null>(null);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Invite modal states
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');
  const [inviteDepartment, setInviteDepartment] = useState('');
  const [inviteSubmitting, setInviteSubmitting] = useState(false);
  const [inviteSuccess, setInviteSuccess] = useState('');

  // ── Auth ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await ensureMe();
      if (cancelled) return;
      if (!me) {
        window.location.assign('/sign-in');
        return;
      }

      const role = me.primary_role ?? 'employee';
      if (role !== 'admin' && role !== 'hr') {
        window.location.assign('/sign-in');
        return;
      }

      setAuthReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // ── Data Loading ─────────────────────────────────────────────────────────

  const loadEmployees = useCallback(async (p: number, q: string, s: string) => {
    if (!authReady) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (q) params.set('search', q);
      if (s) params.set('status', s);
      const res = await fetch(`/api/employees?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load employees');
        return;
      }
      setEmployees(json.employees);
      setTotalPages(json.pagination.pages || 1);
      setTotal(json.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, [authReady]);

  const loadPendingRegistrations = useCallback(async () => {
    if (!authReady) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/hr/approve-registration', { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load pending registrations');
        return;
      }
      setPendingRegistrations(json.pending_registrations || []);
    } finally {
      setLoading(false);
    }
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    if (activeTab === 'all') {
      const timer = setTimeout(() => loadEmployees(page, search, statusFilter), 300);
      return () => clearTimeout(timer);
    } else {
      loadPendingRegistrations();
    }
  }, [activeTab, page, search, statusFilter, loadEmployees, loadPendingRegistrations, authReady]);

  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  // ── Approval Handler ─────────────────────────────────────────────────────

  async function handleApproval(employeeId: string, action: 'approve' | 'reject', newStatus?: 'probation' | 'active') {
    if (!authReady) return;
    setApproving(employeeId);
    try {
      const res = await fetch('/api/hr/approve-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employeeId,
          action,
          new_status: newStatus,
        }),
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: json.error ?? 'Failed to process approval' });
        return;
      }
      loadPendingRegistrations();
    } finally {
      setApproving(null);
    }
  }

  // ── Join Code ────────────────────────────────────────────────────────────

  async function fetchJoinCode() {
    if (joinCode) {
      setShowJoinCode(true);
      return;
    }
    setJoinCodeLoading(true);
    setShowJoinCode(true);
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.company?.join_code) {
        setJoinCode(json.company.join_code);
      } else {
        setJoinCode('');
        setError('Could not retrieve join code');
      }
    } catch {
      setError('Failed to fetch join code');
    } finally {
      setJoinCodeLoading(false);
    }
  }

  function copyJoinCode() {
    if (!joinCode) return;
    navigator.clipboard.writeText(joinCode).then(() => {
      setJoinCodeCopied(true);
      setTimeout(() => setJoinCodeCopied(false), 2000);
    });
  }

  // ── Form Helpers ─────────────────────────────────────────────────────────

  function updateFormField(field: keyof EmployeeFormData, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function openAddModal() {
    setFormData(EMPTY_FORM);
    setFormError('');
    setShowAddModal(true);
  }

  function openEditModal(emp: Employee) {
    setEditingEmployee(emp);
    setFormData({
      email: emp.email,
      firstName: emp.first_name,
      lastName: emp.last_name,
      phone: emp.phone ?? '',
      department: emp.department ?? '',
      designation: emp.designation ?? '',
      role: emp.primary_role,
      gender: '',
      dateOfJoining: emp.date_of_joining ? emp.date_of_joining.slice(0, 10) : '',
      managerId: emp.manager_id ?? '',
      status: emp.status,
    });
    setFormError('');
    setShowEditModal(true);
  }

  function openDeactivateConfirm(emp: Employee) {
    setDeactivatingEmployee(emp);
    setShowDeactivateConfirm(true);
  }

  // ── Add Employee ─────────────────────────────────────────────────────────

  async function handleAddEmployee() {
    setFormError('');
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: formData.email,
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone || undefined,
          department: formData.department || undefined,
          designation: formData.designation || undefined,
          role: formData.role,
          gender: formData.gender,
          dateOfJoining: formData.dateOfJoining,
          managerId: formData.managerId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? 'Failed to create employee.');
        return;
      }
      setShowAddModal(false);
      setFormData(EMPTY_FORM);
      setStatusMessage({ type: 'success', text: 'Employee added successfully.' });
      loadEmployees(page, search, statusFilter);
    } catch {
      setFormError('An unexpected error occurred.');
    } finally {
      setFormSubmitting(false);
    }
  }

  // ── Edit Employee ────────────────────────────────────────────────────────

  async function handleEditEmployee() {
    if (!editingEmployee) return;
    setFormError('');
    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${editingEmployee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          phone: formData.phone,
          department: formData.department,
          designation: formData.designation,
          managerId: formData.managerId || null,
          status: formData.status !== editingEmployee.status ? formData.status : undefined,
          role: formData.role !== editingEmployee.primary_role ? formData.role : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? 'Failed to update employee.');
        return;
      }
      setShowEditModal(false);
      setEditingEmployee(null);
      setStatusMessage({ type: 'success', text: 'Employee updated successfully.' });
      loadEmployees(page, search, statusFilter);
    } catch {
      setFormError('An unexpected error occurred.');
    } finally {
      setFormSubmitting(false);
    }
  }

  // ── Deactivate Employee ──────────────────────────────────────────────────

  async function handleDeactivateEmployee() {
    if (!deactivatingEmployee) return;
    setFormSubmitting(true);
    try {
      const res = await fetch(`/api/employees/${deactivatingEmployee.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Deactivated by HR' }),
      });
      const json = await res.json();
      if (!res.ok) {
        setStatusMessage({ type: 'error', text: json.error ?? 'Failed to deactivate employee.' });
        return;
      }
      setShowDeactivateConfirm(false);
      setDeactivatingEmployee(null);
      setStatusMessage({ type: 'success', text: 'Employee deactivated successfully.' });
      loadEmployees(page, search, statusFilter);
    } catch {
      setStatusMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setFormSubmitting(false);
    }
  }

  // ── Form Select Component ───────────────────────────────────────────────

  function FormSelect({
    label,
    value,
    onChange,
    options,
  }: {
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) {
    return (
      <div className="w-full">
        <label className="block text-sm font-medium text-white mb-1.5">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background hover:border-primary/50"
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <StaggerContainer className="space-y-6">
      <PageHeader
        title="Employees"
        description={
          activeTab === 'all'
            ? (total > 0 ? `${total} employees` : 'Manage your team')
            : `${pendingRegistrations.length} pending registrations`
        }
        icon={<Users className="w-6 h-6 text-primary" />}
        action={
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={openAddModal} className="gap-2">
              <UserPlus className="w-4 h-4" />
              Add Employee
            </Button>
            <Button variant="outline" onClick={() => setShowInviteModal(true)}>
              Invite by Email
            </Button>
            <Button
              variant="outline"
              onClick={() => showJoinCode ? setShowJoinCode(false) : fetchJoinCode()}
            >
              {showJoinCode ? 'Close Invite' : 'Invite Code'}
            </Button>
          </div>
        }
      />

      {statusMessage && (
        <FadeIn>
          <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center gap-2 ${statusMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
            {statusMessage.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            {statusMessage.text}
          </div>
        </FadeIn>
      )}

      {/* Join Code Panel */}
      {showJoinCode && (
        <FadeIn>
          <GlassPanel>
            <div className="p-6">
              <h3 className="text-lg font-semibold text-white mb-2">Invite New Employees</h3>
              <p className="text-sm text-white/60 mb-4">
                Share this code with new employees. They can use it to sign up and join your company.
              </p>
              {joinCodeLoading ? (
                <div className="text-sm text-white/60">Loading join code...</div>
              ) : joinCode ? (
                <div className="flex items-center gap-3">
                  <code className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-lg font-mono font-bold tracking-widest text-white select-all">
                    {joinCode}
                  </code>
                  <Button variant="outline" size="sm" onClick={copyJoinCode}>
                    {joinCodeCopied ? 'Copied!' : 'Copy'}
                  </Button>
                </div>
              ) : (
                <div className="text-sm text-red-400">Join code unavailable. Please try again later.</div>
              )}
            </div>
          </GlassPanel>
        </FadeIn>
      )}

      {/* Tabs */}
      <FadeIn>
        <div className="flex gap-2">
          <TabButton
            active={activeTab === 'all'}
            onClick={() => setActiveTab('all')}
          >
            All Employees
          </TabButton>
          <TabButton
            active={activeTab === 'pending'}
            onClick={() => setActiveTab('pending')}
          >
            Pending Registrations
            {pendingRegistrations.length > 0 && (
              <Badge variant="warning" size="sm">
                {pendingRegistrations.length}
              </Badge>
            )}
          </TabButton>
        </div>
      </FadeIn>

      {activeTab === 'all' && (
        <>
          {/* Search & Filters */}
          <FadeIn>
            <div className="flex gap-3 flex-wrap">
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search by name, email, designation..."
                className="flex-1 min-w-48 rounded-lg border border-white/10 px-3 py-2 text-sm bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary"
              />
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white bg-white/5 focus:outline-none focus:border-primary"
                aria-label="Filter by status"
              >
                <option value="">All Statuses</option>
                <option value="active">Active</option>
                <option value="onboarding">Onboarding</option>
                <option value="probation">Probation</option>
                <option value="on_notice">On Notice</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </FadeIn>

          <FadeIn>
            <GlassPanel>
              <div className="p-6 border-b border-white/10">
                <h3 className="text-lg font-semibold text-white">Employee Directory</h3>
              </div>
              <div className="p-6">
                {loading && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="h-8 bg-white/5 rounded w-48 animate-pulse" />
                      <div className="h-10 bg-white/5 rounded w-32 animate-pulse" />
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
                          <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-white/5 rounded w-32 animate-pulse" />
                            <div className="h-3 bg-white/5 rounded w-48 animate-pulse" />
                          </div>
                          <div className="h-6 bg-white/5 rounded w-16 animate-pulse" />
                          <div className="h-6 bg-white/5 rounded w-20 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {error && !loading && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {error}
                  </div>
                )}
                {!loading && !error && employees.length === 0 && (
                  <div className="py-12 text-center">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto">
                      <Users className="w-5 h-5 text-blue-400" />
                    </div>
                    <p className="text-white/60 mt-3 text-sm">No employees found.</p>
                  </div>
                )}
                {!loading && !error && employees.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th className="text-left py-3 pr-4 text-white/60 font-medium">Employee</th>
                          <th className="text-left py-3 px-2 text-white/60 font-medium">Role</th>
                          <th className="text-left py-3 px-2 text-white/60 font-medium hidden md:table-cell">Department</th>
                          <th className="text-left py-3 px-2 text-white/60 font-medium hidden lg:table-cell">Manager</th>
                          <th className="text-left py-3 px-2 text-white/60 font-medium hidden lg:table-cell">Joined</th>
                          <th className="text-left py-3 px-2 text-white/60 font-medium">Status</th>
                          <th className="text-left py-3 pl-2 text-white/60 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {employees.map((emp) => (
                          <Fragment key={emp.id}>
                          <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-xs font-bold text-blue-400 shrink-0">
                                  {emp.first_name[0]}{emp.last_name[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-white">{emp.first_name} {emp.last_name}</p>
                                  <p className="text-xs text-white/60">{emp.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex flex-wrap gap-1">
                                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[emp.primary_role] ?? 'bg-white/5 text-white/70'}`}>
                                  {emp.primary_role}
                                </span>
                                {emp.secondary_roles?.map((r) => (
                                  <span key={r} className="inline-flex px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-white/60 border border-white/10">
                                    {r}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-2 text-white/60 hidden md:table-cell">
                              {emp.department ?? <span className="text-white/60">--</span>}
                            </td>
                            <td className="py-3 px-2 text-white/60 hidden lg:table-cell">
                              {emp.manager
                                ? `${emp.manager.first_name} ${emp.manager.last_name}`
                                : <span className="text-white/60">--</span>}
                            </td>
                            <td className="py-3 px-2 text-white/60 hidden lg:table-cell text-xs">
                              {formatDate(emp.date_of_joining)}
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={STATUS_BADGE[emp.status] ?? 'default'}>{emp.status}</Badge>
                            </td>
                            <td className="py-3 pl-2">
                              <div className="flex items-center gap-1">
                                <button
                                  className="text-xs text-blue-400 hover:underline font-medium"
                                  onClick={() =>
                                    setExpandedEmployeeId(expandedEmployeeId === emp.id ? null : emp.id)
                                  }
                                >
                                  {expandedEmployeeId === emp.id ? 'Close' : 'View'}
                                </button>
                                <button
                                  className="p-1 rounded hover:bg-white/10 transition-colors text-white/60 hover:text-white"
                                  title="Edit employee"
                                  onClick={() => openEditModal(emp)}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                {emp.status !== 'terminated' && emp.status !== 'exited' && (
                                  <button
                                    className="p-1 rounded hover:bg-red-500/10 transition-colors text-white/60 hover:text-red-400"
                                    title="Deactivate employee"
                                    onClick={() => openDeactivateConfirm(emp)}
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          {expandedEmployeeId === emp.id && (
                            <tr className="bg-white/5">
                              <td colSpan={7} className="px-4 py-4">
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                                  <div>
                                    <span className="block text-white/60 text-xs font-medium mb-1">Phone</span>
                                    <span className="text-white">{emp.phone ?? 'Not provided'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-white/60 text-xs font-medium mb-1">Date of Joining</span>
                                    <span className="text-white">{formatDate(emp.date_of_joining)}</span>
                                  </div>
                                  <div>
                                    <span className="block text-white/60 text-xs font-medium mb-1">Designation</span>
                                    <span className="text-white">{emp.designation ?? 'Not set'}</span>
                                  </div>
                                  <div>
                                    <span className="block text-white/60 text-xs font-medium mb-1">Status</span>
                                    <Badge variant={STATUS_BADGE[emp.status] ?? 'default'}>{emp.status}</Badge>
                                    {emp.status === 'probation' && (
                                      <span className="ml-2 text-xs text-yellow-400">Under review</span>
                                    )}
                                    {emp.status === 'on_notice' && (
                                      <span className="ml-2 text-xs text-orange-400">Notice period active</span>
                                    )}
                                    {emp.status === 'suspended' && (
                                      <span className="ml-2 text-xs text-red-400">Account suspended</span>
                                    )}
                                  </div>
                                </div>
                                <div className="mt-3 text-right">
                                  <button
                                    className="text-xs text-white/60 hover:text-white hover:underline"
                                    onClick={() => setExpandedEmployeeId(null)}
                                  >
                                    Close
                                  </button>
                                </div>
                              </td>
                            </tr>
                          )}
                          </Fragment>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      Previous
                    </Button>
                    <span className="text-sm text-white/60">Page {page} of {totalPages}</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </div>
            </GlassPanel>
          </FadeIn>
        </>
      )}

      {activeTab === 'pending' && (
        <FadeIn>
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white">Pending Registrations</h3>
            </div>
            <div className="p-6">
              {loading && (
                <div className="space-y-4">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 border border-white/10 rounded-lg">
                      <div className="w-10 h-10 rounded-full bg-white/5 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-white/5 rounded w-32 animate-pulse" />
                        <div className="h-3 bg-white/5 rounded w-48 animate-pulse" />
                      </div>
                      <div className="h-8 bg-white/5 rounded w-20 animate-pulse" />
                    </div>
                  ))}
                </div>
              )}
              {error && !loading && (
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
              {!loading && !error && pendingRegistrations.length === 0 && (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  </div>
                  <p className="text-white/60 mt-3 text-sm">No pending registrations.</p>
                  <p className="text-white/40 mt-1 text-xs">All employee registrations have been processed.</p>
                </div>
              )}
              {!loading && !error && pendingRegistrations.length > 0 && (
                <div className="space-y-4">
                  {pendingRegistrations.map((reg) => (
                    <div key={reg.id} className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-full flex items-center justify-center text-sm font-bold text-orange-400">
                            {reg.first_name[0]}{reg.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-white">{reg.first_name} {reg.last_name}</p>
                            <p className="text-sm text-white/60">{reg.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${ROLE_COLORS[reg.primary_role] ?? 'bg-white/5 text-white/70'}`}>
                                {reg.primary_role}
                              </span>
                              {reg.department && (
                                <span className="text-xs text-white/60">- {reg.department}</span>
                              )}
                              <span className="text-xs text-white/60">- Registered {formatDate(reg.created_at)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproval(reg.id, 'reject')}
                            disabled={approving === reg.id}
                            className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                          >
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproval(reg.id, 'approve', 'probation')}
                            disabled={approving === reg.id}
                          >
                            Approve (Probation)
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleApproval(reg.id, 'approve', 'active')}
                            disabled={approving === reg.id}
                          >
                            {approving === reg.id ? 'Processing...' : 'Approve (Active)'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </GlassPanel>
        </FadeIn>
      )}

      {/* ── Add Employee Modal ──────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowAddModal(false)}
            />
            <motion.div
              className="relative bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-gray-900/95 backdrop-blur-xl z-10">
                <h2 className="text-lg font-semibold text-white">Add New Employee</h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {formError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name *"
                    value={formData.firstName}
                    onChange={(e) => updateFormField('firstName', e.target.value)}
                    placeholder="John"
                  />
                  <Input
                    label="Last Name *"
                    value={formData.lastName}
                    onChange={(e) => updateFormField('lastName', e.target.value)}
                    placeholder="Doe"
                  />
                </div>

                <Input
                  label="Email *"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormField('email', e.target.value)}
                  placeholder="john.doe@company.com"
                />

                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                  placeholder="+91 98765 43210"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Department"
                    value={formData.department}
                    onChange={(e) => updateFormField('department', e.target.value)}
                    placeholder="Engineering"
                  />
                  <Input
                    label="Designation"
                    value={formData.designation}
                    onChange={(e) => updateFormField('designation', e.target.value)}
                    placeholder="Software Engineer"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Role *"
                    value={formData.role}
                    onChange={(v) => updateFormField('role', v)}
                    options={ROLE_OPTIONS}
                  />
                  <FormSelect
                    label="Gender *"
                    value={formData.gender}
                    onChange={(v) => updateFormField('gender', v)}
                    options={GENDER_OPTIONS}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Date of Joining *"
                    type="date"
                    value={formData.dateOfJoining}
                    onChange={(e) => updateFormField('dateOfJoining', e.target.value)}
                  />
                  <FormSelect
                    label="Manager"
                    value={formData.managerId}
                    onChange={(v) => updateFormField('managerId', v)}
                    options={[
                      { value: '', label: 'No manager' },
                      ...employees.map((e) => ({
                        value: e.id,
                        label: `${e.first_name} ${e.last_name}`,
                      })),
                    ]}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
                <Button variant="outline" onClick={() => setShowAddModal(false)} disabled={formSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleAddEmployee} disabled={formSubmitting} className="gap-2">
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formSubmitting ? 'Creating...' : 'Add Employee'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Edit Employee Modal ─────────────────────────────────────────── */}
      <AnimatePresence>
        {showEditModal && editingEmployee && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowEditModal(false)}
            />
            <motion.div
              className="relative bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto backdrop-blur-xl"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 sticky top-0 bg-gray-900/95 backdrop-blur-xl z-10">
                <h2 className="text-lg font-semibold text-white">
                  Edit Employee: {editingEmployee.first_name} {editingEmployee.last_name}
                </h2>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-white/60"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="px-6 py-5 space-y-4">
                {formError && (
                  <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="First Name"
                    value={formData.firstName}
                    onChange={(e) => updateFormField('firstName', e.target.value)}
                  />
                  <Input
                    label="Last Name"
                    value={formData.lastName}
                    onChange={(e) => updateFormField('lastName', e.target.value)}
                  />
                </div>

                <Input
                  label="Email"
                  type="email"
                  value={formData.email}
                  disabled
                  helperText="Email cannot be changed."
                />

                <Input
                  label="Phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => updateFormField('phone', e.target.value)}
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Department"
                    value={formData.department}
                    onChange={(e) => updateFormField('department', e.target.value)}
                  />
                  <Input
                    label="Designation"
                    value={formData.designation}
                    onChange={(e) => updateFormField('designation', e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormSelect
                    label="Role"
                    value={formData.role}
                    onChange={(v) => updateFormField('role', v)}
                    options={ROLE_OPTIONS}
                  />
                  <FormSelect
                    label="Status"
                    value={formData.status}
                    onChange={(v) => updateFormField('status', v)}
                    options={STATUS_OPTIONS}
                  />
                </div>

                <FormSelect
                  label="Manager"
                  value={formData.managerId}
                  onChange={(v) => updateFormField('managerId', v)}
                  options={[
                    { value: '', label: 'No manager' },
                    ...employees
                      .filter((e) => e.id !== editingEmployee.id)
                      .map((e) => ({
                        value: e.id,
                        label: `${e.first_name} ${e.last_name}`,
                      })),
                  ]}
                />
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5">
                <Button variant="outline" onClick={() => setShowEditModal(false)} disabled={formSubmitting}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={handleEditEmployee} disabled={formSubmitting} className="gap-2">
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formSubmitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Deactivate Confirmation Dialog ──────────────────────────────── */}
      <AnimatePresence>
        {showDeactivateConfirm && deactivatingEmployee && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowDeactivateConfirm(false)}
            />
            <motion.div
              className="relative bg-gray-900/95 border border-white/10 rounded-2xl shadow-2xl w-full max-w-md backdrop-blur-xl"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div className="px-6 py-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Deactivate Employee</h2>
                </div>
                <p className="text-sm text-white/60 mb-1">
                  Are you sure you want to deactivate this employee?
                </p>
                <p className="text-sm font-medium text-white mb-4">
                  {deactivatingEmployee.first_name} {deactivatingEmployee.last_name} ({deactivatingEmployee.email})
                </p>
                <p className="text-xs text-white/40">
                  This will set the employee&apos;s status to terminated. This action can be reversed by editing the employee later.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/10 bg-white/5 rounded-b-2xl">
                <Button
                  variant="outline"
                  onClick={() => setShowDeactivateConfirm(false)}
                  disabled={formSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  onClick={handleDeactivateEmployee}
                  disabled={formSubmitting}
                  className="gap-2"
                >
                  {formSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {formSubmitting ? 'Deactivating...' : 'Deactivate'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Invite by Email Modal ───────────────────────────────────────── */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            key="invite-overlay"
            variants={overlayVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              key="invite-modal"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="bg-gray-900/95 border border-white/10 rounded-xl shadow-2xl w-full max-w-md p-6 backdrop-blur-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Invite Employee by Email</h2>
                <button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-white/10 rounded-md text-white/60">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {inviteSuccess && (
                <div className="mb-4 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {inviteSuccess}
                </div>
              )}

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setInviteSubmitting(true);
                  setFormError('');
                  setInviteSuccess('');
                  try {
                    const res = await fetch('/api/hr/invites', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      credentials: 'include',
                      body: JSON.stringify({
                        email: inviteEmail,
                        role: inviteRole,
                        department: inviteDepartment || undefined,
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      setFormError(data.error || 'Failed to send invite');
                      return;
                    }
                    setInviteSuccess(`Invite sent to ${inviteEmail}`);
                    setInviteEmail('');
                    setInviteRole('employee');
                    setInviteDepartment('');
                  } catch {
                    setFormError('Failed to send invite');
                  } finally {
                    setInviteSubmitting(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Email Address</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="employee@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Role</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Department (optional)</label>
                  <Input
                    type="text"
                    value={inviteDepartment}
                    onChange={(e) => setInviteDepartment(e.target.value)}
                    placeholder="Engineering, Sales, etc."
                  />
                </div>

                {formError && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 text-red-400 text-sm">
                    {formError}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" type="button" onClick={() => setShowInviteModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={inviteSubmitting}>
                    {inviteSubmitting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                    {inviteSubmitting ? 'Sending...' : 'Send Invite'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </StaggerContainer>
  );
}
