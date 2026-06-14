'use client';

import Image from 'next/image';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Select, Textarea } from '@/components/ui/input';
import { ensureMe } from '@/lib/client-auth';
import {
  Receipt,
  Plus,
  Inbox,
  CheckCircle2,
  Clock,
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
  travel: 'bg-[var(--status-info)]/20 text-[var(--status-info)]',
  medical: 'bg-[var(--status-success)]/20 text-[var(--status-success)]',
  equipment: 'bg-[var(--primary)]/20 text-[var(--primary)]',
  food: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]',
  other: 'bg-[var(--accent)] text-[var(--foreground)]',
};

// ─── Component ───────────────────────────────────────────────────────────────

export default function ReimbursementsView() {
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
      <div className="min-h-screen bg-[var(--background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="space-y-6">
            <div className="border-b border-[var(--border)] pb-6">
              <div className="flex items-center gap-3 mb-2">
                <Receipt className="w-7 h-7 text-[var(--primary)]" />
                <h1 className="text-3xl font-bold text-foreground">Reimbursements</h1>
              </div>
              <p className="text-sm text-[var(--muted-foreground)]">Submit and track expense reimbursements</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-6 animate-pulse">
                  <div className="h-4 bg-[var(--muted)]/40 rounded w-24 mb-3" />
                  <div className="h-8 bg-[var(--muted)]/40 rounded w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div className="flex items-center gap-3">
              <Receipt className="w-7 h-7 text-[var(--primary)]" />
              <div>
                <h1 className="text-3xl font-bold text-foreground">Reimbursements</h1>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Submit and track expense reimbursements</p>
              </div>
            </div>
            <Button size="lg" onClick={openModal}>
              <Plus className="w-4 h-4 mr-2" />
              New Request
            </Button>
          </div>

          {/* Success Message */}
          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-lg text-foreground font-medium bg-[var(--status-success-soft)] border border-[var(--status-success)]/20 flex items-center gap-3"
              >
                <CheckCircle2 className="w-5 h-5 text-[var(--status-success)]" />
                <span>{successMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Receipt} label="Total Submitted" value={summary.totalSubmitted} color="info" />
            <StatCard icon={CheckCircle2} label="Total Approved" value={summary.totalApproved} color="success" />
            <StatCard icon={Clock} label="Total Pending" value={summary.totalPending} color="warning" />
            <StatCard icon={IndianRupee} label="Approved (YTD)" value={formatCurrency(summary.totalAmountApproved)} color="primary" isAmount />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { value: '', label: 'All' },
              { value: 'pending', label: 'Pending' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'processed', label: 'Processed' },
            ].map((f) => (
              <Button
                key={f.value}
                variant={statusFilter === f.value ? 'primary' : 'outline'}
                size="sm"
                onClick={() => {
                  setStatusFilter(f.value);
                  setPage(1);
                }}
              >
                {f.label}
              </Button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <div className="p-4 rounded-lg border border-[var(--status-danger)]/20 bg-[var(--status-danger-soft)] text-[var(--status-danger)] flex items-center gap-3">
              <AlertCircle className="w-5 h-5" />
              <span>{error}</span>
            </div>
          )}

          {/* Reimbursements List */}
          <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-[var(--border)]">
              <h2 className="text-lg font-semibold text-foreground">Your Reimbursements</h2>
            </div>
            <div className="p-4 sm:p-6">
              {!loading && !error && reimbursements.length === 0 && (
                <div className="py-16 text-center">
                  <div className="w-16 h-16 rounded-lg bg-[var(--muted)]/40 flex items-center justify-center mx-auto border border-[var(--border)]">
                    <Inbox className="w-8 h-8 text-[var(--muted-foreground)]" />
                  </div>
                  <p className="text-[var(--muted-foreground)] mt-4 font-medium">No reimbursements found.</p>
                  <p className="text-[var(--muted-foreground)] text-sm mt-1">Submit your first reimbursement request to get started.</p>
                  <Button onClick={openModal} variant="outline" size="sm" className="mt-6">
                    <Plus className="w-4 h-4 mr-2" />
                    New Request
                  </Button>
                </div>
              )}

              {reimbursements.length > 0 && (
                <div className="space-y-4">
                  {reimbursements.map((r) => (
                    <div key={r.id} className="flex items-start gap-4 p-4 rounded-lg border border-[var(--border)] bg-[var(--muted)]/20 hover:bg-[var(--muted)]/40 transition-colors">
                      {/* Category Icon */}
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other}`}>
                        {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other}
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-bold text-foreground">{CATEGORY_LABELS[r.category] || r.category}</p>
                            {r.description && (
                              <p className="text-sm text-[var(--muted-foreground)] mt-0.5 line-clamp-1">{r.description}</p>
                            )}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${
                            r.status === 'approved' || r.status === 'processed' ? 'bg-[var(--status-success-soft)] text-[var(--status-success)] border-[var(--status-success)]/20' :
                            r.status === 'pending' ? 'bg-[var(--status-warning-soft)] text-[var(--status-warning)] border-[var(--status-warning)]/20' :
                            r.status === 'rejected' ? 'bg-[var(--status-danger-soft)] text-[var(--status-danger)] border-[var(--status-danger)]/20' :
                            'bg-[var(--muted)]/40 text-[var(--muted-foreground)] border-[var(--border)]'
                          }`}>
                            {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                          <p className="text-lg font-mono font-bold text-foreground">{formatCurrency(r.amount)}</p>
                          <div className="text-xs text-[var(--muted-foreground)] flex items-center gap-4">
                            <span>{formatDate(r.created_at)}</span>
                            {r.receipt_url && (
                              <a href={r.receipt_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[var(--primary)] hover:underline">
                                <ExternalLink className="w-3 h-3" />
                                View Receipt
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {pagination && pagination.pages > 1 && (
              <div className="p-4 border-t border-[var(--border)] flex justify-center items-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-[var(--muted-foreground)]">Page {page} of {pagination.pages}</span>
                <Button size="sm" variant="outline" disabled={page === pagination.pages} onClick={() => setPage(page + 1)}>
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {showModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="border border-[var(--border)] bg-[var(--card)] rounded-lg w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <form onSubmit={handleSubmit}>
                <div className="p-6 border-b border-[var(--border)]">
                  <h2 className="text-xl font-bold text-foreground">New Reimbursement Request</h2>
                  <p className="text-[var(--muted-foreground)] text-sm mt-1">Fill in the details of your expense.</p>
                </div>
                <div className="p-6 space-y-6">
                  {/* Category & Amount */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="reimbursement-category" className="text-sm font-medium text-foreground block mb-2">Category</label>
                      <Select
                        id="reimbursement-category"
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        aria-label="Reimbursement category"
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-foreground"
                      >
                        {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                          <option key={key} value={key}>{label}</option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label htmlFor="amount" className="text-sm font-medium text-foreground block mb-2">Amount (INR)</label>
                      <div className="relative">
                        <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                        <Input
                          id="amount"
                          type="number"
                          value={formAmount}
                          onChange={(e) => setFormAmount(e.target.value)}
                          placeholder="0.00"
                          className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg pl-9 pr-3 py-2 text-foreground"
                          required
                        />
                      </div>
                    </div>
                  </div>
                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="text-sm font-medium text-foreground block mb-2">Description</label>
                    <Textarea
                      id="description"
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g., Client lunch meeting"
                      rows={3}
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-foreground"
                    />
                  </div>
                  {/* Receipt */}
                  <div>
                    <label className="text-sm font-medium text-foreground block mb-2">Receipt</label>
                    <div className="p-4 border-2 border-dashed border-[var(--border)] rounded-lg text-center">
                      <input
                        type="file"
                        id="receipt-upload"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFormReceiptFile(file);
                            setReceiptPreview(URL.createObjectURL(file));
                          }
                        }}
                        accept="image/*,.pdf"
                      />
                      <label htmlFor="receipt-upload" className="cursor-pointer text-[var(--primary)] hover:underline">
                        {formReceiptFile ? `Selected: ${formReceiptFile.name}` : 'Upload a file'}
                      </label>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">or paste a URL below</p>
                      <Input
                        type="text"
                        value={formReceiptUrl}
                        onChange={(e) => setFormReceiptUrl(e.target.value)}
                        placeholder="https://example.com/receipt.jpg"
                        className="mt-3 w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-foreground text-sm"
                      />
                      {receiptPreview && (
                        <Image
                          src={receiptPreview}
                          alt="Receipt preview"
                          width={320}
                          height={160}
                          unoptimized
                          className="mt-4 max-h-40 w-auto mx-auto rounded-lg"
                        />
                      )}
                    </div>
                  </div>
                  {submitError && (
                    <p className="text-sm text-[var(--status-danger)] bg-[var(--status-danger-soft)] p-3 rounded-lg border border-[var(--status-danger)]/20">{submitError}</p>
                  )}
                </div>
                <div className="p-6 border-t border-[var(--border)] flex justify-end gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  isAmount,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: 'info' | 'success' | 'warning' | 'primary';
  isAmount?: boolean;
}) {
  const colorMap = {
    info: 'bg-[var(--status-info)]/20 text-[var(--status-info)]',
    success: 'bg-[var(--status-success)]/20 text-[var(--status-success)]',
    warning: 'bg-[var(--status-warning)]/20 text-[var(--status-warning)]',
    primary: 'bg-[var(--primary)]/20 text-[var(--primary)]',
  };

  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-6">
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-lg ${colorMap[color]}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-sm text-[var(--muted-foreground)]">{label}</p>
          <p className="text-2xl font-bold text-foreground">{isAmount ? value : value}</p>
        </div>
      </div>
    </div>
  );
}


