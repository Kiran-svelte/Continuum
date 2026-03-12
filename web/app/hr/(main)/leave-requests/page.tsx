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

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
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

export default function HRLeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');

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
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: null }),
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
    <StaggerContainer className="space-y-6">
      <PageHeader
        title="Leave Requests"
        description={total > 0 ? total + ' requests' : 'Manage leave requests'}
        icon={<Inbox className="w-6 h-6 text-primary" />}
        action={
          <div className="flex items-center gap-2">
            <button
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
              className="inline-flex items-center gap-1.5 border border-white/10 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              CSV
            </button>
            <button
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
              className="inline-flex items-center gap-1.5 border border-white/10 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              PDF
            </button>
          </div>
        }
      />

      {/* Search Bar */}
      <FadeIn>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by employee name or department..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
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

          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              hasActiveFilters
                ? 'bg-primary/10 text-primary border border-primary/30'
                : 'bg-white/5 text-white/60 hover:bg-white/10 border border-transparent'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            Filters
            {hasActiveFilters && <span className="w-1.5 h-1.5 rounded-full bg-primary" />}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
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
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      From Date
                    </label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Date To */}
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      To Date
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    />
                  </div>

                  {/* Department Filter */}
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      Department
                    </label>
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    >
                      <option value="">All departments</option>
                      {departments.map((dep) => (
                        <option key={dep} value={dep}>{dep}</option>
                      ))}
                    </select>
                  </div>

                  {/* Leave Type Filter */}
                  <div>
                    <label className="block text-xs font-medium text-white/60 mb-1.5">
                      Leave Type
                    </label>
                    <select
                      value={leaveTypeFilter}
                      onChange={(e) => setLeaveTypeFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                    >
                      <option value="">All types</option>
                      {leaveTypes.map((type) => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {hasActiveFilters && (
                  <div className="mt-3 flex items-center justify-between">
                    <p className="text-xs text-white/60">
                      Showing {filteredRequests.length} of {requests.length} loaded requests
                    </p>
                    <button
                      onClick={clearFilters}
                      className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Clear all filters
                    </button>
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
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
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
                    <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-white">
                      Bulk {bulkResult.action}:{' '}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">{bulkResult.successCount} succeeded</span>
                      {bulkResult.failCount > 0 && (
                        <>, <span className="font-semibold text-red-600 dark:text-red-400">{bulkResult.failCount} failed</span></>
                      )}
                    </span>
                  </div>
                  <button
                    onClick={() => setBulkResult(null)}
                    className="text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
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
              <h2 className="text-lg font-semibold text-white">
                {statusFilter ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' ' : 'All '}
                Requests
              </h2>
              {statusFilter === 'pending' && total > 0 && (
                <Badge variant="warning">{total} pending</Badge>
              )}
            </div>
          </div>
          <div className="p-6">
            {loading && <div className="py-12 text-center text-sm text-white/60">Loading...</div>}
            {error && !loading && (
              <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
                {error}
              </div>
            )}
            {!loading && !error && filteredRequests.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-white/60 mt-3 text-sm">
                  {hasActiveFilters ? 'No requests match your filters.' : 'No leave requests found.'}
                </p>
                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="text-xs text-primary hover:text-primary/80 font-medium mt-2 transition-colors"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
            {!loading && !error && filteredRequests.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      {/* Select All checkbox */}
                      <th className="py-3 pr-2 w-10">
                        {selectableRequests.length > 0 && (
                          <input
                            type="checkbox"
                            checked={allSelectableSelected}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                            title="Select all pending requests"
                          />
                        )}
                      </th>
                      <th className="text-left py-3 pr-4 text-white/60 font-medium">Employee</th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">Type</th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">Dates</th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">Days</th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">Status</th>
                      <th className="text-left py-3 pl-2 text-white/60 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => {
                      const isSelectable = req.status === 'pending' || req.status === 'escalated';
                      const isSelected = selectedIds.has(req.id);

                      return (
                        <tr
                          key={req.id}
                          className={`border-b border-white/10 transition-colors ${
                            isSelected
                              ? 'bg-primary/5 hover:bg-primary/10'
                              : 'hover:bg-white/5'
                          }`}
                        >
                          {/* Checkbox */}
                          <td className="py-3 pr-2">
                            {isSelectable && (
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelect(req.id)}
                                className="h-4 w-4 rounded border-white/10 text-primary focus:ring-primary/50 cursor-pointer accent-primary"
                              />
                            )}
                          </td>
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {req.employee.first_name[0]}{req.employee.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {req.employee.first_name} {req.employee.last_name}
                                </p>
                                <p className="text-xs text-white/60">{req.employee.department ?? '\u2014'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-2 font-medium text-white">{req.leave_type}</td>
                          <td className="py-3 px-2 text-white/60">
                            {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                          </td>
                          <td className="py-3 px-2 text-white/60">{req.total_days}</td>
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
                              <span className="text-xs text-white/60">{'\u2014'}</span>
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
                  <span className="text-sm font-medium text-white whitespace-nowrap">
                    {selectedIds.size} selected
                  </span>
                  <div className="w-px h-6 bg-white/10" />
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
                  <div className="w-px h-6 bg-white/10" />
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="text-xs text-white/60 hover:text-white transition-colors"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        )}
      </AnimatePresence>
    </StaggerContainer>
  );
}
