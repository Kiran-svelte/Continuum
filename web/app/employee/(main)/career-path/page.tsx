'use client';

/**
 * Employee Career Path Page — RALPH-20260630-010
 *
 * Employee view of their assigned career path and milestone progress.
 *
 * @module app/employee/(main)/career-path/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp, CheckCircle2, Circle } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface Milestone { title: string; completed: boolean; target_date?: string }
interface CareerPath {
  id: string;
  title: string;
  current_role: string;
  target_role: string;
  milestones: Milestone[];
  target_date: string | null;
}

export default function EmployeeCareerPathPage() {
  const [paths, setPaths] = useState<CareerPath[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      const r = await fetch('/api/career-paths', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setPaths(d.careerPaths ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-4xl mx-auto w-full">
      <PageHeader
        title="My Career Path"
        description="Track your growth milestones"
        icon={<TrendingUp className="w-6 h-6" />}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : paths.length === 0 ? (
        <div className="card p-12 text-center">
          <TrendingUp className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No career path assigned yet. Talk to your manager to get started.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {paths.map((path) => {
            const done = path.milestones.filter((m) => m.completed).length;
            const pct = path.milestones.length ? Math.round((done / path.milestones.length) * 100) : 0;
            return (
              <div key={path.id} className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold">{path.title}</h3>
                    <p className="text-sm text-muted-foreground">{path.current_role} → {path.target_role}</p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline">{pct}% complete</Badge>
                    {path.target_date && <p className="text-xs text-muted-foreground mt-1">Target: {new Date(path.target_date).toLocaleDateString()}</p>}
                  </div>
                </div>
                <div className="w-full h-2 bg-[var(--muted)] rounded-full mb-4">
                  <div className="h-2 bg-primary rounded-full transition-all" style={{ width: `${pct}%` }} />
                </div>
                <div className="space-y-2">
                  {path.milestones.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm">
                      {m.completed
                        ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                        : <Circle className="w-4 h-4 text-muted-foreground shrink-0" />}
                      <span className={m.completed ? 'line-through text-muted-foreground' : ''}>{m.title}</span>
                      {m.target_date && !m.completed && (
                        <span className="ml-auto text-xs text-muted-foreground">{new Date(m.target_date).toLocaleDateString()}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
