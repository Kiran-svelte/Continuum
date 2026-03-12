'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TiltCard, FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
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
    <div className="p-4 sm:p-8 pb-32 max-w-7xl mx-auto">
      <AmbientBackground />
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Documents"
          description={`Access and manage your documents${pagination && !loading ? ` (${pagination.total} document${pagination.total !== 1 ? 's' : ''})` : ''}`}
          icon={<FileText className="w-6 h-6 text-primary" />}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={loadDocuments}
                disabled={loading}
                className="gap-1.5 text-white/80 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button
                onClick={handleOpenUpload}
                className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/30 gap-2 transition-all duration-300 transform hover:scale-105"
              >
                <Upload className="w-4 h-4" />
                Upload Document
              </Button>
            </div>
          }
        />

        {/* Category Tabs */}
        <FadeIn>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeTab === cat.key;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveTab(cat.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all duration-300 transform hover:-translate-y-1
                    ${
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/40'
                        : 'bg-black/20 text-white/70 hover:bg-black/40 hover:text-white border border-white/10'
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </FadeIn>

        {/* Message Display */}
        <AnimatePresence>
          {message && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`p-4 rounded-lg text-white font-medium ${
                message.type === 'success' ? 'bg-green-500/80' : 'bg-red-500/80'
              }`}
            >
              {message.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div key="loader" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <GlassPanel key={i} className="p-6">
                    <Skeleton className="h-6 w-3/4 bg-white/10" />
                    <Skeleton className="h-4 w-1/2 mt-3 bg-white/10" />
                    <Skeleton className="h-4 w-1/4 mt-1 bg-white/10" />
                    <div className="flex justify-between items-center mt-4">
                      <Skeleton className="h-8 w-24 bg-white/10" />
                      <Skeleton className="h-8 w-8 rounded-full bg-white/10" />
                    </div>
                  </GlassPanel>
                ))}
              </div>
            </motion.div>
          ) : error ? (
            <motion.div key="error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GlassPanel className="flex flex-col items-center justify-center text-center p-10 border-red-500/30">
                <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
                <h3 className="text-xl font-bold text-white">Failed to Load Documents</h3>
                <p className="text-red-300/80 mt-2 max-w-md">{error}</p>
                <Button onClick={loadDocuments} className="mt-6 gap-2">
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </Button>
              </GlassPanel>
            </motion.div>
          ) : documents.length > 0 ? (
            <motion.div
              key="documents"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {documents.map((doc) => {
                const CatIcon = getCategoryIcon(doc.type);
                return (
                  <TiltCard key={doc.id}>
                    <GlassPanel
                      className={`overflow-hidden border-2 transition-all duration-300 hover:shadow-2xl ${
                        CATEGORY_COLORS[doc.type]?.border ?? 'border-white/10'
                      } hover:border-primary/50`}
                    >
                      <div className="p-6 relative">
                        <div className={`absolute top-0 left-0 right-0 h-1 ${CATEGORY_COLORS[doc.type]?.bg.replace('10', '50')} opacity-50`} />

                        <div className="flex justify-between items-start">
                          <div className={`p-3 rounded-lg ${CATEGORY_COLORS[doc.type]?.bg ?? 'bg-white/10'} border ${CATEGORY_COLORS[doc.type]?.border ?? 'border-white/10'}`}>
                            <CatIcon className={`w-6 h-6 ${CATEGORY_COLORS[doc.type]?.text ?? 'text-white'}`} />
                          </div>
                          <Badge
                            className={`capitalize border ${STATUS_BADGE[doc.status] === 'success' ? 'bg-green-500/20 text-green-300 border-green-500/30' : STATUS_BADGE[doc.status] === 'warning' ? 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30' : STATUS_BADGE[doc.status] === 'danger' ? 'bg-red-500/20 text-red-300 border-red-500/30' : 'bg-gray-500/20 text-gray-300 border-gray-500/30'}`}
                          >
                            {STATUS_LABELS[doc.status] ?? 'Unknown'}
                          </Badge>
                        </div>

                        <h3 className="mt-4 text-lg font-bold text-white truncate" title={doc.displayName}>
                          {doc.displayName}
                        </h3>

                        <div className="text-xs text-white/50 mt-2 flex items-center gap-4">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            <span>{formatDate(doc.created_at)}</span>
                          </div>
                          {doc.expiryDate && (
                            <div className="flex items-center gap-1.5">
                              <Clock className="w-3 h-3" />
                              <span>Expires {formatDate(doc.expiryDate)}</span>
                            </div>
                          )}
                        </div>

                        {doc.description && <p className="text-sm text-white/70 mt-3 h-10 overflow-hidden text-ellipsis">{doc.description}</p>}

                        <div className="mt-6 flex justify-between items-center">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-white/70 hover:text-white hover:bg-white/10"
                              onClick={() => window.open(doc.url, '_blank')}
                            >
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View
                            </Button>
                          </div>
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost" className="text-white/60 hover:text-white hover:bg-white/10 rounded-full" onClick={() => openEditModal(doc)}>
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10 rounded-full" onClick={() => setDeleteTarget(doc)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </GlassPanel>
                  </TiltCard>
                );
              })}
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <GlassPanel className="text-center p-10 border-white/10">
                <FolderOpen className="w-12 h-12 text-white/30 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-white">No Documents Found</h3>
                <p className="text-white/60 mt-2">
                  {activeTab === 'all'
                    ? "You haven't uploaded any documents yet."
                    : `No documents found in the "${CATEGORY_LABELS[activeTab] ?? activeTab}" category.`}
                </p>
                <Button onClick={handleOpenUpload} className="mt-6 gap-2">
                  <Upload className="w-4 h-4" />
                  Upload Your First Document
                </Button>
              </GlassPanel>
            </motion.div>
          )}
        </AnimatePresence>
      </StaggerContainer>
    </div>
  );
}
