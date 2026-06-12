'use client';

/**
 * Portal shell v2 — Pulse sidebar, sticky top bar, bento-ready content region.
 * Wraps the shared PortalLayout with a consistent content canvas.
 */
import { PortalLayout, type PortalConfig } from '@/components/portal-layout';
import { cn } from '@/lib/utils';

export type { PortalConfig, NavItem } from '@/components/portal-layout';

export interface PortalShellV2Props {
  config: PortalConfig;
  children: React.ReactNode;
  contentClassName?: string;
}

export function PortalShellV2({ config, children, contentClassName }: PortalShellV2Props) {
  return (
    <PortalLayout config={config}>
      <div
        className={cn(
          'portal-shell-v2 min-h-full w-full bg-[var(--background)]',
          'bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,color-mix(in_srgb,var(--primary)_6%,transparent),transparent)]',
          contentClassName,
        )}
      >
        {children}
      </div>
    </PortalLayout>
  );
}
