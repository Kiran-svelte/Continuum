'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

/** Shape of one leave-balance entry from the KPIs API. */
interface BalanceEntry {
  type: string;
  remaining: number;
  total: number;
}

/** Shape of the KPI API response (partial — we only use leaveBalance). */
interface KpiResponse {
  kpis: {
    leaveBalance: {
      value: number;
      breakdown: BalanceEntry[];
    };
  };
}

/**
 * Renders color-coded leave balance cards for each leave type.
 * Fetches data from /api/employee/dashboard/kpis.
 *
 * @returns A grid of balance cards or skeleton loaders while fetching.
 */
export function LeaveBalanceCards() {
  const [breakdown, setBreakdown] = useState<BalanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchKpis() {
      try {
        const res = await fetch('/api/employee/dashboard/kpis', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          setHasError(true);
          return;
        }
        const data = (await res.json()) as KpiResponse;
        setBreakdown(data.kpis?.leaveBalance?.breakdown ?? []);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') setHasError(true);
      } finally {
        setIsLoading(false);
      }
    }

    void fetchKpis();
    return () => controller.abort();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl bg-[var(--accent)]" />
        ))}
      </div>
    );
  }

  if (hasError || breakdown.length === 0) {
    return (
      <div className="card p-4 text-sm text-[var(--muted-foreground)]">
        Leave balance data is not available yet. Contact HR to set up your leave quotas.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {breakdown.map((entry) => {
        const pct = entry.total > 0 ? Math.round((entry.remaining / entry.total) * 100) : 0;
        const isLow = pct < 30;
        const isMid = pct >= 30 && pct < 60;
        // barColor/textColor removed — now uses inline CSS variable styles for dark-mode compatibility
        void isLow; void isMid; // suppress unused-var lint until removed in next cleanup

    return (
        <div key={entry.type} className="card p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-[var(--muted-foreground)] tracking-wide">
              {entry.type}
            </span>
            {entry.total > 0
              ? <span className="text-xs font-bold" style={{ color: pct < 30 ? 'var(--status-danger)' : pct < 60 ? 'var(--status-warning)' : 'var(--status-success)' }}>{pct}%</span>
              : <span className="text-xs font-medium text-[var(--muted-foreground)]">No quota</span>
            }
          </div>
          {entry.total === 0 ? (
            <p className="text-xs text-[var(--muted-foreground)] mt-1">No quota assigned — contact HR.</p>
          ) : (
            <>
              <div className="text-2xl font-bold text-foreground">
                {entry.remaining}
                <span className="text-sm font-normal text-[var(--muted-foreground)] ml-1">/ {entry.total} days</span>
              </div>
              {/* Progress bar — token-based color */}
              <div className="w-full h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: pct < 30 ? 'var(--status-danger)' : pct < 60 ? 'var(--status-warning)' : 'var(--status-success)',
                  }}
                />
              </div>
            </>
          )}
        </div>
      );
      })}
    </div>
  );
}
