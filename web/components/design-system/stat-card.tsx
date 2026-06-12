import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DSCard } from './card';

export interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: LucideIcon;
  href?: string;
  tone?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  className?: string;
}

const toneIconBg: Record<NonNullable<StatCardProps['tone']>, string> = {
  default: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
  primary: 'bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]',
  success: 'bg-[var(--status-success-soft)] text-[var(--status-success)]',
  warning: 'bg-[var(--status-warning-soft)] text-[var(--status-warning)]',
  danger: 'bg-[var(--status-danger-soft)] text-[var(--status-danger)]',
};

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  href,
  tone = 'default',
  className,
}: StatCardProps) {
  const inner = (
    <DSCard
      interactive={Boolean(href)}
      className={cn('h-full', className)}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="text-sm font-medium text-[var(--muted-foreground)]">{label}</span>
        {Icon && (
          <span className={cn('inline-flex rounded-xl p-2', toneIconBg[tone])}>
            <Icon className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
      <p className="mt-3 text-2xl font-bold tracking-tight text-[var(--foreground)]">{value}</p>
      {sub && <p className="mt-1 text-xs text-[var(--muted-foreground)]">{sub}</p>}
    </DSCard>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full no-underline hover:no-underline">
        {inner}
      </Link>
    );
  }

  return inner;
}
