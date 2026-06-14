'use client';

import { useState, useEffect } from 'react';
import { Sun } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Holiday {
  id: string;
  name: string;
  date: string;
}

interface HolidaysResponse {
  holidays: Holiday[];
}

/**
 * Renders the next 3 upcoming company holidays.
 * Fetches from /api/company/holidays and filters to future dates.
 */
export function UpcomingHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHolidays() {
      try {
        const res = await fetch('/api/company/holidays', {
          credentials: 'include',
          signal: controller.signal,
        });
        if (!res.ok) {
          setHasError(true);
          return;
        }
        const data = (await res.json()) as HolidaysResponse;
        const now = new Date();
        now.setHours(0, 0, 0, 0);

        const upcoming = (data.holidays ?? [])
          .filter((h) => new Date(h.date) >= now)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 3);

        setHolidays(upcoming);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setHasError(true);
        }
      } finally {
        setIsLoading(false);
      }
    }

    void fetchHolidays();
    return () => controller.abort();
  }, []);

  if (isLoading) {
    return (
      <div className="card p-0 overflow-hidden divide-y divide-[var(--border)]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 w-full bg-[var(--accent)] animate-pulse" />
        ))}
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="card p-4 text-sm text-[var(--muted-foreground)]">
        Unable to load holidays. Please refresh the page.
      </div>
    );
  }

  if (holidays.length === 0) {
    return (
      <div className="card p-4 text-sm text-[var(--muted-foreground)]">
        No upcoming holidays in the schedule.
      </div>
    );
  }

  return (
    <div className="card p-0 overflow-hidden divide-y divide-[var(--border)]">
      {holidays.map((h) => {
        const date = new Date(h.date);
        const dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
        const monthDay = date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });

        return (
          <div key={h.id} className="flex items-center gap-3 p-3 hover:bg-[var(--accent)] transition-colors">
            <div className="w-8 h-8 rounded-lg bg-[var(--status-warning-soft,rgba(245,158,11,0.12))] flex items-center justify-center shrink-0">
              <Sun className="w-4 h-4 text-[var(--status-warning)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{h.name}</p>
              <p className="text-xs text-[var(--muted-foreground)]">{dayName}, {monthDay}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
