import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight, CalendarDays, CheckSquare, Scale } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface LeavePulseAction {
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  emphasis?: 'primary' | 'default';
  badge?: number;
}

interface LeavePulseRowProps {
  title?: string;
  actions: LeavePulseAction[];
  className?: string;
}

/**
 * Leave-first quick action row shown at the top of role dashboards.
 */
export function LeavePulseRow({
  title = 'Leave at a glance',
  actions,
  className,
}: LeavePulseRowProps) {
  if (actions.length === 0) {
    return null;
  }

  return (
    <section className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          {title}
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {actions.map((action) => {
          const Icon = action.icon;
          const isPrimary = action.emphasis === 'primary';
          return (
            <Link
              key={action.href + action.label}
              href={action.href}
              className={cn(
                'group relative flex flex-col gap-2 rounded-[var(--radius)] border p-4 transition-all duration-150',
                isPrimary
                  ? 'border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[color-mix(in_srgb,var(--primary)_10%,var(--card))] shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]'
                  : 'border-[var(--border)] bg-[var(--card)] hover:border-[color-mix(in_srgb,var(--primary)_25%,var(--border))] hover:bg-[var(--secondary)]'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg',
                    isPrimary
                      ? 'bg-[var(--primary)] text-[var(--primary-foreground)]'
                      : 'bg-[var(--secondary)] text-[var(--foreground)]'
                  )}
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </div>
                {typeof action.badge === 'number' && action.badge > 0 ? (
                  <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 text-xs font-semibold text-[var(--primary-foreground)]">
                    {action.badge}
                  </span>
                ) : null}
              </div>
              <div>
                <p className="font-semibold text-[var(--foreground)]">{action.label}</p>
                <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{action.description}</p>
              </div>
              <ArrowRight
                className="absolute bottom-4 right-4 h-4 w-4 text-[var(--muted-foreground)] opacity-0 transition-opacity group-hover:opacity-100"
                aria-hidden
              />
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export const LEAVE_PULSE_ICONS = {
  request: CalendarDays,
  balance: Scale,
  approvals: CheckSquare,
} as const;
