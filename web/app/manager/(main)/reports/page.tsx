'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface LeaveSummary {
  year: number;
  total_employees: number;
  by_status: { status: string; count: number }[];
  by_leave_type: { leave_type: string; count: number; total_days: number }[];
}

const STATUS_BADGE: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  cancelled: 'default',
};

export default function ManagerReportsPage() {
  const [data, setData] = useState<LeaveSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/reports/leave-summary?year=${new Date().getFullYear()}`);
        const json = await res.json();
        if (res.ok) setData(json);
        else setError(json.error ?? 'Failed to load report');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const totalRequests = data?.by_status.reduce((acc, s) => acc + s.count, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Team Reports</h1>
        <p className="text-muted-foreground mt-1">Leave analytics for your team ({new Date().getFullYear()})</p>
      </div>

      {loading && <div className="py-12 text-center text-sm text-muted-foreground">Loading…</div>}
      {error && !loading && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Requests by Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.by_status.map((s) => (
                  <div key={s.status} className="flex items-center justify-between">
                    <Badge variant={STATUS_BADGE[s.status] ?? 'default'}>{s.status}</Badge>
                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${totalRequests > 0 ? (s.count / totalRequests) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-foreground w-6 text-right">{s.count}</span>
                    </div>
                  </div>
                ))}
                {data.by_status.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No requests this year.</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Leave Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.by_leave_type.slice(0, 6).map((lt) => (
                  <div key={lt.leave_type} className="flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{lt.leave_type}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">{lt.total_days} days</span>
                      <span className="text-sm font-semibold text-foreground">{lt.count} req.</span>
                    </div>
                  </div>
                ))}
                {data.by_leave_type.length === 0 && (
                  <p className="text-sm text-muted-foreground py-4 text-center">No leave data yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {!loading && !error && !data && (
        <Card>
          <CardContent className="py-12 text-center">
            <span className="text-4xl">📊</span>
            <p className="text-muted-foreground mt-3 text-sm">No report data available.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
