'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { TabButton } from '@/components/tab-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Inbox,
  Check,
  X,
  CheckCircle,
  AlertCircle,
  Filter,
  ChevronDown,
  ChevronUp,
  Search,
  Download,
  FileText,
} from 'lucide-react';
import { downloadCSVLegacy, downloadPDF } from '@/lib/report-export';
import { Input, Select } from '@/components/ui/input';

interface ConstraintViolation {
  rule_id: string;
  rule_name: string;
  level: 'error' | 'warning' | 'info';
  message: string;
}

interface ConstraintResult {
  hasViolations: boolean;
  hasWarnings: boolean;
  isEligible: boolean;
  confidence: number;
  violations: ConstraintViolation[];
  warnings: ConstraintViolation[];
  recommendation?: string;
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
  approver_comments: string | null;
  sla_breached: boolean;
  constraint_result: ConstraintResult | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    designation: string | null;
  };
  approver: {
    first_name: string;
    last_name: string;
  } | null;
}

interface BulkResult {
  requestId: string;
  success: boolean;
  error?: string;
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  escalated: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  draft: 'info',
};

export default function LeaveRequestsView() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ successCount: number; failCount: number; action: string } | null>(null);

  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');

  // Detail drawer
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);

  // Success/error messages
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Selectable rows (only pending or escalated)
  const selectableRequests = useMemo(
    () => requests.filter((r) => r.status === 'pending' || r.status === 'escalated'),
    [requests]
  );

  // Unique departments and leave types from loaded requests for filter dropdowns
  const departments = useMemo(() => {
    const deps = new Set<string>();
    requests.forEach((r) => {
      if (r.employee.department) deps.add(r.employee.department);
    });
    return Array.from(deps).sort();
  }, [requests]);

  const leaveTypes = useMemo(() => {
    const types = new Set<string>();
    requests.forEach((r) => {
      if (r.leave_type) types.add(r.leave_type);
    });
    return Array.from(types).sort();
  }, [requests]);

  // Filtered requests (client-side filters on top of server-side status filter)
  const filteredRequests = useMemo(() => {
    let result = requests;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) =>
        `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase().includes(q) ||
        r.employee.department?.toLowerCase().includes(q)
      );
    }
    if (dateFrom) {
      const from = dateFrom;
      result = result.filter((r) => r.start_date.split('T')[0] >= from);
    }
    if (dateTo) {
      const to = dateTo;
      result = result.filter((r) => r.end_date.split('T')[0] <= to);
    }
    if (departmentFilter) {
      result = result.filter((r) =>
        r.employee.department?.toLowerCase().includes(departmentFilter.toLowerCase())
      );
    }
    if (leaveTypeFilter) {
      result = result.filter((r) => r.leave_type === leaveTypeFilter);
    }

    return result;
  }, [requests, searchQuery, dateFrom, dateTo, departmentFilter, leaveTypeFilter]);

  // Selectable from filtered results
  const filteredSelectableIds = useMemo(
    () => new Set(filteredRequests.filter((r) => r.status === 'pending' || r.status === 'escalated').map((r) => r.id)),
    [filteredRequests]
  );

  const allSelectableSelected = filteredSelectableIds.size > 0 && [...filteredSelectableIds].every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0;

  const loadRequests = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/leaves/list?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load requests');
        return;
      }
      setRequests(json.requests);
      setTotalPages(json.pagination.pages || 1);
      setTotal(json.pagination.total || 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(page, statusFilter);
    // Clear selection when page/filter changes
    setSelectedIds(new Set());
    setBulkResult(null);
  }, [page, statusFilter, loadRequests]);

  function showMessage(type: 'success' | 'error', text: string) {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  }

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(requestId + action);
    try {
      const isApproval = action === 'approve';
      const requestBody = isApproval
        ? { action: 'approve' }
        : { comments: null };
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) =>
            r.id === requestId ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
          )
        );
        // Remove from selection if selected
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
        const req = requests.find((r) => r.id === requestId);
        showMessage('success', `${action === 'approve' ? 'Approved' : 'Rejected'} request for ${req?.employee.first_name ?? 'employee'}`);
      } else {
        const data = await res.json().catch(() => ({}));
        showMessage('error', data.error ?? `Failed to ${action} request`);
      }
    } catch {
      showMessage('error', `Network error while trying to ${action} request`);
    } finally {
      setActionLoading(null);
    }
  }

  // Bulk action handler
  async function handleBulkAction(action: 'approve' | 'reject') {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;

    setBulkLoading(true);
    setBulkResult(null);
    try {
      const res = await fetch('/api/leaves/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ requestIds: ids, action }),
      });

      if (res.ok) {
        const data = await res.json() as { results: BulkResult[]; successCount: number; failCount: number };
        setBulkResult({ successCount: data.successCount, failCount: data.failCount, action });

        // Update request statuses locally for successful ones
        const successIds = new Set(data.results.filter((r) => r.success).map((r) => r.requestId));
        setRequests((prev) =>
          prev.map((r) =>
            successIds.has(r.id) ? { ...r, status: action === 'approve' ? 'approved' : 'rejected' } : r
          )
        );
        // Clear selection
        setSelectedIds(new Set());

        showMessage(
          data.failCount > 0 ? 'error' : 'success',
          `Bulk ${action}: ${data.successCount} succeeded${data.failCount > 0 ? `, ${data.failCount} failed` : ''}`
        );
      } else {
        const data = await res.json().catch(() => ({}));
        showMessage('error', data.error ?? `Bulk ${action} failed`);
      }
    } catch {
      showMessage('error', `Network error during bulk ${action}`);
    } finally {
      setBulkLoading(false);
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelectableSelected) {
      // Deselect all
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredSelectableIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      // Select all pending/escalated in filtered results
      setSelectedIds((prev) => {
        const next = new Set(prev);
        filteredSelectableIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function clearFilters() {
    setSearchQuery('');
    setDateFrom('');
    setDateTo('');
    setDepartmentFilter('');
    setLeaveTypeFilter('');
  }

  const hasActiveFilters = searchQuery || dateFrom || dateTo || departmentFilter || leaveTypeFilter;

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }

  return (
    <>
      <StaggerContainer className="space-y-6">
        <PageHeader
          title="Leave Requests"
          description={total > 0 ? total + ' requests' : 'Manage leave requests'}
          icon={<Inbox className="w-6 h-6 text-primary" />}
          action={
          <div className="flex items-center gap-2">
            <Button
              onClick={() => {
                if (filteredRequests.length === 0) return;
                downloadCSVLegacy(
                  ['Employee', 'Department', 'Leave Type', 'Start Date', 'End Date', 'Days', 'Status', 'Reason'],
                  filteredRequests.map((r) => [
                    `${r.employee.first_name} ${r.employee.last_name}`,
                    r.employee.department ?? '',
                    r.leave_type,
                    r.start_date.split('T')[0],
                    r.end_date.split('T')[0],
                    r.total_days,
                    r.status,
                    r.reason ?? '',
                  ]),
                  `leave-requests-${statusFilter || 'all'}.csv`,
                );
              }}
              disabled={filteredRequests.length === 0}
              className="inline-flex items-center gap-1.5 border border-[var(--border)] text-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              CSV
            </Button>
            <Button
              onClick={() => {
                if (filteredRequests.length === 0) return;
                downloadPDF(
                  `Leave Requests — ${statusFilter || 'All'}`,
                  [{
                    title: `${statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) : 'All'} Requests`,
                    columns: ['Employee', 'Department', 'Type', 'Start', 'End', 'Days', 'Status'],
                    rows: filteredRequests.map((r) => [
                      `${r.employee.first_name} ${r.employee.last_name}`,
                      r.employee.department ?? '',
                      r.leave_type,
                      r.start_date.split('T')[0],
                      r.end_date.split('T')[0],
                      r.total_days,
                      r.status,
                    ]),
                  }],
                  `leave-requests-${statusFilter || 'all'}`,
                  [`Total: ${filteredRequests.length} requests`],
                );
              }}
              disabled={filteredRequests.length === 0}
              className="inline-flex items-center gap-1.5 border border-[var(--border)] text-foreground px-3 py-2 rounded-lg text-sm font-medium hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              PDF
            </Button>
          </div>
        }
      />

      {/* Search Bar */}
      <FadeIn>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name or department..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          />
        </div>
      </FadeIn>

      {/* Status Filters */}
      <FadeIn>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'pending', label: 'Pending' },
              { value: 'escalated', label: 'Escalated' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: '', label: 'All' },
            ].map((f) => (
              <TabButton
                key={f.value}
                active={statusFilter === f.value}
                onClick={() => { setStatusFilter(f.value); setPage(1); }}
              >
                {f.label}
              </TabButton>
            ))}
          </div>

          <Button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-[var(--bg-surface-hover)] text-muted-foreground hover:bg-[var(--accent)] border border-transparent'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </Button>
        </div>
      </FadeIn>

      {/* Advanced Filters Panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            <GlassPanel>
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Date From */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      From Date
                    </label>
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      To Date
                    </label>
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Department Filter */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Department
                    </label>
                    <Select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    >
                      <option value="">All departments</option>
                      {departments.map((dep) => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </Select>
                  </div>

                  {/* Leave Type Filter */}
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1.5">
                      Leave Type
                    </label>
                    <Select
                      value={leaveTypeFilter}
                      onChange={(e) => setLeaveTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--border)] bg-[var(--bg-surface-hover)] text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    >
                      <option value="">All types</option>
                      {leaveTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Showing {filteredRequests.length} of {requests.length} loaded requests
                    </p>
                    <Button
                      onClick={clearFilters}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Clear all filters
                    </Button>
                  </div>
                )}
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Message */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {actionMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Result Summary */}
      <AnimatePresence>
        {bulkResult && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <GlassPanel>
              <div className="py-3 px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-600" />
                    <span className="text-foreground">
                      Bulk {bulkResult.action}:{' '}
                      <span className="font-semibold text-emerald-600">{bulkResult.successCount} succeeded</span>
                      {bulkResult.failCount > 0 && (
                        <>, <span className="font-semibold text-red-600">{bulkResult.failCount} failed</span></>
                      )}
                    </span>
                  </div>
                  <Button
                    onClick={() => setBulkResult(null)}
                    className="text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>

      <FadeIn>
        <GlassPanel>
          <div className="p-6 pb-0">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' ' : 'All '}
                Requests
              </h2>
              {statusFilter === 'pending' && total > 0 && (
                <Badge variant="warning">{total} pending</Badge>
              )}
            </div>
          </div>
          <div className="p-6">
            {loading && <div className="py-12 text-center text-sm text-muted-foreground">Loading...</div>}
            {error && !loading && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {!loading && !error && filteredRequests.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-[var(--bg-surface-hover)] flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mt-3 text-sm">
                  {hasActiveFilters ? 'No requests match your filters.' : 'No leave requests found.'}
                </p>
                {hasActiveFilters && (
                  <Button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary/80 font-medium mt-2 transition-colors"
                  >
                    Clear filters
                  </Button>
                )}
              </div>
            )}
            {!loading && !error && filteredRequests.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)]">
                      {/* Select All checkbox */}
                      <th className="py-3 pr-2 w-10">
                        {selectableRequests.length > 0 && (
                          <input
                            type="checkbox"
                            checked={allSelectableSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-[var(--border)] text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                            title="Select all pending requests"
                          />
                        )}
                      </th>
                      <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Employee</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Dates</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Days</th>
                      <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                      <th className="text-left py-3 pl-2 text-muted-foreground font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => {
                      const isSelectable = req.status === 'pending' || req.status === 'escalated';
                      const isSelected = selectedIds.has(req.id);

                      return (
                        <tr
                          key={req.id}
                          className={`border-b border-[var(--border)] transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-primary/5 hover:bg-primary/10'
                              : selectedRequest?.id === req.id
                              ? 'bg-[var(--accent)]'
                              : 'hover:bg-[var(--bg-surface-hover)]'
                          }`}
                          onClick={(e) => {
                            // Don't open drawer when clicking checkbox or action buttons
                            const target = e.target as HTMLElement;
                            if (target.closest('input[type="checkbox"]') || target.closest('button')) return;
                            setSelectedRequest(req);
                          }}
                        >
                          {/* Checkbox */}
                          <td className="py-3 pr-2">
                            {isSelectable && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(req.id)}
                                className="h-4 w-4 rounded border-[var(--border)] text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                              />
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {req.employee.first_name[0]}{req.employee.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">
                                  {req.employee.first_name} {req.employee.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground">{req.employee.department ?? '\u2014'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 font-medium text-foreground">{req.leave_type}</td>
                          <td className="py-3 px-2 text-muted-foreground">
                            {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                          </td>
                          <td className="py-3 px-2 text-muted-foreground">{req.total_days}</td>
                          <td className="py-3 px-2">
                            <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>{req.status}</Badge>
                          </td>
                          <td className="py-3 pl-2">
                            {isSelectable ? (
                              <div className="flex gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  loading={actionLoading === req.id + 'approve'}
                                  disabled={!!actionLoading || bulkLoading}
                                  onClick={() => handleAction(req.id, 'approve')}
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  loading={actionLoading === req.id + 'reject'}
                                  disabled={!!actionLoading || bulkLoading}
                                  onClick={() => handleAction(req.id, 'reject')}
                                >
                                  <X className="w-3.5 h-3.5" />
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{'\u2014'}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]">
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
                <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>
                  Next
                </Button>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Floating Bulk Action Bar */}
      <AnimatePresence>
        {someSelected && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring' as const, stiffness: 300, damping: 24 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
          >
            <GlassPanel className="shadow-2xl">
              <div className="py-3 px-5">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-foreground whitespace-nowrap">
                    {selectedIds.size} selected
                  </span>
                  <div className="w-px h-6 bg-[var(--accent)]" />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="success"
                      size="sm"
                      loading={bulkLoading}
                      disabled={bulkLoading}
                      onClick={() => handleBulkAction('approve')}
                    >
                      <Check className="w-3.5 h-3.5" />
                      Approve Selected
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      loading={bulkLoading}
                      disabled={bulkLoading}
                      onClick={() => handleBulkAction('reject')}
                    >
                      <X className="w-3.5 h-3.5" />
                      Reject Selected
                    </Button>
                  </div>
                  <div className="w-px h-6 bg-[var(--accent)]" />
                  <Button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
      </StaggerContainer>

    {/* ── AI Constraint Detail Drawer ── */}
    <AnimatePresence>
      {selectedRequest && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={() => setSelectedRequest(null)}
          />
          {/* Side panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 340, damping: 30 }}
            className="fixed right-0 top-0 z-50 h-full w-full max-w-[480px] bg-[var(--card)] border-l border-[var(--border)] flex flex-col shadow-2xl overflow-hidden"
          >
            {/* Drawer header */}
            <div className="flex items-start justify-between p-5 border-b border-[var(--border)]">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={STATUS_BADGE[selectedRequest.status] ?? 'default'}>
                    {selectedRequest.status}
                  </Badge>
                  {selectedRequest.sla_breached && (
                    <Badge variant="danger">SLA Breached</Badge>
                  )}
                </div>
                <h2 className="text-base font-semibold">
                  {selectedRequest.employee.first_name} {selectedRequest.employee.last_name}
                </h2>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {selectedRequest.employee.designation ?? selectedRequest.employee.department ?? 'Employee'}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRequest(null)}
                className="p-1.5 rounded-md hover:bg-[var(--accent)] transition-colors text-[var(--muted-foreground)]"
                aria-label="Close detail panel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* Leave details */}
              <section>
                <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-3">Leave Details</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-[var(--muted)] rounded-lg p-3">
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-0.5">Type</p>
                    <p className="font-semibold">{selectedRequest.leave_type}</p>
                  </div>
                  <div className="bg-[var(--muted)] rounded-lg p-3">
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-0.5">Duration</p>
                    <p className="font-semibold">{selectedRequest.total_days} day{selectedRequest.total_days !== 1 ? 's' : ''}</p>
                  </div>
                  <div className="bg-[var(--muted)] rounded-lg p-3">
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-0.5">From</p>
                    <p className="font-semibold">{formatDate(selectedRequest.start_date)}</p>
                  </div>
                  <div className="bg-[var(--muted)] rounded-lg p-3">
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-0.5">To</p>
                    <p className="font-semibold">{formatDate(selectedRequest.end_date)}</p>
                  </div>
                </div>
                {selectedRequest.reason && (
                  <div className="mt-3 bg-[var(--muted)] rounded-lg p-3 text-sm">
                    <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-1">Employee Reason</p>
                    <p className="text-[var(--foreground)]">{selectedRequest.reason}</p>
                  </div>
                )}
              </section>

              {/* AI Constraint Engine Result */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)]">AI Policy Check</h3>
                  {selectedRequest.constraint_result && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      selectedRequest.constraint_result.isEligible
                        ? 'bg-emerald-500/15 text-emerald-400'
                        : 'bg-red-500/15 text-red-400'
                    }`}>
                      {selectedRequest.constraint_result.isEligible ? 'ELIGIBLE' : 'INELIGIBLE'}
                    </span>
                  )}
                  {selectedRequest.constraint_result && (
                    <span className="ml-auto text-[10px] text-[var(--muted-foreground)]">
                      Confidence: <span className="font-semibold text-[var(--foreground)]">{Math.round((selectedRequest.constraint_result.confidence ?? 0) * 100)}%</span>
                    </span>
                  )}
                </div>

                {!selectedRequest.constraint_result ? (
                  <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-sm text-[var(--muted-foreground)]">
                    No AI policy check was run for this request.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {/* Recommendation */}
                    {selectedRequest.constraint_result.recommendation && (
                      <div className="rounded-lg bg-[var(--muted)] border border-[var(--border)] p-3 text-sm">
                        <p className="text-[10px] uppercase text-[var(--muted-foreground)] mb-1">AI Recommendation</p>
                        <p className="text-[var(--foreground)]">{selectedRequest.constraint_result.recommendation}</p>
                      </div>
                    )}

                    {/* Violations */}
                    {selectedRequest.constraint_result.violations.length > 0 && (
                      <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-red-400">Policy Violations ({selectedRequest.constraint_result.violations.length})</p>
                        {selectedRequest.constraint_result.violations.map((v, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-red-300">{v.rule_name}</span>
                              <p className="text-red-400/80">{v.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Warnings */}
                    {selectedRequest.constraint_result.warnings.length > 0 && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
                        <p className="text-[10px] font-bold uppercase text-amber-400">Warnings ({selectedRequest.constraint_result.warnings.length})</p>
                        {selectedRequest.constraint_result.warnings.map((w, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs">
                            <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-medium text-amber-300">{w.rule_name}</span>
                              <p className="text-amber-400/80">{w.message}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* All clear */}
                    {selectedRequest.constraint_result.violations.length === 0 &&
                     selectedRequest.constraint_result.warnings.length === 0 && (
                      <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-emerald-300">No policy violations detected.</span>
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* Approver comments if already actioned */}
              {selectedRequest.approver_comments && (
                <section>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">Approver Comments</h3>
                  <div className="rounded-lg bg-[var(--muted)] p-3 text-sm text-[var(--foreground)]">
                    {selectedRequest.approver_comments}
                    {selectedRequest.approver && (
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        — {selectedRequest.approver.first_name} {selectedRequest.approver.last_name}
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>

            {/* Drawer footer — contextual action buttons */}
            {(selectedRequest.status === 'pending' || selectedRequest.status === 'escalated') && (
              <div className="p-4 border-t border-[var(--border)] flex gap-3 bg-[var(--card)]">
                <Button
                  variant="success"
                  className="flex-1"
                  loading={actionLoading === selectedRequest.id + 'approve'}
                  disabled={!!actionLoading || bulkLoading}
                  onClick={() => handleAction(selectedRequest.id, 'approve')}
                >
                  <Check className="w-4 h-4" />
                  Approve
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  loading={actionLoading === selectedRequest.id + 'reject'}
                  disabled={!!actionLoading || bulkLoading}
                  onClick={() => handleAction(selectedRequest.id, 'reject')}
                >
                  <X className="w-4 h-4" />
                  Reject
                </Button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
    </>  
  );
}


