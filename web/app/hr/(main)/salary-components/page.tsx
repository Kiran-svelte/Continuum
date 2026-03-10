'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  DollarSign,
  Plus,
  Edit2,
  Trash2,
  Search,
  AlertCircle,
  CheckCircle,
  Loader2,
  Layers,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  History,
  ShieldCheck,
  Inbox,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface SalaryComponent {
  id: string;
  company_id: string;
  name: string;
  type: 'earning' | 'deduction' | 'statutory';
  is_taxable: boolean;
  is_active: boolean;
  created_at: string;
}

interface SalaryRevision {
  id: string;
  emp_id: string;
  employee_name: string;
  email: string;
  department: string | null;
  designation: string | null;
  old_ctc: number;
  new_ctc: number;
  change_percent: number;
  effective_from: string;
  reason: string | null;
  approver_name: string | null;
  created_at: string;
}

interface ComponentFormData {
  name: string;
  type: 'earning' | 'deduction' | 'statutory';
  is_taxable: boolean;
}

/* ─── Animation Variants ─────────────────────────────────────────────────── */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: 'spring' as const, damping: 25, stiffness: 300 },
  },
};

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function fmt(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function fmtLakhs(amount: number): string {
  const lakhs = amount / 100000;
  return lakhs >= 1 ? `${lakhs.toFixed(1)}L` : fmt(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const EMPTY_FORM: ComponentFormData = {
  name: '',
  type: 'earning',
  is_taxable: true,
};

const TYPE_OPTIONS = [
  { value: 'earning', label: 'Earning' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'statutory', label: 'Statutory' },
];

const TYPE_BADGE_VARIANT: Record<string, 'success' | 'danger' | 'info' | 'warning' | 'default'> = {
  earning: 'success',
  deduction: 'danger',
  statutory: 'info',
};

/* ─── Page Component ─────────────────────────────────────────────────────── */

export default function SalaryComponentsPage() {
  // Auth
  const [authReady, setAuthReady] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'components' | 'revisions'>('components');

  // Components data
  const [components, setComponents] = useState<SalaryComponent[]>([]);
  const [groupedComponents, setGroupedComponents] = useState<Record<string, SalaryComponent[]>>({});
  const [componentsLoading, setComponentsLoading] = useState(true);
  const [componentsError, setComponentsError] = useState('');

  // Revisions data
  const [revisions, setRevisions] = useState<SalaryRevision[]>([]);
  const [revisionsLoading, setRevisionsLoading] = useState(true);
  const [revisionsError, setRevisionsError] = useState('');
  const [revisionsPage, setRevisionsPage] = useState(1);
  const [revisionsTotalPages, setRevisionsTotalPages] = useState(1);
  const [revisionsTotal, setRevisionsTotal] = useState(0);
  const [revisionsSearch, setRevisionsSearch] = useState('');

  // Component modal
  const [showComponentModal, setShowComponentModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<SalaryComponent | null>(null);
  const [formData, setFormData] = useState<ComponentFormData>(EMPTY_FORM);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Delete
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Status message
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // ── Auth ────────────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const me = await ensureMe();
      if (cancelled) return;
      if (!me) {
        window.location.assign('/sign-in');
        return;
      }
      const role = me.primary_role ?? 'employee';
      if (role !== 'admin' && role !== 'hr') {
        window.location.assign('/sign-in');
        return;
      }
      setAuthReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Fetch Components ──────────────────────────────────────────────────

  const fetchComponents = useCallback(async () => {
    if (!authReady) return;
    setComponentsLoading(true);
    setComponentsError('');
    try {
      const res = await fetch('/api/salary-components', { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load salary components');
      }
      const data = await res.json();
      setComponents(data.components || []);
      setGroupedComponents(data.grouped || {});
    } catch (err) {
      setComponentsError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setComponentsLoading(false);
    }
  }, [authReady]);

  // ── Fetch Revisions ───────────────────────────────────────────────────

  const fetchRevisions = useCallback(async (page: number) => {
    if (!authReady) return;
    setRevisionsLoading(true);
    setRevisionsError('');
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' });
      const res = await fetch(`/api/salary-revisions?${params}`, { credentials: 'include' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load revisions');
      }
      const data = await res.json();
      setRevisions(data.revisions || []);
      setRevisionsTotalPages(data.pagination?.pages || 1);
      setRevisionsTotal(data.pagination?.total || 0);
    } catch (err) {
      setRevisionsError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setRevisionsLoading(false);
    }
  }, [authReady]);

  useEffect(() => {
    if (authReady) fetchComponents();
  }, [authReady, fetchComponents]);

  useEffect(() => {
    if (authReady && activeTab === 'revisions') fetchRevisions(revisionsPage);
  }, [authReady, activeTab, revisionsPage, fetchRevisions]);

  // Auto-dismiss status messages
  useEffect(() => {
    if (statusMessage) {
      const t = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(t);
    }
  }, [statusMessage]);

  // ── Component Actions ─────────────────────────────────────────────────

  function openAddComponent() {
    setEditingComponent(null);
    setFormData(EMPTY_FORM);
    setFormMessage(null);
    setShowComponentModal(true);
  }

  function openEditComponent(comp: SalaryComponent) {
    setEditingComponent(comp);
    setFormData({
      name: comp.name,
      type: comp.type,
      is_taxable: comp.is_taxable,
    });
    setFormMessage(null);
    setShowComponentModal(true);
  }

  async function handleComponentSubmit() {
    setFormSubmitting(true);
    setFormMessage(null);
    try {
      if (!formData.name.trim()) throw new Error('Name is required');

      const isEditing = !!editingComponent;
      const url = '/api/salary-components';
      const method = isEditing ? 'PATCH' : 'POST';
      const payload = isEditing
        ? { id: editingComponent!.id, name: formData.name, type: formData.type, is_taxable: formData.is_taxable }
        : { name: formData.name, type: formData.type, is_taxable: formData.is_taxable };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to save');
      }

      setFormMessage({ type: 'success', text: isEditing ? 'Updated successfully' : 'Created successfully' });
      fetchComponents();
      setTimeout(() => setShowComponentModal(false), 800);
    } catch (err) {
      setFormMessage({ type: 'error', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setFormSubmitting(false);
    }
  }

  async function handleDeleteComponent(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch('/api/salary-components', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to delete');
      }

      setStatusMessage({ type: 'success', text: 'Component deleted successfully' });
      fetchComponents();
    } catch (err) {
      setStatusMessage({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed' });
    } finally {
      setDeletingId(null);
    }
  }

  // ── Summary Stats ─────────────────────────────────────────────────────

  const earningCount = (groupedComponents['earning'] || []).length;
  const deductionCount = (groupedComponents['deduction'] || []).length;
  const statutoryCount = (groupedComponents['statutory'] || []).length;
  const activeCount = components.filter((c) => c.is_active).length;

  // Filter revisions by search
  const filteredRevisions = revisionsSearch
    ? revisions.filter((r) =>
        r.employee_name.toLowerCase().includes(revisionsSearch.toLowerCase()) ||
        (r.department && r.department.toLowerCase().includes(revisionsSearch.toLowerCase()))
      )
    : revisions;

  // ── Loading / Auth Gate ────────────────────────────────────────────────

  if (!authReady) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton variant="button" className="w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-6 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton variant="circular" className="w-8 h-8" />
              </div>
              <Skeleton className="h-8 w-16" />
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-card">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 border-b border-border last:border-0">
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} className="h-4 flex-1" />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────

  const SUMMARY_CARDS = [
    { label: 'Total Components', value: components.length, icon: Layers, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-500/10' },
    { label: 'Earnings', value: earningCount, icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
    { label: 'Deductions', value: deductionCount, icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-500/10' },
    { label: 'Active', value: activeCount, icon: ShieldCheck, color: 'text-violet-600 dark:text-violet-400', bg: 'bg-violet-50 dark:bg-violet-500/10' },
  ];

  const TAB_ITEMS = [
    { key: 'components' as const, label: 'Salary Components', icon: Layers },
    { key: 'revisions' as const, label: 'Revision History', icon: History },
  ];

  return (
    <motion.div
      className="space-y-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Header */}
      <motion.div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4" variants={itemVariants}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Salary Components</h1>
          <p className="text-muted-foreground mt-1">
            Manage salary components and view revision history
          </p>
        </div>
        {activeTab === 'components' && (
          <Button onClick={openAddComponent}>
            <Plus className="w-4 h-4" />
            Add Component
          </Button>
        )}
      </motion.div>

      {/* Summary Cards */}
      <motion.div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" variants={containerVariants}>
        {SUMMARY_CARDS.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div key={card.label} variants={itemVariants}>
              <Card>
                <CardContent className="pt-6 pb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{card.label}</p>
                      <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 ${card.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Tab Navigation */}
      <motion.div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit" variants={itemVariants}>
        {TAB_ITEMS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </motion.div>

      {/* Status Message */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`rounded-lg px-4 py-3 text-sm flex items-center gap-2 ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400'
                : 'bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {statusMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Components Tab ──────────────────────────────────────────────── */}
      {activeTab === 'components' && (
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>All Components</CardTitle>
                {components.length > 0 && (
                  <Badge variant="default" size="sm">
                    {components.length} component{components.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {componentsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : componentsError ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{componentsError}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={fetchComponents}>
                    Retry
                  </Button>
                </div>
              ) : components.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center mx-auto">
                    <Inbox className="w-5 h-5 text-slate-400" />
                  </div>
                  <h3 className="text-lg font-semibold mt-3">No salary components</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your first salary component to get started.
                  </p>
                  <Button size="sm" className="mt-4" onClick={openAddComponent}>
                    <Plus className="w-4 h-4" />
                    Add Component
                  </Button>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Name</th>
                          <th className="text-left py-3 px-2 text-muted-foreground font-medium">Type</th>
                          <th className="text-left py-3 px-2 text-muted-foreground font-medium">Taxable</th>
                          <th className="text-left py-3 px-2 text-muted-foreground font-medium">Status</th>
                          <th className="text-left py-3 px-2 text-muted-foreground font-medium">Created</th>
                          <th className="text-left py-3 pl-2 text-muted-foreground font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {components.map((comp) => (
                          <tr
                            key={comp.id}
                            className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                          >
                            <td className="py-3 pr-4">
                              <p className="font-medium text-foreground">{comp.name}</p>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={TYPE_BADGE_VARIANT[comp.type] || 'default'} size="sm">
                                {comp.type === 'earning' && <ArrowUpRight className="w-3 h-3 mr-1" />}
                                {comp.type === 'deduction' && <ArrowDownRight className="w-3 h-3 mr-1" />}
                                {comp.type === 'statutory' && <ShieldCheck className="w-3 h-3 mr-1" />}
                                {comp.type.charAt(0).toUpperCase() + comp.type.slice(1)}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <Badge
                                variant={comp.is_taxable ? 'warning' : 'default'}
                                size="sm"
                              >
                                {comp.is_taxable ? 'Taxable' : 'Non-taxable'}
                              </Badge>
                            </td>
                            <td className="py-3 px-2">
                              <Badge variant={comp.is_active ? 'success' : 'default'} size="sm">
                                {comp.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                            </td>
                            <td className="py-3 px-2 text-muted-foreground text-xs">
                              {formatDate(comp.created_at)}
                            </td>
                            <td className="py-3 pl-2">
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openEditComponent(comp)}
                                  className="text-xs gap-1"
                                >
                                  <Edit2 className="w-3 h-3" /> Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteComponent(comp.id)}
                                  disabled={deletingId === comp.id}
                                  className="text-xs gap-1 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300"
                                >
                                  {deletingId === comp.id ? (
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-3 h-3" />
                                  )}
                                  Delete
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {components.map((comp) => (
                      <Card key={comp.id} variant="bordered">
                        <CardContent className="pt-4 pb-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <p className="font-medium text-foreground text-sm">{comp.name}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                Created {formatDate(comp.created_at)}
                              </p>
                            </div>
                            <Badge variant={comp.is_active ? 'success' : 'default'} size="sm">
                              {comp.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant={TYPE_BADGE_VARIANT[comp.type] || 'default'} size="sm">
                              {comp.type.charAt(0).toUpperCase() + comp.type.slice(1)}
                            </Badge>
                            <Badge variant={comp.is_taxable ? 'warning' : 'default'} size="sm">
                              {comp.is_taxable ? 'Taxable' : 'Non-taxable'}
                            </Badge>
                          </div>
                          <div className="flex gap-2 pt-2 border-t border-border">
                            <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => openEditComponent(comp)}>
                              <Edit2 className="w-3 h-3" /> Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 text-xs text-red-600 dark:text-red-400"
                              onClick={() => handleDeleteComponent(comp.id)}
                              disabled={deletingId === comp.id}
                            >
                              {deletingId === comp.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                              Delete
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Revisions Tab ───────────────────────────────────────────────── */}
      {activeTab === 'revisions' && (
        <motion.div variants={itemVariants} className="space-y-4">
          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by employee or department..."
              value={revisionsSearch}
              onChange={(e) => setRevisionsSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Revision History</CardTitle>
                {revisionsTotal > 0 && (
                  <span className="text-sm text-muted-foreground">{revisionsTotal} total</span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {revisionsLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : revisionsError ? (
                <div className="py-12 text-center">
                  <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{revisionsError}</p>
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => fetchRevisions(revisionsPage)}>
                    Retry
                  </Button>
                </div>
              ) : filteredRevisions.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-500/10 flex items-center justify-center mx-auto">
                    <History className="w-5 h-5 text-slate-400" />
                  </div>
                  <p className="text-muted-foreground mt-3 text-sm">No salary revisions found.</p>
                </div>
              ) : (
                <>
                  {/* Desktop table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 pr-4 text-muted-foreground font-medium">Employee</th>
                          <th className="text-right py-3 px-2 text-muted-foreground font-medium">Old CTC</th>
                          <th className="text-right py-3 px-2 text-muted-foreground font-medium">New CTC</th>
                          <th className="text-right py-3 px-2 text-muted-foreground font-medium">% Change</th>
                          <th className="text-left py-3 px-2 text-muted-foreground font-medium">Effective Date</th>
                          <th className="text-left py-3 px-2 text-muted-foreground font-medium">Reason</th>
                          <th className="text-left py-3 pl-2 text-muted-foreground font-medium">Approved By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredRevisions.map((rev) => {
                          const isIncrease = rev.new_ctc > rev.old_ctc;
                          const changeAbs = Math.abs(rev.change_percent);
                          return (
                            <tr
                              key={rev.id}
                              className="border-b border-border/50 hover:bg-muted/30 transition-colors"
                            >
                              <td className="py-3 pr-4">
                                <div>
                                  <p className="font-medium text-foreground">{rev.employee_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {rev.department || '--'} {rev.designation ? `/ ${rev.designation}` : ''}
                                  </p>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-right text-muted-foreground">
                                {fmtLakhs(rev.old_ctc)}
                              </td>
                              <td className="py-3 px-2 text-right font-bold text-foreground">
                                {fmtLakhs(rev.new_ctc)}
                              </td>
                              <td className="py-3 px-2 text-right">
                                <span
                                  className={`inline-flex items-center gap-0.5 font-medium ${
                                    isIncrease
                                      ? 'text-emerald-600 dark:text-emerald-400'
                                      : 'text-red-600 dark:text-red-400'
                                  }`}
                                >
                                  {isIncrease ? (
                                    <ArrowUpRight className="w-3.5 h-3.5" />
                                  ) : (
                                    <ArrowDownRight className="w-3.5 h-3.5" />
                                  )}
                                  {changeAbs.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-3 px-2 text-muted-foreground text-xs">
                                {formatDate(rev.effective_from)}
                              </td>
                              <td className="py-3 px-2 text-muted-foreground text-xs max-w-[200px] truncate">
                                {rev.reason || '--'}
                              </td>
                              <td className="py-3 pl-2 text-muted-foreground text-xs">
                                {rev.approver_name || '--'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile cards */}
                  <div className="md:hidden space-y-3">
                    {filteredRevisions.map((rev) => {
                      const isIncrease = rev.new_ctc > rev.old_ctc;
                      const changeAbs = Math.abs(rev.change_percent);
                      return (
                        <Card key={rev.id} variant="bordered">
                          <CardContent className="pt-4 pb-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-medium text-foreground text-sm">{rev.employee_name}</p>
                                <p className="text-xs text-muted-foreground">
                                  {rev.department || '--'}
                                </p>
                              </div>
                              <span
                                className={`inline-flex items-center gap-0.5 text-sm font-bold ${
                                  isIncrease
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-red-600 dark:text-red-400'
                                }`}
                              >
                                {isIncrease ? (
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ArrowDownRight className="w-3.5 h-3.5" />
                                )}
                                {changeAbs.toFixed(1)}%
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                              <div>
                                <p className="text-muted-foreground">Old CTC</p>
                                <p className="font-medium text-foreground">{fmtLakhs(rev.old_ctc)}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">New CTC</p>
                                <p className="font-bold text-foreground">{fmtLakhs(rev.new_ctc)}</p>
                              </div>
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <p>Effective: {formatDate(rev.effective_from)}</p>
                              {rev.reason && <p>Reason: {rev.reason}</p>}
                              {rev.approver_name && <p>Approved by: {rev.approver_name}</p>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>

                  {/* Pagination */}
                  {revisionsTotalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevisionsPage((p) => Math.max(1, p - 1))}
                        disabled={revisionsPage <= 1}
                      >
                        Previous
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        Page {revisionsPage} of {revisionsTotalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setRevisionsPage((p) => Math.min(revisionsTotalPages, p + 1))}
                        disabled={revisionsPage >= revisionsTotalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ─── Add/Edit Component Modal ────────────────────────────────────── */}
      <Modal
        isOpen={showComponentModal}
        onClose={() => setShowComponentModal(false)}
        title={editingComponent ? 'Edit Salary Component' : 'Add Salary Component'}
        description={
          editingComponent
            ? 'Update the details of this salary component.'
            : 'Create a new salary component for your organization.'
        }
        size="md"
      >
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">
              Component Name
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g. Basic Salary, HRA, PF Contribution"
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1.5">Type</label>
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  type: e.target.value as ComponentFormData['type'],
                }))
              }
              className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Taxable toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="is-taxable"
              checked={formData.is_taxable}
              onChange={(e) => setFormData((prev) => ({ ...prev, is_taxable: e.target.checked }))}
              className="rounded border-border"
            />
            <label htmlFor="is-taxable" className="text-sm text-foreground">
              This component is taxable
            </label>
          </div>

          {/* Form Message */}
          <AnimatePresence>
            {formMessage && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`text-sm flex items-center gap-2 ${
                  formMessage.type === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formMessage.type === 'success' ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <AlertCircle className="w-4 h-4" />
                )}
                {formMessage.text}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ModalFooter>
          <Button variant="outline" onClick={() => setShowComponentModal(false)} disabled={formSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleComponentSubmit} disabled={formSubmitting}>
            {formSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {editingComponent ? 'Update' : 'Create'} Component
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
