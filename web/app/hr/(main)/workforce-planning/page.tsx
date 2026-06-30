'use client';

/**
 * Workforce Planning HR Page — RALPH-20260630-027
 * Plan headcount needs, succession, and department targets.
 * @module app/hr/(main)/workforce-planning/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GitMerge, Plus } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface Plan {
  id: string;
  role: string;
  department: string | null;
  timeline: string | null;
  status: string;
  notes: string | null;
  employee: { first_name: string; last_name: string; designation: string | null } | null;
}

interface DeptCount { department: string; count: number }

const statusVariant = (s: string): 'success' | 'warning' | 'info' | 'outline' =>
  s === 'filled' ? 'success' : s === 'approved' ? 'info' : s === 'draft' ? 'outline' : 'warning';

export default function WorkforcePlanningPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [depts, setDepts] = useState<DeptCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [canEdit, setCanEdit] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (me) setCanEdit(me.permissions?.includes('employee.edit_any') ?? false);
      const r = await fetch('/api/workforce-planning', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setPlans(d.plans ?? []);
      setDepts(d.headcount_by_department ?? []);
      setLoading(false);
    })();
  }, []);

  const maxCount = Math.max(1, ...depts.map((d) => d.count));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Workforce Planning"
        description="Plan headcount, succession, and department targets"
        icon={<GitMerge className="w-6 h-6" />}
        action={canEdit ? <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Plan</Button> : undefined}
      />

      {loading ? (
        <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Plans list */}
          <div className="lg:col-span-2 card">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold">Open Workforce Plans</h3>
            </div>
            {plans.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                <GitMerge className="w-8 h-8 mx-auto mb-2 opacity-40" />
                No workforce plans created yet.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {plans.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{p.role}</p>
                      <Badge variant={statusVariant(p.status)}>{p.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {p.department ?? 'All Depts'}
                      {p.timeline ? ` · ${p.timeline}` : ''}
                      {p.employee ? ` · Successor: ${p.employee.first_name} ${p.employee.last_name}` : ''}
                    </p>
                    {p.notes && <p className="text-xs text-muted-foreground mt-1 italic">{p.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Headcount snapshot */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Headcount by Dept</h3>
            <div className="space-y-2">
              {depts.map((d) => (
                <div key={d.department} className="flex items-center gap-2">
                  <span className="text-xs truncate w-24 flex-shrink-0">{d.department}</span>
                  <div className="flex-1 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${(d.count / maxCount) * 100}%` }} />
                  </div>
                  <span className="text-xs font-semibold w-6 text-right">{d.count}</span>
                </div>
              ))}
              {depts.length === 0 && <p className="text-sm text-muted-foreground">No data.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
