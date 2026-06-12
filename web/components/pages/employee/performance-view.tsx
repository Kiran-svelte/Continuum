'use client';

/**
 * Employee Performance Portal — Self-Service
 *
 * Features:
 * - View personal goals (create, update, mark progress)
 * - View open review instances for self-review
 * - See historical ratings
 *
 * Module-aware: shows MODULE_DISABLED state when performance module is off.
 *
 * @module components/pages/employee/performance-view
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Target, TrendingUp, Clock, CheckCircle, Plus, AlertCircle } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Goal {
  id: string;
  title: string;
  description: string | null;
  status: string;
  progress_percent: number;
  due_date: string | null;
  created_at: string;
}

interface ReviewInstance {
  id: string;
  status: string;
  overall_rating: number | null;
  ReviewCycle: { name: string; start_date: string; end_date: string };
}

type TabId = 'goals' | 'reviews';

// ─── View ─────────────────────────────────────────────────────────────────────

export default function EmployeePerformanceView() {
  const [activeTab, setActiveTab] = useState<TabId>('goals');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reviews, setReviews] = useState<ReviewInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModuleDisabled, setIsModuleDisabled] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newGoalTitle, setNewGoalTitle] = useState('');

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [goalsRes, reviewsRes] = await Promise.allSettled([
        fetch('/api/goals?scope=own', { credentials: 'include' }),
        fetch('/api/review-instances?role=reviewee', { credentials: 'include' }),
      ]);

      if (goalsRes.status === 'fulfilled') {
        if (goalsRes.value.status === 403) {
          const body = await goalsRes.value.json().catch(() => ({}));
          if ((body as { error?: string }).error === 'MODULE_DISABLED') {
            setIsModuleDisabled(true);
            return;
          }
        }
        if (goalsRes.value.ok) {
          const data = await goalsRes.value.json();
          setGoals((data as { goals?: Goal[] }).goals ?? []);
        }
      }

      if (reviewsRes.status === 'fulfilled' && reviewsRes.value.ok) {
        const data = await reviewsRes.value.json();
        setReviews((data as { instances?: ReviewInstance[] }).instances ?? []);
      }
    } catch {
      toast.error('Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCreateGoal = useCallback(async () => {
    if (!newGoalTitle.trim()) return;
    setIsCreating(true);
    try {
      const res = await fetch('/api/goals', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newGoalTitle.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create goal');
      toast.success('Goal created');
      setNewGoalTitle('');
      void fetchData();
    } catch {
      toast.error('Failed to create goal');
    } finally {
      setIsCreating(false);
    }
  }, [newGoalTitle, fetchData]);

  const handleUpdateProgress = useCallback(async (goalId: string, progressPercent: number) => {
    try {
      const res = await fetch(`/api/goals/${goalId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ progressPercent, status: progressPercent === 100 ? 'completed' : 'in_progress' }),
      });
      if (!res.ok) throw new Error('Update failed');
      toast.success(progressPercent === 100 ? 'Goal completed! 🎉' : 'Progress updated');
      void fetchData();
    } catch {
      toast.error('Failed to update goal progress');
    }
  }, [fetchData]);

  if (isModuleDisabled) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-center p-8">
        <AlertCircle className="w-12 h-12 text-[var(--muted-foreground)]" />
        <h2 className="text-xl font-semibold text-[var(--foreground)]">Performance Module Disabled</h2>
        <p className="text-sm text-[var(--muted-foreground)] max-w-sm">
          The Performance module has not been enabled for your organization. Contact your HR administrator.
        </p>
      </div>
    );
  }

  const activeGoals = goals.filter((g) => g.status !== 'completed');
  const completedGoals = goals.filter((g) => g.status === 'completed');
  const pendingReviews = reviews.filter((r) => r.status !== 'completed');

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="border-b border-[var(--border)] pb-6">
          <div className="flex items-center gap-3 mb-2">
            <Target className="w-7 h-7 text-[var(--primary)]" />
            <h1 className="text-3xl font-bold text-[var(--foreground)]">My Performance</h1>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">Goals, review cycles, and your performance history</p>
        </div>

        {/* KPI Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard icon={<Target className="w-5 h-5 text-[var(--primary)]" />} label="Active Goals" value={isLoading ? '…' : String(activeGoals.length)} />
          <KpiCard icon={<CheckCircle className="w-5 h-5 text-[var(--status-success)]" />} label="Goals Completed" value={isLoading ? '…' : String(completedGoals.length)} />
          <KpiCard icon={<Clock className="w-5 h-5 text-[var(--status-warning)]" />} label="Pending Reviews" value={isLoading ? '…' : String(pendingReviews.length)} />
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border)] gap-1">
          {(['goals', 'reviews'] as TabId[]).map((tab) => (
            <button
              key={tab}
              id={`perf-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-[var(--primary)] text-[var(--primary)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Goals Tab */}
        {activeTab === 'goals' && (
          <div className="space-y-4">
            {/* Create Goal */}
            <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-4 flex gap-3">
              <input
                type="text"
                id="new-goal-title"
                placeholder="Enter a new goal…"
                value={newGoalTitle}
                onChange={(e) => setNewGoalTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleCreateGoal(); }}
                className="flex-1 bg-transparent border border-[var(--border)] rounded px-3 py-1.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)]"
                aria-label="New goal title"
              />
              <Button
                id="create-goal-btn"
                size="sm"
                disabled={isCreating || !newGoalTitle.trim()}
                onClick={() => void handleCreateGoal()}
              >
                <Plus className="w-4 h-4 mr-1" />
                Add Goal
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
            ) : activeGoals.length === 0 && completedGoals.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No goals yet. Add your first goal above.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
                {[...activeGoals, ...completedGoals].map((goal) => (
                  <div key={goal.id} className="p-4 sm:p-6 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{goal.title}</p>
                        {goal.description && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 line-clamp-2">{goal.description}</p>
                        )}
                        {goal.due_date && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-1">
                            Due {new Date(goal.due_date).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                      <Badge variant={goal.status === 'completed' ? 'default' : 'outline'}>
                        {goal.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>

                    <div className="w-full h-2 rounded-full bg-[var(--muted)]/40">
                      <div
                        className="h-2 rounded-full bg-[var(--primary)] transition-all"
                        style={{ width: `${goal.progress_percent}%` }}
                      />
                    </div>

                    {goal.status !== 'completed' && (
                      <div className="flex gap-2 flex-wrap">
                        {[25, 50, 75, 100].filter((p) => p > goal.progress_percent).map((pct) => (
                          <Button
                            key={pct}
                            size="sm"
                            variant="outline"
                            className="text-xs"
                            onClick={() => void handleUpdateProgress(goal.id, pct)}
                          >
                            {pct === 100 ? 'Mark Complete' : `${pct}%`}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div>
            {isLoading ? (
              <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-12 text-[var(--muted-foreground)]">
                <TrendingUp className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No review cycles assigned yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)] border border-[var(--border)] bg-[var(--card)] rounded-lg overflow-hidden">
                {reviews.map((review) => (
                  <div key={review.id} className="p-4 sm:p-6 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{review.ReviewCycle.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                        {new Date(review.ReviewCycle.start_date).toLocaleDateString('en-IN')} –{' '}
                        {new Date(review.ReviewCycle.end_date).toLocaleDateString('en-IN')}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {review.overall_rating !== null && (
                        <span className="text-sm font-bold text-[var(--primary)]">
                          {review.overall_rating}/5
                        </span>
                      )}
                      <Badge variant={review.status === 'completed' ? 'default' : 'outline'}>
                        {review.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] bg-[var(--card)] rounded-lg p-4 flex flex-col gap-2 text-center items-center">
      {icon}
      <span className="text-2xl font-bold text-[var(--foreground)]">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{label}</span>
    </div>
  );
}
