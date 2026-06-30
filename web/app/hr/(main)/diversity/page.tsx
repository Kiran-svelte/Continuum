'use client';

/**
 * Diversity Metrics HR Page — RALPH-20260630-029
 * Gender distribution, tenure diversity, department breakdown.
 * @module app/hr/(main)/diversity/page
 */

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users } from 'lucide-react';

interface DiversityData {
  total: number;
  by_gender: { gender: string; count: number; pct: number }[];
  gender_by_department: { department: string; total: number; breakdown: Record<string, number> }[];
  tenure_distribution: { bucket: string; count: number }[];
}

const GENDER_COLOR: Record<string, string> = {
  male: 'bg-blue-500',
  female: 'bg-pink-500',
  other: 'bg-purple-500',
  not_specified: 'bg-gray-400',
};

export default function DiversityPage() {
  const [data, setData] = useState<DiversityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/analytics/diversity', { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d.error) setError(d.error); else setData(d); })
      .catch(() => setError('Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const maxDept = data ? Math.max(1, ...data.gender_by_department.map((d) => d.total)) : 1;

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-5xl mx-auto w-full">
      <PageHeader
        title="Diversity Metrics"
        description="Gender distribution, tenure diversity, and inclusion insights"
        icon={<Users className="w-6 h-6" />}
      />

      {loading && <div className="space-y-3">{[1,2,3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}
      {error && !loading && <div className="card p-4 text-danger text-sm">{error}</div>}

      {data && !loading && (
        <>
          {/* Gender overview */}
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Gender Distribution — {data.total} employees</h3>
            {/* Stacked bar */}
            <div className="flex h-6 rounded-full overflow-hidden mb-4">
              {data.by_gender.map((g) => (
                <div
                  key={g.gender}
                  className={`${GENDER_COLOR[g.gender] ?? 'bg-gray-400'} transition-all`}
                  style={{ width: `${g.pct}%` }}
                  title={`${g.gender}: ${g.count} (${g.pct}%)`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-4">
              {data.by_gender.map((g) => (
                <div key={g.gender} className="flex items-center gap-2">
                  <div className={`w-3 h-3 rounded-full ${GENDER_COLOR[g.gender] ?? 'bg-gray-400'}`} />
                  <span className="text-sm capitalize">{g.gender.replace(/_/g, ' ')}</span>
                  <Badge variant="outline">{g.count} ({g.pct}%)</Badge>
                </div>
              ))}
            </div>
          </div>

          {/* Tenure distribution */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Tenure Distribution</h3>
            <div className="flex items-end gap-3 h-28">
              {data.tenure_distribution.map((t) => {
                const max = Math.max(1, ...data.tenure_distribution.map((x) => x.count));
                return (
                  <div key={t.bucket} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-muted-foreground">{t.count || ''}</span>
                    <div
                      className="w-full bg-primary rounded-t-sm"
                      style={{ height: `${Math.max(4, (t.count / max) * 90)}px`, opacity: t.count > 0 ? 1 : 0.2 }}
                      title={`${t.bucket}: ${t.count}`}
                    />
                    <span className="text-xs text-muted-foreground">{t.bucket}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gender by department */}
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Gender by Department</h3>
            <div className="space-y-3">
              {data.gender_by_department.slice(0, 10).map((d) => (
                <div key={d.department}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm">{d.department}</span>
                    <span className="text-xs text-muted-foreground">{d.total}</span>
                  </div>
                  <div className="flex h-3 rounded-full overflow-hidden">
                    {Object.entries(d.breakdown).map(([g, count]) => (
                      <div
                        key={g}
                        className={`${GENDER_COLOR[g] ?? 'bg-gray-400'}`}
                        style={{ width: `${(count / maxDept) * 100}%` }}
                        title={`${g}: ${count}`}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
