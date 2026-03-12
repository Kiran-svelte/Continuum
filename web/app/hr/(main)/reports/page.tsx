'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
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

export default function ReportsPage() {
  const [data, setData] = useState<LeaveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/reports/leave-summary?year=${year}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.error ?? 'Failed to load report');
          return;
        }
        setData(json);
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
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="rounded-lg border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
            >
              {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <button
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
              className="inline-flex items-center gap-2 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
            <button
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
              className="inline-flex items-center gap-2 border border-white/10 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <FileText className="w-4 h-4" />
              Export PDF
            </button>
          </div>
        }
      />

      {loading && <FadeIn><div className="py-12 text-center text-sm text-white/60">Loading report...</div></FadeIn>}
      {error && !loading && (
        <FadeIn>
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
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
                  <p className="text-xs text-white/60">Total Requests</p>
                  <p className="text-3xl font-bold text-white mt-1">{totalRequests}</p>
                  <p className="text-xs text-white/60 mt-1">this year</p>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <p className="text-xs text-white/60">Active Employees</p>
                  <p className="text-3xl font-bold text-white mt-1">{data.total_employees}</p>
                  <p className="text-xs text-white/60 mt-1">in company</p>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <p className="text-xs text-white/60">Approval Rate</p>
                  <p className="text-3xl font-bold text-emerald-400 mt-1">
                    {totalRequests > 0
                      ? `${Math.round(((data.by_status.find((s) => s.status === 'approved')?.count ?? 0) / totalRequests) * 100)}%`
                      : '—'}
                  </p>
                  <p className="text-xs text-white/60 mt-1">approved / total</p>
                </GlassPanel>
              </TiltCard>
              <TiltCard>
                <GlassPanel className="p-5">
                  <p className="text-xs text-white/60">SLA Breaches</p>
                  <p className={`text-3xl font-bold mt-1 ${data.sla_breaches > 0 ? 'text-red-600 dark:text-red-400' : 'text-white'}`}>
                    {data.sla_breaches}
                  </p>
                  <p className="text-xs text-white/60 mt-1">this year</p>
                </GlassPanel>
              </TiltCard>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests by Status */}
            <FadeIn>
              <GlassPanel>
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Requests by Status</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {data.by_status.map((s) => (
                      <div key={s.status} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant={STATUS_BADGE[s.status] ?? 'default'}>{s.status}</Badge>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-white/10 rounded-full h-2">
                            <div
                              className="bg-primary h-2 rounded-full"
                              style={{ width: `${totalRequests > 0 ? (s.count / totalRequests) * 100 : 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-white w-8 text-right">
                            {s.count}
                          </span>
                        </div>
                      </div>
                    ))}
                    {data.by_status.length === 0 && (
                      <p className="text-sm text-white/60 text-center py-4">No data yet.</p>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </FadeIn>

            {/* Requests by Leave Type */}
            <FadeIn>
              <GlassPanel>
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Leave Types Used</h2>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    {data.by_leave_type.slice(0, 8).map((lt) => (
                      <div key={lt.leave_type} className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{lt.leave_type}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-white/60">{lt.total_days} days</span>
                          <span className="text-sm font-semibold text-white">{lt.count} requests</span>
                        </div>
                      </div>
                    ))}
                    {data.by_leave_type.length === 0 && (
                      <p className="text-sm text-white/60 text-center py-4">No data yet.</p>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </FadeIn>

            {/* Monthly Trend (bar chart simulation) */}
            <FadeIn>
              <GlassPanel className="lg:col-span-2">
                <div className="p-4 border-b border-white/10">
                  <h2 className="text-lg font-semibold text-white">Monthly Leave Trend ({year})</h2>
                </div>
                <div className="p-4">
                  <div className="flex items-end gap-2 h-40">
                    {data.monthly.map((m) => (
                      <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                        <span className="text-xs text-white/60">{m.days || ''}</span>
                        <div
                          className="w-full bg-primary rounded-t-sm transition-all"
                          style={{
                            height: `${m.days > 0 ? Math.max(4, (m.days / maxMonthlyDays) * 100) : 2}px`,
                            opacity: m.days > 0 ? 1 : 0.2,
                          }}
                          title={`${MONTHS[m.month - 1]}: ${m.days} days, ${m.requests} requests`}
                        />
                        <span className="text-xs text-white/60">{MONTHS[m.month - 1]}</span>
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
                  <div className="p-4 border-b border-white/10">
                    <h2 className="text-lg font-semibold text-white">Top Leave Takers</h2>
                  </div>
                  <div className="p-4">
                    <div className="space-y-3">
                      {data.top_takers.map((t, i) => (
                        <div key={t.emp_id} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-bold text-white/60 w-5">#{i + 1}</span>
                            <div>
                              <p className="text-sm font-medium text-white">{t.name}</p>
                              <p className="text-xs text-white/60">{t.department ?? '—'}</p>
                            </div>
                          </div>
                          <span className="text-sm font-semibold text-white">{t.days_used} days</span>
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
