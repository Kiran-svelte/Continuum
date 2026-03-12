'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { AmbientBackground, TiltCard, FadeIn, StaggerContainer } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import {
  FilePlus,
  Inbox,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  Calendar,
  CalendarDays,
  Filter,
  Eye,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  User,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { downloadCSVLegacy } from '@/lib/report-export';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface LeaveRequest {
  id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  is_half_day: boolean;
  reason: string;
  status: string;
  approver_comments: string | null;
  cancel_reason: string | null;
  approved_at: string | null;
  constraint_result: ConstraintResult | null;
  ai_recommendation: AiRecommendation | null;
  sla_deadline: string | null;
  sla_breached: boolean;
  escalation_count: number;
  attachment_url: string | null;
  created_at: string;
  updated_at: string;
  approver: { first_name: string; last_name: string } | null;
  employee?: {
    id: string;
    first_name: string;
    last_name: string;
    department: string;
    designation: string;
  };
}

interface ConstraintResult {
  passed?: boolean;
  score?: number;
  checks?: Array<{
    name?: string;
    rule?: string;
    passed?: boolean;
    message?: string;
    details?: string;
  }>;
  [key: string]: unknown;
}

interface AiRecommendation {
  recommendation?: string;
  confidence?: number;
  reason?: string;
  [key: string]: unknown;
}

interface LeaveTypeOption {
  code: string;
  name: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  escalated: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  draft: 'info',
};

const STATUS_ICON: Record<string, typeof Clock> = {
  pending: Clock,
  escalated: AlertTriangle,
  approved: CheckCircle2,
  rejected: XCircle,
  cancelled: X,
  draft: FileText,
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toISODate(dateStr: string): string {
  return new Date(dateStr).toISOString().split('T')[0];
}


/* ------------------------------------------------------------------ */
/*  Timeline Entry sub-component                                       */
/* ------------------------------------------------------------------ */

function TimelineEntry({
  icon: Icon,
  label,
  date,
  detail,
  color,
}: {
  icon: typeof Clock;
  label: string;
  date: string | null;
  detail?: string | null;
  color: string;
}) {
  if (!date) return null;
  return (
    <div className="flex gap-3 items-start">
      <div
        className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${color}`}
      >
        <Icon className="w-3.5 h-3.5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-white/60">{formatDateTime(date)}</p>
        {detail && (
          <p className="text-xs text-white/60 mt-0.5 italic">{detail}</p>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page Component                                                */
/* ------------------------------------------------------------------ */

export default function LeaveHistoryPage() {
  /* ---------- state ---------- */
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');

  // New filter state
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');
  const [leaveTypeFilter, setLeaveTypeFilter] = useState('');
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeOption[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Detail modal state
  const [selectedRequest, setSelectedRequest] = useState<LeaveRequest | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  /* ---------- fetch leave types ---------- */
  useEffect(() => {
    async function fetchLeaveTypes() {
      try {
        const res = await fetch('/api/company/leave-types', { credentials: 'include' });
        if (res.ok) {
          const json = await res.json();
          setLeaveTypes(
            (json.leaveTypes ?? []).map((lt: { code: string; name: string }) => ({
              code: lt.code,
              name: lt.name,
            }))
          );
        }
      } catch {
        // Silently ignore - leave types dropdown will just be empty
      }
    }
    fetchLeaveTypes();
  }, []);

  /* ---------- fetch leave requests ---------- */
  const loadRequests = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '10' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/leaves/list?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load leave history');
        return;
      }
      setRequests(json.requests);
      setTotalPages(json.pagination.pages || 1);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests(page, statusFilter);
  }, [page, statusFilter, loadRequests]);

  /* ---------- client-side filtering (date range + leave type) ---------- */
  const filteredRequests = useMemo(() => {
    let result = requests;

    if (leaveTypeFilter) {
      result = result.filter(
        (r) => r.leave_type.toLowerCase() === leaveTypeFilter.toLowerCase()
      );
    }

    if (startDateFilter) {
      const startDate = new Date(startDateFilter);
      result = result.filter((r) => new Date(r.start_date) >= startDate);
    }

    if (endDateFilter) {
      const endDate = new Date(endDateFilter);
      endDate.setHours(23, 59, 59, 999);
      result = result.filter((r) => new Date(r.end_date) <= endDate);
    }

    return result;
  }, [requests, leaveTypeFilter, startDateFilter, endDateFilter]);

  const hasActiveFilters = startDateFilter || endDateFilter || leaveTypeFilter;

  /* ---------- cancel handler ---------- */
  async function handleCancel(requestId: string) {
    if (!confirm('Are you sure you want to cancel this leave request?')) return;
    setCancellingId(requestId);
    try {
      const res = await fetch(`/api/leaves/cancel/${requestId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ reason: 'Cancelled by employee' }),
      });
      if (res.ok) {
        setRequests((prev) =>
          prev.map((r) => (r.id === requestId ? { ...r, status: 'cancelled' } : r))
        );
      }
    } finally {
      setCancellingId(null);
    }
  }

  /* ---------- detail modal ---------- */
  function openDetail(req: LeaveRequest) {
    setSelectedRequest(req);
    setDetailModalOpen(true);
  }

  function closeDetail() {
    setDetailModalOpen(false);
    setTimeout(() => setSelectedRequest(null), 200);
  }

  /* ---------- CSV export ---------- */
  function handleExportCsv() {
    const headers = [
      'Leave Type',
      'Start Date',
      'End Date',
      'Days',
      'Status',
      'Reason',
      'Applied On',
    ];

    const rows = filteredRequests.map((r) => [
      r.leave_type,
      toISODate(r.start_date),
      toISODate(r.end_date),
      r.total_days,
      r.status.charAt(0).toUpperCase() + r.status.slice(1),
      r.reason || '',
      toISODate(r.created_at),
    ] as (string | number)[]);

    downloadCSVLegacy(
      headers,
      rows,
      `leave-history-${new Date().toISOString().slice(0, 10)}.csv`,
    );
  }

  /* ---------- clear additional filters ---------- */
  function clearFilters() {
    setStartDateFilter('');
    setEndDateFilter('');
    setLeaveTypeFilter('');
  }

  /* ---------- build timeline for detail modal ---------- */
  function buildTimeline(req: LeaveRequest) {
    const entries: Array<{
      icon: typeof Clock;
      label: string;
      date: string | null;
      detail?: string | null;
      color: string;
    }> = [];

    entries.push({
      icon: FilePlus,
      label: 'Request submitted',
      date: req.created_at,
      color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
    });

    if (req.status === 'approved' && req.approved_at) {
      entries.push({
        icon: CheckCircle2,
        label: `Approved by ${req.approver ? `${req.approver.first_name} ${req.approver.last_name}` : 'Manager'}`,
        date: req.approved_at,
        detail: req.approver_comments,
        color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400',
      });
    }

    if (req.status === 'rejected' && req.approved_at) {
      entries.push({
        icon: XCircle,
        label: `Rejected by ${req.approver ? `${req.approver.first_name} ${req.approver.last_name}` : 'Manager'}`,
        date: req.approved_at,
        detail: req.approver_comments,
        color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
      });
    }

    if (req.status === 'cancelled') {
      entries.push({
        icon: X,
        label: 'Request cancelled',
        date: req.updated_at,
        detail: req.cancel_reason,
        color: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
      });
    }

    if (req.status === 'escalated') {
      entries.push({
        icon: AlertTriangle,
        label: `Escalated (${req.escalation_count} time${req.escalation_count !== 1 ? 's' : ''})`,
        date: req.updated_at,
        detail: req.sla_breached ? 'SLA breached' : null,
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
      });
    }

    if (req.updated_at !== req.created_at && !['approved', 'rejected', 'cancelled', 'escalated'].includes(req.status)) {
      entries.push({
        icon: Clock,
        label: 'Last updated',
        date: req.updated_at,
        color: 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400',
      });
    }

    return entries;
  }

  /* ================================================================ */
  /*  RENDER                                                          */
  /* ================================================================ */

  return (
    <StaggerContainer className="space-y-6">
      {/* ---- Header ---- */}
      <PageHeader
        title="Leave History"
        description="View your past leave applications"
        icon={<CalendarDays className="w-6 h-6 text-primary" />}
        action={
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date range filter */}
            <div className="flex items-center gap-2 bg-black/20 p-1.5 rounded-xl border border-white/10 backdrop-blur-sm">
              <label htmlFor="header-from-date" className="sr-only">From date</label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors pointer-events-none" />
                <input
                  id="header-from-date"
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => setStartDateFilter(e.target.value)}
                  placeholder="From"
                  className="pl-9 pr-3 py-2 rounded-lg border border-transparent bg-transparent text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-black/40 transition-all w-[140px] [color-scheme:dark]"
                  title="Filter from date"
                />
              </div>
              <span className="text-white/30 font-bold">&ndash;</span>
              <label htmlFor="header-to-date" className="sr-only">To date</label>
              <div className="relative group">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40 group-focus-within:text-primary transition-colors pointer-events-none" />
                <input
                  id="header-to-date"
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => setEndDateFilter(e.target.value)}
                  min={startDateFilter || undefined}
                  placeholder="To"
                  className="pl-9 pr-3 py-2 rounded-lg border border-transparent bg-transparent text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:bg-black/40 transition-all w-[140px] [color-scheme:dark]"
                  title="Filter to date"
                />
              </div>
              {(startDateFilter || endDateFilter) && (
                <button
                  onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}
                  className="p-2 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-all bg-black/20"
                  title="Clear date range"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={filteredRequests.length === 0}
              className="gap-2 h-11 px-4 rounded-xl border-white/20 bg-black/20 hover:bg-white/10 text-white font-bold transition-all shadow-inner"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Link
              href="/employee/request-leave"
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-white hover:text-primary transition-all shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.6)] group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
              <FilePlus className="w-4 h-4 relative z-10" />
              <span className="relative z-10">New Request</span>
            </Link>
          </div>
        }
      />

      {/* ---- Status Filters ---- */}
      <FadeIn>
        <div className="flex gap-2 flex-wrap items-center">
          {['', 'pending', 'approved', 'rejected', 'cancelled'].map((s) => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-5 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                statusFilter === s
                  ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.5)] scale-105'
                  : 'bg-black/20 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              {s === '' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}

          <div className="ml-auto">
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 ${
                showFilters || hasActiveFilters
                  ? 'bg-primary/20 text-primary border border-primary/50 shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                  : 'bg-black/20 text-white/60 hover:bg-white/10 hover:text-white border border-white/5'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="ml-1 w-2 h-2 rounded-full bg-primary drop-shadow-[0_0_5px_rgba(var(--primary-rgb),0.8)]" />
              )}
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </button>
          </div>
        </div>
      </FadeIn>

      {/* ---- Advanced Filters Panel ---- */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <TiltCard>
              <GlassPanel className="mt-4">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -z-10 translate-x-1/2 -translate-y-1/2 pointer-events-none" />
                <div className="p-6 relative z-10">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 items-end">
                    {/* Date range - start */}
                    <div className="space-y-2">
                      <label htmlFor="filter-start-date" className="text-sm font-bold text-white/80 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary" />
                        From Date
                      </label>
                      <input
                        id="filter-start-date"
                        type="date"
                        value={startDateFilter}
                        onChange={(e) => setStartDateFilter(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner [color-scheme:dark]"
                      />
                    </div>

                    {/* Date range - end */}
                    <div className="space-y-2">
                      <label htmlFor="filter-end-date" className="text-sm font-bold text-white/80 flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-cyan-400" />
                        To Date
                      </label>
                      <input
                        id="filter-end-date"
                        type="date"
                        value={endDateFilter}
                        onChange={(e) => setEndDateFilter(e.target.value)}
                        min={startDateFilter || undefined}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all shadow-inner [color-scheme:dark]"
                      />
                    </div>

                    {/* Leave type dropdown */}
                    <div className="space-y-2">
                      <label htmlFor="filter-leave-type" className="text-sm font-bold text-white/80 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        Leave Type
                      </label>
                      <select
                        id="filter-leave-type"
                        value={leaveTypeFilter}
                        onChange={(e) => setLeaveTypeFilter(e.target.value)}
                        className="w-full rounded-xl bg-black/40 border border-white/10 px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50 transition-all appearance-none cursor-pointer [color-scheme:dark]"
                      >
                        <option value="">All types</option>
                        {leaveTypes.map((lt) => (
                          <option key={lt.code} value={lt.code}>
                            {lt.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {hasActiveFilters && (
                    <div className="mt-3 flex items-center justify-between">
                      <p className="text-xs text-white/60">
                        Showing {filteredRequests.length} of {requests.length} results on this page
                      </p>
                      <button
                        onClick={clearFilters}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              </GlassPanel>
            </TiltCard>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ---- Requests Table ---- */}
      <FadeIn>
        <GlassPanel>
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          <div className="border-b border-white/10 bg-black/20 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Leave Requests</h2>
              {hasActiveFilters && (
                <Badge variant="info" size="sm" className="bg-primary/20 text-primary border border-primary/30 shadow-[0_0_10px_rgba(var(--primary-rgb),0.2)]">
                  {filteredRequests.length} match{filteredRequests.length !== 1 ? 'es' : ''}
                </Badge>
              )}
            </div>
          </div>
          <div className="relative z-10">
            {/* Loading skeletons */}
            {loading && (
              <div className="divide-y divide-white/10">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="px-6 py-4 animate-pulse">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Skeleton className="h-4 w-24" />
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                        <Skeleton className="h-3 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Error state */}
            {error && !loading && (
              <div className="m-6 rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* Empty state */}
            {!loading && !error && filteredRequests.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                  <Inbox className="w-6 h-6 text-white/60" />
                </div>
                {hasActiveFilters ? (
                  <>
                    <p className="text-white/60 mt-3 text-sm">No requests match your filters.</p>
                    <button
                      onClick={clearFilters}
                      className="mt-3 inline-flex items-center gap-1.5 text-primary text-sm font-medium hover:underline"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Clear filters
                    </button>
                  </>
                ) : (
                  <>
                    <p className="text-white/60 mt-3 text-sm">No leave requests found.</p>
                    <Link
                      href="/employee/request-leave"
                      className="mt-3 inline-block text-primary text-sm font-medium hover:underline"
                    >
                      Submit your first request &rarr;
                    </Link>
                  </>
                )}
              </div>
            )}

            {/* Request rows */}
            {!loading && !error && filteredRequests.length > 0 && (
              <div className="divide-y divide-white/10">
                {filteredRequests.map((req) => {
                  const StatusIcon = STATUS_ICON[req.status] || Clock;
                  return (
                    <FadeIn key={req.id}>
                      <div
                        className="px-6 py-4 hover:bg-white/5 transition-colors cursor-pointer group"
                        onClick={() => openDetail(req)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') openDetail(req); }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-white">
                                {req.leave_type}
                              </span>
                              {req.is_half_day && (
                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]">
                                  Half day
                                </span>
                              )}
                              <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>
                                {req.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-white/60 mt-1">
                              {formatDate(req.start_date)}
                              {req.start_date !== req.end_date && ` \u2013 ${formatDate(req.end_date)}`}
                              {' \u00B7 '}
                              <span className="font-medium text-white">
                                {req.total_days} day{req.total_days !== 1 ? 's' : ''}
                              </span>
                            </p>
                            {req.reason && (
                              <p className="text-xs text-white/60 mt-1 truncate max-w-md">
                                {req.reason}
                              </p>
                            )}
                            {req.approver_comments && (
                              <p className="text-xs mt-1.5 flex items-start gap-1.5 max-w-lg">
                                <MessageSquare className="w-3.5 h-3.5 shrink-0 mt-0.5 text-primary/60" />
                                <span className="text-white/60">
                                  <span className="font-medium text-white/80">
                                    {req.approver?.first_name} {req.approver?.last_name}:
                                  </span>{' '}
                                  <span className="italic">{req.approver_comments}</span>
                                </span>
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <p className="text-xs text-white/60">
                              {formatDate(req.created_at)}
                            </p>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                                <Eye className="w-3 h-3" />
                                View
                              </span>
                              {(req.status === 'pending' || req.status === 'escalated') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleCancel(req.id); }}
                                  disabled={cancellingId === req.id}
                                  className="text-xs text-destructive hover:text-destructive/80 font-medium hover:underline disabled:opacity-50 transition-colors flex items-center gap-1"
                                >
                                  {cancellingId === req.id ? (
                                    'Cancelling...'
                                  ) : (
                                    <>
                                      <X className="w-3.5 h-3.5" /> Cancel
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </FadeIn>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="gap-1.5 border-white/10 bg-black/20 hover:bg-white/10 text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </Button>
                <span className="text-sm text-white/60">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="gap-1.5 border-white/10 bg-black/20 hover:bg-white/10 text-white"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* ================================================================ */}
      {/*  DETAIL MODAL                                                    */}
      {/* ================================================================ */}
      <Modal
        isOpen={detailModalOpen}
        onClose={closeDetail}
        title="Leave Request Details"
        size="lg"
      >
        {selectedRequest && (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
            {/* ---- Header Summary ---- */}
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-lg font-semibold text-white">
                    {selectedRequest.leave_type}
                  </span>
                  {selectedRequest.is_half_day && (
                    <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(var(--primary-rgb),0.2)]">
                      Half day
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/60 mt-1">
                  {formatDate(selectedRequest.start_date)}
                  {selectedRequest.start_date !== selectedRequest.end_date &&
                    ` \u2013 ${formatDate(selectedRequest.end_date)}`}
                </p>
              </div>
              <Badge
                variant={STATUS_BADGE[selectedRequest.status] ?? 'default'}
                size="lg"
              >
                {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
              </Badge>
            </div>

            {/* ---- Key Details Grid ---- */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-xl bg-white/5 border border-white/10 p-4">
              <div>
                <p className="text-xs text-white/60">Total Days</p>
                <p className="text-sm font-semibold text-white mt-0.5">
                  {selectedRequest.total_days} day{selectedRequest.total_days !== 1 ? 's' : ''}
                </p>
              </div>
              <div>
                <p className="text-xs text-white/60">Submitted</p>
                <p className="text-sm font-medium text-white mt-0.5">
                  {formatDate(selectedRequest.created_at)}
                </p>
              </div>
              {selectedRequest.approved_at && (
                <div>
                  <p className="text-xs text-white/60">
                    {selectedRequest.status === 'approved' ? 'Approved' : 'Reviewed'}
                  </p>
                  <p className="text-sm font-medium text-white mt-0.5">
                    {formatDate(selectedRequest.approved_at)}
                  </p>
                </div>
              )}
              {selectedRequest.approver && (
                <div>
                  <p className="text-xs text-white/60">Approver</p>
                  <p className="text-sm font-medium text-white mt-0.5 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-white/60" />
                    {selectedRequest.approver.first_name} {selectedRequest.approver.last_name}
                  </p>
                </div>
              )}
              {selectedRequest.sla_deadline && (
                <div>
                  <p className="text-xs text-white/60">SLA Deadline</p>
                  <p className={`text-sm font-medium mt-0.5 ${selectedRequest.sla_breached ? 'text-red-400 drop-shadow-[0_0_6px_rgba(239,68,68,0.5)]' : 'text-white'}`}>
                    {formatDate(selectedRequest.sla_deadline)}
                    {selectedRequest.sla_breached && ' (Breached)'}
                  </p>
                </div>
              )}
              {selectedRequest.escalation_count > 0 && (
                <div>
                  <p className="text-xs text-white/60">Escalations</p>
                  <p className="text-sm font-semibold text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.5)] mt-0.5">
                    {selectedRequest.escalation_count}
                  </p>
                </div>
              )}
            </div>

            {/* ---- Reason ---- */}
            {selectedRequest.reason && (
              <div>
                <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1.5">
                  Reason
                </h4>
                <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3">
                  <p className="text-sm text-white whitespace-pre-wrap">
                    {selectedRequest.reason}
                  </p>
                </div>
              </div>
            )}

            {/* ---- Approver Comments ---- */}
            {selectedRequest.approver_comments && (
              <div>
                <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1.5">
                  Approver Comments
                </h4>
                <div className="rounded-lg bg-white/5 border border-white/10 px-4 py-3 flex items-start gap-2">
                  <MessageSquare className="w-4 h-4 text-primary/60 shrink-0 mt-0.5" />
                  <div>
                    {selectedRequest.approver && (
                      <p className="text-xs font-medium text-white/80 mb-1">
                        {selectedRequest.approver.first_name} {selectedRequest.approver.last_name}
                      </p>
                    )}
                    <p className="text-sm text-white italic">
                      {selectedRequest.approver_comments}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* ---- Cancel Reason ---- */}
            {selectedRequest.cancel_reason && (
              <div>
                <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1.5">
                  Cancel Reason
                </h4>
                <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3">
                  <p className="text-sm text-red-400">
                    {selectedRequest.cancel_reason}
                  </p>
                </div>
              </div>
            )}

            {/* ---- Constraint Engine Results ---- */}
            {selectedRequest.constraint_result && (
              <div>
                <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1.5">
                  Constraint Engine Results
                </h4>
                <div className="rounded-lg border border-white/10 overflow-hidden">
                  {/* Overall result */}
                  <div className={`px-4 py-2.5 flex items-center justify-between text-sm font-medium ${
                    selectedRequest.constraint_result.passed
                      ? 'bg-emerald-500/10 text-emerald-400'
                      : 'bg-red-500/10 text-red-400'
                  }`}>
                    <span className="flex items-center gap-1.5">
                      {selectedRequest.constraint_result.passed ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                      {selectedRequest.constraint_result.passed ? 'All checks passed' : 'Some checks failed'}
                    </span>
                    {selectedRequest.constraint_result.score !== undefined && (
                      <span className="text-xs font-normal opacity-80">
                        Score: {Math.round(selectedRequest.constraint_result.score * 100)}%
                      </span>
                    )}
                  </div>

                  {/* Individual checks */}
                  {Array.isArray(selectedRequest.constraint_result.checks) &&
                    selectedRequest.constraint_result.checks.length > 0 && (
                      <div className="divide-y divide-white/10">
                        {selectedRequest.constraint_result.checks.map((check, idx) => (
                          <div key={idx} className="px-4 py-2.5 flex items-start gap-2 text-sm bg-white/5">
                            {check.passed ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-white text-xs">
                                {check.name || check.rule || `Check ${idx + 1}`}
                              </p>
                              {(check.message || check.details) && (
                                <p className="text-xs text-white/60 mt-0.5">
                                  {check.message || check.details}
                                </p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              </div>
            )}

            {/* ---- AI Recommendation ---- */}
            {selectedRequest.ai_recommendation && selectedRequest.ai_recommendation.recommendation && (
              <div>
                <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1.5">
                  AI Recommendation
                </h4>
                <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 px-4 py-3">
                  <p className="text-sm text-blue-400 font-medium">
                    {selectedRequest.ai_recommendation.recommendation}
                    {selectedRequest.ai_recommendation.confidence !== undefined && (
                      <span className="ml-2 text-xs opacity-70">
                        ({Math.round(selectedRequest.ai_recommendation.confidence * 100)}% confidence)
                      </span>
                    )}
                  </p>
                  {selectedRequest.ai_recommendation.reason && (
                    <p className="text-xs text-blue-400/80 mt-1">
                      {selectedRequest.ai_recommendation.reason}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* ---- Timeline / Audit Trail ---- */}
            <div>
              <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-2">
                Timeline
              </h4>
              <div className="space-y-3 relative before:absolute before:left-[13px] before:top-4 before:bottom-4 before:w-px before:bg-white/10">
                {buildTimeline(selectedRequest).map((entry, idx) => (
                  <TimelineEntry key={idx} {...entry} />
                ))}
              </div>
            </div>

            {/* ---- Attachment ---- */}
            {selectedRequest.attachment_url && (
              <div>
                <h4 className="text-xs font-medium text-white/60 uppercase tracking-wide mb-1.5">
                  Attachment
                </h4>
                <a
                  href={selectedRequest.attachment_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <FileText className="w-4 h-4" />
                  View attachment
                </a>
              </div>
            )}

            {/* ---- Modal Footer Actions ---- */}
            <div className="flex items-center justify-between pt-2 border-t border-white/10">
              <p className="text-xs text-white/60">
                ID: {selectedRequest.id.slice(0, 8)}...
              </p>
              <div className="flex items-center gap-2">
                {(selectedRequest.status === 'pending' || selectedRequest.status === 'escalated') && (
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => {
                      closeDetail();
                      handleCancel(selectedRequest.id);
                    }}
                    disabled={cancellingId === selectedRequest.id}
                  >
                    <X className="w-3.5 h-3.5" />
                    Cancel Request
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={closeDetail}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </StaggerContainer>
  );
}
