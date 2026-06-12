'use client';

import Link from 'next/link';
import { MonitorPlay } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';

export interface AuthShellProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  children: React.ReactNode;
  aside?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

export function AuthShell({
  title,
  subtitle,
  eyebrow = 'Continuum',
  children,
  aside,
  footer,
  className,
}: AuthShellProps) {
  return (
    <div className={cn('relative min-h-[100dvh] overflow-hidden bg-[var(--background)] text-[var(--foreground)]', className)}>
      <div className="ambient-glow" aria-hidden />
      <div className="absolute right-4 top-4 z-20 sm:right-6 sm:top-6">
        <ThemeToggle variant="button" />
      </div>
      <div className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center justify-center px-4 py-10 sm:px-6">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[var(--radius-xl)] p-1.5 ring-1 ring-[color-mix(in_srgb,var(--foreground)_8%,transparent)] bg-[color-mix(in_srgb,var(--foreground)_4%,transparent)] shadow-[var(--shadow-lg)] lg:grid-cols-[1.05fr_1fr]">
          <aside className="hidden flex-col justify-between rounded-[calc(var(--radius-xl)-0.375rem)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--background))] p-10 lg:flex">
            <Link href="/" className="inline-flex items-center gap-2 text-lg font-semibold no-underline">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] shadow-[var(--shadow-bento)]">
                <MonitorPlay className="h-5 w-5" aria-hidden />
              </span>
              Continuum
            </Link>
            {aside ?? (
              <div className="space-y-4">
                <h2 className="text-3xl font-bold tracking-tight">TeamHub Pulse</h2>
                <p className="max-w-sm text-sm text-[var(--muted-foreground)]">
                  Modern HR operations with bento dashboards, role portals, and India-ready payroll — all in one workspace.
                </p>
              </div>
            )}
            <p className="text-xs text-[var(--muted-foreground)]">© {new Date().getFullYear()} Continuum</p>
          </aside>

          <div className="rounded-[calc(var(--radius-xl)-0.375rem)] border border-[var(--border)] bg-[var(--card)] p-6 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--foreground)_8%,transparent)] sm:p-8 lg:p-10">
            <p className="text-xs font-semibold uppercase tracking-widest text-[var(--primary)]">{eyebrow}</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {subtitle && <p className="mt-2 text-sm text-[var(--muted-foreground)]">{subtitle}</p>}
            <div className="mt-8">{children}</div>
            {footer && <div className="mt-6">{footer}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
