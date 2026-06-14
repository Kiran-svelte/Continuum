'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Download, FileText } from 'lucide-react';
import { downloadCSVLegacy, downloadPDF } from '@/lib/report-export';
import { StaggerContainer, FadeIn, TiltCard } from '@/components/motion';
import { PageHeader } from '@/components/page-header';
import { GlassPanel } from '@/components/glass-panel';

interface LeaveSummary {
  year: number;
  total_employees: number;
  sla_breaches: number;
  by_status: { status: string; count: number }[];
  by_leave_type: { leave_type: string; count: number; total_days: number }[];
  monthly: { month: number; requests: number; days: number }[];
  top_takers: { emp_id: string; name: string; department: string | null; days_used: number }[];
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'default',
  escalated: 'warning',
};

/**
 * Maps the nested enterprise API response from /api/reports/leave-summary
 * into the flat LeaveSummary shape consumed by the component.
 *
 * The API returns: { summary: { overall, by_status, by_leave_type, monthly, top_leave_takers } }
 * This component expects: { total_employees, sla_breaches, by_status, by_leave_type, monthly, top_takers }
 *
 * @param apiResponse - Raw JSON from the reports API
 * @param year - Current report year
 * @returns LeaveSummary in the expected flat shape
 */
function mapApiResponseToLeaveSummary(apiResponse: Record<string, unknown>, year: number): LeaveSummary {
  const summary = (apiResponse.summary ?? apiResponse) as Record<string, unknown>;
  const overall = (summary.overall ?? {}) as Record<string, unknown>;

  const rawByStatus = (summary.by_status ?? apiResponse.by_status ?? []) as Array<Record<string, unknown>>;
  const byStatus = rawByStatus.map((s) => {
    const countObj = s._count as Record<string, number> | undefined;
    return {
      status: String(s.status ?? ''),
      count: Number(s.count ?? countObj?.id ?? 0),
    };
  });

  const rawByLeaveType = summary.by_leave_type ?? apiResponse.by_leave_type;
  let byLeaveType: LeaveSummary['by_leave_type'] = [];
  if (Array.isArray(rawByLeaveType)) {
    byLeaveType = rawByLeaveType.map((lt: Record<string, unknown>) => {
      const countObj = lt._count as Record<string, number> | undefined;
      const sumObj = lt._sum as Record<string, number> | undefined;
      return {
        leave_type: String(lt.leave_type ?? ''),
        count: Number(lt.count ?? lt.total_requests ?? countObj?.id ?? 0),
        total_days: Number(lt.total_days ?? sumObj?.total_days ?? 0),
      };
    });
  } else if (rawByLeaveType && typeof rawByLeaveType === 'object') {
    byLeaveType = Object.entries(rawByLeaveType as Record<string, Record<string, unknown>>).map(
      ([leaveType, stats]) => ({
        leave_type: leaveType,
        count: Number(stats.total_requests ?? 0),
        total_days: Number(stats.total_days ?? 0),
      })
    );
  }

  const rawMonthly = (summary.monthly ?? apiResponse.monthly ?? []) as Array<Record<string, unknown>>;
  const monthly = rawMonthly.map((m) => ({
    month: Number(m.month ?? 0),
    requests: Number(m.requests ?? 0),
    days: Number(m.days ?? 0),
  }));

  const rawTopTakers = (summary.top_leave_takers ?? summary.top_takers ?? apiResponse.top_takers ?? []) as Array<Record<string, unknown>>;
  const topTakers = rawTopTakers.map((t) => ({
    emp_id: String(t.emp_id ?? t.employee_id ?? ''),
    name: String(t.name ?? ''),
    department: (t.department as string) ?? null,
    days_used: Number(t.days_used ?? 0),
  }));

  return {
    year,
    total_employees: Number(overall.total_employees ?? apiResponse.total_employees ?? 0),
    sla_breaches: Number(overall.sla_breaches ?? apiResponse.sla_breaches ?? 0),
    by_status: byStatus,
    by_leave_type: byLeaveType,
    monthly,
    top_takers: topTakers,
  };
}

export default function ReportsView() {
  const [data, setData] = useState<LeaveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/reports/leave-summary?year=${year}`, { credentials: 'include' });
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to load report');
          return;
        }
        setData(mapApiResponseToLeaveSummary(json, year));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [year]);

  const totalRequests = data?.by_status.reduce((acc, s) => acc + s.count, 0) ?? 0;

  // Find max monthly value for bar chart scaling
  const maxMonthlyDays = Math.max(1, ...((data?.monthly ?? []).map((m) => m.days)));

  return (
    <StaggerContainer className="space-y-6">
      <PageHeader
        title="Leave Reports"
        description={"Analytics and insights for " + year}
        icon={<FileText className="w-6 h-6 text-primary" />}
        action={
          <div className="flex items-center gap-3">
            <Select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </Select>
            <Button
              onClick={() => {
                if (!data) return;
                const sections: { headers: string[]; rows: (string | number)[][] }[] = [];

                // Status breakdown
                sections.push({
                  headers: ['Status', 'Count'],
                  rows: data.by_status.map((s) => [s.status, s.count]),
                });

                // Leave type breakdown
                sections.push({
                  headers: ['Leave Type', 'Count', 'Total Days'],
                  rows: data.by_leave_type.map((lt) => [lt.leave_type, lt.count, lt.total_days]),
                });

                // Monthly trend
                sections.push({
                  headers: ['Month', 'Requests', 'Days'],
                  rows: data.monthly.map((m) => [MONTHS[m.month - 1], m.requests, m.days]),
                });

                // Top takers
                sections.push({
                  headers: ['Employee ID', 'Name', 'Department', 'Days Used'],
                  rows: data.top_takers.map((t) => [t.emp_id, t.name, t.department ?? '', t.days_used]),
                });

                // Flatten all sections into a single CSV with section headers
                const allHeaders = ['Status', 'Count'];
                const allRows: (string | number)[][] = [];
                for (const s of sections) {
                  allRows.push(s.headers as (string | number)[]);
                  allRows.push(...s.rows);
                  allRows.push([]);
                }
                downloadCSVLegacy(allHeaders, allRows, `leave-report-${year}.csv`);
              }}
              disabled={!data}
              className="inline-flex items-center gap-2 border border-[var(--border)] text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                if (!data) return;
                downloadPDF(
                  `Leave Report — ${year}`,
                  [
                    {
                      title: 'Status Breakdown',
                      columns: ['Status', 'Count'],
                      rows: data.by_status.map((s) => [s.status, s.count]),
                    },
                    {
                      title: 'Leave Types Used',
                      columns: ['Leave Type', 'Count', 'Total Days'],
                      rows: data.by_leave_type.map((lt) => [lt.leave_type, lt.count, lt.total_days]),
                    },
                    {
                      title: 'Monthly Trend',
                      columns: ['Month', 'Requests', 'Days'],
                      rows: data.monthly.map((m) => [MONTHS[m.month - 1], m.requests, m.days]),
                    },
                    {
                      title: 'Top Leave Takers',
                      columns: ['Employee ID', 'Name', 'Department', 'Days Used'],
                      rows: data.top_takers.map((t) => [t.emp_id, t.name, t.department ?? '', t.days_used]),
                    },
                  ],
                  `leave-report-${year}`,
                  [`Year: ${year}`, `Total Employees: ${data.total_employees}`, `Total Requests: ${totalRequests}`],
                );
              }}
              disabled={!data}
              className="inline-flex items-center gap-2 border border-[var(--border)] text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-[var(--bg-surface-hover)] transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </Button>
          </div>
        }
      />

      {loading && (
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card p-5 space-y-3 animate-pulse">
                <div className="h-3 w-24 rounded bg-[var(--muted)]" />
                <div className="h-8 w-16 rounded bg-[var(--muted)]" />
                <div className="h-3 w-20 rounded bg-[var(--muted)]" />
              </div>
            ))}
          </div>
          <div className="card p-5 animate-pulse space-y-3">
            <div className="h-4 w-40 rounded bg-[var(--muted)]" />
            <div className="flex items-end gap-2 h-32">
              {[60, 80, 40, 90, 70, 50, 85, 45, 65, 75, 55, 30].map((h, i) => (
                <div key={i} className="flex-1 bg-[var(--muted)] rounded-t" style={{ height: `${h}%` }} />
              ))}
            </div>
          </div>
        </FadeIn>
      )}
      {error && !loading && (
        <FadeIn>
          <div className="rounded-lg bg-[var(--danger-bg)] border border-[var(--danger-border)] px-4 py-3 text-sm text-[var(--danger)]">
            {error}
          </div>
        </FadeIn>
      )}

      {!loading && data && (
        <>
          {/* Summary Cards */}
          <FadeIn>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <TiltCard>
                <GlassPanel className="p-5">
                  <p className="text-xs text-muted-foreground">Total Requests</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{totalRequests}</p>
                  <p className="text-xs text-muted-foreground mt-1">this year</p>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <p className="text-xs text-muted-foreground">Active Employees</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{data.total_employees}</p>
                  <p className="text-xs text-muted-foreground mt-1">in company</p>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <p className="text-xs text-muted-foreground">Approval Rate</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">
                    {totalRequests > 0
                      ? `${Math.round(((data.by_status.find((s) => s.status === 'approved')?.count ?? 0) / totalRequests) * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">approved / total</p>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <p className="text-xs text-muted-foreground">SLA Breaches</p>
                  <p className={`text-3xl font-bold mt-1 ${data.sla_breaches > 0 ? 'text-red-600' : 'text-foreground'}`}>
                    {data.sla_breaches}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">this year</p>
                </GlassPanel>
              </TiltCard>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests by Status */}
            <FadeIn>
              <GlassPanel>
                <div className="p-4 border-b border-[var(--border)]">
                  <h2 className="text-lg font-semibold text-foreground">Requests by Status</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {data.by_status.map((s) => (
                      <div key={s.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_BADGE[s.status] ?? 'default'}>{s.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-[var(--accent)] rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${totalRequests > 0 ? (s.count / totalRequests) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-foreground w-8 text-right">
                            {s.count}
                          </span>
                        </div>
                      </div>
                    ))}
                    {data.by_status.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </FadeIn>

            {/* Requests by Leave Type */}
            <FadeIn>
              <GlassPanel>
                <div className="p-4 border-b border-[var(--border)]">
                  <h2 className="text-lg font-semibold text-foreground">Leave Types Used</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {data.by_leave_type.slice(0, 8).map((lt) => (
                      <div key={lt.leave_type} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-foreground">{lt.leave_type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground">{lt.total_days} days</span>
                          <span className="text-sm font-semibold text-foreground">{lt.count} requests</span>
                        </div>
                      </div>
                    ))}
                    {data.by_leave_type.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">No data yet.</p>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </FadeIn>

            {/* Monthly Trend (bar chart simulation) */}
            <FadeIn>
              <GlassPanel className="lg:col-span-2">
                <div className="p-4 border-b border-[var(--border)]">
                  <h2 className="text-lg font-semibold text-foreground">Monthly Leave Trend ({year})</h2>
                </div>
                <div className="p-4">
                  <div className="flex items-end gap-2 h-40">
                    {data.monthly.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-muted-foreground">{m.days || ''}</span>
                        <div
                          className="w-full bg-primary rounded-t-sm transition-all"
                          style={{
                            height: `${m.days > 0 ? Math.max(4, (m.days / maxMonthlyDays) * 100) : 2}px`,
                            opacity: m.days > 0 ? 1 : 0.2,
                          }}
                          title={`${MONTHS[m.month - 1]}: ${m.days} days, ${m.requests} requests`}
                        />
                        <span className="text-xs text-muted-foreground">{MONTHS[m.month - 1]}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </GlassPanel>
            </FadeIn>

            {/* Top Leave Takers */}
            {data.top_takers.length > 0 && (
              <FadeIn>
                <GlassPanel>
                  <div className="p-4 border-b border-[var(--border)]">
                    <h2 className="text-lg font-semibold text-foreground">Top Leave Takers</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {data.top_takers.map((t, i) => (
                        <div key={t.emp_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-muted-foreground w-5">#{i + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-foreground">{t.name}</p>
                              <p className="text-xs text-muted-foreground">{t.department ?? '—'}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-foreground">{t.days_used} days</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </GlassPanel>
              </FadeIn>
            )}
          </div>
        </>
      )}
    </StaggerContainer>
  );
}


