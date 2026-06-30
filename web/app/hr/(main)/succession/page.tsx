'use client';

/**
 * Succession Planning HR Page — RALPH-20260630-013
 *
 * HR view: manage succession plans for critical roles.
 *
 * @module app/hr/(main)/succession/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { GitMerge, AlertTriangle, Users, Plus } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface Candidate { emp_id: string; readiness: string; notes?: string; employee?: { first_name: string; last_name: string; designation: string | null } }
interface SuccessionPlan {
  id: string;
  role_title: string;
  priority: number;
  status: string;
  candidates: Candidate[];
  notes: string | null;
}

const priorityLabel: Record<number, { label: string; color: string }> = {
  1: { label: 'Critical', color: 'destructive' },
  2: { label: 'High', color: 'warning' },
  3: { label: 'Medium', color: 'info' },
};

const readinessColor: Record<string, string> = {
  ready: 'success', '1_year': 'warning', '2_year': 'info', emerging: 'outline',
};

export default function HRSuccessionPage() {
  const [plans, setPlans] = useState<SuccessionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [canManage, setCanManage] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setCanManage(me.permissions?.includes('performance.manage_reviews') ?? false);
      const r = await fetch('/api/succession-plans', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setPlans(d.plans ?? []);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Succession Planning"
        description="Identify and develop future leaders for critical roles"
        icon={<GitMerge className="w-6 h-6" />}
        action={canManage ? <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />New Plan</Button> : undefined}
      />

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full" />)}</div>
      ) : plans.length === 0 ? (
        <div className="card p-12 text-center">
          <GitMerge className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No succession plans yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {plans.map((plan) => {
            const p = priorityLabel[plan.priority] ?? priorityLabel[3];
            return (
              <div key={plan.id} className="card p-5">
                <div className="flex items-center gap-3 mb-3">
                  {plan.priority === 1 && <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />}
                  <h3 className="font-semibold flex-1">{plan.role_title}</h3>
                  <Badge variant={p.color as 'outline'}>{p.label}</Badge>
                  <Badge variant="outline">{plan.candidates.length} candidates</Badge>
                </div>
                {plan.candidates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {plan.candidates.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5 text-sm bg-[var(--muted)] px-2 py-1 rounded-md">
                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{c.employee ? `${c.employee.first_name} ${c.employee.last_name}` : c.emp_id}</span>
                        <Badge variant={(readinessColor[c.readiness] ?? 'outline') as 'outline'} className="text-xs">{c.readiness}</Badge>
                      </div>
                    ))}
                  </div>
                )}
                {plan.notes && <p className="text-sm text-muted-foreground mt-3">{plan.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
