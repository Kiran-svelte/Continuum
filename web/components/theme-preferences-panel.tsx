'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';

export interface ThemePreferencesPanelProps {
  title?: string;
  description?: string;
  className?: string;
}

export function ThemePreferencesPanel({
  title = 'Appearance',
  description = 'Choose light, dark, or match your system. Your choice applies across every portal.',
  className,
}: ThemePreferencesPanelProps) {
  const { theme, resolvedTheme } = useTheme();
  const activeLabel =
    theme === 'system' ? `System (${resolvedTheme})` : theme.charAt(0).toUpperCase() + theme.slice(1);

  return (
    <section
      aria-labelledby="theme-preferences-heading"
      className={cn('rounded-[2rem] bg-[var(--muted)]/40 p-1.5 ring-1 ring-[var(--border)]/60', className)}
    >
      <div className="liquid-glass rounded-[calc(2rem-0.375rem)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 flex-1 space-y-3">
            <span className="inline-flex rounded-full bg-[var(--primary)]/10 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.2em] text-[var(--primary)]">
              Display
            </span>
            <div>
              <h2 id="theme-preferences-heading" className="text-h3 tracking-tight">
                {title}
              </h2>
              <p className="mt-2 max-w-[65ch] text-sm leading-relaxed text-[var(--muted-foreground)]">
                {description}
              </p>
            </div>
            <p className="text-xs font-medium text-[var(--muted-foreground)]">
              Active mode{' '}
              <span className="rounded-full bg-[var(--card)] px-2.5 py-1 text-[var(--foreground)] shadow-[var(--shadow-xs)]">
                {activeLabel}
              </span>
            </p>
          </div>
          <ThemeToggle variant="button" className="shrink-0 self-start lg:self-center" />
        </div>
      </div>
    </section>
  );
}
