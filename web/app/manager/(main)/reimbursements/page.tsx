'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FadeIn, StaggerContainer } from '@/components/motion';
import { GlassPanel } from '@/components/glass-panel';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Receipt,
  Inbox,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  AlertCircle,
  ExternalLink,
  IndianRupee,
  Loader2,
  RefreshCw,
  Plane,
  Stethoscope,
  Monitor,
  UtensilsCrossed,
  MoreHorizontal,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReimbursementEmployee {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  email: string;
}

interface ReimbursementApprover {
  id: string;
  first_name: string;
  last_name: string;
}

interface Reimbursement {
  id: string;
  emp_id: string;
  category: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  status: string;
  approved_by: string | null;
  employee: ReimbursementEmployee;
  approver: ReimbursementApprover | null;
  created_at: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  processed: 'info',
};

const CATEGORY_LABELS: Record<string, string> = {
  travel: 'Travel',
  medical: 'Medical',
  equipment: 'Equipment',
  food: 'Food',
  other: 'Other',
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  travel: <Plane className="w-4 h-4" />,
  medical: <Stethoscope className="w-4 h-4" />,
  equipment: <Monitor className="w-4 h-4" />,
  food: <UtensilsCrossed className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />,
};

const CATEGORY_COLORS: Record<string, string> = {
  travel: 'bg-blue-500/10 text-blue-400',
  medical: 'bg-emerald-500/10 text-emerald-400',
  equipment: 'bg-purple-500/10 text-purple-400',
  food: 'bg-orange-500/10 text-orange-400',
  other: 'bg-slate-500/10 text-slate-400',
};

const STATUS_TABS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
] as const;

// ─── Animation Variants ──────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/* ------------------------------------------------------------------ */
/*  Loading Skeleton                                                   */
/* ------------------------------------------------------------------ */

function ReimbursementsSkeleton() {
  return (
    <div className="p-4 sm:p-6 pb-32">
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 bg-white/10" />
          <Skeleton className="h-4 w-80 bg-white/10" />
        </div>

        {/* Metric cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <GlassPanel key={i} className="p-6 space-y-3">
              <Skeleton className="h-5 w-24 bg-white/10" />
              <Skeleton className="h-8 w-16 bg-white/10" />
            </GlassPanel>
          ))}
        </div>

        {/* Filters skeleton */}
        <GlassPanel className="p-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex gap-2">
              <Skeleton className="h-8 w-16 bg-white/10 rounded-full" />
              <Skeleton className="h-8 w-20 bg-white/10 rounded-full" />
              <Skeleton className="h-8 w-24 bg-white/10 rounded-full" />
            </div>
            <Skeleton className="h-10 flex-1 bg-white/10 rounded-lg sm:ml-auto" />
          </div>
        </GlassPanel>

        {/* Table skeleton */}
        <GlassPanel className="p-6 space-y-4">
          <Skeleton className="h-6 w-40 bg-white/10" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex justify-between items-center p-3 bg-black/10 rounded-lg">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full bg-white/10" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-32 bg-white/10" />
                    <Skeleton className="h-3 w-24 bg-white/10" />
                  </div>
                </div>
                <Skeleton className="h-8 w-24 bg-white/10 rounded-lg" />
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ManagerReimbursementsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadReimbursements = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '50' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/reimbursements?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load reimbursements');
        return;
      }
      setReimbursements(json.reimbursements);
      setPagination(json.pagination);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReimbursements(page, statusFilter);
  }, [page, statusFilter, loadReimbursements]);

  // ─── Approve / Reject Action ─────────────────────────────────────────────────

  const handleAction = useCallback(
    async (id: string, action: 'approve' | 'reject') => {
      setActionLoading(id);
      try {
        const res = await fetch('/api/reimbursements', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ id, action }),
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? `Failed to ${action} reimbursement`);
          return;
        }
        // Update the local list with the returned record
        setReimbursements((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...json.reimbursement } : r))
        );
        const label = action === 'approve' ? 'approved' : 'rejected';
        setSuccessMsg(`Reimbursement ${label} successfully.`);
        setTimeout(() => setSuccessMsg(''), 4000);
      } catch {
        setError('Network error. Please try again.');
      } finally {
        setActionLoading(null);
      }
    },
    []
  );

  // ─── Summary Calculations ───────────────────────────────────────────────────

  const summary = useMemo(() => {
    const all = reimbursements;
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const pending = all.filter((r) => r.status === 'pending');
    const approvedThisMonth = all.filter(
      (r) =>
        r.status === 'approved' &&
        new Date(r.created_at).getMonth() === currentMonth &&
        new Date(r.created_at).getFullYear() === currentYear
    );
    const rejected = all.filter((r) => r.status === 'rejected');
    const pendingAmount = pending.reduce((sum, r) => sum + r.amount, 0);

    return {
      totalPending: pending.length,
      totalAmountPending: pendingAmount,
      approvedThisMonth: approvedThisMonth.length,
      totalRejected: rejected.length,
    };
  }, [reimbursements]);

  // ─── Filtered Reimbursements ─────────────────────────────────────────────────

  const filteredReimbursements = useMemo(() => {
    if (!searchQuery.trim()) return reimbursements;
    const q = searchQuery.toLowerCase();
    return reimbursements.filter((r) => {
      const empName = `${r.employee.first_name} ${r.employee.last_name}`.toLowerCase();
      return empName.includes(q);
    });
  }, [reimbursements, searchQuery]);

  // ─── Loading State ─────────────────────────────────────────────────────────

  if (loading && reimbursements.length === 0) {
    return <ReimbursementsSkeleton />;
  }

  // ─── Error State (full page) ──────────────────────────────────────────────

  if (error && reimbursements.length === 0) {
    return (
      <div className="p-4 sm:p-6">
        <FadeIn>
          <PageHeader
            title="Reimbursement Approvals"
            description="Review and approve team reimbursement requests"
            icon={<Receipt className="w-6 h-6 text-primary" />}
          />
          <GlassPanel interactive className="border-red-500/30 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto ring-4 ring-red-500/20">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <p className="text-white font-semibold mt-6 text-xl">Unable to load reimbursements</p>
            <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">{error}</p>
            <Button
              variant="outline"
              size="md"
              className="mt-6"
              onClick={() => loadReimbursements(page, statusFilter)}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          </GlassPanel>
        </FadeIn>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6 pb-32">
      <StaggerContainer>
        {/* Header */}
        <PageHeader
          title="Reimbursement Approvals"
          description="Review and approve team reimbursement requests"
          icon={<Receipt className="w-6 h-6 text-primary" />}
        />

        {/* Success & Error Messages */}
        <div className="relative">
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                className="z-10 my-4 rounded-xl px-4 py-3 text-sm flex items-center gap-3 bg-green-500/10 border border-green-500/30 text-green-300 shadow-lg shadow-green-500/10"
              >
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                {successMsg}
              </motion.div>
            )}
            {error && reimbursements.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: -30, scale: 0.95 }}
                className="z-10 my-4 rounded-xl px-4 py-3 text-sm flex items-center gap-3 bg-red-500/10 border border-red-500/30 text-red-300 shadow-lg shadow-red-500/10"
              >
                <AlertCircle className="w-5 h-5 shrink-0" />
                {error}
                <button
                  type="button"
                  aria-label="Dismiss error"
                  onClick={() => setError('')}
                  className="ml-auto text-red-400 hover:text-red-300"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <MetricCard icon={Clock} label="Total Pending" value={summary.totalPending} color="amber" />
          <MetricCard icon={IndianRupee} label="Amount Pending" value={formatCurrency(summary.totalAmountPending)} color="purple" />
          <MetricCard icon={CheckCircle2} label="Approved This Month" value={summary.approvedThisMonth} color="emerald" />
          <MetricCard icon={XCircle} label="Total Rejected" value={summary.totalRejected} color="red" />
        </div>

        {/* Status Filter Tabs + Search */}
        <FadeIn>
          <GlassPanel className="mt-8 p-4">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => { setStatusFilter(tab.value); setPage(1); }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors duration-300 ${
                      statusFilter === tab.value
                        ? 'bg-primary text-white shadow-[0_0_15px_rgba(var(--primary-rgb),0.3)]'
                        : 'bg-black/20 text-white/60 hover:bg-black/40 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="relative w-full sm:w-72 sm:ml-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by employee name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 bg-black/20 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-primary/50 focus:outline-none"
                />
              </div>
            </div>
          </GlassPanel>
        </FadeIn>

        {/* Reimbursements List */}
        <FadeIn>
          <GlassPanel className="mt-6 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Requests</h3>
              {loading && reimbursements.length > 0 && (
                <Loader2 className="w-5 h-5 animate-spin text-white/60" />
              )}
            </div>

            {/* Empty State */}
            {!loading && !error && filteredReimbursements.length === 0 && (
              <div className="py-16 text-center">
                <div className="w-20 h-20 rounded-full bg-black/20 flex items-center justify-center mx-auto border-2 border-white/10">
                  <Inbox className="w-10 h-10 text-white/30" />
                </div>
                <p className="text-white font-semibold mt-5 text-lg">
                  {searchQuery.trim() ? 'No matching requests' : 'No reimbursements found'}
                </p>
                <p className="text-white/60 text-sm mt-2 max-w-sm mx-auto">
                  {searchQuery.trim()
                    ? `No reimbursements match "${searchQuery}"`
                    : statusFilter
                      ? `No ${statusFilter} reimbursements at this time.`
                      : 'Team reimbursement requests will appear here.'}
                </p>
              </div>
            )}

            {/* List */}
            {filteredReimbursements.length > 0 && (
              <div className="space-y-4">
                {filteredReimbursements.map((r) => (
                  <ReimbursementCard key={r.id} request={r} onAction={handleAction} actionLoading={actionLoading} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-8 pt-4 border-t-2 border-white/5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-white/60">
                  Page {page} of {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(pagination!.pages, p + 1))}
                  disabled={page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </GlassPanel>
        </FadeIn>
      </StaggerContainer>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                     */
/* ------------------------------------------------------------------ */

function MetricCard({ icon: Icon, label, value, color }: { icon: React.ElementType, label: string, value: number | string, color: string }) {
  const colorClasses: Record<string, string> = {
    amber: 'text-amber-400 bg-amber-500/10 shadow-amber-500/10',
    purple: 'text-purple-400 bg-purple-500/10 shadow-purple-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10 shadow-emerald-500/10',
    red: 'text-red-400 bg-red-500/10 shadow-red-500/10',
  };

  return (
    <FadeIn>
      <GlassPanel interactive className="p-5 h-full">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-lg shadow-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm text-white/70">{label}</p>
            <p className="text-2xl font-bold text-white">{value}</p>
          </div>
        </div>
      </GlassPanel>
    </FadeIn>
  );
}

function ReimbursementCard({ request, onAction, actionLoading }: { request: Reimbursement, onAction: (id: string, action: 'approve' | 'reject') => void, actionLoading: string | null }) {
  const isPending = request.status === 'pending';
  const isActioning = actionLoading === request.id;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.98 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="bg-black/20 border border-white/10 rounded-2xl p-4 transition-shadow hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Employee Info */}
        <div className="flex-1 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-lg font-bold text-white shrink-0 shadow-lg shadow-violet-500/20">
            {request.employee.first_name.charAt(0)}
            {request.employee.last_name.charAt(0)}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-white truncate">{request.employee.first_name} {request.employee.last_name}</p>
            <p className="text-xs text-white/60 truncate">{request.employee.department || 'N/A'}</p>
            <p className="text-xs text-white/60 truncate">{formatDate(request.created_at)}</p>
          </div>
        </div>

        {/* Details */}
        <div className="flex-1 grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${CATEGORY_COLORS[request.category] || CATEGORY_COLORS.other}`}>
                {CATEGORY_ICONS[request.category] || CATEGORY_ICONS.other}
              </div>
              <div>
                <p className="text-white/60">Category</p>
                <p className="font-medium text-white">{CATEGORY_LABELS[request.category] || request.category}</p>
              </div>
            </div>
          </div>
          <div>
            <p className="text-white/60">Amount</p>
            <p className="font-bold text-lg text-white">{formatCurrency(request.amount)}</p>
          </div>
        </div>

        {/* Status & Actions */}
        <div className="sm:w-64 flex flex-col sm:items-end gap-2">
          <div className="flex items-center gap-2">
            {request.receipt_url && (
              <a href={request.receipt_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                <ExternalLink className="w-4 h-4 text-white/70" />
              </a>
            )}
            <Badge variant={STATUS_BADGE[request.status] ?? 'default'} className="capitalize py-1 px-3 text-xs">{request.status}</Badge>
          </div>
          {isPending ? (
            <div className="flex items-center justify-end gap-2 mt-2 w-full">
              <Button
                variant="success"
                size="sm"
                className="flex-1"
                disabled={isActioning}
                onClick={() => onAction(request.id, 'approve')}
              >
                {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span className="ml-2">Approve</span>
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                disabled={isActioning}
                onClick={() => onAction(request.id, 'reject')}
              >
                {isActioning ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                <span className="ml-2">Reject</span>
              </Button>
            </div>
          ) : (
            <p className="text-xs text-white/50 text-right mt-2">
              {request.approver ? `By ${request.approver.first_name}` : 'Processed'}
            </p>
          )}
        </div>
      </div>
      {request.description && (
        <div className="mt-3 pt-3 border-t border-white/10 text-sm text-white/70">
          <p className="line-clamp-2">{request.description}</p>
        </div>
      )}
    </motion.div>
  );
}
