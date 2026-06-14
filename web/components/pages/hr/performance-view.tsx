'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ensureMe } from '@/lib/client-auth';
import {
  Target, TrendingUp, Users, CheckCircle, Clock,
  BarChart3, ChevronRight, AlertTriangle, Brain,
} from 'lucide-react';

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface ReviewCycle {
  id: string;
  name: string;
  cycle_type: string;
  status: string;
  start_date: string;
  end_date: string;
  rating_scale: number;
  _count: { instances: number };
}

interface GoalStats {
  total: number;
  completed: number;
  inProgress: number;
  notStarted: number;
}

interface AttritionRisk {
  employeeId: string;
  employeeName: string;
  department: string | null;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
}

interface CoachingInsight {
  id: string;
  priority: string;
  title: string;
  description: string;
  actionUrl?: string;
  actionLabel?: string;
}

/* ─── Status Badge Helpers ──────────────────────────────────────────────── */

/** Maps review cycle status to a valid Badge variant. */
function cycleStatusVariant(status: string): 'default' | 'success' | 'warning' | 'danger' | 'outline' {
  switch (status) {
    case 'active':
    case 'self_review':
    case 'manager_review':
      return 'success';
    case 'completed':
      return 'default';
    case 'draft':
      return 'outline';
    case 'cancelled':
      return 'danger';
    default:
      return 'outline';
  }
}

/** Formats a status enum value for display. */
function formatStatus(status: string): string {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ─── Page ──────────────────────────────────────────────────────────────── */

export default function PerformanceView() {
  const [cycles, setCycles] = useState<ReviewCycle[]>([]);
  const [goalStats, setGoalStats] = useState<GoalStats>({ total: 0, completed: 0, inProgress: 0, notStarted: 0 });
  const [attritionRisks, setAttritionRisks] = useState<AttritionRisk[]>([]);
  const [coachingInsights, setCoachingInsights] = useState<CoachingInsight[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await ensureMe();
      const [cyclesRes, goalsRes, attritionRes, coachingRes] = await Promise.allSettled([
        fetch('/api/review-cycles', { credentials: 'include' }),
        fetch('/api/goals', { credentials: 'include' }),
        fetch('/api/ai/attrition', { credentials: 'include' }),
        fetch('/api/ai/coaching', { credentials: 'include' }),
      ]);

      if (cyclesRes.status === 'fulfilled' && cyclesRes.value.ok) {
        const data = await cyclesRes.value.json();
        setCycles(data.cycles || []);
      }

      if (goalsRes.status === 'fulfilled' && goalsRes.value.ok) {
        const data = await goalsRes.value.json();
        const goals = data.goals || [];
        setGoalStats({
          total: goals.length,
          completed: goals.filter((g: { status: string }) => g.status === 'completed').length,
          inProgress: goals.filter((g: { status: string }) => g.status === 'in_progress').length,
          notStarted: goals.filter((g: { status: string }) => g.status === 'not_started').length,
        });
      }

      if (attritionRes.status === 'fulfilled' && attritionRes.value.ok) {
        const data = await attritionRes.value.json();
        setAttritionRisks((data.results ?? []).filter((r: AttritionRisk) => r.riskLevel !== 'low').slice(0, 5));
      }

      if (coachingRes.status === 'fulfilled' && coachingRes.value.ok) {
        const data = await coachingRes.value.json();
        setCoachingInsights(data.result?.insights ?? []);
      }
    } catch {
      toast.error('Failed to load performance data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const activeCycles = cycles.filter((c) => c.status !== 'draft' && c.status !== 'cancelled');
  const completionRate = goalStats.total > 0
    ? Math.round((goalStats.completed / goalStats.total) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      <PageHeader
        title="Performance Management"
        description="Review cycles, goal tracking, and team performance overview"
        icon={<Target className="w-6 h-6" />}
      />

      {/* KPI Cards */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          icon={<BarChart3 className="w-5 h-5" />}
          label="Active Cycles"
          value={isLoading ? '...' : String(activeCycles.length)}
          subtext="review cycles running"
        />
        <KpiCard
          icon={<Target className="w-5 h-5" />}
          label="Total Goals"
          value={isLoading ? '...' : String(goalStats.total)}
          subtext="across all employees"
        />
        <KpiCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Goal Completion"
          value={isLoading ? '...' : `${completionRate}%`}
          subtext={`${goalStats.completed} of ${goalStats.total} completed`}
        />
        <KpiCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="In Progress"
          value={isLoading ? '...' : String(goalStats.inProgress)}
          subtext="goals being worked on"
        />
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Review Cycles */}
        <section className="card p-0 col-span-1 lg:col-span-2 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-h4 font-semibold">Review Cycles</h3>
            <Link href="/hr/reviews" className="text-xs font-semibold text-[var(--info)] hover:underline flex items-center">
              Manage Cycles <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-4 space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : cycles.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              <Target className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">No review cycles yet</p>
              <p className="text-xs mt-1">Create your first review cycle to start performance tracking</p>
              <Link href="/hr/reviews">
                <Button className="mt-4" size="sm">Create Review Cycle</Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--muted)] border-b border-[var(--border)]">
                    <th className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Cycle</th>
                    <th className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Type</th>
                    <th className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase hidden sm:table-cell">Period</th>
                    <th className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Status</th>
                    <th className="py-2 px-4 text-[11px] font-semibold text-[var(--muted-foreground)] uppercase">Reviews</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {cycles.map((cycle) => (
                    <tr key={cycle.id} className="border-b border-[var(--border)] hover:bg-[var(--accent)] transition-colors">
                      <td className="py-3 px-4 font-medium">{cycle.name}</td>
                      <td className="py-3 px-4 text-xs text-[var(--muted-foreground)]">{formatStatus(cycle.cycle_type)}</td>
                      <td className="py-3 px-4 text-xs hidden sm:table-cell">
                        {new Date(cycle.start_date).toLocaleDateString('en-IN')} – {new Date(cycle.end_date).toLocaleDateString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={cycleStatusVariant(cycle.status)}>{formatStatus(cycle.status)}</Badge>
                      </td>
                      <td className="py-3 px-4 text-xs">{cycle._count.instances}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Quick Actions & Goal Summary */}
        <section className="col-span-1 flex flex-col gap-6">
          <GlassPanel className="p-5">
            <h3 className="text-h4 font-semibold mb-4 flex items-center gap-2">
              <Users className="w-4 h-4" /> Quick Actions
            </h3>
            <div className="space-y-2">
              <Link href="/hr/reviews" className="btn btn-outline btn-sm w-full text-left flex items-center gap-2">
                <Clock className="w-4 h-4" /> New Review Cycle
              </Link>
              <Link href="/hr/goals" className="btn btn-outline btn-sm w-full text-left flex items-center gap-2">
                <Target className="w-4 h-4" /> Manage Goals
              </Link>
              <Link href="/hr/recruitment" className="btn btn-outline btn-sm w-full text-left flex items-center gap-2">
                <Users className="w-4 h-4" /> Open Positions
              </Link>
              <Link href="/hr/learning" className="btn btn-outline btn-sm w-full text-left flex items-center gap-2">
                <Brain className="w-4 h-4" /> Learning Management
              </Link>
              <Link href="/hr/compensation" className="btn btn-outline btn-sm w-full text-left flex items-center gap-2">
                <TrendingUp className="w-4 h-4" /> Compensation Planning
              </Link>
            </div>
          </GlassPanel>

          {goalStats.notStarted > 0 && (
            <div className="card p-0" style={{ borderColor: 'var(--warning-border)' }}>
              <div className="p-3 rounded-t-[var(--radius)]" style={{ backgroundColor: 'var(--warning-bg)', borderBottom: '1px solid var(--warning-border)' }}>
                <span className="text-xs font-bold uppercase" style={{ color: 'var(--warning)' }}>Attention</span>
              </div>
              <div className="p-4">
                <p className="text-sm font-medium mb-1 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" style={{ color: 'var(--warning)' }} />
                  Goals Not Started
                </p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  {goalStats.notStarted} goal(s) haven&apos;t been started yet. Follow up with employees.
                </p>
                <Link href="/hr/goals?status=not_started" className="btn btn-outline btn-sm w-full mt-3">
                  View Pending Goals
                </Link>
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Attrition Risk Panel */}
      {attritionRisks.length > 0 && (
        <section className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-400" /> AI Attrition Risk Alerts
            </h3>
            <Link href="/hr/analytics" className="text-xs font-semibold text-[var(--info)] hover:underline flex items-center">
              Full Report <ChevronRight className="w-3 h-3 ml-1" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
            {attritionRisks.map((risk) => (
              <div key={risk.employeeId} className="rounded-lg p-3 flex items-center justify-between"
                style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}>
                <div>
                  <p className="text-sm font-medium">{risk.employeeName}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{risk.department ?? 'N/A'}</p>
                </div>
                <Badge variant={risk.riskLevel === 'critical' || risk.riskLevel === 'high' ? 'danger' : 'default'}>
                  {risk.riskLevel}
                </Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* AI Coaching Insights */}
      {coachingInsights.length > 0 && (
        <section className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-[var(--border)]">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <Brain className="w-5 h-5" style={{ color: 'var(--info)' }} /> AI Coaching Insights
              <span className="text-xs px-2 py-0.5 rounded-full ml-1" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>Personalized</span>
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-4">
            {coachingInsights.slice(0, 4).map((insight) => (
              <div key={insight.id} className="rounded-lg p-4"
                style={{ background: insight.priority === 'critical' ? 'var(--danger-bg)' : insight.priority === 'warning' ? 'var(--warning-bg)' : 'var(--muted)', borderLeft: `4px solid ${insight.priority === 'critical' ? 'var(--danger)' : insight.priority === 'warning' ? 'var(--warning)' : insight.priority === 'positive' ? 'var(--success)' : 'var(--info)'}` }}>
                <p className="text-sm font-semibold">{insight.title}</p>
                <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>{insight.description}</p>
                {insight.actionUrl && (
                  <Link href={insight.actionUrl} className="text-xs mt-2 inline-flex items-center gap-1" style={{ color: 'var(--info)' }}>
                    {insight.actionLabel ?? 'View'} <ChevronRight className="w-3 h-3" />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

/* ─── KPI Card Component ────────────────────────────────────────────────── */

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
}

/**
 * Renders a single KPI metric card with icon, value, and description.
 */
function KpiCard({ icon, label, value, subtext }: KpiCardProps) {
  return (
    <div className="card p-4 flex flex-col gap-2">
      <div className="bg-[var(--muted)] w-10 h-10 rounded-md flex items-center justify-center">
        {icon}
      </div>
      <span className="text-xs font-semibold text-[var(--muted-foreground)]">{label}</span>
      <span className="text-display text-2xl leading-none">{value}</span>
      <span className="text-xs text-[var(--muted-foreground)]">{subtext}</span>
    </div>
  );
}
