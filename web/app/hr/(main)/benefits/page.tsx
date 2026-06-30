'use client';

/**
 * Benefits Administration HR Page — RALPH-20260630-012
 *
 * HR view: manage benefit plans and enrollment status.
 *
 * @module app/hr/(main)/benefits/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, Users, Plus } from 'lucide-react';
import { ensureMe } from '@/lib/client-auth';

interface BenefitPlan {
  id: string;
  name: string;
  type: string;
  provider: string | null;
  is_active: boolean;
  _count: { enrollments: number };
}

const typeIcon: Record<string, string> = {
  health: '🏥', dental: '🦷', vision: '👁️', life: '❤️', retirement: '🏦', other: '📋',
};

export default function HRBenefitsPage() {
  const [plans, setPlans] = useState<BenefitPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    (async () => {
      const me = await ensureMe();
      if (!me) return;
      setIsAdmin(me.permissions?.includes('employee.edit_any') ?? false);
      const r = await fetch('/api/benefits', { credentials: 'include' });
      const d = await r.json().catch(() => ({}));
      setPlans(d.plans ?? []);
      setLoading(false);
    })();
  }, []);

  const toggleActive = async (id: string, current: boolean) => {
    await fetch(`/api/benefits/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !current }),
    });
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, is_active: !current } : p)));
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Benefits Administration"
        description="Manage employee benefit plans"
        icon={<Shield className="w-6 h-6" />}
        action={isAdmin ? <Button size="sm" className="gap-2"><Plus className="w-4 h-4" />Add Plan</Button> : undefined}
      />

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : plans.length === 0 ? (
        <div className="card p-12 text-center">
          <Shield className="w-10 h-10 mx-auto mb-3 text-muted-foreground opacity-40" />
          <p className="text-muted-foreground">No benefit plans configured.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {plans.map((plan) => (
            <div key={plan.id} className="card p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{typeIcon[plan.type] ?? '📋'}</span>
                  <div>
                    <h3 className="font-semibold">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground capitalize">{plan.type}{plan.provider ? ` · ${plan.provider}` : ''}</p>
                  </div>
                </div>
                <Badge variant={plan.is_active ? 'success' : 'outline'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Users className="w-4 h-4" />
                  {plan._count.enrollments} enrolled
                </div>
                {isAdmin && (
                  <Button size="sm" variant="outline" onClick={() => toggleActive(plan.id, plan.is_active)}>
                    {plan.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
