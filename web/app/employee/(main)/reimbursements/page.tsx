'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Receipt,
  Plus,
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
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Reimbursement {
  id: string;
  category: string;
  amount: number;
  description: string | null;
  receipt_url: string | null;
  status: string;
  approved_by: string | null;
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
  travel: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  medical: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  equipment: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
  food: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  other: 'bg-slate-500/10 text-slate-600 dark:text-slate-400',
};

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function EmployeeReimbursementsPage() {
  const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Form state
  const [formCategory, setFormCategory] = useState<string>('travel');
  const [formAmount, setFormAmount] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formReceiptUrl, setFormReceiptUrl] = useState('');
  const [formReceiptFile, setFormReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);

  // Success message
  const [successMsg, setSuccessMsg] = useState('');

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

  // ─── Summary Calculations ───────────────────────────────────────────────────

  const summary = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const all = reimbursements;
    return {
      totalSubmitted: pagination?.total ?? all.length,
      totalApproved: all.filter((r) => r.status === 'approved' || r.status === 'processed').length,
      totalPending: all.filter((r) => r.status === 'pending').length,
      totalAmountApproved: all
        .filter(
          (r) =>
            (r.status === 'approved' || r.status === 'processed') &&
            new Date(r.created_at).getFullYear() === currentYear
        )
        .reduce((sum, r) => sum + r.amount, 0),
    };
  }, [reimbursements, pagination]);

  // ─── Form Submission ────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError('');

    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid positive amount.');
      setSubmitting(false);
      return;
    }

    try {
      const body: Record<string, unknown> = {
        category: formCategory,
        amount,
      };
      if (formDescription.trim()) body.description = formDescription.trim();

      // Handle receipt: file upload takes priority over URL
      if (formReceiptFile) {
        const reader = new FileReader();
        const dataUrl = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(formReceiptFile);
        });
        body.receipt_url = dataUrl;
      } else if (formReceiptUrl.trim()) {
        body.receipt_url = formReceiptUrl.trim();
      }

      const res = await fetch('/api/reimbursements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });

      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error ?? 'Failed to submit reimbursement.');
        return;
      }

      // Success: close modal and refresh
      setShowModal(false);
      resetForm();
      setSuccessMsg('Reimbursement submitted successfully!');
      setTimeout(() => setSuccessMsg(''), 5000);
      loadReimbursements(page, statusFilter);
    } catch {
      setSubmitError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function resetForm() {
    setFormCategory('travel');
    setFormAmount('');
    setFormDescription('');
    setFormReceiptUrl('');
    setFormReceiptFile(null);
    setReceiptPreview(null);
    setSubmitError('');
  }

  function openModal() {
    resetForm();
    setShowModal(true);
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
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-36" />
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
        <Card>
          <CardContent className="py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 border-b border-border last:border-0">
                <Skeleton className="w-10 h-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Header */}
      <motion.div className="flex items-center justify-between flex-wrap gap-4" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reimbursements</h1>
          <p className="text-muted-foreground mt-1">
            Submit and track your expense reimbursements
          </p>
        </div>
        <Button onClick={openModal}>
          <Plus className="w-4 h-4" />
          New Request
        </Button>
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

      {/* Summary Cards */}
      <motion.div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" variants={itemVariants}>
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Receipt className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Submitted</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalSubmitted}</p>
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
                <p className="text-sm text-muted-foreground">Total Approved</p>
                <p className="text-2xl font-bold text-foreground">{summary.totalApproved}</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
                <p className="text-sm text-muted-foreground">Approved This Year</p>
                <p className="text-2xl font-bold text-foreground">{formatCurrency(summary.totalAmountApproved)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Status Filters */}
      <motion.div className="flex items-center gap-2 flex-wrap" variants={itemVariants}>
        {[
          { value: '', label: 'All' },
          { value: 'pending', label: 'Pending' },
          { value: 'approved', label: 'Approved' },
          { value: 'rejected', label: 'Rejected' },
          { value: 'processed', label: 'Processed' },
        ].map((f) => (
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

      {/* Error State */}
      {error && (
        <motion.div variants={itemVariants}>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        </motion.div>
      )}

      {/* Reimbursements List */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Your Reimbursements</CardTitle>
          </CardHeader>
          <CardContent>
            {!loading && !error && reimbursements.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center mx-auto">
                  <Inbox className="w-6 h-6 text-slate-400" />
                </div>
                <p className="text-muted-foreground mt-3 text-sm">
                  No reimbursements found.
                </p>
                <p className="text-muted-foreground text-xs mt-1">
                  Submit your first reimbursement request to get started.
                </p>
                <Button onClick={openModal} variant="outline" size="sm" className="mt-4">
                  <Plus className="w-4 h-4" />
                  New Request
                </Button>
              </div>
            )}

            {reimbursements.length > 0 && (
              <div className="space-y-3">
                {reimbursements.map((r) => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-4 p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                  >
                    {/* Category Icon */}
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other
                      }`}
                    >
                      {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">
                            {CATEGORY_LABELS[r.category] || r.category}
                          </p>
                          {r.description && (
                            <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">
                              {r.description}
                            </p>
                          )}
                        </div>
                        <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>
                          {r.status}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="font-semibold text-foreground text-sm">
                          {formatCurrency(r.amount)}
                        </span>
                        <span>{formatDate(r.created_at)}</span>
                        {r.approver && (
                          <span>
                            {r.status === 'rejected' ? 'Rejected' : 'Approved'} by{' '}
                            {r.approver.first_name} {r.approver.last_name}
                          </span>
                        )}
                        {r.receipt_url && (
                          r.receipt_url.startsWith('data:image/') ? (
                            <button
                              type="button"
                              onClick={() => window.open(r.receipt_url!, '_blank')}
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                            >
                              <img src={r.receipt_url} alt="Receipt" className="w-8 h-8 rounded object-cover border border-border" />
                              <span>Receipt</span>
                            </button>
                          ) : (
                            <a
                              href={r.receipt_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              Receipt
                            </a>
                          )
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
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
                  <ChevronLeft className="w-4 h-4" />
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
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* New Reimbursement Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="New Reimbursement Request"
        description="Submit a new expense reimbursement"
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
              required
            >
              <option value="travel">Travel</option>
              <option value="medical">Medical</option>
              <option value="equipment">Equipment</option>
              <option value="food">Food</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Amount (INR) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                <IndianRupee className="w-4 h-4" />
              </span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                required
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Description
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Brief description of the expense..."
              maxLength={500}
              rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors resize-none"
            />
            <p className="text-xs text-muted-foreground mt-1 text-right">
              {formDescription.length}/500
            </p>
          </div>

          {/* Receipt Upload */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Receipt (image or PDF)
            </label>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setFormReceiptFile(file);
                if (file && file.type.startsWith('image/')) {
                  const url = URL.createObjectURL(file);
                  setReceiptPreview(url);
                } else {
                  setReceiptPreview(null);
                }
              }}
              className="w-full text-sm text-foreground file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer"
            />
            {receiptPreview && (
              <img src={receiptPreview} alt="Receipt preview" className="mt-2 max-h-32 rounded-lg border border-border object-contain" />
            )}
            {formReceiptFile && !receiptPreview && (
              <p className="mt-1 text-xs text-muted-foreground">{formReceiptFile.name}</p>
            )}
            {!formReceiptFile && (
              <div className="mt-2">
                <p className="text-xs text-muted-foreground mb-1">Or paste a receipt URL:</p>
                <input
                  type="url"
                  value={formReceiptUrl}
                  onChange={(e) => setFormReceiptUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
                />
              </div>
            )}
          </div>

          {/* Submit Error */}
          {submitError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {submitError}
            </div>
          )}

          <ModalFooter>
            <Button
              variant="outline"
              type="button"
              onClick={() => setShowModal(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              <Banknote className="w-4 h-4" />
              Submit Request
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </motion.div>
  );
}
