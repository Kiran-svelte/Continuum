'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type OpsStatus = 'complete' | 'partial' | 'missing' | 'platform';

interface CategoryRow {
  id: number;
  category: string;
  tier: string;
  status: OpsStatus;
  why: string;
  evidence: string[];
  actions: string[];
}

interface Report {
  evaluatedAt: string;
  environment: string;
  overall: OpsStatus;
  summary: { complete: number; partial: number; missing: number; platform: number; total: number };
  categories: CategoryRow[];
}

const STATUS_VARIANT: Record<OpsStatus, 'success' | 'warning' | 'danger' | 'default'> = {
  complete: 'success',
  partial: 'warning',
  missing: 'danger',
  platform: 'default',
};

export default function OperationsReadinessView() {
  const [report, setReport] = React.useState<Report | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ops/operations-readiness', { credentials: 'include', cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load');
      setReport(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return <div className="p-6 text-sm text-muted-foreground">Evaluating operations readiness…</div>;
  }

  if (error) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-destructive">{error}</p>
        <Button onClick={load}>Retry</Button>
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Operations Readiness</h1>
          <p className="text-sm text-muted-foreground mt-1">
            20 production categories — monitoring, security, CI/CD, DR, and platform scaling.
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Environment: <strong>{report.environment}</strong> · Evaluated:{' '}
            {new Date(report.evaluatedAt).toLocaleString()}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={STATUS_VARIANT[report.overall]}>{report.overall}</Badge>
          <Button variant="outline" onClick={load}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="card p-3 text-center">
          <div className="text-2xl font-semibold text-green-600">{report.summary.complete}</div>
          <div className="text-xs text-muted-foreground">Complete</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-semibold text-amber-600">{report.summary.partial}</div>
          <div className="text-xs text-muted-foreground">Partial</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-semibold text-red-600">{report.summary.missing}</div>
          <div className="text-xs text-muted-foreground">Missing</div>
        </div>
        <div className="card p-3 text-center">
          <div className="text-2xl font-semibold">{report.summary.platform}</div>
          <div className="text-xs text-muted-foreground">Platform-managed</div>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        Full runbook:{' '}
        <Link href="/status" className="text-primary underline">
          Public status page
        </Link>
        {' · '}
        See <code className="text-xs">docs/OPERATIONS_READINESS_20.md</code> in the repository for setup steps.
      </p>

      <div className="space-y-3">
        {report.categories.map((row) => (
          <div key={row.id} className="card p-4 border border-border">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs text-muted-foreground">#{row.id}</span>
              <h2 className="font-medium">{row.category}</h2>
              <Badge variant="outline" className="text-xs">
                {row.tier}
              </Badge>
              <Badge variant={STATUS_VARIANT[row.status]}>{row.status}</Badge>
            </div>
            <p className="text-sm text-muted-foreground mb-2">{row.why}</p>
            {row.evidence.length > 0 && (
              <ul className="text-xs list-disc pl-5 mb-2 space-y-0.5">
                {row.evidence.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            )}
            {row.actions.length > 0 && (
              <div className="text-xs">
                <span className="font-medium text-amber-700 dark:text-amber-400">Actions: </span>
                {row.actions.join(' · ')}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
