'use client';

/**
 * Predictive Analytics HR Page — RALPH-20260630-026
 * Attrition risk, hiring forecast, leave anomalies.
 * @module app/hr/(main)/predictive-analytics/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, AlertTriangle, Users, Calendar } from 'lucide-react';

interface PredictiveData {
  generated_at: string;
  period_days: number;
  attrition_risk: {
    high: number;
    medium: number;
    low: number;
    top_risks: { emp_id: string; name: string; department: string | null; designation: string | null; risk_score: number; risk_level: string }[];
  };
  hiring_forecast: { recommended_hires: number; recent_exits_90d: number; note: string };
  leave_anomalies: { emp_id: string; name: string; department: string | null; leave_days_90d: number }[];
}

const riskBadge = (level: string) =>
  level === 'high' ? 'danger' : level === 'medium' ? 'warning' : 'success';

export default function PredictiveAnalyticsPage() {
  const [data, setData] = useState<PredictiveData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/analytics/predictive', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Predictive Analytics"
        description="AI-powered workforce insights and risk predictions"
        icon={<Brain className="w-6 h-6" />}
      />

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}
      {error && !loading && <div className="card p-4 text-danger text-sm">{error}</div>}

      {data && !loading && (
        <>
          {/* Risk summary cards */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'High Risk', value: data.attrition_risk.high, color: 'text-danger' },
              { label: 'Medium Risk', value: data.attrition_risk.medium, color: 'text-warning' },
              { label: 'Low Risk', value: data.attrition_risk.low, color: 'text-success' },
            ].map((c) => (
              <div key={c.label} className="card p-5 text-center">
                <AlertTriangle className={`w-6 h-6 mx-auto mb-2 ${c.color}`} />
                <p className={`text-3xl font-bold ${c.color}`}>{c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{c.label}</p>
              </div>
            ))}
          </div>

          {/* Hiring forecast */}
          <div className="card p-5 flex items-center gap-4">
            <Users className="w-8 h-8 text-primary flex-shrink-0" />
            <div>
              <p className="font-semibold">Recommended Hires: {data.hiring_forecast.recommended_hires}</p>
              <p className="text-sm text-muted-foreground">{data.hiring_forecast.note} · {data.hiring_forecast.recent_exits_90d} exits in last 90 days</p>
            </div>
          </div>

          {/* Top attrition risks */}
          <div className="card">
            <div className="p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold">Top Attrition Risks</h3>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {data.attrition_risk.top_risks.map((r) => (
                <div key={r.emp_id} className="p-4 flex items-center gap-3">
                  <div className="flex-1">
                    <p className="font-medium">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.designation ?? '—'} · {r.department ?? '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-16 h-2 bg-[var(--border)] rounded-full overflow-hidden">
                      <div className="h-full bg-danger rounded-full" style={{ width: `${r.risk_score}%` }} />
                    </div>
                    <span className="text-sm font-semibold w-8">{r.risk_score}</span>
                    <Badge variant={riskBadge(r.risk_level) as 'danger' | 'warning' | 'success'}>{r.risk_level}</Badge>
                  </div>
                </div>
              ))}
              {data.attrition_risk.top_risks.length === 0 && (
                <div className="p-8 text-center text-muted-foreground text-sm">No significant attrition risks detected.</div>
              )}
            </div>
          </div>

          {/* Leave anomalies */}
          {data.leave_anomalies.length > 0 && (
            <div className="card">
              <div className="p-4 border-b border-[var(--border)]">
                <h3 className="font-semibold flex items-center gap-2"><Calendar className="w-4 h-4" />Leave Anomalies (90 days)</h3>
              </div>
              <div className="divide-y divide-[var(--border)]">
                {data.leave_anomalies.map((a) => (
                  <div key={a.emp_id} className="p-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium">{a.name}</p>
                      <p className="text-sm text-muted-foreground">{a.department ?? '—'}</p>
                    </div>
                    <Badge variant="warning">{a.leave_days_90d} days</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground text-right">Generated: {new Date(data.generated_at).toLocaleString()}</p>
        </>
      )}
    </div>
  );
}
