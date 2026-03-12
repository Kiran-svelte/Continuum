'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { FadeIn, StaggerContainer, AmbientBackground } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

interface ChecklistItem {
  task: string;
  category: string;
  completed: boolean;
  due_date?: string;
}

interface ExitChecklist {
  id: string;
  items: ChecklistItem[];
  custom_items: ChecklistItem[] | null;
  status: 'not_started' | 'in_progress' | 'completed';
  completed_at: string | null;
  created_at: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  'IT & Access': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  'Finance': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  'HR & Admin': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  'Knowledge Transfer': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  'Assets': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'Compliance': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  'Other': 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

const STATUS_MAP: Record<string, { label: string; variant: 'warning' | 'info' | 'success' }> = {
  not_started: { label: 'Not Started', variant: 'warning' },
  in_progress: { label: 'In Progress', variant: 'info' },
  completed: { label: 'Completed', variant: 'success' },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function ChecklistLoadingSkeleton() {
  return (
    <div className="p-4 sm:p-8 pb-32 max-w-4xl mx-auto">
      <AmbientBackground />
      <div className="space-y-8">
        {/* Header skeleton */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 bg-white/10" />
          <Skeleton className="h-4 w-80 bg-white/10" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-white/10 p-6 space-y-2">
              <Skeleton className="h-4 w-20 bg-white/10" />
              <Skeleton className="h-8 w-12 bg-white/10" />
            </div>
          ))}
        </div>

        {/* Progress bar skeleton */}
        <div className="glass-panel rounded-2xl border border-white/10 p-6 space-y-3">
          <div className="flex justify-between">
            <Skeleton className="h-4 w-24 bg-white/10" />
            <Skeleton className="h-4 w-12 bg-white/10" />
          </div>
          <Skeleton className="h-3 w-full bg-white/10" />
        </div>

        {/* Checklist items skeleton */}
        <div className="space-y-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl border border-white/10 p-6">
              <div className="flex justify-between items-center mb-4">
                <Skeleton className="h-6 w-24 bg-white/10" />
                <Skeleton className="h-4 w-20 bg-white/10" />
              </div>
              <div className="space-y-3">
                {[...Array(3)].map((_, j) => (
                  <div key={j} className="flex items-start gap-4 p-4 rounded-xl bg-black/20">
                    <Skeleton className="w-6 h-6 rounded-full bg-white/10 mt-1" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 bg-white/10" />
                      <div className="flex gap-2">
                        <Skeleton className="h-5 w-20 rounded-full bg-white/10" />
                        <Skeleton className="h-5 w-28 rounded-full bg-white/10" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function EmployeeExitChecklistPage() {
  const [checklists, setChecklists] = useState<ExitChecklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const loadChecklists = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/exit-checklist', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Failed to load exit checklist');
        return;
      }
      setChecklists(data.checklists ?? []);
    } catch {
      setError('Network error loading exit checklist');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChecklists();
  }, [loadChecklists]);

  async function toggleChecklist(id: string, completed: boolean) {
    setToggling(id);
    try {
      const res = await fetch('/api/exit-checklist', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id, completed }),
      });
      if (res.ok) {
        const data = await res.json();
        setChecklists((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status: data.checklist.status, completed_at: data.checklist.completed_at } : c))
        );
      }
    } finally {
      setToggling(null);
    }
  }

  // Aggregate all items across all checklists
  const allItems: { checklistId: string; item: ChecklistItem; isCustom: boolean }[] = [];
  for (const cl of checklists) {
    for (const item of cl.items) {
      allItems.push({ checklistId: cl.id, item, isCustom: false });
    }
    if (cl.custom_items) {
      for (const item of cl.custom_items) {
        allItems.push({ checklistId: cl.id, item, isCustom: true });
      }
    }
  }

  const totalItems = allItems.length;
  const completedItems = allItems.filter((a) => a.item.completed).length;
  const pendingItems = totalItems - completedItems;
  const progressPct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Check for overdue items
  const now = new Date();
  const overdueCount = allItems.filter(
    (a) => !a.item.completed && a.item.due_date && new Date(a.item.due_date) < now
  ).length;

  if (loading) {
    return <ChecklistLoadingSkeleton />;
  }

  return (
    <div className="p-4 sm:p-8 pb-32 max-w-4xl mx-auto">
      <AmbientBackground />
      <StaggerContainer className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Exit Checklist"
          description="Complete your offboarding tasks"
          icon={<ClipboardList className="w-6 h-6 text-primary" />}
        />

        {/* Error */}
        {error && (
          <FadeIn>
            <GlassPanel className="p-6 border-red-500/30 text-red-300/90 flex items-center gap-4">
              <AlertCircle className="w-6 h-6" />
              <span className="flex-1">{error}</span>
              <Button
                onClick={loadChecklists}
                className="ml-2 text-sm underline hover:no-underline shrink-0 bg-red-500/20 hover:bg-red-500/30 px-3 py-1 rounded-md"
              >
                Retry
              </Button>
            </GlassPanel>
          </FadeIn>
        )}

        {/* Empty state */}
        {!loading && !error && checklists.length === 0 && (
          <FadeIn>
            <GlassPanel interactive className="text-center py-20">
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring' as const, stiffness: 260, damping: 20, delay: 0.2 }}
              >
                <CheckCircle2 className="w-16 h-16 text-green-400/80 mx-auto mb-6" />
              </motion.div>
              <h3 className="text-xl font-semibold text-white mb-2">No exit tasks assigned</h3>
              <p className="text-sm text-white/60">
                You don&apos;t have any exit checklist items at the moment.
              </p>
            </GlassPanel>
          </FadeIn>
        )}

        {/* Content */}
        {!loading && !error && checklists.length > 0 && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <FadeIn>
                <GlassPanel interactive className="p-4">
                  <p className="text-xs text-white/50 font-medium uppercase mb-1">Total Tasks</p>
                  <p className="text-3xl font-bold text-white">{totalItems}</p>
                </GlassPanel>
              </FadeIn>
              <FadeIn>
                <GlassPanel interactive className="p-4">
                  <p className="text-xs text-white/50 font-medium uppercase mb-1">Completed</p>
                  <p className="text-3xl font-bold text-green-400">{completedItems}</p>
                </GlassPanel>
              </FadeIn>
              <FadeIn>
                <GlassPanel interactive className="p-4">
                  <p className="text-xs text-white/50 font-medium uppercase mb-1">Pending</p>
                  <p className="text-3xl font-bold text-amber-400">{pendingItems}</p>
                </GlassPanel>
              </FadeIn>
              <FadeIn>
                <GlassPanel interactive className="p-4">
                  <p className="text-xs text-white/50 font-medium uppercase mb-1">Overdue</p>
                  <p className={`text-3xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-white'}`}>{overdueCount}</p>
                </GlassPanel>
              </FadeIn>
            </div>

            {/* Progress bar */}
            <FadeIn>
              <GlassPanel interactive className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-white">Overall Progress</span>
                  <span className="text-sm font-bold text-white">{progressPct}%</span>
                </div>
                <div className="w-full bg-black/30 rounded-full h-2.5 shadow-inner">
                  <motion.div
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      progressPct === 100
                        ? 'bg-gradient-to-r from-green-400 to-cyan-400'
                        : 'bg-gradient-to-r from-primary to-blue-500'
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${progressPct}%` }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                </div>
              </GlassPanel>
            </FadeIn>

            {/* Checklist groups */}
            {checklists.map((cl) => {
              const items = [...cl.items, ...(cl.custom_items ?? [])];
              const clCompleted = items.filter((i) => i.completed).length;
              const statusInfo = STATUS_MAP[cl.status] ?? STATUS_MAP.not_started;

              return (
                <FadeIn key={cl.id}>
                  <GlassPanel interactive className="p-4 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                        <span className="text-xs text-white/50 flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          Assigned {formatDate(cl.created_at)}
                        </span>
                        {cl.completed_at && (
                          <span className="text-xs text-green-400 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Completed {formatDate(cl.completed_at)}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-white/50 mt-2 sm:mt-0">{clCompleted}/{items.length} done</span>
                    </div>

                    <div className="space-y-3">
                      {items.map((item, idx) => {
                        const isOverdue = !item.completed && item.due_date && new Date(item.due_date) < now;
                        const catColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS['Other'];

                        return (
                          <FadeIn key={`${cl.id}-${idx}`}>
                            <GlassPanel
                              className={`p-3 sm:p-4 flex items-start gap-4 transition-colors duration-300 hover:bg-white/5 ${
                                item.completed
                                  ? 'border-green-500/20'
                                  : isOverdue
                                  ? 'border-red-500/30'
                                  : 'border-white/10'
                              }`}
                            >
                              <button
                                onClick={() => {
                                  if (cl.status !== 'completed') {
                                    toggleChecklist(cl.id, true);
                                  } else {
                                    toggleChecklist(cl.id, false);
                                  }
                                }}
                                disabled={toggling === cl.id}
                                className="mt-1 shrink-0"
                              >
                                {toggling === cl.id ? (
                                  <Loader2 className="w-5 h-5 text-white/50 animate-spin" />
                                ) : item.completed ? (
                                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                                ) : (
                                  <Circle className="w-5 h-5 text-white/40 hover:text-primary transition-colors" />
                                )}
                              </button>

                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium ${
                                  item.completed ? 'text-white/50 line-through' : 'text-white'
                                }`}>
                                  {item.task}
                                </p>
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catColor}`}>
                                    {item.category}
                                  </span>
                                  {item.due_date && (
                                    <span className={`text-xs flex items-center gap-1.5 ${
                                      isOverdue ? 'text-red-400 font-medium' : 'text-white/60'
                                    }`}>
                                      <Clock className="w-3 h-3" />
                                      {isOverdue ? 'Overdue: ' : 'Due: '}{formatDate(item.due_date)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </GlassPanel>
                          </FadeIn>
                        );
                      })}
                    </div>
                  </GlassPanel>
                </FadeIn>
              );
            })}
          </>
        )}
      </StaggerContainer>
    </div>
  );
}
