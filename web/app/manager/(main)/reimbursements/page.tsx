'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  travel: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  medical: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  equipment: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  food: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  other: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
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

// ─── Skeleton Loader ─────────────────────────────────────────────────────────

function ReimbursementsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-16" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
      <Skeleton className="h-10 w-full max-w-xs" />
      <Card>
        <CardContent className="py-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-4 border-b border-border last:border-0">
              <Skeleton className="w-10 h-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

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
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reimbursement Approvals</h1>
          <p className="text-muted-foreground mt-1">
            Review and approve team reimbursement requests
          </p>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-foreground font-medium mt-4">Unable to load reimbursements</p>
              <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => loadReimbursements(page, statusFilter)}
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-foreground">Reimbursement Approvals</h1>
        <p className="text-muted-foreground mt-1">
          Review and approve team reimbursement requests
        </p>
      </motion.div>

      {/* Success Message */}
      <AnimatePresence>
        {successMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg px-4 py-3 text-sm flex items-center gap-2 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400"
          >
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Inline error banner */}
      <AnimatePresence>
        {error && reimbursements.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="rounded-lg px-4 py-3 text-sm flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400"
          >
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() => setError('')}
              className="ml-auto text-red-500 hover:text-red-600 dark:hover:text-red-300"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        variants={itemVariants}
      >
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Pending</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalPending}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Amount Pending</p>
                <p className="text-2xl font-bold text-foreground">
                  {formatCurrency(summary.totalAmountPending)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Approved This Month</p>
                <p className="text-2xl font-bold text-foreground">{summary.approvedThisMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rejected</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalRejected}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Filter Tabs + Search */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center gap-3"
        variants={itemVariants}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === tab.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64 sm:ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder="Search by employee name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-colors"
          />
        </div>
      </motion.div>

      {/* Reimbursements Table */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Reimbursement Requests</CardTitle>
              {loading && reimbursements.length > 0 && (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            {/* Empty State */}
            {!loading && !error && filteredReimbursements.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-foreground font-medium mt-3">
                  {searchQuery.trim()
                    ? 'No matching reimbursements'
                    : 'No reimbursements found'}
                </p>
                <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">
                  {searchQuery.trim()
                    ? `No reimbursements match "${searchQuery}"`
                    : statusFilter
                      ? `No ${statusFilter} reimbursements at this time.`
                      : 'Team reimbursement requests will appear here.'}
                </p>
              </div>
            )}

            {/* Desktop Table */}
            {filteredReimbursements.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Category
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">
                        Description
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        Receipt
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Status
                      </th>
                      <th className="text-left py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">
                        Date
                      </th>
                      <th className="text-right py-3 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredReimbursements.map((r) => {
                      const isPending = r.status === 'pending';
                      const isActioning = actionLoading === r.id;

                      return (
                        <motion.tr
                          key={r.id}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Employee */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center text-xs font-bold text-violet-600 dark:text-violet-400 shrink-0">
                                {r.employee.first_name.charAt(0)}
                                {r.employee.last_name.charAt(0)}
                              </div>
                              <div className="min-w-0">
                                <p className="font-medium text-foreground truncate">
                                  {r.employee.first_name} {r.employee.last_name}
                                </p>
                                {r.employee.department && (
                                  <p className="text-xs text-muted-foreground truncate">
                                    {r.employee.department}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 ${
                                  CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other
                                }`}
                              >
                                {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other}
                              </div>
                              <span className="text-foreground">
                                {CATEGORY_LABELS[r.category] || r.category}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-3 text-right">
                            <span className="font-semibold text-foreground">
                              {formatCurrency(r.amount)}
                            </span>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-3 hidden lg:table-cell">
                            <p className="text-muted-foreground text-xs line-clamp-2 max-w-[200px]">
                              {r.description || '-'}
                            </p>
                          </td>

                          {/* Receipt */}
                          <td className="py-3 px-3 hidden md:table-cell">
                            {r.receipt_url ? (
                              <a
                                href={r.receipt_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                                View
                              </a>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3">
                            <Badge
                              variant={STATUS_BADGE[r.status] ?? 'default'}
                              size="sm"
                            >
                              {r.status}
                            </Badge>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3 hidden md:table-cell">
                            <span className="text-xs text-muted-foreground">
                              {formatDate(r.created_at)}
                            </span>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3 text-right">
                            {isPending ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="success"
                                  size="sm"
                                  disabled={isActioning}
                                  onClick={() => handleAction(r.id, 'approve')}
                                >
                                  {isActioning ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <CheckCircle2 className="w-3 h-3" />
                                  )}
                                  Approve
                                </Button>
                                <Button
                                  variant="danger"
                                  size="sm"
                                  disabled={isActioning}
                                  onClick={() => handleAction(r.id, 'reject')}
                                >
                                  {isActioning ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <XCircle className="w-3 h-3" />
                                  )}
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {r.approver
                                  ? `By ${r.approver.first_name} ${r.approver.last_name}`
                                  : '-'}
                              </span>
                            )}
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
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
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
