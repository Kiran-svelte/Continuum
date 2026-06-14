'use client';

import { CORE_FUNCTION_CATALOG, type ModuleSlug } from '@/lib/core-functions/catalog';

interface ModuleChipsSummaryProps {
  cap: ModuleSlug[];
  enabled: ModuleSlug[];
  showCapOnly?: boolean;
  maxVisible?: number;
}

export function ModuleChipsSummary({
  cap,
  enabled,
  showCapOnly = false,
  maxVisible = 12,
}: ModuleChipsSummaryProps) {
  const nameBySlug = new Map(CORE_FUNCTION_CATALOG.map((cf) => [cf.slug, cf.name]));
  const slugs = showCapOnly ? cap : enabled;
  const visible = slugs.slice(0, maxVisible);
  const hidden = slugs.length - visible.length;

  if (slugs.length === 0) {
    return <p className="text-sm text-muted-foreground">No modules configured.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {visible.map((slug) => {
        const inCap = cap.includes(slug);
        const isOn = enabled.includes(slug);
        return (
          <span
            key={slug}
            className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
              showCapOnly || isOn
                ? 'bg-primary/10 text-primary'
                : 'bg-muted text-muted-foreground'
            } ${!showCapOnly && inCap && !isOn ? 'border border-dashed border-border' : ''}`}
            title={nameBySlug.get(slug) ?? slug}
          >
            {nameBySlug.get(slug) ?? slug}
            {!showCapOnly && inCap && !isOn ? ' (off)' : ''}
          </span>
        );
      })}
      {hidden > 0 && (
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">
          +{hidden} more
        </span>
      )}
    </div>
  );
}
