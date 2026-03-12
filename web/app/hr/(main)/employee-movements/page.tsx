'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  ArrowRightLeft,
  TrendingUp,
  Check,
  X,
  Plus,
  Inbox,
  CheckCircle,
  AlertCircle,
  Clock,
  Search,
  ArrowRight,
  Users,
  Award,
  Briefcase,
  Building2,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface Movement {
  id: string;
  emp_id: string;
  type: 'transfer' | 'promotion' | 'role_change' | 'department_change';
  from_value: string;
  to_value: string;
  effective_date: string;
  status: 'pending' | 'approved' | 'rejected';
  approved_by: string | null;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    designation: string | null;
    primary_role: string;
  };
  approver: {
    first_name: string;
    last_name: string;
  } | null;
}

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  designation: string | null;
  primary_role: string;
}

interface MovementFormData {
  emp_id: string;
  type: 'transfer' | 'promotion' | 'role_change' | 'department_change';
  from_value: string;
  to_value: string;
  effective_date: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const EMPTY_FORM: MovementFormData = {
  emp_id: '',
  type: 'transfer',
  from_value: '',
  to_value: '',
  effective_date: '',
};

const TYPE_BADGE: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  transfer: 'info',
  promotion: 'success',
  role_change: 'warning',
  department_change: 'default',
};

const TYPE_LABELS: Record<string, string> = {
  transfer: 'Transfer',
  promotion: 'Promotion',
  role_change: 'Role Change',
  department_change: 'Dept Change',
};

const TYPE_ICONS: Record<string, typeof ArrowRightLeft> = {
  transfer: ArrowRightLeft,
  promotion: Award,
  role_change: Briefcase,
  department_change: Building2,
};

const STATUS_BADGE: Record<string, 'warning' | 'success' | 'danger'> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const MOVEMENT_TYPE_OPTIONS = [
  { value: 'transfer', label: 'Transfer' },
  { value: 'promotion', label: 'Promotion' },
  { value: 'role_change', label: 'Role Change' },
  { value: 'department_change', label: 'Department Change' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getAutoFromValue(emp: EmployeeOption | null, type: string): string {
  if (!emp) return '';
  switch (type) {
    case 'department_change':
      return emp.department ?? '';
    case 'role_change':
      return emp.primary_role ?? '';
    case 'promotion':
      return emp.designation ?? '';
    case 'transfer':
      return emp.department ?? '';
    default:
      return '';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

export default function EmployeeMovementsPage() {
  // Auth
  const [authReady, setAuthReady] = useState(false);

  // Data
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  // Modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [formData, setFormData] = useState<MovementFormData>(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Employee search for modal
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [employeeOptions, setEmployeeOptions] = useState<EmployeeOption[]>([]);
  const [employeeSearchLoading, setEmployeeSearchLoading] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeOption | null>(null);
  const [showEmployeeDropdown, setShowEmployeeDropdown] = useState(false);

  // Action
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Summary counts
  const [summary, setSummary] = useState({ total: 0, pending: 0, approvedThisMonth: 0, rejected: 0 });

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
    return () => { cancelled = true; };
  }, []);

  // ── Data Loading ─────────────────────────────────────────────────────────

  const loadMovements = useCallback(async (p: number, status: string, type: string) => {
    if (!authReady) return;
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (status) params.set('status', status);
      if (type) params.set('type', type);
      const res = await fetch(`/api/employee-movements?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load movements');
        return;
      }
      setMovements(json.movements);
      setTotalPages(json.pagination.pages || 1);
      setTotal(json.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, [authReady]);

  const loadSummary = useCallback(async () => {
    if (!authReady) return;
    try {
      // Fetch counts for summary cards
      const [allRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
        fetch('/api/employee-movements?limit=1', { credentials: 'include' }),
        fetch('/api/employee-movements?limit=1&status=pending', { credentials: 'include' }),
        fetch('/api/employee-movements?limit=1&status=approved', { credentials: 'include' }),
        fetch('/api/employee-movements?limit=1&status=rejected', { credentials: 'include' }),
      ]);

      const [allJson, pendingJson, approvedJson, rejectedJson] = await Promise.all([
        allRes.json(),
        pendingRes.json(),
        approvedRes.json(),
        rejectedRes.json(),
      ]);

      setSummary({
        total: allJson.pagination?.total ?? 0,
        pending: pendingJson.pagination?.total ?? 0,
        approvedThisMonth: approvedJson.pagination?.total ?? 0,
        rejected: rejectedJson.pagination?.total ?? 0,
      });
    } catch {
      // Silently fail summary - non-critical
    }
  }, [authReady]);

  useEffect(() => {
    if (!authReady) return;
    loadMovements(page, statusFilter, typeFilter);
  }, [page, statusFilter, typeFilter, loadMovements, authReady]);

  useEffect(() => {
    if (authReady) loadSummary();
  }, [authReady, loadSummary]);

  // Auto-dismiss status messages
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  // ── Employee Search for Modal ────────────────────────────────────────────

  useEffect(() => {
    if (!showCreateModal || !employeeSearch.trim()) {
      setEmployeeOptions([]);
      return;
    }
    const timer = setTimeout(async () => {
      setEmployeeSearchLoading(true);
      try {
        const params = new URLSearchParams({ search: employeeSearch, limit: '10' });
        const res = await fetch(`/api/employees?${params}`, { credentials: 'include' });
        const json = await res.json();
        if (res.ok) {
          setEmployeeOptions(json.employees ?? []);
          setShowEmployeeDropdown(true);
        }
      } finally {
        setEmployeeSearchLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [employeeSearch, showCreateModal]);

  // Auto-fill from_value when employee or type changes
  useEffect(() => {
    if (selectedEmployee && formData.type) {
      const autoFrom = getAutoFromValue(selectedEmployee, formData.type);
      setFormData((prev) => ({ ...prev, from_value: autoFrom }));
    }
  }, [selectedEmployee, formData.type]);

  // ── Actions ──────────────────────────────────────────────────────────────

  function showMessage(type: 'success' | 'error', text: string) {
    setStatusMessage({ type, text });
  }

  async function handleCreate() {
    setFormError('');

    if (!formData.emp_id) {
      setFormError('Please select an employee.');
      return;
    }
    if (!formData.to_value.trim()) {
      setFormError('To value is required.');
      return;
    }
    if (!formData.effective_date) {
      setFormError('Effective date is required.');
      return;
    }

    setFormSubmitting(true);
    try {
      const res = await fetch('/api/employee-movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emp_id: formData.emp_id,
          type: formData.type,
          from_value: formData.from_value,
          to_value: formData.to_value,
          effective_date: new Date(formData.effective_date).toISOString(),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? 'Failed to create movement.');
        return;
      }
      setShowCreateModal(false);
      setFormData(EMPTY_FORM);
      setSelectedEmployee(null);
      setEmployeeSearch('');
      showMessage('success', 'Movement created successfully.');
      loadMovements(page, statusFilter, typeFilter);
      loadSummary();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleAction(movementId: string, action: 'approve' | 'reject') {
    setActionLoading(movementId + action);
    try {
      const res = await fetch('/api/employee-movements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: movementId, action }),
      });
      const json = await res.json();
      if (res.ok) {
        setMovements((prev) =>
          prev.map((m) =>
            m.id === movementId
              ? { ...m, status: action === 'approve' ? 'approved' : 'rejected' }
              : m
          )
        );
        const mov = movements.find((m) => m.id === movementId);
        showMessage(
          'success',
          `${action === 'approve' ? 'Approved' : 'Rejected'} movement for ${mov?.employee.first_name ?? 'employee'}`
        );
        loadSummary();
      } else {
        showMessage('error', json.error ?? `Failed to ${action} movement.`);
      }
    } catch {
      showMessage('error', `Network error while trying to ${action} movement.`);
    } finally {
      setActionLoading(null);
    }
  }

  function openCreateModal() {
    setFormData(EMPTY_FORM);
    setFormError('');
    setSelectedEmployee(null);
    setEmployeeSearch('');
    setEmployeeOptions([]);
    setShowCreateModal(true);
  }

  function selectEmployee(emp: EmployeeOption) {
    setSelectedEmployee(emp);
    setFormData((prev) => ({ ...prev, emp_id: emp.id }));
    setEmployeeSearch(`${emp.first_name} ${emp.last_name}`);
    setShowEmployeeDropdown(false);
  }

  // ── Loading / Auth Gate ──────────────────────────────────────────────────

  if (!authReady) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton variant="button" className="w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton variant="circular" className="w-8 h-8" />
              </div>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5">
          <div className="flex gap-4 p-4 border-b border-white/10">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-4 flex-1" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-white/10 last:border-0">
              {Array.from({ length: 6 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────

  const SUMMARY_CARDS = [
    {
      label: 'Total Movements',
      value: summary.total,
      icon: ArrowRightLeft,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Pending',
      value: summary.pending,
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
    },
    {
      label: 'Approved',
      value: summary.approvedThisMonth,
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
    },
    {
      label: 'Rejected',
      value: summary.rejected,
      icon: X,
      color: 'text-red-400',
      bg: 'bg-red-500/10',
    },
  ];

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Employee Movements"
        description="Manage transfers, promotions, role changes, and department changes"
        icon={<ArrowRightLeft className="w-6 h-6 text-primary" />}
        action={
          <Button onClick={openCreateModal}>
            <Plus className="w-4 h-4" />
            New Movement
          </Button>
        }
      />

      {/* Summary Cards */}
      <FadeIn>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SUMMARY_CARDS.map((card) => {
            const Icon = card.icon;
            return (
              <GlassPanel key={card.label} interactive>
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white/60">{card.label}</p>
                      <p className="text-2xl font-bold text-white mt-1">{card.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                </div>
              </GlassPanel>
            );
          })}
        </div>
      </FadeIn>

      {/* Filters */}
      <FadeIn>
        <div className="flex flex-wrap items-center gap-3">
          {/* Status filter tabs */}
          <div className="flex gap-2 flex-wrap">
            {[
              { value: '', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
            ].map((f) => (
              <button
                key={f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  statusFilter === f.value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="w-px h-6 bg-white/10 hidden sm:block" />

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          >
            <option value="">All Types</option>
            {MOVEMENT_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </FadeIn>

      {/* Status Message */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {statusMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table / Content */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                {statusFilter
                  ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' '
                  : 'All '}
                Movements
              </h3>
              {total > 0 && (
                <span className="text-sm text-white/60">{total} total</span>
              )}
            </div>
          </div>
          <div className="p-6">
            {/* Loading state */}
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex gap-4 items-center">
                    <Skeleton variant="circular" className="w-8 h-8" />
                    <Skeleton className="h-4 flex-1" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton variant="badge" className="w-16" />
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && movements.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-white/60 mt-3 text-sm">No movements found.</p>
                <Button variant="outline" size="sm" className="mt-3" onClick={openCreateModal}>
                  <Plus className="w-3.5 h-3.5" />
                  Create First Movement
                </Button>
              </div>
            )}

            {/* Desktop Table */}
            {!loading && !error && movements.length > 0 && (
              <>
                {/* Desktop view */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 pr-4 text-white/60 font-medium">Employee</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Type</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">From / To</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Effective Date</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Status</th>
                        <th className="text-left py-3 pl-2 text-white/60 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movements.map((mov) => {
                        const TypeIcon = TYPE_ICONS[mov.type] ?? ArrowRightLeft;
                        return (
                          <tr
                            key={mov.id}
                            className="border-b border-white/10 hover:bg-white/5 transition-colors"
                          >
                            <td className="py-3 pr-4">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                  {mov.employee.first_name[0]}{mov.employee.last_name[0]}
                                </div>
                                <div>
                                  <p className="font-medium text-white">
                                    {mov.employee.first_name} {mov.employee.last_name}
                                  </p>
                                  <p className="text-xs text-white/60">{mov.employee.department ?? '\u2014'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={TYPE_BADGE[mov.type] ?? 'default'}>
                                <TypeIcon className="w-3 h-3 mr-1" />
                                {TYPE_LABELS[mov.type] ?? mov.type}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <div className="flex items-center gap-1.5 text-white">
                                <span className="text-white/60">{mov.from_value || '\u2014'}</span>
                                <ArrowRight className="w-3.5 h-3.5 text-white/60 shrink-0" />
                                <span className="font-medium">{mov.to_value}</span>
                              </div>
                            </td>
                            <td className="py-3 px-2 text-white/60">
                              {formatDate(mov.effective_date)}
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={STATUS_BADGE[mov.status] ?? 'default'}>
                                {mov.status}
                              </Badge>
                            </td>
                            <td className="py-3 pl-2">
                              {mov.status === 'pending' ? (
                                <div className="flex gap-2">
                                  <Button
                                    variant="success"
                                    size="sm"
                                    loading={actionLoading === mov.id + 'approve'}
                                    disabled={!!actionLoading}
                                    onClick={() => handleAction(mov.id, 'approve')}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    loading={actionLoading === mov.id + 'reject'}
                                    disabled={!!actionLoading}
                                    onClick={() => handleAction(mov.id, 'reject')}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Reject
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-xs text-white/60">
                                  {mov.approver
                                    ? `by ${mov.approver.first_name} ${mov.approver.last_name}`
                                    : '\u2014'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {movements.map((mov) => {
                    const TypeIcon = TYPE_ICONS[mov.type] ?? ArrowRightLeft;
                    return (
                      <GlassPanel key={mov.id}>
                        <div className="p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {mov.employee.first_name[0]}{mov.employee.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-white text-sm">
                                  {mov.employee.first_name} {mov.employee.last_name}
                                </p>
                                <p className="text-xs text-white/60">{mov.employee.department ?? '\u2014'}</p>
                              </div>
                            </div>
                            <Badge variant={STATUS_BADGE[mov.status] ?? 'default'} size="sm">
                              {mov.status}
                            </Badge>
                          </div>

                          <div className="space-y-2 mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={TYPE_BADGE[mov.type] ?? 'default'} size="sm">
                                <TypeIcon className="w-3 h-3 mr-1" />
                                {TYPE_LABELS[mov.type] ?? mov.type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <span className="text-white/60">{mov.from_value || '\u2014'}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-white/60 shrink-0" />
                              <span className="font-medium text-white">{mov.to_value}</span>
                            </div>
                            <p className="text-xs text-white/60">
                              Effective: {formatDate(mov.effective_date)}
                            </p>
                          </div>

                          {mov.status === 'pending' && (
                            <div className="flex gap-2 pt-2 border-t border-white/10">
                              <Button
                                variant="success"
                                size="sm"
                                className="flex-1"
                                loading={actionLoading === mov.id + 'approve'}
                                disabled={!!actionLoading}
                                onClick={() => handleAction(mov.id, 'approve')}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="flex-1"
                                loading={actionLoading === mov.id + 'reject'}
                                disabled={!!actionLoading}
                                onClick={() => handleAction(mov.id, 'reject')}
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      </GlassPanel>
                    );
                  })}
                </div>
              </>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <span className="text-sm text-white/60">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Create Movement Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="New Employee Movement"
        description="Create a transfer, promotion, role change, or department change."
        size="lg"
      >
        <div className="space-y-4">
          {/* Employee Search */}
          <div className="relative">
            <label className="block text-sm font-medium text-white mb-1.5">Employee</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
              <input
                type="text"
                value={employeeSearch}
                onChange={(e) => {
                  setEmployeeSearch(e.target.value);
                  setSelectedEmployee(null);
                  setFormData((prev) => ({ ...prev, emp_id: '', from_value: '' }));
                  if (!e.target.value.trim()) setShowEmployeeDropdown(false);
                }}
                onFocus={() => { if (employeeOptions.length > 0) setShowEmployeeDropdown(true); }}
                placeholder="Search by name or email..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              />
              {employeeSearchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <svg className="animate-spin h-4 w-4 text-white/60" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Dropdown */}
            {showEmployeeDropdown && employeeOptions.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-lg border border-white/10 bg-white/5/90 dark:bg-black/80 backdrop-blur-xl shadow-lg max-h-48 overflow-y-auto">
                {employeeOptions.map((emp) => (
                  <button
                    key={emp.id}
                    type="button"
                    onClick={() => selectEmployee(emp)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-white/5 transition-colors flex items-center gap-2"
                  >
                    <div className="w-6 h-6 bg-primary/10 rounded-full flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                      {emp.first_name[0]}{emp.last_name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {emp.first_name} {emp.last_name}
                      </p>
                      <p className="text-xs text-white/60 truncate">
                        {emp.department ?? 'No dept'} &middot; {emp.designation ?? emp.primary_role}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
            {selectedEmployee && (
              <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                Selected: {selectedEmployee.first_name} {selectedEmployee.last_name}
              </p>
            )}
          </div>

          {/* Movement Type */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Type</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData((prev) => ({ ...prev, type: e.target.value as MovementFormData['type'] }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              {MOVEMENT_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* From Value */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              From Value
              <span className="text-white/60 font-normal ml-1">(auto-filled)</span>
            </label>
            <input
              type="text"
              value={formData.from_value}
              onChange={(e) => setFormData((prev) => ({ ...prev, from_value: e.target.value }))}
              placeholder={selectedEmployee ? 'Current value' : 'Select an employee first'}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          {/* To Value */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">To Value</label>
            <input
              type="text"
              value={formData.to_value}
              onChange={(e) => setFormData((prev) => ({ ...prev, to_value: e.target.value }))}
              placeholder={
                formData.type === 'department_change'
                  ? 'New department name'
                  : formData.type === 'role_change'
                  ? 'New role (e.g. manager, team_lead)'
                  : formData.type === 'promotion'
                  ? 'New designation / title'
                  : 'New location or unit'
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          {/* Effective Date */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">Effective Date</label>
            <input
              type="date"
              value={formData.effective_date}
              onChange={(e) => setFormData((prev) => ({ ...prev, effective_date: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          {/* Form Error */}
          {formError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {formError}
            </div>
          )}
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={formSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleCreate} loading={formSubmitting}>
            <Plus className="w-4 h-4" />
            Create Movement
          </Button>
        </ModalFooter>
      </Modal>
    </StaggerContainer>
  );
}
