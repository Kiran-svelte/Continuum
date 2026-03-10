'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Skeleton, SkeletonTable } from '@/components/ui/skeleton';
import { motion } from 'framer-motion';
import { ensureMe } from '@/lib/client-auth';
import {
  GitBranch,
  Layers,
  Plus,
  Pencil,
  Trash2,
  ArrowRight,
  Users,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface EmployeeSummary {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ApprovalHierarchy {
  id: string;
  emp_id: string;
  company_id: string;
  level1_approver: string | null;
  level2_approver: string | null;
  level3_approver: string | null;
  level4_approver: string | null;
  hr_partner: string | null;
  created_at: string;
  updated_at: string;
  employee: EmployeeSummary;
  level1: EmployeeSummary | null;
  level2: EmployeeSummary | null;
  level3: EmployeeSummary | null;
  level4: EmployeeSummary | null;
  hr: EmployeeSummary | null;
}

interface JobLevel {
  id: string;
  company_id: string;
  name: string;
  rank: number;
  description: string | null;
  created_at: string;
}

interface ApprovalFormData {
  emp_id: string;
  level1_approver: string;
  level2_approver: string;
  level3_approver: string;
  level4_approver: string;
  hr_partner: string;
}

interface JobLevelFormData {
  name: string;
  rank: string;
  description: string;
}

// ─── Animation Variants ─────────────────────────────────────────────────────

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
} as const;

// ─── Constants ──────────────────────────────────────────────────────────────

const EMPTY_APPROVAL_FORM: ApprovalFormData = {
  emp_id: '',
  level1_approver: '',
  level2_approver: '',
  level3_approver: '',
  level4_approver: '',
  hr_partner: '',
};

const EMPTY_JOB_LEVEL_FORM: JobLevelFormData = {
  name: '',
  rank: '',
  description: '',
};

type TabKey = 'approvals' | 'levels';

// ─── Helper ─────────────────────────────────────────────────────────────────

function empName(e: EmployeeSummary | null): string {
  if (!e) return '-';
  return `${e.first_name} ${e.last_name}`;
}

// ─── Page Component ─────────────────────────────────────────────────────────

export default function ApprovalConfigPage() {
  // ── Auth ────────────────────────────────────────────────────────────
  const [authed, setAuthed] = useState(false);

  // ── Tab ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>('approvals');

  // ── Approval Hierarchy state ────────────────────────────────────────
  const [hierarchies, setHierarchies] = useState<ApprovalHierarchy[]>([]);
  const [loadingH, setLoadingH] = useState(true);
  const [errorH, setErrorH] = useState('');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [editingApproval, setEditingApproval] = useState<ApprovalHierarchy | null>(null);
  const [approvalForm, setApprovalForm] = useState<ApprovalFormData>(EMPTY_APPROVAL_FORM);
  const [savingApproval, setSavingApproval] = useState(false);
  const [deletingApprovalId, setDeletingApprovalId] = useState<string | null>(null);

  // ── Job Levels state ────────────────────────────────────────────────
  const [jobLevels, setJobLevels] = useState<JobLevel[]>([]);
  const [loadingJ, setLoadingJ] = useState(true);
  const [errorJ, setErrorJ] = useState('');
  const [showLevelModal, setShowLevelModal] = useState(false);
  const [editingLevel, setEditingLevel] = useState<JobLevel | null>(null);
  const [levelForm, setLevelForm] = useState<JobLevelFormData>(EMPTY_JOB_LEVEL_FORM);
  const [savingLevel, setSavingLevel] = useState(false);
  const [deletingLevelId, setDeletingLevelId] = useState<string | null>(null);

  // ── Employees for dropdowns ─────────────────────────────────────────
  const [employees, setEmployees] = useState<EmployeeSummary[]>([]);

  // ── Fetch helpers ───────────────────────────────────────────────────

  const fetchHierarchies = useCallback(async () => {
    try {
      setLoadingH(true);
      const res = await fetch('/api/approval-hierarchy', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load approval hierarchies');
      const data = await res.json();
      setHierarchies(data.hierarchies ?? []);
      setErrorH('');
    } catch (err) {
      setErrorH(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingH(false);
    }
  }, []);

  const fetchJobLevels = useCallback(async () => {
    try {
      setLoadingJ(true);
      const res = await fetch('/api/job-levels', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load job levels');
      const data = await res.json();
      setJobLevels(data.jobLevels ?? []);
      setErrorJ('');
    } catch (err) {
      setErrorJ(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoadingJ(false);
    }
  }, []);

  const fetchEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?limit=100', { credentials: 'include' });
      if (!res.ok) return;
      const data = await res.json();
      setEmployees(
        (data.employees ?? []).map((e: Record<string, string>) => ({
          id: e.id,
          first_name: e.first_name,
          last_name: e.last_name,
          email: e.email,
        }))
      );
    } catch {
      // non-critical
    }
  }, []);

  // ── Init ────────────────────────────────────────────────────────────

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) {
        window.location.href = '/sign-in';
        return;
      }
      setAuthed(true);
      fetchHierarchies();
      fetchJobLevels();
      fetchEmployees();
    })();
  }, [fetchHierarchies, fetchJobLevels, fetchEmployees]);

  // ── Approval CRUD ──────────────────────────────────────────────────

  function openAddApproval() {
    setEditingApproval(null);
    setApprovalForm(EMPTY_APPROVAL_FORM);
    setShowApprovalModal(true);
  }

  function openEditApproval(h: ApprovalHierarchy) {
    setEditingApproval(h);
    setApprovalForm({
      emp_id: h.emp_id,
      level1_approver: h.level1_approver ?? '',
      level2_approver: h.level2_approver ?? '',
      level3_approver: h.level3_approver ?? '',
      level4_approver: h.level4_approver ?? '',
      hr_partner: h.hr_partner ?? '',
    });
    setShowApprovalModal(true);
  }

  async function saveApproval() {
    setSavingApproval(true);
    try {
      const isEdit = !!editingApproval;
      const payload = isEdit
        ? {
            id: editingApproval!.id,
            level1_approver: approvalForm.level1_approver || null,
            level2_approver: approvalForm.level2_approver || null,
            level3_approver: approvalForm.level3_approver || null,
            level4_approver: approvalForm.level4_approver || null,
            hr_partner: approvalForm.hr_partner || null,
          }
        : {
            emp_id: approvalForm.emp_id,
            level1_approver: approvalForm.level1_approver || null,
            level2_approver: approvalForm.level2_approver || null,
            level3_approver: approvalForm.level3_approver || null,
            level4_approver: approvalForm.level4_approver || null,
            hr_partner: approvalForm.hr_partner || null,
          };

      const res = await fetch('/api/approval-hierarchy', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setShowApprovalModal(false);
      fetchHierarchies();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving approval hierarchy');
    } finally {
      setSavingApproval(false);
    }
  }

  async function deleteApproval(id: string) {
    if (!confirm('Remove this approval chain?')) return;
    setDeletingApprovalId(id);
    try {
      const res = await fetch('/api/approval-hierarchy', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchHierarchies();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting');
    } finally {
      setDeletingApprovalId(null);
    }
  }

  // ── Job Level CRUD ─────────────────────────────────────────────────

  function openAddLevel() {
    setEditingLevel(null);
    setLevelForm(EMPTY_JOB_LEVEL_FORM);
    setShowLevelModal(true);
  }

  function openEditLevel(jl: JobLevel) {
    setEditingLevel(jl);
    setLevelForm({
      name: jl.name,
      rank: String(jl.rank),
      description: jl.description ?? '',
    });
    setShowLevelModal(true);
  }

  async function saveLevel() {
    setSavingLevel(true);
    try {
      const isEdit = !!editingLevel;
      const rankNum = parseInt(levelForm.rank, 10);

      if (!levelForm.name.trim()) throw new Error('Name is required');
      if (isNaN(rankNum)) throw new Error('Rank must be a number');

      const payload = isEdit
        ? {
            id: editingLevel!.id,
            name: levelForm.name.trim(),
            rank: rankNum,
            description: levelForm.description.trim() || null,
          }
        : {
            name: levelForm.name.trim(),
            rank: rankNum,
            description: levelForm.description.trim() || null,
          };

      const res = await fetch('/api/job-levels', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setShowLevelModal(false);
      fetchJobLevels();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error saving job level');
    } finally {
      setSavingLevel(false);
    }
  }

  async function deleteLevel(id: string) {
    if (!confirm('Delete this job level?')) return;
    setDeletingLevelId(id);
    try {
      const res = await fetch('/api/job-levels', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete');
      }
      fetchJobLevels();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error deleting');
    } finally {
      setDeletingLevelId(null);
    }
  }

  // ── Loading / auth gate ────────────────────────────────────────────

  if (!authed) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
        <SkeletonTable rows={5} columns={6} />
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <motion.div
      className="space-y-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* ── Page Header ─────────────────────────────────────────────── */}
      <motion.div
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
        variants={itemVariants}
      >
        <div>
          <h1 className="text-2xl font-bold text-foreground dark:text-white">
            Approval Configuration
          </h1>
          <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1">
            Manage approval chains and job level grades for your organization.
          </p>
        </div>
      </motion.div>

      {/* ── Tabs ────────────────────────────────────────────────────── */}
      <motion.div variants={itemVariants}>
        <div className="flex border-b border-border dark:border-slate-700">
          <button
            onClick={() => setActiveTab('approvals')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'approvals'
                ? 'border-primary text-primary dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <GitBranch className="w-4 h-4" />
            Approval Chains
            <Badge variant="default" size="sm">
              {hierarchies.length}
            </Badge>
          </button>
          <button
            onClick={() => setActiveTab('levels')}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === 'levels'
                ? 'border-primary text-primary dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-muted-foreground hover:text-foreground dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            Job Levels
            <Badge variant="default" size="sm">
              {jobLevels.length}
            </Badge>
          </button>
        </div>
      </motion.div>

      {/* ── Approval Chains Tab ─────────────────────────────────────── */}
      {activeTab === 'approvals' && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              Define who approves leave, reimbursements, and other requests for each employee.
            </p>
            <Button size="sm" onClick={openAddApproval}>
              <Plus className="w-4 h-4 mr-1" />
              Add Chain
            </Button>
          </div>

          {loadingH ? (
            <SkeletonTable rows={5} columns={6} />
          ) : errorH ? (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 text-red-500 dark:text-red-400 py-8 justify-center">
                  <AlertCircle className="w-5 h-5" />
                  <span>{errorH}</span>
                </div>
              </CardContent>
            </Card>
          ) : hierarchies.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <GitBranch className="w-12 h-12 mx-auto text-muted-foreground dark:text-slate-500 mb-3" />
                  <p className="text-muted-foreground dark:text-slate-400 mb-4">
                    No approval chains configured yet.
                  </p>
                  <Button size="sm" onClick={openAddApproval}>
                    <Plus className="w-4 h-4 mr-1" />
                    Create First Chain
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-700 bg-muted/50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        Employee
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        L1 Approver
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        L2 Approver
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        L3 Approver
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        L4 Approver
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        HR Partner
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {hierarchies.map((h) => (
                      <tr
                        key={h.id}
                        className="border-b border-border/50 dark:border-slate-800 hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary dark:text-blue-400" />
                            <div>
                              <p className="font-medium text-foreground dark:text-white">
                                {empName(h.employee)}
                              </p>
                              <p className="text-xs text-muted-foreground dark:text-slate-500">
                                {h.employee.email}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            {h.level1 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                            {empName(h.level1)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            {h.level2 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                            {empName(h.level2)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            {h.level3 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                            {empName(h.level3)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            {h.level4 && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
                            {empName(h.level4)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-foreground dark:text-slate-300">
                          <div className="flex items-center gap-1">
                            {h.hr && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                            {empName(h.hr)}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditApproval(h)}
                              className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteApproval(h.id)}
                              disabled={deletingApprovalId === h.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── Job Levels Tab ──────────────────────────────────────────── */}
      {activeTab === 'levels' && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground dark:text-slate-400">
              Define job level grades used across your organization hierarchy.
            </p>
            <Button size="sm" onClick={openAddLevel}>
              <Plus className="w-4 h-4 mr-1" />
              Add Level
            </Button>
          </div>

          {loadingJ ? (
            <SkeletonTable rows={5} columns={4} />
          ) : errorJ ? (
            <Card>
              <CardContent>
                <div className="flex items-center gap-2 text-red-500 dark:text-red-400 py-8 justify-center">
                  <AlertCircle className="w-5 h-5" />
                  <span>{errorJ}</span>
                </div>
              </CardContent>
            </Card>
          ) : jobLevels.length === 0 ? (
            <Card>
              <CardContent>
                <div className="text-center py-12">
                  <Layers className="w-12 h-12 mx-auto text-muted-foreground dark:text-slate-500 mb-3" />
                  <p className="text-muted-foreground dark:text-slate-400 mb-4">
                    No job levels defined yet.
                  </p>
                  <Button size="sm" onClick={openAddLevel}>
                    <Plus className="w-4 h-4 mr-1" />
                    Create First Level
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border dark:border-slate-700 bg-muted/50 dark:bg-slate-800/50">
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        Rank
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        Name
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        Description
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-muted-foreground dark:text-slate-400">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobLevels.map((jl) => (
                      <tr
                        key={jl.id}
                        className="border-b border-border/50 dark:border-slate-800 hover:bg-muted/30 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <Badge variant="info" size="sm">
                            {jl.rank}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground dark:text-white">
                          {jl.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground dark:text-slate-400 max-w-xs truncate">
                          {jl.description || '-'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditLevel(jl)}
                              className="p-1.5 rounded-lg hover:bg-muted dark:hover:bg-slate-700 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors"
                              title="Edit"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => deleteLevel(jl.id)}
                              disabled={deletingLevelId === jl.id}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-muted-foreground hover:text-red-600 dark:hover:text-red-400 transition-colors disabled:opacity-50"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </motion.div>
      )}

      {/* ── Approval Hierarchy Modal ────────────────────────────────── */}
      <Modal
        isOpen={showApprovalModal}
        onClose={() => setShowApprovalModal(false)}
        title={editingApproval ? 'Edit Approval Chain' : 'Add Approval Chain'}
        description="Configure the approval chain for an employee."
        size="lg"
      >
        <div className="space-y-4">
          {/* Employee select (only for new entries) */}
          {!editingApproval && (
            <div>
              <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
                Employee <span className="text-red-500">*</span>
              </label>
              <select
                value={approvalForm.emp_id}
                onChange={(e) => setApprovalForm((f) => ({ ...f, emp_id: e.target.value }))}
                className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="">Select employee...</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.first_name} {e.last_name} ({e.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {editingApproval && (
            <div className="bg-muted/50 dark:bg-slate-800 rounded-lg p-3">
              <p className="text-sm text-muted-foreground dark:text-slate-400">Employee</p>
              <p className="font-medium text-foreground dark:text-white">
                {empName(editingApproval.employee)}
              </p>
            </div>
          )}

          {/* Level 1 */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              Level 1 Approver
            </label>
            <select
              value={approvalForm.level1_approver}
              onChange={(e) =>
                setApprovalForm((f) => ({ ...f, level1_approver: e.target.value }))
              }
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Level 2 */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              Level 2 Approver
            </label>
            <select
              value={approvalForm.level2_approver}
              onChange={(e) =>
                setApprovalForm((f) => ({ ...f, level2_approver: e.target.value }))
              }
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Level 3 */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              Level 3 Approver
            </label>
            <select
              value={approvalForm.level3_approver}
              onChange={(e) =>
                setApprovalForm((f) => ({ ...f, level3_approver: e.target.value }))
              }
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* Level 4 */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              Level 4 Approver
            </label>
            <select
              value={approvalForm.level4_approver}
              onChange={(e) =>
                setApprovalForm((f) => ({ ...f, level4_approver: e.target.value }))
              }
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </select>
          </div>

          {/* HR Partner */}
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              HR Partner
            </label>
            <select
              value={approvalForm.hr_partner}
              onChange={(e) =>
                setApprovalForm((f) => ({ ...f, hr_partner: e.target.value }))
              }
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">None</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowApprovalModal(false)}
            disabled={savingApproval}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={saveApproval}
            loading={savingApproval}
            disabled={!editingApproval && !approvalForm.emp_id}
          >
            {editingApproval ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Job Level Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={showLevelModal}
        onClose={() => setShowLevelModal(false)}
        title={editingLevel ? 'Edit Job Level' : 'Add Job Level'}
        description="Define a grade level for your organization."
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={levelForm.name}
              onChange={(e) => setLevelForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Senior Engineer"
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              Rank <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={levelForm.rank}
              onChange={(e) => setLevelForm((f) => ({ ...f, rank: e.target.value }))}
              placeholder="e.g. 5"
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <p className="text-xs text-muted-foreground dark:text-slate-500 mt-1">
              Lower rank = higher seniority. Levels are sorted by rank ascending.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground dark:text-slate-300 mb-1">
              Description
            </label>
            <textarea
              value={levelForm.description}
              onChange={(e) => setLevelForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Optional description of this level..."
              className="w-full rounded-lg border border-border dark:border-slate-700 bg-background dark:bg-slate-800 text-foreground dark:text-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLevelModal(false)}
            disabled={savingLevel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={saveLevel}
            loading={savingLevel}
            disabled={!levelForm.name.trim() || !levelForm.rank}
          >
            {editingLevel ? 'Update' : 'Create'}
          </Button>
        </ModalFooter>
      </Modal>
    </motion.div>
  );
}
