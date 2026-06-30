'use client';

/**
 * Workforce Analytics Page — RALPH-20260630-010-WFA
 *
 * HR view: headcount trends, attrition, dept breakdown.
 *
 * @module app/hr/(main)/workforce-analytics/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, TrendingDown, TrendingUp, Users } from 'lucide-react';

interface Analytics {
  summary: {
    totalEmployees: number;
    recentJoins: number;
    recentExits: number;
    attritionRate: number;
    growthRate: number;
    periodMonths: number;
  };
  byDepartment: Array<{ department: string; count: number }>;
  byStatus: Array<{ status: string; count: number }>;
  leaveStats: Array<{ status: string; count: number; totalDays: number }>;
}

export default function WorkforceAnalyticsPage() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(3);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/analytics/workforce?months=${months}`, { credentials: 'include' })
      .then((r) => r.json().catch(() => null))
      .then((d) => { setData(d); })
      .finally(() => setLoading(false));
  }, [months]);

  const s = data?.summary;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-6xl mx-auto w-full">
      <PageHeader
        title="Workforce Analytics"
        description="Headcount, attrition, and department insights"
        icon={<BarChart3 className="w-6 h-6" />}
        action={
          <select
            className="text-sm border rounded-md px-2 py-1 bg-background"
            value={months}
            onChange={(e) => setMonths(Number(e.target.value))}
          >
            <option value={1}>Last 1 month</option>
            <option value={3}>Last 3 months</option>
            <option value={6}>Last 6 months</option>
            <option value={12}>Last 12 months</option>
          </select>
        }
      />

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : s ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MetricCard icon={<Users className="w-5 h-5" />} label="Total Employees" value={s.totalEmployees} />
            <MetricCard icon={<TrendingUp className="w-5 h-5 text-green-500" />} label="New Joins" value={s.recentJoins} sub={`+${s.growthRate}%`} />
            <MetricCard icon={<TrendingDown className="w-5 h-5 text-red-500" />} label="Exits" value={s.recentExits} sub={`${s.attritionRate}% attrition`} />
            <MetricCard icon={<BarChart3 className="w-5 h-5" />} label="Departments" value={data.byDepartment.length} />
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h3 className="font-semibold mb-4">By Department</h3>
              <div className="space-y-2">
                {data.byDepartment.slice(0, 8).map((d) => {
                  const pct = s.totalEmployees > 0 ? (d.count / s.totalEmployees) * 100 : 0;
                  return (
                    <div key={d.department} className="flex items-center gap-3">
                      <span className="text-sm w-32 truncate">{d.department}</span>
                      <div className="flex-1 h-2 bg-[var(--muted)] rounded-full">
                        <div className="h-2 bg-primary rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-sm text-muted-foreground w-8 text-right">{d.count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold mb-4">Employee Status</h3>
              <div className="space-y-2">
                {data.byStatus.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <Badge variant="outline" className="capitalize">{s.status}</Badge>
                    <span className="font-semibold">{s.count}</span>
                  </div>
                ))}
              </div>
              <h3 className="font-semibold mt-6 mb-4">Leave Summary</h3>
              <div className="space-y-2">
                {data.leaveStats.map((l) => (
                  <div key={l.status} className="flex items-center justify-between text-sm">
                    <Badge variant="outline" className="capitalize">{l.status}</Badge>
                    <span>{l.count} requests · {l.totalDays} days</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="card p-12 text-center"><p className="text-muted-foreground">No data available.</p></div>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-2">{icon}<span className="text-xs">{label}</span></div>
      <p className="text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
