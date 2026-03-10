'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ensureMe } from '@/lib/client-auth';
import {
  Banknote,
  Inbox,
  Check,
  X,
  CheckCircle,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EncashmentRequest {
  id: string;
  leave_type: string;
  days: number;
  amount: number;
  status: string;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
  };
  approver: {
    first_name: string;
    last_name: string;
  } | null;
}

// ─── Status Config ──────────────────────────────────────────────────────────

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  processed: 'info',
  rejected: 'danger',
};

const TAB_FILTERS = [
  { value: '', label: 'All' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'processed', label: 'Processed' },
  { value: 'rejected', label: 'Rejected' },
] as const;

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
} as const;

const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
};

const messageVariants = {
  initial: { opacity: 0, y: -10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
};

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="space-y-3 py-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-32 bg-muted rounded" />
            <div className="h-3 w-20 bg-muted rounded" />
          </div>
          <div className="h-4 w-16 bg-muted rounded" />
          <div className="h-4 w-10 bg-muted rounded" />
          <div className="h-6 w-16 bg-muted rounded-full" />
          <div className="h-4 w-20 bg-muted rounded" />
          <div className="h-8 w-36 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function HRLeaveEncashmentPage() {
  const [encashments, setEncashments] = useState<EncashmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // ─── Data Loading ─────────────────────────────────────────────────────────

  const loadEncashments = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      await ensureMe();
      const params = new URLSearchParams({ page: String(p), limit: '20' });
      if (status) params.set('status', status);
      const res = await fetch(`/api/leaves/encash?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load encashment requests');
        return;
      }
      setEncashments(json.encashments);
      setTotalPages(json.pagination.pages || 1);
      setTotal(json.pagination.total || 0);
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEncashments(page, statusFilter);
  }, [page, statusFilter, loadEncashments]);

  // ─── Message Helper ───────────────────────────────────────────────────────

  function showMessage(type: 'success' | 'error', text: string) {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  }

  // ─── Action Handler ───────────────────────────────────────────────────────

  async function handleAction(requestId: string, action: 'approve' | 'reject') {
    setActionLoading(requestId + action);
    try {
      const res = await fetch(`/api/leaves/encash/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        const updatedData = await res.json();
        setEncashments((prev) =>
          prev.map((r) =>
            r.id === requestId ? { ...r, ...updatedData } : r
          )
        );
        const req = encashments.find((r) => r.id === requestId);
        showMessage(
          'success',
          `${action === 'approve' ? 'Approved' : 'Rejected'} encashment for ${req?.employee.first_name ?? 'employee'}`
        );
      } else {
        const data = await res.json().catch(() => ({}));
        showMessage('error', data.error ?? `Failed to ${action} encashment`);
      }
    } catch {
      showMessage('error', `Network error while trying to ${action} encashment`);
    } finally {
      setActionLoading(null);
    }
  }

  // ─── Formatters ───────────────────────────────────────────────────────────

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatAmount(amount: number) {
    if (!amount) return '--';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <motion.div className="space-y-6" variants={containerVariants} initial="hidden" animate="visible">
      {/* Header */}
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
            <Banknote className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Leave Encashment</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              {total > 0 ? `${total} requests` : 'Manage leave encashment requests'}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Tab Filters */}
      <motion.div className="flex gap-2 flex-wrap" variants={itemVariants}>
        {TAB_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              statusFilter === f.value
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-muted/50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </motion.div>

      {/* Action Message */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            {...messageVariants}
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

      {/* Main Content Card */}
      <motion.div variants={itemVariants}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>
              {statusFilter
                ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' '
                : 'All '}
              Requests
            </CardTitle>
            {statusFilter === 'pending' && total > 0 && (
              <Badge variant="warning">{total} pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Loading Skeleton */}
          {loading && <TableSkeleton />}

          {/* Error State */}
          {error && !loading && (
            <div className="py-12 text-center space-y-4">
              <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => loadEncashments(page, statusFilter)}
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && encashments.length === 0 && (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center mx-auto">
                <Inbox className="w-5 h-5 text-slate-400" />
              </div>
              <p className="text-muted-foreground mt-3 text-sm">
                No encashment requests found.
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && !error && encashments.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 pr-4 text-muted-foreground font-medium">
                      Employee
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                      Leave Type
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                      Days
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                      Amount
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                      Status
                    </th>
                    <th className="text-left py-3 px-2 text-muted-foreground font-medium">
                      Date
                    </th>
                    <th className="text-left py-3 pl-2 text-muted-foreground font-medium">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence mode="popLayout">
                    {encashments.map((req) => (
                      <motion.tr
                        key={req.id}
                        layout
                        {...fadeInUp}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                              {req.employee.first_name[0]}
                              {req.employee.last_name[0]}
                            </div>
                            <div>
                              <p className="font-medium text-foreground">
                                {req.employee.first_name} {req.employee.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {req.employee.department ?? '\u2014'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-2 font-medium text-foreground">
                          {req.leave_type}
                        </td>
                        <td className="py-3 px-2 text-foreground">{req.days}</td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {formatAmount(req.amount)}
                        </td>
                        <td className="py-3 px-2">
                          <Badge variant={STATUS_BADGE[req.status] ?? 'default'}>
                            {req.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {formatDate(req.created_at)}
                        </td>
                        <td className="py-3 pl-2">
                          {req.status === 'pending' ? (
                            <div className="flex gap-2">
                              <Button
                                variant="success"
                                size="sm"
                                loading={actionLoading === req.id + 'approve'}
                                disabled={!!actionLoading}
                                onClick={() => handleAction(req.id, 'approve')}
                              >
                                <Check className="w-3.5 h-3.5" />
                                Approve
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                loading={actionLoading === req.id + 'reject'}
                                disabled={!!actionLoading}
                                onClick={() => handleAction(req.id, 'reject')}
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </Button>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              {req.approver
                                ? `by ${req.approver.first_name} ${req.approver.last_name}`
                                : '\u2014'}
                            </span>
                          )}
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
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
                Page {page} of {totalPages}
              </span>
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
        </CardContent>
      </Card>
      </motion.div>
    </motion.div>
  );
}
