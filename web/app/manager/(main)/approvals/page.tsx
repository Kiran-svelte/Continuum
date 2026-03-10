'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { ProgressBar } from '@/components/ui/progress';
import {
  Inbox,
  CheckCircle,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Bot,
  Loader2,
  History,
  Clock,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  MinusSquare,
  Search,
  Filter,
  X,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ConstraintViolation {
  message?: string;
  rule_name?: string;
}

interface ConstraintWarning {
  message?: string;
  rule_name?: string;
}

interface ConstraintSuggestion {
  message?: string;
}

interface ConstraintResult {
  violations?: (ConstraintViolation | string)[];
  warnings?: (ConstraintWarning | string)[];
  suggestions?: (ConstraintSuggestion | string)[];
  ai_recommendation?: {
    decision: string;
    confidence?: number;
  };
}

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled' | 'escalated' | 'draft';
  reason: string | null;
  created_at: string;
  approved_at?: string | null;
  approver_comments?: string | null;
  constraint_result: ConstraintResult | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
  approver?: {
    first_name: string;
    last_name: string;
  } | null;
}

interface LeaveType {
  code: string;
  name: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

type TabId = 'pending' | 'history';

// ─── Component ───────────────────────────────────────────────────────────────

export default function ManagerApprovalsPage() {
  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('pending');

  // Pending tab state
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [commentingId, setCommentingId] = useState<string | null>(null);
  const [commentAction, setCommentAction] = useState<'approve' | 'reject' | null>(null);
  const [comment, setComment] = useState('');

  // Filters (pending tab)
  const [leaveTypes, setLeaveTypes] = useState<LeaveType[]>([]);
  const [filterLeaveType, setFilterLeaveType] = useState<string>('all');
  const [filterName, setFilterName] = useState('');

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Bulk action modal state
  const [bulkAction, setBulkAction] = useState<'approve' | 'reject' | null>(null);
  const [bulkComment, setBulkComment] = useState('');
  const [bulkProcessing, setBulkProcessing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [bulkTotal, setBulkTotal] = useState(0);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);
  const [bulkSuccessCount, setBulkSuccessCount] = useState(0);

  // History tab state
  const [historyRequests, setHistoryRequests] = useState<LeaveRequest[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [historyPagination, setHistoryPagination] = useState<Pagination | null>(null);
  const [historyPage, setHistoryPage] = useState(1);

  // ─── Data Loading ────────────────────────────────────────────────────────────

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/leaves/list?status=pending,escalated&limit=50', {
        credentials: 'include',
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load pending requests');
        return;
      }
      setRequests(json.requests);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadHistory = useCallback(async (page: number) => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const res = await fetch(
        `/api/leaves/list?status=approved,rejected,cancelled&limit=20&page=${page}`,
        { credentials: 'include' }
      );
      const json = await res.json();
      if (!res.ok) {
        setHistoryError(json.error ?? 'Failed to load history');
        return;
      }
      setHistoryRequests(json.requests);
      setHistoryPagination(json.pagination);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const loadLeaveTypes = useCallback(async () => {
    try {
      const res = await fetch('/api/company/leave-types', { credentials: 'include' });
      const json = await res.json();
      if (res.ok && json.leaveTypes) {
        setLeaveTypes(
          json.leaveTypes.map((lt: { code: string; name: string }) => ({
            code: lt.code,
            name: lt.name,
          }))
        );
      }
    } catch {
      // silently fail -- filter dropdown just won't have named labels
    }
  }, []);

  useEffect(() => {
    loadRequests();
    loadLeaveTypes();
  }, [loadRequests, loadLeaveTypes]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory(historyPage);
    }
  }, [activeTab, historyPage, loadHistory]);

  // ─── Filtering (Pending Tab) ───────────────────────────────────────────────

  const filteredRequests = useMemo(() => {
    let result = requests;
    if (filterLeaveType !== 'all') {
      result = result.filter((r) => r.leave_type === filterLeaveType);
    }
    if (filterName.trim()) {
      const q = filterName.trim().toLowerCase();
      result = result.filter((r) => {
        const name = `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase();
        return name.includes(q);
      });
    }
    return result;
  }, [requests, filterLeaveType, filterName]);

  // Unique leave types across pending requests + company leave types
  const activeLeaveTypes = useMemo(() => {
    const fromRequests = Array.from(new Set(requests.map((r) => r.leave_type)));
    const allCodes = new Set([...fromRequests, ...leaveTypes.map((lt) => lt.code)]);
    return Array.from(allCodes).sort();
  }, [requests, leaveTypes]);

  function leaveTypeLabel(code: string) {
    const lt = leaveTypes.find((l) => l.code === code);
    return lt ? lt.name : code;
  }

  // ─── Single Approve/Reject (existing) ────────────────────────────────────────

  function startAction(requestId: string, action: 'approve' | 'reject') {
    setCommentingId(requestId);
    setCommentAction(action);
    setComment('');
  }

  function cancelAction() {
    setCommentingId(null);
    setCommentAction(null);
    setComment('');
  }

  async function confirmAction(requestId: string, action: 'approve' | 'reject', empName: string) {
    setActionLoading(requestId + action);
    setActionSuccess(null);
    try {
      const res = await fetch(`/api/leaves/${action}/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ comments: comment || null }),
      });
      const json = await res.json();
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(requestId);
          return next;
        });
        setActionSuccess(`${action === 'approve' ? 'Approved' : 'Rejected'} ${empName}'s request.`);
        setTimeout(() => setActionSuccess(null), 4000);
        cancelAction();
      } else {
        setError(json.error ?? `${action} failed`);
      }
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Bulk Selection ─────────────────────────────────────────────────────────

  const visibleIds = useMemo(() => filteredRequests.map((r) => r.id), [filteredRequests]);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const someVisibleSelected = visibleIds.some((id) => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
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

  // ─── Bulk Action Workflow ───────────────────────────────────────────────────

  function openBulkDialog(action: 'approve' | 'reject') {
    setBulkAction(action);
    setBulkComment('');
    setBulkErrors([]);
    setBulkProgress(0);
    setBulkTotal(selectedIds.size);
    setBulkSuccessCount(0);
    setBulkProcessing(false);
  }

  function closeBulkDialog() {
    if (bulkProcessing) return;
    setBulkAction(null);
    setBulkComment('');
    setBulkErrors([]);
    setBulkProgress(0);
    setBulkTotal(0);
    setBulkSuccessCount(0);
  }

  async function executeBulkAction() {
    if (!bulkAction || selectedIds.size === 0) return;

    setBulkProcessing(true);
    setBulkProgress(0);
    setBulkErrors([]);
    setBulkSuccessCount(0);

    const ids = Array.from(selectedIds);
    setBulkTotal(ids.length);

    try {
      const res = await fetch('/api/leaves/bulk-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          requestIds: ids,
          action: bulkAction,
          comments: bulkComment || null,
        }),
      });

      const json = await res.json();

      if (res.ok) {
        const results = json.results ?? [];
        const succeeded = results.filter((r: { success: boolean }) => r.success).map((r: { requestId: string }) => r.requestId);
        const failedResults = results.filter((r: { success: boolean }) => !r.success);

        const errors: string[] = failedResults.map((r: { requestId: string; error?: string }) => {
          const req = requests.find((lr) => lr.id === r.requestId);
          const name = req ? `${req.employee.first_name} ${req.employee.last_name}` : r.requestId;
          return `${name}: ${r.error ?? 'Failed'}`;
        });

        setBulkProgress(ids.length);
        setBulkSuccessCount(succeeded.length);

        // Remove succeeded from lists
        setRequests((prev) => prev.filter((r) => !succeeded.includes(r.id)));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          succeeded.forEach((id: string) => next.delete(id));
          return next;
        });

        setBulkErrors(errors);
        setBulkProcessing(false);

        if (errors.length === 0) {
          const verb = bulkAction === 'approve' ? 'Approved' : 'Rejected';
          setActionSuccess(
            `${verb} ${succeeded.length} request${succeeded.length !== 1 ? 's' : ''}.`
          );
          setTimeout(() => setActionSuccess(null), 4000);
          closeBulkDialog();
        }
        // If there were errors, keep dialog open so user can see them
      } else {
        setBulkErrors([json.error ?? 'Bulk operation failed']);
        setBulkProcessing(false);
        setBulkProgress(ids.length);
      }
    } catch {
      setBulkErrors(['Network error during bulk operation']);
      setBulkProcessing(false);
      setBulkProgress(ids.length);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
    });
  }

  function formatFullDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function timeAgo(dateStr: string) {
    const diff = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diff / 3_600_000);
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function statusBadgeVariant(
    status: string
  ): 'success' | 'danger' | 'default' | 'warning' {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'cancelled':
        return 'default';
      default:
        return 'warning';
    }
  }

  const pendingCount = requests.length;

  // ─── Tab Definitions ──────────────────────────────────────────────────────

  const tabs: { id: TabId; label: string; icon: typeof Clock }[] = [
    { id: 'pending', label: 'Pending', icon: Clock },
    { id: 'history', label: 'History', icon: History },
  ];

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Approvals</h1>
        <p className="text-muted-foreground mt-1">
          {activeTab === 'pending'
            ? pendingCount > 0
              ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} need your attention`
              : 'All caught up!'
            : 'Review past approval decisions'}
        </p>
      </div>

      {/* Status Messages */}
      {actionSuccess && (
        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0" />
          {actionSuccess}
        </div>
      )}
      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700 dark:hover:text-red-300"
            aria-label="Dismiss error"
          >
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-muted/50 w-fit">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {tab.id === 'pending' && pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400">
                  {pendingCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* PENDING TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pending' && (
        <>
          {/* Filter controls */}
          {requests.length > 0 && (
            <div className="flex flex-wrap items-center gap-3">
              {/* Employee name search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Search by employee name..."
                  className="pl-9 pr-8 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring w-60"
                />
                {filterName && (
                  <button
                    onClick={() => setFilterName('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    aria-label="Clear name search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Leave type dropdown */}
              <div className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <select
                  value={filterLeaveType}
                  onChange={(e) => setFilterLeaveType(e.target.value)}
                  aria-label="Filter by leave type"
                  className="text-sm rounded-lg border border-border bg-background text-foreground px-3 py-2 pr-8 focus:outline-none focus:ring-2 focus:ring-ring appearance-none cursor-pointer"
                >
                  <option value="all">All leave types</option>
                  {activeLeaveTypes.map((code) => (
                    <option key={code} value={code}>
                      {leaveTypeLabel(code)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Clear filters + count */}
              {(filterLeaveType !== 'all' || filterName.trim()) && (
                <>
                  <button
                    onClick={() => {
                      setFilterLeaveType('all');
                      setFilterName('');
                    }}
                    className="text-xs text-primary hover:text-primary/80 font-medium"
                  >
                    Clear filters
                  </button>
                  <span className="text-xs text-muted-foreground">
                    Showing {filteredRequests.length} of {requests.length}
                  </span>
                </>
              )}
            </div>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Select-all checkbox */}
                  {filteredRequests.length > 0 && (
                    <button
                      onClick={toggleSelectAll}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={allVisibleSelected ? 'Deselect all' : 'Select all'}
                      disabled={bulkProcessing}
                    >
                      {allVisibleSelected ? (
                        <CheckSquare className="w-5 h-5 text-primary" />
                      ) : someVisibleSelected ? (
                        <MinusSquare className="w-5 h-5 text-primary" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>
                  )}
                  <CardTitle>Team Requests</CardTitle>
                </div>
                {pendingCount > 0 && (
                  <Badge variant="warning">{pendingCount} pending</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loading && (
                <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading...
                </div>
              )}
              {!loading && filteredRequests.length === 0 && requests.length === 0 && !error && (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-xl bg-green-50 dark:bg-green-500/10 flex items-center justify-center mx-auto">
                    <Inbox className="w-5 h-5 text-green-500" />
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm">No pending requests -- all caught up!</p>
                </div>
              )}
              {!loading && filteredRequests.length === 0 && requests.length > 0 && (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto">
                    <Search className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm">No requests match your filters.</p>
                </div>
              )}
              {!loading && filteredRequests.length > 0 && (
                <div className="space-y-3">
                  {filteredRequests.map((req) => {
                    const empName = `${req.employee.first_name} ${req.employee.last_name}`;
                    const isCommenting = commentingId === req.id;
                    const isSelected = selectedIds.has(req.id);
                    return (
                      <div
                        key={req.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          isSelected
                            ? 'border-primary/40 bg-primary/5 dark:bg-primary/10'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleSelect(req.id)}
                              className="mt-1 shrink-0 text-muted-foreground hover:text-primary transition-colors"
                              disabled={bulkProcessing}
                              aria-label={isSelected ? 'Deselect request' : 'Select request'}
                            >
                              {isSelected ? (
                                <CheckSquare className="w-5 h-5 text-primary" />
                              ) : (
                                <Square className="w-5 h-5" />
                              )}
                            </button>

                            <div className="w-9 h-9 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-sm font-bold text-primary shrink-0">
                              {req.employee.first_name[0]}{req.employee.last_name[0]}
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="text-sm font-semibold text-foreground">
                                  {empName}
                                </p>
                                <span className="text-xs text-muted-foreground">{req.employee.department ?? '--'}</span>
                                <Badge variant="warning">{req.leave_type}</Badge>
                                {req.status === 'escalated' && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300">
                                    Escalated
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                {formatDate(req.start_date)}
                                {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                                {' \u00b7 '}
                                <span className="font-medium">{req.total_days} day{req.total_days !== 1 ? 's' : ''}</span>
                                {' \u00b7 '}
                                <span className="text-muted-foreground">{timeAgo(req.created_at)}</span>
                              </p>
                              {req.reason && (
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm truncate">&ldquo;{req.reason}&rdquo;</p>
                              )}
                            </div>
                          </div>
                          {!isCommenting && (
                            <div className="flex gap-2 ml-4 shrink-0">
                              <button
                                onClick={() => startAction(req.id, 'approve')}
                                disabled={!!actionLoading || bulkProcessing}
                                className="px-3 py-1.5 text-xs font-medium text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 disabled:opacity-50 transition-colors"
                              >
                                Approve
                              </button>
                              <button
                                onClick={() => startAction(req.id, 'reject')}
                                disabled={!!actionLoading || bulkProcessing}
                                className="px-3 py-1.5 text-xs font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/40 disabled:opacity-50 transition-colors"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Constraint Engine Results */}
                        {req.constraint_result && (
                          <div className="mt-3 ml-8 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-2 flex items-center gap-1.5">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Constraint Engine Results
                            </p>
                            {(req.constraint_result.violations?.length ?? 0) > 0 && (
                              <div className="space-y-1">
                                {req.constraint_result.violations!.map((v, i) => (
                                  <p key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                                    {typeof v === 'string' ? v : v.message || v.rule_name || 'Violation'}
                                  </p>
                                ))}
                              </div>
                            )}
                            {(req.constraint_result.warnings?.length ?? 0) > 0 && (
                              <div className="space-y-1 mt-1">
                                {req.constraint_result.warnings!.map((w, i) => (
                                  <p key={i} className="text-xs text-amber-600 dark:text-amber-400 flex items-start gap-1.5">
                                    <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
                                    {typeof w === 'string' ? w : w.message || w.rule_name || 'Warning'}
                                  </p>
                                ))}
                              </div>
                            )}
                            {(req.constraint_result.suggestions?.length ?? 0) > 0 && (
                              <div className="space-y-1 mt-1">
                                {req.constraint_result.suggestions!.map((s, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">
                                    {typeof s === 'string' ? s : s.message || 'Suggestion'}
                                  </p>
                                ))}
                              </div>
                            )}
                            {req.constraint_result.ai_recommendation && (
                              <p className="text-xs text-primary mt-2 flex items-center gap-1.5">
                                <Bot className="w-3.5 h-3.5 shrink-0" />
                                AI: {req.constraint_result.ai_recommendation.decision}
                                {' '}({Math.round((req.constraint_result.ai_recommendation.confidence || 0) * 100)}% confidence)
                              </p>
                            )}
                          </div>
                        )}

                        {/* Comment input for approve/reject */}
                        {isCommenting && commentAction && (
                          <div className="mt-3 ml-8 p-3 rounded-lg border border-border bg-muted/30">
                            <p className="text-xs font-medium text-foreground mb-2">
                              {commentAction === 'approve' ? 'Approve' : 'Reject'} {empName}&apos;s request
                            </p>
                            <textarea
                              value={comment}
                              onChange={(e) => setComment(e.target.value)}
                              placeholder="Add a comment (optional)..."
                              rows={2}
                              className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                            />
                            <div className="flex gap-2 mt-2 justify-end">
                              <button
                                onClick={cancelAction}
                                disabled={!!actionLoading}
                                className="px-3 py-1.5 text-xs font-medium text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 disabled:opacity-50 transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={() => confirmAction(req.id, commentAction, empName)}
                                disabled={!!actionLoading}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg disabled:opacity-50 transition-colors ${
                                  commentAction === 'approve'
                                    ? 'text-green-700 dark:text-green-300 bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/40'
                                    : 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40'
                                }`}
                              >
                                {actionLoading === req.id + commentAction
                                  ? 'Processing...'
                                  : `Confirm ${commentAction === 'approve' ? 'Approval' : 'Rejection'}`}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sticky Bulk Action Bar */}
          {selectedCount > 0 && !bulkProcessing && (
            <div className="sticky bottom-4 z-30 mx-auto max-w-2xl">
              <div className="flex items-center justify-between gap-4 px-5 py-3 rounded-xl bg-card border border-border shadow-lg dark:shadow-black/30">
                <p className="text-sm text-foreground font-medium whitespace-nowrap">
                  {selectedCount} request{selectedCount !== 1 ? 's' : ''} selected
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => openBulkDialog('approve')}
                    disabled={!!actionLoading}
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve Selected ({selectedCount})
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => openBulkDialog('reject')}
                    disabled={!!actionLoading}
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Selected ({selectedCount})
                  </Button>
                  <button
                    onClick={() => setSelectedIds(new Set())}
                    className="ml-1 p-1.5 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors"
                    aria-label="Clear selection"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* HISTORY TAB                                                        */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {activeTab === 'history' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Decision History</CardTitle>
              <button
                onClick={() => loadHistory(historyPage)}
                disabled={historyLoading}
                className="text-xs text-primary hover:text-primary/80 font-medium disabled:opacity-50"
              >
                Refresh
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading && (
              <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading history...
              </div>
            )}
            {historyError && (
              <div className="py-8 text-center text-sm text-red-600 dark:text-red-400">
                {historyError}
              </div>
            )}
            {!historyLoading && !historyError && historyRequests.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mx-auto">
                  <History className="w-5 h-5 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground mt-3 text-sm">No approval history yet.</p>
              </div>
            )}
            {!historyLoading && !historyError && historyRequests.length > 0 && (
              <>
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/60 dark:border-slate-800/50">
                        <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Employee</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Leave Type</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Dates</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Days</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Status</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Processed By</th>
                        <th className="text-left py-3 px-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40 dark:divide-slate-800/40">
                      {historyRequests.map((req) => (
                        <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {req.employee.first_name[0]}{req.employee.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{req.employee.first_name} {req.employee.last_name}</p>
                                <p className="text-xs text-muted-foreground">{req.employee.department ?? '--'}</p>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant="info" size="sm">{req.leave_type}</Badge>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {formatDate(req.start_date)}
                            {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {req.total_days}
                          </td>
                          <td className="py-3 px-3">
                            <Badge variant={statusBadgeVariant(req.status)} size="sm">
                              {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                            </Badge>
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {req.approver
                              ? `${req.approver.first_name} ${req.approver.last_name}`
                              : '--'}
                          </td>
                          <td className="py-3 px-3 text-muted-foreground">
                            {req.approved_at ? formatFullDate(req.approved_at) : formatFullDate(req.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-3">
                  {historyRequests.map((req) => (
                    <div key={req.id} className="p-3 rounded-lg border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {req.employee.first_name[0]}{req.employee.last_name[0]}
                          </div>
                          <p className="text-sm font-medium text-foreground">
                            {req.employee.first_name} {req.employee.last_name}
                          </p>
                        </div>
                        <Badge variant={statusBadgeVariant(req.status)} size="sm">
                          {req.status.charAt(0).toUpperCase() + req.status.slice(1)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground space-y-1">
                        <p>
                          <Badge variant="info" size="sm">{req.leave_type}</Badge>
                          {' \u00b7 '}
                          {formatDate(req.start_date)}
                          {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                          {' \u00b7 '}
                          {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                        </p>
                        <p>
                          By: {req.approver ? `${req.approver.first_name} ${req.approver.last_name}` : '--'}
                          {req.approved_at && ` \u00b7 ${formatFullDate(req.approved_at)}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {historyPagination && historyPagination.pages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/40 dark:border-slate-800/40">
                    <p className="text-xs text-muted-foreground">
                      Showing {(historyPage - 1) * historyPagination.limit + 1}
                      {' '}-{' '}
                      {Math.min(historyPage * historyPagination.limit, historyPagination.total)}
                      {' '}of {historyPagination.total}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setHistoryPage(historyPage - 1)}
                        disabled={historyPage <= 1}
                        aria-label="Previous page"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      {Array.from({ length: Math.min(historyPagination.pages, 5) }, (_, i) => {
                        let pageNum: number;
                        if (historyPagination.pages <= 5) {
                          pageNum = i + 1;
                        } else if (historyPage <= 3) {
                          pageNum = i + 1;
                        } else if (historyPage >= historyPagination.pages - 2) {
                          pageNum = historyPagination.pages - 4 + i;
                        } else {
                          pageNum = historyPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setHistoryPage(pageNum)}
                            className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                              historyPage === pageNum
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                      <button
                        onClick={() => setHistoryPage(historyPage + 1)}
                        disabled={historyPage >= (historyPagination?.pages ?? 1)}
                        aria-label="Next page"
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* BULK ACTION MODAL                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      <Modal
        isOpen={bulkAction !== null}
        onClose={closeBulkDialog}
        title={
          bulkProcessing
            ? `${bulkAction === 'approve' ? 'Approving' : 'Rejecting'} requests...`
            : bulkErrors.length > 0
              ? 'Bulk Action Complete'
              : `Bulk ${bulkAction === 'approve' ? 'Approve' : 'Reject'} ${selectedCount} Request${selectedCount !== 1 ? 's' : ''}`
        }
        size="md"
        closeOnOverlayClick={!bulkProcessing}
        closeOnEscape={!bulkProcessing}
      >
        {/* Step 1: Comment dialog before execution */}
        {!bulkProcessing && bulkErrors.length === 0 && bulkProgress === 0 && (
          <>
            <p className="text-sm text-muted-foreground mb-3">
              {bulkAction === 'approve'
                ? `You are about to approve ${selectedCount} leave request${selectedCount !== 1 ? 's' : ''}. Add an optional comment that will be applied to all.`
                : `You are about to reject ${selectedCount} leave request${selectedCount !== 1 ? 's' : ''}. Add an optional comment that will be applied to all.`}
            </p>
            <textarea
              value={bulkComment}
              onChange={(e) => setBulkComment(e.target.value)}
              placeholder="Add a comment (optional)..."
              rows={3}
              className="w-full text-sm rounded-md border border-border bg-background px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
            <ModalFooter>
              <Button variant="outline" size="sm" onClick={closeBulkDialog}>
                Cancel
              </Button>
              <Button
                variant={bulkAction === 'approve' ? 'success' : 'danger'}
                size="sm"
                onClick={executeBulkAction}
              >
                {bulkAction === 'approve'
                  ? `Approve All (${selectedCount})`
                  : `Reject All (${selectedCount})`}
              </Button>
            </ModalFooter>
          </>
        )}

        {/* Step 2: Progress display during execution */}
        {bulkProcessing && (
          <div className="py-4 space-y-4">
            <ProgressBar
              value={bulkProgress}
              max={bulkTotal}
              variant={bulkAction === 'approve' ? 'success' : 'danger'}
              size="md"
              showValue
              animated
            />
            <p className="text-sm text-muted-foreground text-center">
              Processing {bulkProgress} of {bulkTotal}...
            </p>
          </div>
        )}

        {/* Step 3: Error summary after completion with failures */}
        {!bulkProcessing && bulkErrors.length > 0 && (
          <div className="space-y-3">
            {bulkSuccessCount > 0 && (
              <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm text-green-700 dark:text-green-300">
                  {bulkSuccessCount} request{bulkSuccessCount !== 1 ? 's' : ''} processed successfully.
                </p>
              </div>
            )}
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3">
              <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                {bulkErrors.length} request{bulkErrors.length !== 1 ? 's' : ''} failed:
              </p>
              <ul className="space-y-1">
                {bulkErrors.map((err, i) => (
                  <li key={i} className="text-xs text-red-600 dark:text-red-400 flex items-start gap-1.5">
                    <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                    {err}
                  </li>
                ))}
              </ul>
            </div>
            <ModalFooter>
              <Button variant="outline" size="sm" onClick={closeBulkDialog}>
                Close
              </Button>
            </ModalFooter>
          </div>
        )}
      </Modal>
    </div>
  );
}
