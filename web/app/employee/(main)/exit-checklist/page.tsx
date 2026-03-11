'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  CheckCircle2,
  Circle,
  Calendar,
  Clock,
  AlertCircle,
} from 'lucide-react';

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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ClipboardList className="w-6 h-6" />
          Exit Checklist
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Tasks assigned to you as part of the exit process. Mark items as you complete them.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-4 animate-pulse">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && checklists.length === 0 && (
        <div className="text-center py-16 bg-card rounded-xl border border-border">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-1">No exit tasks assigned</h3>
          <p className="text-sm text-muted-foreground">
            You don&apos;t have any exit checklist items at the moment.
          </p>
        </div>
      )}

      {/* Content */}
      {!loading && !error && checklists.length > 0 && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Total Tasks</p>
              <p className="text-2xl font-bold text-foreground">{totalItems}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{completedItems}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Pending</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{pendingItems}</p>
            </div>
            <div className="bg-card border border-border rounded-xl p-4">
              <p className="text-xs text-muted-foreground font-medium uppercase mb-1">Overdue</p>
              <p className={`text-2xl font-bold ${overdueCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>{overdueCount}</p>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mb-6 bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-foreground">Overall Progress</span>
              <span className="text-sm font-bold text-foreground">{progressPct}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-2.5">
              <div
                className={`h-2.5 rounded-full transition-all duration-500 ${
                  progressPct === 100
                    ? 'bg-green-500'
                    : progressPct >= 50
                    ? 'bg-blue-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          {/* Checklist groups */}
          {checklists.map((cl) => {
            const items = [...cl.items, ...(cl.custom_items ?? [])];
            const clCompleted = items.filter((i) => i.completed).length;
            const statusInfo = STATUS_MAP[cl.status] ?? STATUS_MAP.not_started;

            return (
              <div key={cl.id} className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Badge variant={statusInfo.variant} size="sm">{statusInfo.label}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      Assigned {formatDate(cl.created_at)}
                    </span>
                    {cl.completed_at && (
                      <span className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Completed {formatDate(cl.completed_at)}
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground">{clCompleted}/{items.length} done</span>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => {
                    const isOverdue = !item.completed && item.due_date && new Date(item.due_date) < now;
                    const catColor = CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS['Other'];

                    return (
                      <div
                        key={`${cl.id}-${idx}`}
                        className={`bg-card border rounded-lg p-3 flex items-start gap-3 transition-colors ${
                          item.completed
                            ? 'border-green-200 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10'
                            : isOverdue
                            ? 'border-red-200 dark:border-red-800/30'
                            : 'border-border'
                        }`}
                      >
                        <button
                          onClick={() => {
                            // Toggle the entire checklist completion status
                            // For individual items, we'd need a different approach
                            // but the API works at checklist level
                            if (cl.status !== 'completed') {
                              toggleChecklist(cl.id, true);
                            } else {
                              toggleChecklist(cl.id, false);
                            }
                          }}
                          disabled={toggling === cl.id}
                          className="mt-0.5 shrink-0"
                        >
                          {item.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-green-500" />
                          ) : (
                            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${
                            item.completed ? 'text-muted-foreground line-through' : 'text-foreground'
                          }`}>
                            {item.task}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${catColor}`}>
                              {item.category}
                            </span>
                            {item.due_date && (
                              <span className={`text-xs flex items-center gap-1 ${
                                isOverdue ? 'text-red-600 dark:text-red-400 font-medium' : 'text-muted-foreground'
                              }`}>
                                <Clock className="w-3 h-3" />
                                {isOverdue ? 'Overdue: ' : 'Due: '}{formatDate(item.due_date)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
