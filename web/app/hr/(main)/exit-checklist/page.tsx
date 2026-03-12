'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { StaggerContainer, FadeIn } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal, ModalFooter } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { ProgressBar } from '@/components/ui/progress';
import { ensureMe } from '@/lib/client-auth';
import {
  ClipboardCheck,
  Plus,
  Trash2,
  AlertCircle,
  CheckCircle,
  Loader2,
  Inbox,
  Users,
  Clock,
  CheckCircle2,
} from 'lucide-react';

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface ChecklistItem {
  task: string;
  category: string;
  completed: boolean;
  due_date?: string;
}

interface ExitChecklist {
  id: string;
  emp_id: string;
  company_id: string;
  items: ChecklistItem[];
  custom_items: ChecklistItem[] | null;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    last_name: string;
    department: string | null;
    email: string;
    designation: string | null;
  };
}

interface EmployeeOption {
  id: string;
  first_name: string;
  last_name: string;
  department: string | null;
  email: string;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'info' | 'default'> = {
  completed: 'success',
  in_progress: 'warning',
  not_started: 'default',
};

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  in_progress: 'In Progress',
  not_started: 'Not Started',
};

const CATEGORY_OPTIONS = [
  'IT & Access',
  'Finance',
  'HR & Admin',
  'Knowledge Transfer',
  'Assets',
  'Compliance',
  'Other',
];

/* ─── Helpers ────────────────────────────────────────────────────────────── */

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/* ─── Component ──────────────────────────────────────────────────────────── */

export default function HRExitChecklistPage() {
  const [checklists, setChecklists] = useState<ExitChecklist[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Filters
  const [employeeFilter, setEmployeeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Add Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [formEmpId, setFormEmpId] = useState('');
  const [formTask, setFormTask] = useState('');
  const [formCategory, setFormCategory] = useState('IT & Access');
  const [formDueDate, setFormDueDate] = useState('');

  // Action states
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [toggleLoading, setToggleLoading] = useState<string | null>(null);

  // ── Auth ──────────────────────────────────────────────────────────────

  useEffect(() => {
    ensureMe().then((me) => {
      if (!me) {
        window.location.href = '/sign-in';
      }
    });
  }, []);

  // ── Data Fetching ─────────────────────────────────────────────────────

  const loadChecklists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (employeeFilter) params.set('employee_id', employeeFilter);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/exit-checklist?${params}`, { credentials: 'include' });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Failed to load checklists');
        return;
      }
      setChecklists(json.checklists);
    } catch {
      setError('Network error while loading checklists.');
    } finally {
      setLoading(false);
    }
  }, [employeeFilter, statusFilter]);

  const loadEmployees = useCallback(async () => {
    try {
      const res = await fetch('/api/employees?limit=100', { credentials: 'include' });
      const json = await res.json();
      if (res.ok) {
        setEmployees(json.employees ?? []);
      }
    } catch {
      // Silently fail; employee select will be empty
    }
  }, []);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  // ── Summary Stats ─────────────────────────────────────────────────────

  const stats = useMemo(() => {
    const total = checklists.length;
    const completed = checklists.filter((c) => c.status === 'completed').length;
    const pending = checklists.filter((c) => c.status !== 'completed').length;
    return { total, completed, pending };
  }, [checklists]);

  // ── Per-Employee Progress ─────────────────────────────────────────────

  const employeeProgress = useMemo(() => {
    const grouped: Record<
      string,
      {
        name: string;
        department: string | null;
        total: number;
        completed: number;
      }
    > = {};

    checklists.forEach((c) => {
      const key = c.emp_id;
      if (!grouped[key]) {
        grouped[key] = {
          name: `${c.employee.first_name} ${c.employee.last_name}`,
          department: c.employee.department,
          total: 0,
          completed: 0,
        };
      }
      grouped[key].total += 1;
      if (c.status === 'completed') {
        grouped[key].completed += 1;
      }
    });

    return Object.entries(grouped).map(([empId, data]) => ({
      empId,
      ...data,
      percent: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }));
  }, [checklists]);

  // ── Filtered Checklists ───────────────────────────────────────────────

  const filteredChecklists = useMemo(() => {
    let result = checklists;
    if (employeeFilter) {
      result = result.filter((c) => c.emp_id === employeeFilter);
    }
    if (statusFilter) {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [checklists, employeeFilter, statusFilter]);

  // ── Actions ───────────────────────────────────────────────────────────

  function showMessage(type: 'success' | 'error', text: string) {
    setActionMessage({ type, text });
    setTimeout(() => setActionMessage(null), 5000);
  }

  async function handleAddChecklist() {
    if (!formEmpId || !formTask.trim()) {
      showMessage('error', 'Please select an employee and enter a task.');
      return;
    }

    setAddLoading(true);
    try {
      const itemPayload: ChecklistItem = {
        task: formTask.trim(),
        category: formCategory,
        completed: false,
        due_date: formDueDate || undefined,
      };

      const res = await fetch('/api/exit-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          emp_id: formEmpId,
          items: [itemPayload],
          status: 'not_started',
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        showMessage('error', json.error ?? 'Failed to create checklist item.');
        return;
      }

      setChecklists((prev) => [json.checklist, ...prev]);
      showMessage('success', 'Checklist item added successfully.');
      setShowAddModal(false);
      resetForm();
    } catch {
      showMessage('error', 'Network error while creating checklist item.');
    } finally {
      setAddLoading(false);
    }
  }

  async function handleToggleComplete(checklist: ExitChecklist) {
    const newCompleted = checklist.status !== 'completed';
    setToggleLoading(checklist.id);
    try {
      const res = await fetch('/api/exit-checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: checklist.id, completed: newCompleted }),
      });

      const json = await res.json();
      if (!res.ok) {
        showMessage('error', json.error ?? 'Failed to update checklist.');
        return;
      }

      setChecklists((prev) =>
        prev.map((c) => (c.id === checklist.id ? json.checklist : c))
      );
      showMessage(
        'success',
        newCompleted ? 'Item marked as completed.' : 'Item reopened.'
      );
    } catch {
      showMessage('error', 'Network error while updating checklist.');
    } finally {
      setToggleLoading(null);
    }
  }

  async function handleDelete(id: string) {
    setDeleteLoading(id);
    try {
      const res = await fetch('/api/exit-checklist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id }),
      });

      const json = await res.json();
      if (!res.ok) {
        showMessage('error', json.error ?? 'Failed to delete checklist item.');
        return;
      }

      setChecklists((prev) => prev.filter((c) => c.id !== id));
      showMessage('success', 'Checklist item deleted.');
    } catch {
      showMessage('error', 'Network error while deleting checklist item.');
    } finally {
      setDeleteLoading(null);
    }
  }

  function resetForm() {
    setFormEmpId('');
    setFormTask('');
    setFormCategory('IT & Access');
    setFormDueDate('');
  }

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <StaggerContainer className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Exit Checklist"
        description="Manage offboarding tasks for departing employees"
        icon={<ClipboardCheck className="w-6 h-6 text-primary" />}
        action={
          <Button onClick={() => setShowAddModal(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        }
      />

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
              <CheckCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            {actionMessage.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary Cards */}
      <FadeIn className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <GlassPanel>
          <div className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <ClipboardCheck className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Total Items</p>
                <p className="text-2xl font-bold text-white">
                  {stats.total}
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Completed</p>
                <p className="text-2xl font-bold text-white">
                  {stats.completed}
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>

        <GlassPanel>
          <div className="p-6 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm text-white/60">Pending</p>
                <p className="text-2xl font-bold text-white">
                  {stats.pending}
                </p>
              </div>
            </div>
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Filters */}
      <FadeIn className="flex flex-wrap items-center gap-4">
        <div className="flex-1 min-w-[200px]">
          <select
            value={employeeFilter}
            onChange={(e) => setEmployeeFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
          >
            <option value="">All Employees</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.first_name} {emp.last_name}
                {emp.department ? ` - ${emp.department}` : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 flex-wrap">
          {[
            { value: '', label: 'All' },
            { value: 'not_started', label: 'Not Started' },
            { value: 'in_progress', label: 'In Progress' },
            { value: 'completed', label: 'Completed' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                statusFilter === f.value
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </FadeIn>

      {/* Per-Employee Progress */}
      {employeeProgress.length > 0 && !employeeFilter && (
        <FadeIn>
          <GlassPanel>
            <div className="p-6 border-b border-white/10">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Users className="w-5 h-5" />
                Employee Progress
              </h3>
            </div>
            <div className="p-6 relative z-10">
              <div className="space-y-4">
                {employeeProgress.map((ep) => (
                  <div key={ep.empId} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-white">
                          {ep.name}
                        </span>
                        {ep.department && (
                          <span className="text-xs text-white/40 ml-2">
                            {ep.department}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/60">
                        {ep.completed}/{ep.total} ({ep.percent}%)
                      </span>
                    </div>
                    <ProgressBar
                      value={ep.percent}
                      max={100}
                      variant={
                        ep.percent === 100
                          ? 'success'
                          : ep.percent >= 50
                            ? 'warning'
                            : 'default'
                      }
                      size="sm"
                    />
                  </div>
                ))}
              </div>
            </div>
          </GlassPanel>
        </FadeIn>
      )}

      {/* Checklist Table */}
      <FadeIn>
        <GlassPanel>
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">
                Checklist Items
              </h3>
              {filteredChecklists.length > 0 && (
                <Badge variant="info">{filteredChecklists.length} items</Badge>
              )}
            </div>
          </div>
          <div className="p-6 relative z-10">
            {loading && (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 border border-white/10 rounded-lg">
                    <Skeleton className="w-5 h-5" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                ))}
              </div>
            )}

            {error && !loading && (
              <div className="rounded-lg bg-red-500/10 border border-red-800 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            {!loading && !error && filteredChecklists.length === 0 && (
              <div className="py-12 text-center">
                <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center mx-auto">
                  <Inbox className="w-5 h-5 text-white/40" />
                </div>
                <p className="text-white/60 mt-3 text-sm">
                  No checklist items found.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setShowAddModal(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Item
                </Button>
              </div>
            )}

            {!loading && !error && filteredChecklists.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="py-3 pr-2 w-10"></th>
                      <th className="text-left py-3 pr-4 text-white/60 font-medium">
                        Employee
                      </th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">
                        Task
                      </th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">
                        Category
                      </th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">
                        Due Date
                      </th>
                      <th className="text-left py-3 px-2 text-white/60 font-medium">
                        Status
                      </th>
                      <th className="text-left py-3 pl-2 text-white/60 font-medium">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredChecklists.map((checklist) => {
                      const firstItem =
                        checklist.items && Array.isArray(checklist.items) && checklist.items.length > 0
                          ? (checklist.items as ChecklistItem[])[0]
                          : null;

                      return (
                        <tr
                          key={checklist.id}
                          className="border-b border-white/10 hover:bg-white/5 transition-colors"
                        >
                          {/* Checkbox */}
                          <td className="py-3 pr-2">
                            <button
                              onClick={() => handleToggleComplete(checklist)}
                              disabled={toggleLoading === checklist.id}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                checklist.status === 'completed'
                                  ? 'bg-emerald-500 border-emerald-500 text-white'
                                  : 'border-white/20 hover:border-emerald-400'
                              }`}
                            >
                              {toggleLoading === checklist.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : checklist.status === 'completed' ? (
                                <CheckCircle className="w-3 h-3" />
                              ) : null}
                            </button>
                          </td>

                          {/* Employee */}
                          <td className="py-3 pr-4">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center text-xs font-bold text-primary shrink-0">
                                {checklist.employee.first_name[0]}
                                {checklist.employee.last_name[0]}
                              </div>
                              <div>
                                <p className="font-medium text-white">
                                  {checklist.employee.first_name} {checklist.employee.last_name}
                                </p>
                                <p className="text-xs text-white/40">
                                  {checklist.employee.department ?? '\u2014'}
                                </p>
                              </div>
                            </div>
                          </td>

                          {/* Task */}
                          <td className="py-3 px-2">
                            <span
                              className={`text-white ${
                                checklist.status === 'completed'
                                  ? 'line-through text-white/40'
                                  : ''
                              }`}
                            >
                              {firstItem?.task ?? 'No task defined'}
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-2">
                            <span className="text-xs px-2 py-1 rounded-full bg-white/5 text-white/60">
                              {firstItem?.category ?? '\u2014'}
                            </span>
                          </td>

                          {/* Due Date */}
                          <td className="py-3 px-2 text-white/60">
                            {firstItem?.due_date ? formatDate(firstItem.due_date) : '\u2014'}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-2">
                            <Badge variant={STATUS_BADGE[checklist.status] ?? 'default'}>
                              {STATUS_LABELS[checklist.status] ?? checklist.status}
                            </Badge>
                          </td>

                          {/* Actions */}
                          <td className="py-3 pl-2">
                            <Button
                              variant="danger"
                              size="sm"
                              loading={deleteLoading === checklist.id}
                              disabled={!!deleteLoading}
                              onClick={() => handleDelete(checklist.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassPanel>
      </FadeIn>

      {/* Add Item Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          resetForm();
        }}
        title="Add Exit Checklist Item"
        description="Create a new offboarding task for a departing employee"
        size="lg"
      >
        <div className="space-y-4">
          {/* Employee Select */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Employee
            </label>
            <select
              value={formEmpId}
              onChange={(e) => setFormEmpId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              <option value="">Select employee...</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.first_name} {emp.last_name}
                  {emp.department ? ` - ${emp.department}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Task */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Task
            </label>
            <input
              type="text"
              value={formTask}
              onChange={(e) => setFormTask(e.target.value)}
              placeholder="e.g., Return laptop and accessories"
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Category
            </label>
            <select
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            >
              {CATEGORY_OPTIONS.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-white mb-1.5">
              Due Date (optional)
            </label>
            <input
              type="date"
              value={formDueDate}
              onChange={(e) => setFormDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-white/10 bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-colors"
            />
          </div>
        </div>

        <ModalFooter>
          <Button
            variant="outline"
            onClick={() => {
              setShowAddModal(false);
              resetForm();
            }}
            disabled={addLoading}
          >
            Cancel
          </Button>
          <Button onClick={handleAddChecklist} loading={addLoading} disabled={addLoading}>
            <Plus className="w-4 h-4 mr-1" />
            Add Item
          </Button>
        </ModalFooter>
      </Modal>
    </StaggerContainer>
  );
}