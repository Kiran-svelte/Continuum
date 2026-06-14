'use client';

import { PortalLayout, type PortalConfig } from '@/components/portal-layout';
import { getStaticPortalNav, type PortalSlug } from '@/lib/navigation/portal-nav';

interface StaticPortalLayoutProps {
  portal: PortalSlug;
  config: Omit<PortalConfig, 'navItems'>;
  children: React.ReactNode;
}

/** Portal shell with a fixed nav catalog (no tenant module filtering). */
export function StaticPortalLayout({ portal, config, children }: StaticPortalLayoutProps) {
  return (
    <PortalLayout
      config={{
        ...config,
        navItems: getStaticPortalNav(portal),
        showPortalSwitcher: false,
      }}
    >
      {children}
    </PortalLayout>
  );
}
