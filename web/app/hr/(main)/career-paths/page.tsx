'use client';

/**
 * Career Paths Page — RALPH-20260630-010
 *
 * View and manage career development plans for employees.
 *
 * @module app/hr/(main)/career-paths/page
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import { TrendingUp, Plus, Target, Calendar, CheckCircle2 } from 'lucide-react';

interface CareerPath {
  id: string;
  title: string;
  current_role: string;
  target_role: string;
  target_date: string | null;
  status: string;
  milestones: Array<{ title: string; dueDate?: string; completed?: boolean }>;
  notes: string | null;
  created_at: string;
  Employee: { first_name: string; last_name: string; department: string | null };
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'outline' {
  if (status === 'achieved') return 'success';
  if (status === 'paused') return 'warning';
  return 'outline';
}

export default function CareerPathsPage() {
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await ensureMe();
      if (!me) return;
      const perms = (me.permissions ?? []) as string[];
      setCanManage(perms.includes('employee.edit_any'));

      const res = await fetch('/api/career-paths', { credentials: 'include' });
      const data = await res.json().catch(() => ({}));
      setPaths(data.careerPaths ?? []);
    } catch {
      toast.error('Failed to load career paths');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Career Paths"
        description="Track employee career development and growth goals"
        icon={<TrendingUp className="w-6 h-6" />}
        action={
          <Button size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            New Career Plan
          </Button>
        }
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : paths.length === 0 ? (
        <div className="card p-12 text-center">
          <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
          <p className="text-muted-foreground">No career paths defined yet.</p>
          <Button className="mt-4 gap-2" size="sm">
            <Plus className="w-4 h-4" />
            Create First Career Plan
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {paths.map((path) => {
            const milestones = Array.isArray(path.milestones) ? path.milestones : [];
            const completed = milestones.filter((m) => m.completed).length;
            const progress = milestones.length > 0 ? Math.round((completed / milestones.length) * 100) : 0;

            return (
              <div key={path.id} className="card p-5">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="font-semibold">{path.title}</p>
                    <p className="text-sm text-muted-foreground">
                      {path.Employee.first_name} {path.Employee.last_name}
                      {path.Employee.department && ` · ${path.Employee.department}`}
                    </p>
                  </div>
                  <Badge variant={statusVariant(path.status)}>{path.status}</Badge>
                </div>

                <div className="flex items-center gap-2 text-sm mb-3">
                  <span className="text-muted-foreground">{path.current_role}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="font-medium text-primary">{path.target_role}</span>
                </div>

                {milestones.length > 0 && (
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-muted-foreground mb-1">
                      <span>{completed}/{milestones.length} milestones</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {path.target_date && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Target: {new Date(path.target_date).toLocaleDateString()}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    {milestones.length} milestones
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
