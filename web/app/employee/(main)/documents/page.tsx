'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Modal, ModalFooter } from '@/components/ui/modal';
import {
  FileText,
  Upload,
  Shield,
  Award,
  FileSignature,
  Receipt,
  FileSpreadsheet,
  FolderOpen,
  AlertCircle,
  ExternalLink,
  Calendar,
  Clock,
  RefreshCw,
  Trash2,
  Pencil,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface DocumentRecord {
  id: string;
  name: string;
  type: string;
  url: string;
  status: string;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
  emp_id: string;
  employee: {
    first_name: string;
    last_name: string;
    email: string;
  };
  verifier: {
    first_name: string;
    last_name: string;
  } | null;
}

interface ParsedDocument extends DocumentRecord {
  displayName: string;
  description: string | null;
  expiryDate: string | null;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'all', label: 'All', icon: FolderOpen },
  { key: 'personal_id', label: 'Personal ID', icon: Shield },
  { key: 'certificate', label: 'Certificates', icon: Award },
  { key: 'offer_letter', label: 'Offer Letters', icon: FileSignature },
  { key: 'payslip', label: 'Payslips', icon: Receipt },
  { key: 'tax_form', label: 'Tax Forms', icon: FileSpreadsheet },
  { key: 'other', label: 'Other', icon: FileText },
] as const;

const CATEGORY_LABELS: Record<string, string> = {
  personal_id: 'Personal ID',
  certificate: 'Certificate',
  offer_letter: 'Offer Letter',
  payslip: 'Payslip',
  tax_form: 'Tax Form',
  other: 'Other',
};

const STATUS_BADGE: Record<string, 'success' | 'info' | 'warning' | 'danger' | 'default'> = {
  pending: 'warning',
  verified: 'success',
  rejected: 'danger',
  expired: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  verified: 'Verified',
  rejected: 'Rejected',
  expired: 'Expired',
};

const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  personal_id: {
    bg: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
  },
  certificate: {
    bg: 'bg-amber-500/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
  },
  offer_letter: {
    bg: 'bg-emerald-500/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
  },
  payslip: {
    bg: 'bg-purple-500/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-200 dark:border-purple-800',
  },
  tax_form: {
    bg: 'bg-rose-500/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-200 dark:border-rose-800',
  },
  other: {
    bg: 'bg-slate-500/10',
    text: 'text-slate-600 dark:text-slate-400',
    border: 'border-slate-200 dark:border-slate-800',
  },
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

const cardVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { type: 'spring' as const, stiffness: 300, damping: 24 },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.15 },
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseDocument(doc: DocumentRecord): ParsedDocument {
  const parts = doc.name.split('|||');
  const displayName = parts[0];
  let description: string | null = null;
  let expiryDate: string | null = null;

  if (parts[1]) {
    try {
      const meta = JSON.parse(parts[1]);
      description = meta.description ?? null;
      expiryDate = meta.expiryDate ?? null;
    } catch {
      // Ignore parse errors, metadata is optional
    }
  }

  return { ...doc, displayName, description, expiryDate };
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function getCategoryIcon(type: string) {
  const found = CATEGORIES.find((c) => c.key === type);
  return found?.icon ?? FileText;
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<ParsedDocument[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formCategory, setFormCategory] = useState('personal_id');
  const [formUrl, setFormUrl] = useState('');
  const [formFile, setFormFile] = useState<File | null>(null);
  const [formUploadMode, setFormUploadMode] = useState<'file' | 'url'>('file');
  const [formDescription, setFormDescription] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');

  // Delete confirmation state
  const [deleteTarget, setDeleteTarget] = useState<ParsedDocument | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Edit modal state
  const [editTarget, setEditTarget] = useState<ParsedDocument | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('personal_id');
  const [editExpiryDate, setEditExpiryDate] = useState('');
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Success/error message
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.set('category', activeTab);
      }
      params.set('limit', '100');
      const res = await fetch(`/api/documents?${params.toString()}`, {
        credentials: 'include',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to load documents (${res.status})`);
      }
      const data = await res.json();
      const parsed = (data.documents ?? []).map(parseDocument);
      setDocuments(parsed);
      setPagination(data.pagination ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  function resetForm() {
    setFormName('');
    setFormCategory('personal_id');
    setFormUrl('');
    setFormFile(null);
    setFormUploadMode('file');
    setFormDescription('');
    setFormExpiryDate('');
    setUploadError(null);
  }

  function handleOpenUpload() {
    resetForm();
    setShowUploadModal(true);
  }

  async function handleUpload() {
    setUploadError(null);

    // Client-side validation
    if (!formName.trim()) {
      setUploadError('Document name is required.');
      return;
    }

    if (formUploadMode === 'file' && !formFile) {
      setUploadError('Please select a file to upload.');
      return;
    }
    if (formUploadMode === 'url' && !formUrl.trim()) {
      setUploadError('Document URL is required.');
      return;
    }

    setUploading(true);
    try {
      if (formUploadMode === 'file' && formFile) {
        // Use multipart upload endpoint
        const fd = new FormData();
        fd.append('file', formFile);
        fd.append('name', formName.trim());
        fd.append('category', formCategory);

        const res = await fetch('/api/documents/upload', {
          method: 'POST',
          credentials: 'include',
          body: fd,
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload document');
        }
      } else {
        // URL-based upload (existing endpoint)
        const body: Record<string, string> = {
          name: formName.trim(),
          category: formCategory,
          url: formUrl.trim(),
        };
        if (formDescription.trim()) {
          body.description = formDescription.trim();
        }
        if (formExpiryDate) {
          body.expiryDate = formExpiryDate;
        }

        const res = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(body),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Failed to upload document');
        }
      }

      setShowUploadModal(false);
      resetForm();
      loadDocuments();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function showMsg(type: 'success' | 'error', text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      if (res.ok) {
        setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
        showMsg('success', `"${deleteTarget.displayName}" deleted successfully.`);
      } else {
        const data = await res.json().catch(() => ({}));
        showMsg('error', data.error ?? 'Failed to delete document.');
      }
    } catch {
      showMsg('error', 'Network error while deleting document.');
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  }

  function openEditModal(doc: ParsedDocument) {
    setEditTarget(doc);
    setEditName(doc.displayName);
    setEditCategory(doc.type);
    setEditExpiryDate(doc.expiryDate ? doc.expiryDate.split('T')[0] : '');
    setEditError(null);
  }

  async function handleEdit() {
    if (!editTarget) return;
    if (!editName.trim()) {
      setEditError('Document name is required.');
      return;
    }
    setEditLoading(true);
    setEditError(null);
    try {
      const res = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          id: editTarget.id,
          name: editName.trim(),
          category: editCategory,
          expiryDate: editExpiryDate || null,
        }),
      });
      if (res.ok) {
        showMsg('success', `"${editName.trim()}" updated successfully.`);
        setEditTarget(null);
        loadDocuments();
      } else {
        const data = await res.json().catch(() => ({}));
        setEditError(data.error ?? 'Failed to update document.');
      }
    } catch {
      setEditError('Network error while updating document.');
    } finally {
      setEditLoading(false);
    }
  }

  // Count documents per category for tab badges
  const categoryCounts: Record<string, number> = {};
  if (!loading) {
    // When we are on "all" tab, we have all documents; otherwise just current
    // We only show count on the "all" tab's data set
  }

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div className="flex items-center justify-between" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Documents</h1>
          <p className="text-muted-foreground mt-1">
            Your employment documents and records
            {pagination && !loading && (
              <span className="text-xs ml-2">
                ({pagination.total} document{pagination.total !== 1 ? 's' : ''})
              </span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={loadDocuments}
            disabled={loading}
            className="gap-1.5"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            onClick={handleOpenUpload}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20 gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload Document
          </Button>
        </div>
      </motion.div>

      {/* Category Tabs */}
      <motion.div variants={itemVariants}>
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeTab === cat.key;
            return (
              <button
                key={cat.key}
                onClick={() => setActiveTab(cat.key)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-200
                  ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                      : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50'
                  }
                `}
              >
                <Icon className="w-4 h-4" />
                {cat.label}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl px-4 py-3 text-sm font-medium bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2"
        >
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button
            onClick={loadDocuments}
            className="ml-auto text-xs underline hover:no-underline"
          >
            Retry
          </button>
        </motion.div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
        >
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <motion.div key={i} variants={itemVariants}>
              <Card className="border-0 shadow-md overflow-hidden">
                <CardContent className="p-5">
                  <div className="space-y-3 animate-pulse">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-lg" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                        </div>
                      </div>
                      <Skeleton className="h-5 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-3 w-full" />
                    <div className="flex justify-between items-center">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Empty State */}
      {!loading && !error && documents.length === 0 && (
        <motion.div variants={itemVariants}>
          <Card className="border-0 shadow-md">
            <CardContent className="py-16">
              <div className="flex flex-col items-center text-center max-w-md mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center mb-6">
                  {activeTab === 'all' ? (
                    <FolderOpen className="w-8 h-8 text-blue-500 dark:text-blue-400" />
                  ) : (
                    (() => {
                      const Icon = getCategoryIcon(activeTab);
                      return <Icon className="w-8 h-8 text-blue-500 dark:text-blue-400" />;
                    })()
                  )}
                </div>
                <h2 className="text-lg font-semibold text-foreground">
                  {activeTab === 'all'
                    ? 'No documents yet'
                    : `No ${CATEGORY_LABELS[activeTab] ?? activeTab} documents`}
                </h2>
                <p className="text-sm text-muted-foreground mt-2">
                  {activeTab === 'all'
                    ? 'Upload your first document to get started. You can add personal IDs, certificates, offer letters, payslips, and more.'
                    : `You have not uploaded any ${(CATEGORY_LABELS[activeTab] ?? activeTab).toLowerCase()} documents yet.`}
                </p>
                <Button
                  onClick={handleOpenUpload}
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload Document
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Document Grid */}
      {!loading && !error && documents.length > 0 && (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence mode="popLayout">
            {documents.map((doc, index) => {
              const Icon = getCategoryIcon(doc.type);
              const colors = CATEGORY_COLORS[doc.type] ?? CATEGORY_COLORS.other;
              const isExpired =
                doc.expiryDate && new Date(doc.expiryDate) < new Date();

              return (
                <motion.div
                  key={doc.id}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                  transition={{ delay: index * 0.04 }}
                >
                  <Card
                    className={`border-0 shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-200 group ${
                      isExpired ? 'opacity-75' : ''
                    }`}
                  >
                    <div
                      className={`h-1 ${
                        doc.status === 'verified'
                          ? 'bg-gradient-to-r from-emerald-500 to-green-600'
                          : doc.status === 'rejected'
                          ? 'bg-gradient-to-r from-red-500 to-rose-600'
                          : doc.status === 'expired' || isExpired
                          ? 'bg-gradient-to-r from-slate-400 to-slate-500'
                          : 'bg-gradient-to-r from-amber-400 to-orange-500'
                      }`}
                    />
                    <CardContent className="p-5">
                      {/* Top Row: Icon + Name + Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <div
                            className={`h-10 w-10 shrink-0 rounded-lg ${colors.bg} flex items-center justify-center`}
                          >
                            <Icon className={`w-5 h-5 ${colors.text}`} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-sm font-semibold text-foreground truncate">
                              {doc.displayName}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {CATEGORY_LABELS[doc.type] ?? doc.type}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={
                            isExpired
                              ? 'default'
                              : STATUS_BADGE[doc.status] ?? 'default'
                          }
                          size="sm"
                        >
                          {isExpired ? 'Expired' : STATUS_LABELS[doc.status] ?? doc.status}
                        </Badge>
                      </div>

                      {/* Description */}
                      {doc.description && (
                        <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                          {doc.description}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                        {doc.expiryDate && (
                          <div
                            className={`flex items-center gap-1.5 ${
                              isExpired
                                ? 'text-red-500 dark:text-red-400'
                                : 'text-muted-foreground'
                            }`}
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                              {isExpired ? 'Expired' : 'Expires'}{' '}
                              {formatDate(doc.expiryDate)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Verified By */}
                      {doc.verifier && doc.verified_at && (
                        <div className="mt-2 text-xs text-emerald-600 dark:text-emerald-400">
                          Verified by {doc.verifier.first_name} {doc.verifier.last_name} on{' '}
                          {formatDate(doc.verified_at)}
                        </div>
                      )}

                      {/* View Link + Actions */}
                      <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between">
                        <a
                          href={doc.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          View Document
                        </a>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(doc)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            title="Edit document"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(doc)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Delete document"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Upload Modal */}
      <Modal
        isOpen={showUploadModal}
        onClose={() => !uploading && setShowUploadModal(false)}
        title="Upload Document"
        description="Add a new document to your profile"
        size="lg"
      >
        <div className="space-y-4">
          {uploadError && (
            <div className="rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {uploadError}
            </div>
          )}

          {/* Document Name */}
          <div>
            <label
              htmlFor="doc-name"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              id="doc-name"
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Passport, Degree Certificate"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              disabled={uploading}
            />
          </div>

          {/* Category */}
          <div>
            <label
              htmlFor="doc-category"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Category <span className="text-red-500">*</span>
            </label>
            <select
              id="doc-category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              disabled={uploading}
            >
              {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Mode Toggle */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Upload Method <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormUploadMode('file')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  formUploadMode === 'file'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
                disabled={uploading}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => setFormUploadMode('url')}
                className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                  formUploadMode === 'url'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted'
                }`}
                disabled={uploading}
              >
                Paste URL
              </button>
            </div>
          </div>

          {/* File Upload */}
          {formUploadMode === 'file' && (
            <div>
              <label
                htmlFor="doc-file"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                File <span className="text-red-500">*</span>
              </label>
              <div
                className={`relative rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors ${
                  formFile
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10'
                    : 'border-border hover:border-blue-400'
                }`}
              >
                <input
                  id="doc-file"
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                  onChange={(e) => setFormFile(e.target.files?.[0] ?? null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={uploading}
                />
                {formFile ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-foreground">{formFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(formFile.size / 1024).toFixed(0)} KB)
                    </span>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Click or drag to upload a file
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      PDF, PNG, JPG, DOC, DOCX (max 10MB)
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Document URL (when in URL mode) */}
          {formUploadMode === 'url' && (
            <div>
              <label
                htmlFor="doc-url"
                className="block text-sm font-medium text-foreground mb-1.5"
              >
                Document URL <span className="text-red-500">*</span>
              </label>
              <input
                id="doc-url"
                type="url"
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                placeholder="https://drive.google.com/..."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
                disabled={uploading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Paste a link to your document (Google Drive, Dropbox, etc.)
              </p>
            </div>
          )}

          {/* Description */}
          <div>
            <label
              htmlFor="doc-description"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Description
            </label>
            <textarea
              id="doc-description"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional description or notes about this document..."
              rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors resize-none"
              disabled={uploading}
            />
          </div>

          {/* Expiry Date */}
          <div>
            <label
              htmlFor="doc-expiry"
              className="block text-sm font-medium text-foreground mb-1.5"
            >
              Expiry Date
            </label>
            <input
              id="doc-expiry"
              type="date"
              value={formExpiryDate}
              onChange={(e) => setFormExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              disabled={uploading}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Set an expiry date for documents that need renewal.
            </p>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setShowUploadModal(false)}
            disabled={uploading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            loading={uploading}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            <Upload className="w-4 h-4" />
            Upload
          </Button>
        </ModalFooter>
      </Modal>

      {/* Success/Error Message */}
      <AnimatePresence>
        {message && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-medium ${
              message.type === 'success'
                ? 'bg-green-600 text-white'
                : 'bg-red-600 text-white'
            }`}
          >
            {message.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !deleteLoading && setDeleteTarget(null)}
        title="Delete Document"
        description="This action cannot be undone."
        size="sm"
      >
        <p className="text-sm text-muted-foreground">
          Are you sure you want to delete <strong className="text-foreground">&quot;{deleteTarget?.displayName}&quot;</strong>?
        </p>
        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setDeleteTarget(null)}
            disabled={deleteLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            loading={deleteLoading}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Delete
          </Button>
        </ModalFooter>
      </Modal>

      {/* Edit Document Modal */}
      <Modal
        isOpen={!!editTarget}
        onClose={() => !editLoading && setEditTarget(null)}
        title="Edit Document"
        description="Update document name, category, or expiry date"
        size="md"
      >
        <div className="space-y-4">
          {editError && (
            <div className="rounded-lg px-3 py-2 text-sm bg-red-50 text-red-700 border border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {editError}
            </div>
          )}

          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium text-foreground mb-1.5">
              Document Name <span className="text-red-500">*</span>
            </label>
            <input
              id="edit-name"
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              disabled={editLoading}
            />
          </div>

          <div>
            <label htmlFor="edit-category" className="block text-sm font-medium text-foreground mb-1.5">
              Category
            </label>
            <select
              id="edit-category"
              value={editCategory}
              onChange={(e) => setEditCategory(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              disabled={editLoading}
            >
              {CATEGORIES.filter((c) => c.key !== 'all').map((cat) => (
                <option key={cat.key} value={cat.key}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="edit-expiry" className="block text-sm font-medium text-foreground mb-1.5">
              Expiry Date
            </label>
            <input
              id="edit-expiry"
              type="date"
              value={editExpiryDate}
              onChange={(e) => setEditExpiryDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-colors"
              disabled={editLoading}
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => setEditTarget(null)}
            disabled={editLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleEdit}
            loading={editLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Save Changes
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
