'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { AnimatePresence, motion } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/modal';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { ensureMe } from '@/lib/client-auth';
import {
  Crosshair, Plus, Filter, CheckCircle, Clock, XCircle,
  AlertCircle, TrendingUp, Search,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Goal {
  id: string;
  title: string;
  description: string | null;
  category: string;
  metric_type: string;
  target_value: number;
  current_value: number;
  weight: number;
  status: string;
  due_date: string | null;
  created_at: string;
  Employee: { first_name: string; last_name: string; department: string | null };
  ParentGoal: { id: string; title: string } | null;
  _count: { ChildGoals: number };
}

/* ─── Status Helpers ────────────────────────────────────────────────────── */

/** Returns the appropriate icon for a goal status. */
function statusIcon(status: string) {
  switch (status) {
    case 'completed':
      return <CheckCircle className="w-4 h-4 text-[var(--success)]" />;
    case 'in_progress':
      return <Clock className="w-4 h-4 text-[var(--info)]" />;
    case 'cancelled':
    case 'deferred':
      return <XCircle className="w-4 h-4 text-[var(--muted-foreground)]" />;
    default:
      return <AlertCircle className="w-4 h-4 text-[var(--warning)]" />;
  }
}

/** Formats a status enum value for display. */
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Calculates completion percentage for a goal. */
function completionPercentage(goal: Goal): number {
  if (goal.target_value === 0) return 0;
  return Math.min(100, Math.round((goal.current_value / goal.target_value) * 100));
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function GoalsView() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Create form state
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formCategory, setFormCategory] = useState('individual');
  const [formMetricType, setFormMetricType] = useState('percentage');
  const [formTargetValue, setFormTargetValue] = useState('100');
  const [formDueDate, setFormDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);

      const res = await fetch(`/api/goals?${params}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load goals');
      const data = await res.json();
      setGoals(data.goals || []);
    } catch {
      toast.error('Failed to load goals');
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, categoryFilter]);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const filteredGoals = goals.filter((g) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const name = `${g.Employee.first_name} ${g.Employee.last_name}`.toLowerCase();
    return g.title.toLowerCase().includes(query) || name.includes(query);
  });

  async function handleCreateGoal() {
    if (!formTitle.trim()) {
      toast.error('Goal title is required');
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          title: formTitle,
          description: formDescription || undefined,
          category: formCategory,
          metricType: formMetricType,
          targetValue: parseFloat(formTargetValue) || 100,
          dueDate: formDueDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || 'Failed to create goal');
      }

      toast.success('Goal created successfully');
      setShowCreateModal(false);
      resetForm();
      fetchGoals();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create goal');
    } finally {
      setIsSaving(false);
    }
  }

  function resetForm() {
    setFormTitle('');
    setFormDescription('');
    setFormCategory('individual');
    setFormMetricType('percentage');
    setFormTargetValue('100');
    setFormDueDate('');
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Goals"
        description="OKR-based goal tracking for all employees"
        icon={<Crosshair className="w-6 h-6" />}
        action={
          <Button onClick={() => setShowCreateModal(true)} size="sm">
            <Plus className="w-4 h-4 mr-1" /> New Goal
          </Button>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-[400px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input
            type="text"
            placeholder="Search goals or employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            aria-label="Search goals"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input text-sm py-2 px-3 rounded-md min-w-[150px]"
          aria-label="Filter by status"
        >
          <option value="">All Statuses</option>
          <option value="not_started">Not Started</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="deferred">Deferred</option>
        </select>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input text-sm py-2 px-3 rounded-md min-w-[150px]"
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          <option value="company">Company</option>
          <option value="department">Department</option>
          <option value="team">Team</option>
          <option value="individual">Individual</option>
        </select>
      </div>

      {/* Goals List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="card p-12 text-center text-[var(--muted-foreground)]">
          <Crosshair className="w-12 h-12 mx-auto mb-4 opacity-20" />
          <p className="text-base font-medium">No goals found</p>
          <p className="text-sm mt-1">Create your first goal to start tracking performance</p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {filteredGoals.map((goal) => {
              const completion = completionPercentage(goal);
              return (
                <motion.div
                  key={goal.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="card p-4 hover:border-[var(--primary)] transition-all"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {statusIcon(goal.status)}
                        <h4 className="text-sm font-semibold truncate">{goal.title}</h4>
                        <Badge variant="outline" className="text-[10px]">{formatStatus(goal.category)}</Badge>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] mb-2">
                        {goal.Employee.first_name} {goal.Employee.last_name}
                        {goal.Employee.department && ` • ${goal.Employee.department}`}
                      </p>
                      {goal.description && (
                        <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{goal.description}</p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-lg font-bold">{completion}%</span>
                      {goal.due_date && (
                        <span className="text-[10px] text-[var(--muted-foreground)]">
                          Due {new Date(goal.due_date).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-3 w-full bg-[var(--muted)] rounded-full h-1.5">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{
                        width: `${completion}%`,
                        backgroundColor: completion >= 100 ? 'var(--success)' : completion >= 50 ? 'var(--info)' : 'var(--warning)',
                      }}
                    />
                  </div>

                  {goal.ParentGoal && (
                    <p className="text-[10px] text-[var(--muted-foreground)] mt-2 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" /> Linked to: {goal.ParentGoal.title}
                    </p>
                  )}
                </motion.div>
              );
            })}
          </div>
        </AnimatePresence>
      )}

      {/* Create Goal Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Goal">
        <div className="space-y-4">
          <div>
            <label htmlFor="goal-title" className="text-xs font-semibold block mb-1">Title *</label>
            <Input id="goal-title" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g., Increase team velocity by 20%" />
          </div>
          <div>
            <label htmlFor="goal-desc" className="text-xs font-semibold block mb-1">Description</label>
            <textarea
              id="goal-desc"
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Details about this goal..."
              className="input w-full min-h-[80px] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-category" className="text-xs font-semibold block mb-1">Category</label>
              <select id="goal-category" value={formCategory} onChange={(e) => setFormCategory(e.target.value)} className="input w-full text-sm">
                <option value="individual">Individual</option>
                <option value="team">Team</option>
                <option value="department">Department</option>
                <option value="company">Company</option>
              </select>
            </div>
            <div>
              <label htmlFor="goal-metric" className="text-xs font-semibold block mb-1">Metric Type</label>
              <select id="goal-metric" value={formMetricType} onChange={(e) => setFormMetricType(e.target.value)} className="input w-full text-sm">
                <option value="percentage">Percentage</option>
                <option value="number">Number</option>
                <option value="currency">Currency</option>
                <option value="boolean">Yes/No</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="goal-target" className="text-xs font-semibold block mb-1">Target Value</label>
              <Input id="goal-target" type="number" value={formTargetValue} onChange={(e) => setFormTargetValue(e.target.value)} />
            </div>
            <div>
              <label htmlFor="goal-due" className="text-xs font-semibold block mb-1">Due Date</label>
              <Input id="goal-due" type="date" value={formDueDate} onChange={(e) => setFormDueDate(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleCreateGoal} disabled={isSaving}>
              {isSaving ? 'Creating...' : 'Create Goal'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
