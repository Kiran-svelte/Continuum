'use client';

/**
 * Compensation Planning Dashboard — HR Portal
 *
 * Features:
 * - Active compensation cycles list
 * - Budget utilization
 * - Pending recommendation approvals
 * - Create new cycle
 *
 * @module app/hr/(main)/compensation/page
 */

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import { DollarSign, ChevronRight, Plus, TrendingUp, Users, Clock } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompensationCycle {
  id: string;
  name: string;
  status: string;
  effective_date: string;
  budget_total: number | null;
  currency: string;
  _count: { recommendations: number };
  Creator: { first_name: string; last_name: string };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompensationView() {
  const [cycles, setCycles] = useState<CompensationCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const res = await fetch('/api/compensation/cycles', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setCycles(data.cycles ?? []);
    } catch {
      toast.error('Failed to load compensation data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const statusVariant = (status: string): 'default' | 'success' | 'info' | 'outline' => {
    if (status === 'active') return 'success';
    if (status === 'finalized') return 'info';
    if (status === 'planning') return 'outline';
    return 'outline';
  };

  const activeCycles = cycles.filter((c) => c.status === 'active');
  const totalBudget = cycles.reduce((s, c) => s + (c.budget_total ?? 0), 0);
  const totalRecs = cycles.reduce((s, c) => s + c._count.recommendations, 0);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Compensation Planning"
        description="Salary review cycles, recommendations, and budget management"
        icon={<DollarSign className="w-6 h-6" />}
        action={
          <Button size="sm" onClick={() => setShowCreateForm((v) => !v)}>
            <Plus className="w-4 h-4 mr-2" /> New Cycle
          </Button>
        }
      />

      {/* Create Form */}
      {showCreateForm && (
        <CreateCycleForm
          onSuccess={() => { setShowCreateForm(false); void fetchData(); }}
          onCancel={() => setShowCreateForm(false)}
        />
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard icon={<TrendingUp className="w-5 h-5" />} label="Active Cycles" value={isLoading ? '...' : String(activeCycles.length)} subtext="in progress" />
        <KpiCard icon={<Clock className="w-5 h-5" />} label="Total Cycles" value={isLoading ? '...' : String(cycles.length)} subtext="all time" />
        <KpiCard icon={<Users className="w-5 h-5" />} label="Recommendations" value={isLoading ? '...' : String(totalRecs)} subtext="across all cycles" />
        <KpiCard icon={<DollarSign className="w-5 h-5" />} label="Total Budget" value={isLoading ? '...' : `₹${(totalBudget / 100000).toFixed(1)}L`} subtext="allocated" />
      </section>

      {/* Cycles Table */}
      <section className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-[var(--border)]">
          <h3 className="text-h4 font-semibold">Compensation Cycles</h3>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
        ) : cycles.length === 0 ? (
          <div className="p-8 text-center">
            <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No compensation cycles yet</p>
            <p className="text-xs mt-1 text-[var(--muted-foreground)]">Create your first cycle to plan salary revisions</p>
            <Button className="mt-4" size="sm" onClick={() => setShowCreateForm(true)}>Create Cycle</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                  {['Cycle', 'Effective Date', 'Budget', 'Recommendations', 'Created By', 'Status', ''].map((h) => (
                    <th key={h} className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-[var(--border)]">
                {cycles.map((cycle) => (
                  <tr key={cycle.id} className="hover:bg-[var(--accent)] transition-colors">
                    <td className="py-3 px-4 font-medium">{cycle.name}</td>
                    <td className="py-3 px-4 text-xs">{new Date(cycle.effective_date).toLocaleDateString('en-IN')}</td>
                    <td className="py-3 px-4 text-xs">
                      {cycle.budget_total ? `${cycle.currency} ${cycle.budget_total.toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs font-semibold">{cycle._count.recommendations}</td>
                    <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">
                      {cycle.Creator.first_name} {cycle.Creator.last_name}
                    </td>
                    <td className="py-3 px-4"><Badge variant={statusVariant(cycle.status)}>{cycle.status}</Badge></td>
                    <td className="py-3 px-4">
                      <Link href={`/hr/compensation/${cycle.id}`}
                        className="text-xs text-[var(--info)] hover:underline flex items-center gap-1">
                        View <ChevronRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

// ─── Create Cycle Form ────────────────────────────────────────────────────────

function CreateCycleForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const [form, setForm] = useState({ name: '', effectiveDate: '', budgetTotal: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/compensation/cycles', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          effectiveDate: form.effectiveDate,
          budgetTotal: form.budgetTotal ? Number(form.budgetTotal) : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message ?? 'Failed to create cycle');
      }
      toast.success('Compensation cycle created!');
      onSuccess();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create cycle');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card p-6">
      <h3 className="text-h4 font-semibold mb-4">Create Compensation Cycle</h3>
      <form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label htmlFor="cycle-name" className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Cycle Name *</label>
          <input id="cycle-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            required placeholder="Annual Review 2025" />
        </div>
        <div>
          <label htmlFor="cycle-date" className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Effective Date *</label>
          <input id="cycle-date" type="date" value={form.effectiveDate} onChange={(e) => setForm({ ...form, effectiveDate: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            required />
        </div>
        <div>
          <label htmlFor="cycle-budget" className="text-xs font-semibold text-[var(--muted-foreground)] mb-1 block">Total Budget (₹)</label>
          <input id="cycle-budget" type="number" min="0" value={form.budgetTotal} onChange={(e) => setForm({ ...form, budgetTotal: e.target.value })}
            className="w-full rounded-md border px-3 py-2 text-sm" style={{ background: 'var(--input)', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            placeholder="Optional" />
        </div>
        <div className="sm:col-span-3 flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting}>{isSubmitting ? 'Creating...' : 'Create Cycle'}</Button>
        </div>
      </form>
    </div>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps { icon: React.ReactNode; label: string; value: string; subtext: string }

function KpiCard({ icon, label, value, subtext }: KpiCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="bg-[var(--muted)] w-10 h-10 rounded-md flex items-center justify-center">{icon}</div>
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</span>
      <span className="text-display text-2xl leading-none">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{subtext}</span>
    </div>
  );
}
