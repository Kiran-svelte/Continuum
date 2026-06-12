'use client';

import { ThemeToggle } from '@/components/theme-toggle';
import { useTheme } from '@/components/theme-provider';
import { DSCard } from '@/components/design-system';

export interface ThemePreferencesPanelProps {
  title?: string;
  description?: string;
}

export function ThemePreferencesPanel({
  title = 'Appearance',
  description = 'Choose light, dark, or match your system. Your choice applies across every portal.',
}: ThemePreferencesPanelProps) {
  const { theme, resolvedTheme } = useTheme();

  return (
    <DSCard padding="lg" className="liquid-glass">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h2 className="text-h3">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{description}</p>
          <p className="mt-3 text-xs font-medium text-[var(--muted-foreground)]">
            Active mode:{' '}
            <span className="text-[var(--foreground)]">
              {theme === 'system' ? `System (${resolvedTheme})` : theme}
            </span>
          </p>
        </div>
        <ThemeToggle variant="button" className="shrink-0" />
      </div>
    </DSCard>
  );
}
