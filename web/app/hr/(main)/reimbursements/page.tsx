'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { TabButton } from '@/components/tab-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Receipt,
  Inbox,
  CheckCircle2,
  Clock,
  XCircle,
  Banknote,
  Plane,
  Stethoscope,
  Monitor,
  UtensilsCrossed,
  MoreHorizontal,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  IndianRupee,
  Check,
  X,
  ArrowRightCircle,
  Users,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reimbursement {
  id: string;
  emp_id: string;
  category: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  status: string;
  approved_by: string | null;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    email: string;
  };
  approver: {
    id: string;
    first_name: string;
    last_name: string;
  } | null;
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

// ─── Component ───────────────────────────────────────────────────────────────

export default function HRReimbursementsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Reject modal state
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectLoading, setRejectLoading] = useState(false);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadReimbursements = useCallback(async (p: number, status: string) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: '20' });
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
    ensureMe().then((me) => {
      if (!me) return;
      loadReimbursements(page, statusFilter);
    });
  }, [page, statusFilter, loadReimbursements]);

  // ─── Summary ────────────────────────────────────────────────────────────────

  const summary = useMemo(() => {
    const all = reimbursements;
    return {
      totalRequests: pagination?.total ?? all.length,
      pendingReview: all.filter((r) => r.status === 'pending').length,
      totalApprovedAmount: all
        .filter((r) => r.status === 'approved' || r.status === 'processed')
        .reduce((sum, r) => sum + r.amount, 0),
      totalProcessedAmount: all
        .filter((r) => r.status === 'processed')
        .reduce((sum, r) => sum + r.amount, 0),
    };
  }, [reimbursements, pagination]);

  // ─── Action Handlers ────────────────────────────────────────────────────────

  function showMessage(type: 'success' | 'error', text: string) {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  }

  async function handleAction(id: string, action: 'approve' | 'reject' | 'process', reason?: string) {
    setActionLoading(id + action);
    try {
      const body: Record<string, unknown> = { id, action };
      if (reason) body.reason = reason;

      const res = await fetch('/api/reimbursements', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        showMessage('error', json.error ?? `Failed to ${action} reimbursement`);
        return;
      }

      // Update local state
      setReimbursements((prev) =>
        prev.map((r) =>
          r.id === id
            ? {
                ...r,
                status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'processed',
                approver: json.reimbursement?.approver ?? r.approver,
                approved_by: json.reimbursement?.approved_by ?? r.approved_by,
              }
            : r
        )
      );

      const target = reimbursements.find((r) => r.id === id);
      const empName = target ? `${target.employee.first_name} ${target.employee.last_name}` : 'employee';
      const actionLabels: Record<string, string> = {
        approve: 'Approved',
        reject: 'Rejected',
        process: 'Processed',
      };
      showMessage('success', `${actionLabels[action]} reimbursement for ${empName}`);
    } catch {
      showMessage('error', `Network error while trying to ${action} reimbursement`);
    } finally {
      setActionLoading(null);
    }
  }

  function openRejectModal(id: string) {
    setRejectTargetId(id);
    setRejectReason('');
    setRejectModalOpen(true);
  }

  async function confirmReject() {
    if (!rejectTargetId) return;
    setRejectLoading(true);
    await handleAction(rejectTargetId, 'reject', rejectReason || undefined);
    setRejectLoading(false);
    setRejectModalOpen(false);
    setRejectTargetId(null);
    setRejectReason('');
  }

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

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading && reimbursements.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <GlassPanel key={i} className="p-6 space-y-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </GlassPanel>
          ))}
        </div>
        <GlassPanel className="p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b border-white/10 last:border-0">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
                <Skeleton className="h-8 w-20" />
              </div>
            ))}
        </GlassPanel>
      </div>
    );
  }

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <PageHeader title="Reimbursement Management" description="Review and process employee reimbursement requests" icon={<Receipt className="w-6 h-6 text-primary" />} />

      {/* Summary Cards */}
      <FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <TiltCard>
          <GlassPanel className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total Requests</p>
                <p className="text-2xl font-bold text-white">{summary.totalRequests}</p>
              </div>
            </div>
          </GlassPanel>
        </TiltCard>

        <TiltCard>
          <GlassPanel className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Pending Review</p>
                <p className="text-2xl font-bold text-white">{summary.pendingReview}</p>
              </div>
            </div>
          </GlassPanel>
        </TiltCard>

        <TiltCard>
          <GlassPanel className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total Approved</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalApprovedAmount)}</p>
              </div>
            </div>
          </GlassPanel>
        </TiltCard>

        <TiltCard>
          <GlassPanel className="p-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Banknote className="w-5 h-5 text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total Processed</p>
                <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalProcessedAmount)}</p>
              </div>
            </div>
          </GlassPanel>
        </TiltCard>
        </div>
      </FadeIn>

      {/* Status Filter Tabs */}
      <FadeIn>
        <div className="flex items-center gap-2 flex-wrap">
        {[
          { value: '', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'processed', label: 'Processed' },
        ].map((f) => (
          <TabButton
            key={f.value}
            active={statusFilter === f.value}
            onClick={() => {
              setStatusFilter(f.value);
              setPage(1);
            }}
          >
            {f.label}
          </TabButton>
        ))}
        </div>
      </FadeIn>

      {/* Action Message */}
      <AnimatePresence>
        {actionMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              actionMessage.type === 'success'
                ? 'bg-emerald-500/10 border border-emerald-800 text-emerald-400'
                : 'bg-red-500/10 border border-red-800 text-red-400'
            }`}
          >
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {actionMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error State */}
      {error && (
        <FadeIn>
          <div className="rounded-lg bg-red-900/20 border border-red-800 px-4 py-3 text-sm text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        </FadeIn>
      )}

      {/* Main Table / Cards */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              {statusFilter
                ? statusFilter.charAt(0).toUpperCase() + statusFilter.slice(1) + ' '
                : 'All '}
              Reimbursements
            </h2>
            {!loading && !error && reimbursements.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-500/10 flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-white/60 mt-3 text-sm">
                  No reimbursement requests found.
                </p>
              </div>
            )}

            {reimbursements.length > 0 && (
              <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 pr-4 text-white/60 font-medium">Employee</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Category</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Amount</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Description</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Status</th>
                        <th className="text-left py-3 px-2 text-white/60 font-medium">Date</th>
                        <th className="text-left py-3 pl-2 text-white/60 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reimbursements.map((r) => (
                        <tr
                          key={r.id}
                          className="border-b border-white/10 hover:bg-white/5 transition-colors"
                        >
                          {/* Employee */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {r.employee.first_name[0]}
                                {r.employee.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {r.employee.first_name} {r.employee.last_name}
                                </p>
                                <p className="text-xs text-white/60">
                                  {r.employee.department ?? '\u2014'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-1.5">
                              <span className={`w-6 h-6 rounded flex items-center justify-center ${CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other}`}>
                                {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other}
                              </span>
                              <span className="text-white">
                                {CATEGORY_LABELS[r.category] || r.category}
                              </span>
                            </div>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-2 font-semibold text-white">
                            {formatCurrency(r.amount)}
                          </td>

                          {/* Description */}
                          <td className="py-3 px-2 text-white/60 max-w-[200px]">
                            <span className="line-clamp-1">
                              {r.description || '\u2014'}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2">
                            <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>
                              {r.status}
                            </Badge>
                          </td>

                          {/* Date */}
                          <td className="py-3 px-2 text-white/60 whitespace-nowrap">
                            {formatDate(r.created_at)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 pl-2">
                            <div className="flex items-center gap-1.5">
                              {r.status === 'pending' && (
                                <>
                                  <Button
                                    variant="success"
                                    size="sm"
                                    loading={actionLoading === r.id + 'approve'}
                                    disabled={!!actionLoading}
                                    onClick={() => handleAction(r.id, 'approve')}
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="danger"
                                    size="sm"
                                    loading={actionLoading === r.id + 'reject'}
                                    disabled={!!actionLoading}
                                    onClick={() => openRejectModal(r.id)}
                                  >
                                    <X className="w-3.5 h-3.5" />
                                    Reject
                                  </Button>
                                </>
                              )}
                              {r.status === 'approved' && (
                                <Button
                                  variant="primary"
                                  size="sm"
                                  loading={actionLoading === r.id + 'process'}
                                  disabled={!!actionLoading}
                                  onClick={() => handleAction(r.id, 'process')}
                                >
                                  <ArrowRightCircle className="w-3.5 h-3.5" />
                                  Process
                                </Button>
                              )}
                              {(r.status === 'rejected' || r.status === 'processed') && (
                                <span className="text-xs text-white/60">{'\u2014'}</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-3">
                  {reimbursements.map((r) => (
                    <motion.div
                      key={r.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-lg border border-white/10 hover:bg-white/5 transition-colors"
                    >
                      {/* Top row: Employee + Status */}
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                            {r.employee.first_name[0]}
                            {r.employee.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-white text-sm">
                              {r.employee.first_name} {r.employee.last_name}
                            </p>
                            <p className="text-xs text-white/60">
                              {r.employee.department ?? '\u2014'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>
                          {r.status}
                        </Badge>
                      </div>

                      {/* Details grid */}
                      <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                        <div>
                          <p className="text-xs text-white/60">Category</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className={`w-5 h-5 rounded flex items-center justify-center ${CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other}`}>
                              {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other}
                            </span>
                            <span className="text-white">
                              {CATEGORY_LABELS[r.category] || r.category}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-white/60">Amount</p>
                          <p className="font-semibold text-white mt-0.5">{formatCurrency(r.amount)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-white/60">Date</p>
                          <p className="text-white mt-0.5">{formatDate(r.created_at)}</p>
                        </div>
                        {r.description && (
                          <div>
                            <p className="text-xs text-white/60">Description</p>
                            <p className="text-white mt-0.5 line-clamp-1">{r.description}</p>
                          </div>
                        )}
                      </div>

                      {/* Receipt link */}
                      {r.receipt_url && (
                        <a
                          href={r.receipt_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors mb-3"
                        >
                          <ExternalLink className="w-3 h-3" />
                          View Receipt
                        </a>
                      )}

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                        {r.status === 'pending' && (
                          <>
                            <Button
                              variant="success"
                              size="sm"
                              loading={actionLoading === r.id + 'approve'}
                              disabled={!!actionLoading}
                              onClick={() => handleAction(r.id, 'approve')}
                              className="flex-1"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              loading={actionLoading === r.id + 'reject'}
                              disabled={!!actionLoading}
                              onClick={() => openRejectModal(r.id)}
                              className="flex-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </Button>
                          </>
                        )}
                        {r.status === 'approved' && (
                          <Button
                            variant="primary"
                            size="sm"
                            loading={actionLoading === r.id + 'process'}
                            disabled={!!actionLoading}
                            onClick={() => handleAction(r.id, 'process')}
                            className="flex-1"
                          >
                            <ArrowRightCircle className="w-3.5 h-3.5" />
                            Process
                          </Button>
                        )}
                        {(r.status === 'rejected' || r.status === 'processed') && (
                          <span className="text-xs text-white/60">No actions available</span>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </>
            )}

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="w-4 h-4" />
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
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Reject Confirmation Modal */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setRejectTargetId(null);
          setRejectReason('');
        }}
        title="Reject Reimbursement"
        description="Please provide a reason for rejecting this reimbursement request."
        size="sm"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Reason for Rejection
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Enter the reason for rejection..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-white/60 mt-1 text-right">
              {rejectReason.length}/500
            </p>
          </div>

          <ModalFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectModalOpen(false);
                setRejectTargetId(null);
                setRejectReason('');
              }}
              disabled={rejectLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={rejectLoading}
              onClick={confirmReject}
            >
              <XCircle className="w-4 h-4" />
              Reject
            </Button>
          </ModalFooter>
        </div>
      </Modal>
    </StaggerContainer>
  );
}
