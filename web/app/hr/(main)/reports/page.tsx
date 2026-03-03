'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Leave Reports</h1>
          <p className="text-gray-500 mt-1">Analytics and insights for {year}</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value, 10))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-blue-500"
          >
            {[new Date().getFullYear(), new Date().getFullYear() - 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button className="inline-flex items-center gap-2 border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">
            📥 Export CSV
          </button>
        </div>
      </div>

      {loading && <div className="py-12 text-center text-sm text-gray-400">Loading report…</div>}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Total Requests</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{totalRequests}</p>
                <p className="text-xs text-gray-400 mt-1">this year</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Active Employees</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{data.total_employees}</p>
                <p className="text-xs text-gray-400 mt-1">in company</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">Approval Rate</p>
                <p className="text-3xl font-bold text-green-600 mt-1">
                  {totalRequests > 0
                    ? `${Math.round(((data.by_status.find((s) => s.status === 'approved')?.count ?? 0) / totalRequests) * 100)}%`
                    : '—'}
                </p>
                <p className="text-xs text-gray-400 mt-1">approved / total</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <p className="text-xs text-gray-500">SLA Breaches</p>
                <p className={`text-3xl font-bold mt-1 ${data.sla_breaches > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                  {data.sla_breaches}
                </p>
                <p className="text-xs text-gray-400 mt-1">this year</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Requests by Status */}
            <Card>
              <CardHeader>
                <CardTitle>Requests by Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.by_status.map((s) => (
                    <div key={s.status} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={STATUS_BADGE[s.status] ?? 'default'}>{s.status}</Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-gray-100 rounded-full h-2">
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${totalRequests > 0 ? (s.count / totalRequests) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-900 w-8 text-right">
                          {s.count}
                        </span>
                      </div>
                    </div>
                  ))}
                  {data.by_status.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Requests by Leave Type */}
            <Card>
              <CardHeader>
                <CardTitle>Leave Types Used</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.by_leave_type.slice(0, 8).map((lt) => (
                    <div key={lt.leave_type} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{lt.leave_type}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{lt.total_days} days</span>
                        <span className="text-sm font-semibold text-gray-900">{lt.count} requests</span>
                      </div>
                    </div>
                  ))}
                  {data.by_leave_type.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No data yet.</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Trend (bar chart simulation) */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Monthly Leave Trend ({year})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-end gap-2 h-40">
                  {data.monthly.map((m) => (
                    <div key={m.month} className="flex-1 flex flex-col items-center gap-1">
                      <span className="text-xs text-gray-400">{m.days || ''}</span>
                      <div
                        className="w-full bg-blue-500 rounded-t-sm transition-all"
                        style={{
                          height: `${m.days > 0 ? Math.max(4, (m.days / maxMonthlyDays) * 100) : 2}px`,
                          opacity: m.days > 0 ? 1 : 0.2,
                        }}
                        title={`${MONTHS[m.month - 1]}: ${m.days} days, ${m.requests} requests`}
                      />
                      <span className="text-xs text-gray-500">{MONTHS[m.month - 1]}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Top Leave Takers */}
            {data.top_takers.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Top Leave Takers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.top_takers.map((t, i) => (
                      <div key={t.emp_id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-bold text-gray-400 w-5">#{i + 1}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{t.name}</p>
                            <p className="text-xs text-gray-400">{t.department ?? '—'}</p>
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-gray-900">{t.days_used} days</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
