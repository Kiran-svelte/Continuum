import { cn } from '@/lib/utils';

/**
 * Accessible vertical/sidebar nav tab styles for light and dark themes.
 * Avoids low-contrast pairings like accent-soft background + primary-colored text.
 */
export function getNavTabClassName(
  active: boolean,
  options?: { danger?: boolean; className?: string }
): string {
  const base = cn(
    'w-full justify-start h-auto min-h-11 px-4 py-3 rounded-lg text-sm font-semibold',
    'inline-flex items-center gap-3 border transition-colors duration-150',
    'active:scale-100 active:brightness-100 whitespace-normal text-left leading-snug',
    '[&_svg]:shrink-0'
  );

  if (options?.danger) {
    return cn(
      base,
      active
        ? 'bg-destructive/10 text-destructive border-destructive/35 shadow-sm'
        : 'bg-transparent text-muted-foreground border-transparent hover:bg-destructive/5 hover:text-destructive',
      options.className
    );
  }

  return cn(
    base,
    active
      ? 'bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] text-foreground border-[color-mix(in_srgb,var(--primary)_38%,transparent)] shadow-sm'
      : 'bg-transparent text-muted-foreground border-transparent hover:bg-muted hover:text-foreground',
    options?.className
  );
}
