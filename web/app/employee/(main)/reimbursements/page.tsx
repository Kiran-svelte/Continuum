'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StaggerContainer, FadeIn, TiltCard, AmbientBackground } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
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
      <div className="p-4 sm:p-8 pb-32 max-w-7xl mx-auto">
        <AmbientBackground />
        <StaggerContainer className="space-y-6">
          <PageHeader
            title="Reimbursements"
            description="Submit and track expense reimbursements"
            icon={<Receipt className="w-6 h-6 text-primary" />}
            action={
              <Button
                onClick={openModal}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 gap-2 transition-all duration-300 transform hover:scale-105"
              >
                <Plus className="w-4 h-4" />
                New Request
              </Button>
            }
          />

          <AnimatePresence>
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-4 rounded-lg text-white font-medium bg-green-500/80 border border-green-400/50"
              >
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{successMsg}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
              {[1,2,3,4].map(i => (
                <GlassPanel key={i} className="p-6 animate-pulse">
                  <div className="h-4 bg-white/10 rounded w-24 mb-3" />
                  <div className="h-8 bg-white/10 rounded w-16" />
                </GlassPanel>
              ))}
            </div>
          </FadeIn>
        </StaggerContainer>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8 pb-32 max-w-7xl mx-auto">
      <AmbientBackground />
      <StaggerContainer className="space-y-6">
        <PageHeader
          title="Reimbursements"
          description="Submit and track expense reimbursements"
          icon={<Receipt className="w-6 h-6 text-primary" />}
          action={
            <Button
              onClick={openModal}
              className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 gap-2 transition-all duration-300 transform hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              New Request
            </Button>
          }
        />

        <AnimatePresence>
          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-4 rounded-lg text-white font-medium bg-green-500/80 border border-green-400/50"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5" />
                <span>{successMsg}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

          <FadeIn>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <TiltCard>
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.3)]">
                      <Receipt className="w-6 h-6 text-blue-300" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Total Submitted</p>
                      <p className="text-2xl font-bold text-white">{summary.totalSubmitted}</p>
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>

              <TiltCard>
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                      <CheckCircle2 className="w-6 h-6 text-emerald-300" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Total Approved</p>
                      <p className="text-2xl font-bold text-white">{summary.totalApproved}</p>
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>

              <TiltCard>
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                      <Clock className="w-6 h-6 text-amber-300" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Total Pending</p>
                      <p className="text-2xl font-bold text-white">{summary.totalPending}</p>
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>

              <TiltCard>
                <GlassPanel className="p-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-lg bg-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
                      <IndianRupee className="w-6 h-6 text-purple-300" />
                    </div>
                    <div>
                      <p className="text-sm text-white/60">Approved (YTD)</p>
                      <p className="text-2xl font-bold text-white">{formatCurrency(summary.totalAmountApproved)}</p>
                    </div>
                  </div>
                </GlassPanel>
              </TiltCard>
            </div>
          </FadeIn>

          <FadeIn>
            <div className="flex items-center gap-2 flex-wrap">
              {([
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
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-300 transform hover:-translate-y-0.5 ${
                    statusFilter === f.value
                      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {f.label}
                </button>
              )))}
            </div>
          </FadeIn>

          {error && (
            <FadeIn>
              <GlassPanel className="p-4 border border-red-500/30 text-red-300/90 flex items-center gap-3">
                <AlertCircle className="w-5 h-5" />
                <span>{error}</span>
              </GlassPanel>
            </FadeIn>
          )}

          <FadeIn>
            <GlassPanel>
              <div className="p-6 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Your Reimbursements</h2>
              </div>
              <div className="p-6">
                {!loading && !error && reimbursements.length === 0 && (
                  <div className="py-16 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto shadow-inner border border-white/10">
                      <Inbox className="w-8 h-8 text-white/30" />
                    </div>
                    <p className="text-white/60 mt-4 font-medium">
                      No reimbursements found.
                    </p>
                    <p className="text-white/40 text-sm mt-1">
                      Submit your first reimbursement request to get started.
                    </p>
                    <Button onClick={openModal} variant="outline" size="sm" className="mt-6 bg-white/5 border-white/10 text-white/80 hover:bg-white/10 hover:text-white">
                      <Plus className="w-4 h-4 mr-2" />
                      New Request
                    </Button>
                  </div>
                )}

                {reimbursements.length > 0 && (
                  <div className="space-y-4">
                    {reimbursements.map((r) => (
                      <FadeIn key={r.id}>
                        <div className="flex items-start gap-4 p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors">
                          {/* Category Icon */}
                          <div
                            className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${
                              CATEGORY_COLORS[r.category] || CATEGORY_COLORS.other
                            }`}
                          >
                            {CATEGORY_ICONS[r.category] || CATEGORY_ICONS.other}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-bold text-white">
                                  {CATEGORY_LABELS[r.category] || r.category}
                                </p>
                                {r.description && (
                                  <p className="text-sm text-white/60 mt-0.5 line-clamp-1">
                                    {r.description}
                                  </p>
                                )}
                              </div>
                              <Badge variant={STATUS_BADGE[r.status] ?? 'default'}>
                                {r.status}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-lg font-mono font-bold text-white">{formatCurrency(r.amount)}</p>
                              <div className="text-xs text-white/50 flex items-center gap-4">
                                <span>{formatDate(r.created_at)}</span>
                                {r.receipt_url && (
                                  <a
                                    href={r.receipt_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 hover:text-primary transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    View Receipt
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </FadeIn>
                    ))}
                  </div>
                )}
              </div>
              {pagination && pagination.pages > 1 && (
                <div className="p-4 border-t border-white/10 flex justify-center items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page === 1}
                    onClick={() => setPage(page - 1)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <span className="text-sm text-white/50">
                    Page {page} of {pagination.pages}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={page === pagination.pages}
                    onClick={() => setPage(page + 1)}
                    className="text-white/70 hover:text-white hover:bg-white/10"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </GlassPanel>
          </FadeIn>
        </StaggerContainer>

        {/* Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center"
              onClick={() => setShowModal(false)}
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.9, y: 20 }}
                className="glass-panel border border-white/10 rounded-2xl w-full max-w-lg m-4"
                onClick={(e) => e.stopPropagation()}
              >
                <form onSubmit={handleSubmit}>
                  <div className="p-6">
                    <h2 className="text-xl font-bold text-white">New Reimbursement Request</h2>
                    <p className="text-white/60 mt-1">Fill in the details of your expense.</p>
                  </div>
                  <div className="p-6 space-y-6 border-y border-white/10">
                    {/* Category & Amount */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-white/80 block mb-2">Category</label>
                        <select
                          value={formCategory}
                          onChange={(e) => setFormCategory(e.target.value)}
                          className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
                        >
                          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
                            <option key={key} value={key}>{label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label htmlFor="amount" className="text-sm font-medium text-white/80 block mb-2">Amount (INR)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                          <input
                            id="amount"
                            type="number"
                            value={formAmount}
                            onChange={(e) => setFormAmount(e.target.value)}
                            placeholder="0.00"
                            className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white focus:ring-primary focus:border-primary"
                            required
                          />
                        </div>
                      </div>
                    </div>
                    {/* Description */}
                    <div>
                      <label htmlFor="description" className="text-sm font-medium text-white/80 block mb-2">Description</label>
                      <textarea
                        id="description"
                        value={formDescription}
                        onChange={(e) => setFormDescription(e.target.value)}
                        placeholder="e.g., Client lunch meeting"
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white focus:ring-primary focus:border-primary"
                      />
                    </div>
                    {/* Receipt */}
                    <div>
                      <label className="text-sm font-medium text-white/80 block mb-2">Receipt</label>
                      <div className="p-4 border-2 border-dashed border-white/10 rounded-lg text-center">
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
                        <label htmlFor="receipt-upload" className="cursor-pointer text-primary hover:underline">
                          {formReceiptFile ? `Selected: ${formReceiptFile.name}` : 'Upload a file'}
                        </label>
                        <p className="text-xs text-white/50 mt-1">or paste a URL below</p>
                        <input
                          type="text"
                          value={formReceiptUrl}
                          onChange={(e) => setFormReceiptUrl(e.target.value)}
                          placeholder="https://example.com/receipt.jpg"
                          className="mt-3 w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:ring-primary focus:border-primary"
                        />
                        {receiptPreview && <img src={receiptPreview} alt="Receipt preview" className="mt-4 max-h-40 mx-auto rounded-lg" />}
                      </div>
                    </div>
                    {submitError && (
                      <p className="text-sm text-red-400 bg-red-500/10 p-3 rounded-lg">{submitError}</p>
                    )}
                  </div>
                  <div className="p-6 flex justify-end gap-3">
                    <Button type="button" variant="ghost" onClick={() => setShowModal(false)} className="text-white/70 hover:text-white hover:bg-white/10">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90 text-primary-foreground">
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
