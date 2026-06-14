'use client';

import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SummaryStat {
  label: string;
  value: number | string;
  icon: LucideIcon;
  tone?: 'default' | 'success' | 'warning' | 'info';
}

interface PageSummaryStripProps {
  stats: SummaryStat[];
  /** Hide the strip when every numeric value is zero. */
  hideWhenEmpty?: boolean;
  className?: string;
}

const toneStyles: Record<NonNullable<SummaryStat['tone']>, string> = {
  default: 'bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-[var(--primary)]',
  success: 'bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[var(--success)]',
  warning: 'bg-[color-mix(in_srgb,var(--status-warning)_14%,transparent)] text-[var(--status-warning)]',
  info: 'bg-[color-mix(in_srgb,var(--info)_14%,transparent)] text-[var(--info)]',
};

export function PageSummaryStrip({
  stats,
  hideWhenEmpty = true,
  className,
}: PageSummaryStripProps) {
  const allZero =
    hideWhenEmpty &&
    stats.length > 0 &&
    stats.every((stat) => typeof stat.value === 'number' && stat.value === 0);

  if (allZero || stats.length === 0) {
    return null;
  }

  return (
    <div className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3', className)}>
      {stats.map((stat) => {
        const Icon = stat.icon;
        const tone = stat.tone ?? 'default';
        return (
          <div
            key={stat.label}
            className="rounded-[var(--radius)] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[var(--shadow-xs)]"
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl',
                  toneStyles[tone]
                )}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">{stat.label}</p>
                <p className="text-2xl font-bold text-[var(--foreground)]">{stat.value}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
