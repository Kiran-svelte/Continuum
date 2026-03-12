'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { TabButton } from '@/components/tab-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { ProgressBar, PageLoader } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
  Check,
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

// ─── Loading Skeleton ────────────────────────────────────────────────────────

function ApprovalsLoadingSkeleton() {
  return (
    <div className="p-4 sm:p-6 pb-32">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </div>

        {/* Tabs skeleton */}
        <div className="flex gap-2">
          <Skeleton className="h-10 w-28 bg-white/10 rounded-lg" />
          <Skeleton className="h-10 w-28 bg-white/10 rounded-lg" />
        </div>

        {/* Filters skeleton */}
        <GlassPanel className="p-4 flex flex-col sm:flex-row gap-3">
          <Skeleton className="h-10 flex-1 bg-white/10 rounded-lg" />
          <Skeleton className="h-10 w-40 bg-white/10 rounded-lg" />
          <Skeleton className="h-10 w-10 bg-white/10 rounded-lg" />
        </GlassPanel>

        {/* Bulk actions skeleton */}
        <div className="h-12 flex items-center justify-between">
          <Skeleton className="h-6 w-32 bg-white/10 rounded-md" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-28 bg-white/10 rounded-lg" />
            <Skeleton className="h-10 w-28 bg-white/10 rounded-lg" />
          </div>
        </div>

        {/* List skeleton */}
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <GlassPanel key={i} className="p-4">
              <div className="flex items-start gap-4">
                <Skeleton className="w-12 h-12 rounded-full bg-white/10" />
                <div className="flex-1 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/3 bg-white/10" />
                    <Skeleton className="h-4 w-16 bg-white/10" />
                  </div>
                  <Skeleton className="h-4 w-3/4 bg-white/10" />
                  <Skeleton className="h-4 w-1/2 bg-white/10" />
                </div>
              </div>
              <div className="mt-4 h-px bg-white/10" />
              <div className="mt-4 flex justify-end gap-3">
                <Skeleton className="h-9 w-24 bg-white/10 rounded-lg" />
                <Skeleton className="h-9 w-24 bg-white/10 rounded-lg" />
              </div>
            </GlassPanel>
          ))}
        </div>
      </div>
    </div>
  );
}

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
  ): 'success' | 'danger' | 'default' | 'warning' | 'info' {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'danger';
      case 'cancelled':
        return 'default';
      case 'escalated':
        return 'info';
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

  if (loading && requests.length === 0) {
    return <ApprovalsLoadingSkeleton />;
  }

  const headerDescription = activeTab === 'pending'
    ? pendingCount > 0
      ? `${pendingCount} request${pendingCount !== 1 ? 's' : ''} need your attention`
      : 'All caught up!'
    : 'Review past approval decisions';

  return (
    <div className="p-4 sm:p-6 pb-32">
      <StaggerContainer>
        <PageHeader
          title="Approvals"
          description={headerDescription}
          icon={<CheckCircle className="w-6 h-6 text-primary" />}
        />

        {/* Status Messages */}
        <AnimatePresence>
          {actionSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 glass-panel p-4 rounded-xl border border-green-500/30 text-green-300/90 flex items-center gap-3"
            >
              <CheckCircle className="w-5 h-5" />
              <span className="flex-1">{actionSuccess}</span>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6 glass-panel p-4 rounded-xl border border-red-500/30 text-red-300/90 flex items-center gap-3"
            >
              <AlertCircle className="w-5 h-5" />
              <span className="flex-1">{error}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setError('')}
                className="text-red-300/70 hover:text-red-300 hover:bg-red-500/20"
              >
                <X className="w-5 h-5" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <FadeIn>
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabButton
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </TabButton>
              );
            })}
          </div>
        </FadeIn>

        {/* Pending Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'pending' && (
            <motion.div
              key="pending-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Filters */}
              <FadeIn>
                <GlassPanel className="p-4 flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <input
                      type="text"
                      placeholder="Filter by name..."
                      value={filterName}
                      onChange={(e) => setFilterName(e.target.value)}
                      className="w-full h-10 pl-10 pr-4 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    />
                  </div>
                  <div className="relative">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                    <select
                      value={filterLeaveType}
                      onChange={(e) => setFilterLeaveType(e.target.value)}
                      className="appearance-none w-full sm:w-48 h-10 pl-10 pr-8 bg-black/20 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-primary/50 focus:outline-none"
                    >
                      <option value="all">All Leave Types</option>
                      {activeLeaveTypes.map((lt) => (
                        <option key={lt} value={lt}>{leaveTypeLabel(lt)}</option>
                      ))}
                    </select>
                  </div>
                  <Button variant="ghost" onClick={() => { setFilterName(''); setFilterLeaveType('all'); }} className="h-10 text-white/60 hover:text-white hover:bg-white/10">
                    Clear
                  </Button>
                </GlassPanel>
              </FadeIn>

              {/* Bulk Actions */}
              <AnimatePresence>
                {selectedCount > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    <GlassPanel className="p-4 flex items-center justify-between border-primary/30">
                      <p className="text-sm font-semibold text-primary">{selectedCount} request{selectedCount !== 1 ? 's' : ''} selected</p>
                      <div className="flex gap-3">
                        <Button size="sm" variant="success" onClick={() => openBulkDialog('approve')}>
                          <Check className="w-4 h-4 mr-2" /> Approve
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => openBulkDialog('reject')}>
                          <X className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </div>
                    </GlassPanel>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Request List */}
              {loading && requests.length === 0 ? (
                <PageLoader />
              ) : filteredRequests.length === 0 ? (
                <FadeIn>
                  <GlassPanel className="text-center py-24">
                    <Inbox className="w-16 h-16 text-white/30 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-white mb-2">No matching requests</h3>
                    <p className="text-sm text-white/60">Try adjusting your filters.</p>
                  </GlassPanel>
                </FadeIn>
              ) : (
                <div className="space-y-4">
                  {/* Select All Header */}
                  <div className="flex items-center gap-3 px-2">
                    <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm text-white/60 hover:text-white">
                      {allVisibleSelected ? <CheckSquare className="w-5 h-5 text-primary" /> : someVisibleSelected ? <MinusSquare className="w-5 h-5 text-primary/70" /> : <Square className="w-5 h-5" />}
                      <span>Select All Visible</span>
                    </button>
                  </div>
                  {filteredRequests.map((req, i) => (
                    <FadeIn key={req.id} delay={i * 0.05}>
                      <RequestCard
                        req={req}
                        onToggleSelect={toggleSelect}
                        isSelected={selectedIds.has(req.id)}
                        onStartAction={startAction}
                        actionLoading={actionLoading}
                      />
                    </FadeIn>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* History Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'history' && (
            <motion.div
              key="history-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {historyLoading && historyRequests.length === 0 ? (
                <PageLoader />
              ) : historyError ? (
                <GlassPanel className="text-center py-24 border-red-500/30">
                  <AlertCircle className="w-16 h-16 text-red-400/70 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-white mb-2">Error loading history</h3>
                  <p className="text-sm text-red-300/80">{historyError}</p>
                </GlassPanel>
              ) : historyRequests.length === 0 ? (
                <GlassPanel className="text-center py-24">
                  <History className="w-16 h-16 text-white/30 mx-auto mb-6" />
                  <h3 className="text-xl font-semibold text-white mb-2">No history yet</h3>
                  <p className="text-sm text-white/60">Approved and rejected requests will appear here.</p>
                </GlassPanel>
              ) : (
                <div className="space-y-4">
                  {historyRequests.map((req, i) => (
                    <FadeIn key={req.id} delay={i * 0.05}>
                      <HistoryCard req={req} />
                    </FadeIn>
                  ))}
                  {/* Pagination */}
                  {historyPagination && historyPagination.pages > 1 && (
                    <div className="flex justify-center items-center gap-4 pt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage === 1}
                        className="bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                      </Button>
                      <span className="text-sm text-white/60">
                        Page {historyPagination.page} of {historyPagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setHistoryPage(p => Math.min(historyPagination.pages, p + 1))}
                        disabled={historyPage === historyPagination.pages}
                        className="bg-black/20 border-white/10 text-white/70 hover:bg-white/10 hover:text-white"
                      >
                        Next <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </StaggerContainer>

      {/* Comment Modal */}
      <AnimatePresence>
        {commentingId && (
          <Modal
            isOpen
            onClose={cancelAction}
            title={`${commentAction === 'approve' ? 'Approve' : 'Reject'} Request`}
            description="Add an optional comment for the employee."
            className="glass-panel border-white/10 text-white"
          >
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g., 'Enjoy your time off!'"
              className="w-full mt-4 p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
              rows={3}
            />
            <ModalFooter className="mt-6">
              <Button variant="ghost" onClick={cancelAction} className="text-white/70 hover:text-white hover:bg-white/10">Cancel</Button>
              <Button
                variant={commentAction === 'approve' ? 'success' : 'danger'}
                onClick={() => {
                  const req = requests.find(r => r.id === commentingId);
                  if (req) confirmAction(commentingId, commentAction!, `${req.employee.first_name} ${req.employee.last_name}`);
                }}
              >
                Confirm {commentAction}
              </Button>
            </ModalFooter>
          </Modal>
        )}
      </AnimatePresence>

      {/* Bulk Action Modal */}
      <AnimatePresence>
        {bulkAction && (
          <Modal
            isOpen
            onClose={closeBulkDialog}
            title={`Bulk ${bulkAction === 'approve' ? 'Approve' : 'Reject'} Requests`}
            description={`You are about to ${bulkAction} ${selectedCount} request${selectedCount !== 1 ? 's' : ''}.`}
            className="glass-panel border-white/10 text-white"
          >
            {!bulkProcessing && bulkErrors.length === 0 && (
              <>
                <textarea
                  value={bulkComment}
                  onChange={(e) => setBulkComment(e.target.value)}
                  placeholder="Optional comment for all selected requests..."
                  className="w-full mt-4 p-3 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                  rows={3}
                />
                <p className="text-xs text-white/50 mt-2">This comment will be applied to all {selectedCount} requests.</p>
              </>
            )}

            {(bulkProcessing || bulkErrors.length > 0) && (
              <div className="mt-4 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/80">Progress:</span>
                  <span className="font-semibold">{bulkProgress} / {bulkTotal}</span>
                </div>
                <ProgressBar value={(bulkProgress / bulkTotal) * 100} />

                {bulkErrors.length > 0 && !bulkProcessing && (
                  <div className="mt-4 space-y-3 max-h-40 overflow-y-auto p-3 bg-black/20 rounded-lg border border-red-500/30">
                    <h4 className="font-semibold text-red-400">Errors ({bulkErrors.length}):</h4>
                    <ul className="text-xs text-red-300/90 list-disc list-inside space-y-1">
                      {bulkErrors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <ModalFooter className="mt-6">
              <Button variant="ghost" onClick={closeBulkDialog} disabled={bulkProcessing} className="text-white/70 hover:text-white hover:bg-white/10">
                {bulkProcessing ? 'Processing...' : bulkErrors.length > 0 ? 'Close' : 'Cancel'}
              </Button>
              {!bulkProcessing && bulkErrors.length === 0 && (
                <Button
                  variant={bulkAction === 'approve' ? 'success' : 'danger'}
                  onClick={executeBulkAction}
                  loading={bulkProcessing}
                >
                  Confirm {bulkAction} ({selectedCount})
                </Button>
              )}
            </ModalFooter>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Request Card ────────────────────────────────────────────────────────────

function RequestCard({ req, onToggleSelect, isSelected, onStartAction, actionLoading }: { req: LeaveRequest, onToggleSelect: (id: string) => void, isSelected: boolean, onStartAction: (id: string, action: 'approve' | 'reject') => void, actionLoading: string | null }) {
  return (
    <TiltCard>
      <GlassPanel className={isSelected ? 'border-primary/50 shadow-[0_0_20px_rgba(var(--primary-rgb),0.2)]' : ''}>
        <div className="p-4 relative z-10">
          <div className="flex items-start gap-4">
            <button onClick={() => onToggleSelect(req.id)} className="mt-1">
              {isSelected ? <CheckSquare className="w-6 h-6 text-primary" /> : <Square className="w-6 h-6 text-white/40 hover:text-white" />}
            </button>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-base font-semibold text-primary shrink-0">
                    {req.employee.first_name?.[0]}{req.employee.last_name?.[0]}
                  </div>
                  <div>
                    <p className="text-base font-bold text-white">{req.employee.first_name} {req.employee.last_name}</p>
                    <p className="text-xs text-white/60">{req.employee.department || 'No Department'}</p>
                  </div>
                </div>
                <p className="text-xs text-white/50 mt-2 sm:mt-0">{timeAgo(req.created_at)}</p>
              </div>
              <div className="mt-4 pl-1 space-y-1 text-sm">
                <p><strong className="text-white/70 font-medium">Type:</strong> {req.leave_type}</p>
                <p><strong className="text-white/70 font-medium">Dates:</strong> {formatDate(req.start_date)} - {formatDate(req.end_date)} ({req.total_days} days)</p>
                {req.reason && <p><strong className="text-white/70 font-medium">Reason:</strong> <span className="text-white/90">{req.reason}</span></p>}
              </div>
            </div>
          </div>
        </div>
        {/* Constraint Analysis Section */}
        {req.constraint_result && (
          <div className="border-t border-white/10 px-5 py-4 bg-black/10 space-y-3 relative z-10">
            <h4 className="text-sm font-semibold text-white/80 flex items-center gap-2"><Bot className="w-5 h-5 text-primary" /> Constraint Analysis</h4>
          </div>
        )}
        <div className="border-t border-white/10 p-4 flex justify-end gap-3 bg-black/10 rounded-b-2xl relative z-10">
          <Button variant="danger" size="sm" onClick={() => onStartAction(req.id, 'reject')} loading={actionLoading === req.id + 'reject'} disabled={!!actionLoading}>
            <XCircle className="w-4 h-4 mr-2" /> Reject
          </Button>
          <Button variant="success" size="sm" onClick={() => onStartAction(req.id, 'approve')} loading={actionLoading === req.id + 'approve'} disabled={!!actionLoading}>
            <CheckCircle className="w-4 h-4 mr-2" /> Approve
          </Button>
        </div>
      </GlassPanel>
    </TiltCard>
  );
}

// ─── History Card ────────────────────────────────────────────────────────────

function HistoryCard({ req }: { req: LeaveRequest }) {
  const statusInfo = ({
    approved: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/10' },
    rejected: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
    cancelled: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  } as Record<string, { icon: typeof CheckCircle; color: string; bg: string }>)[req.status] || { icon: History, color: 'text-white/60', bg: 'bg-white/10' };
  const StatusIcon = statusInfo.icon;

  return (
    <TiltCard>
      <GlassPanel className="p-4">
        <div className="flex items-start gap-4 relative z-10">
          <div className={`h-10 w-10 rounded-full ${statusInfo.bg} flex items-center justify-center shrink-0`}>
            <StatusIcon className={`w-6 h-6 ${statusInfo.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between">
              <p className="font-bold text-white">{req.employee.first_name} {req.employee.last_name}</p>
              <Badge variant={statusBadgeVariant(req.status)}>{req.status}</Badge>
            </div>
            <p className="text-xs text-white/60">{req.leave_type} · {req.total_days} day{req.total_days !== 1 ? 's' : ''}</p>
            <p className="text-sm text-white/80 mt-2">{formatFullDate(req.start_date)} - {formatFullDate(req.end_date)}</p>
            {req.approved_at && <p className="text-xs text-white/50 mt-1">Processed on {formatFullDate(req.approved_at)} by {req.approver?.first_name}</p>}
            {req.approver_comments && <p className="text-xs italic text-white/70 mt-1">"{req.approver_comments}"</p>}
          </div>
        </div>
      </GlassPanel>
    </TiltCard>
  );
}

// ─── Standalone Helpers (used by child components) ───────────────────────────

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
): 'success' | 'danger' | 'default' | 'warning' | 'info' {
  switch (status) {
    case 'approved':
      return 'success';
    case 'rejected':
      return 'danger';
    case 'cancelled':
      return 'default';
    case 'escalated':
      return 'info';
    default:
      return 'warning';
  }
}
