'use client';

import { useMemo } from 'react';
import { PortalLayout, type PortalConfig } from '@/components/portal-layout';
import { buildPortalNav, type PortalSlug } from '@/lib/navigation/portal-nav';
import { useCompanyModules } from '@/hooks/use-company-modules';

interface ModuleFilteredPortalLayoutProps {
  portal: PortalSlug;
  config: Omit<PortalConfig, 'navItems'>;
  children: React.ReactNode;
}

/**
 * Client portal shell that filters navigation by enabled company modules.
 * Never guesses modules while loading — avoids flashing unauthorized nav links.
 */
export function ModuleFilteredPortalLayout({
  portal,
  config,
  children,
}: ModuleFilteredPortalLayoutProps) {
  const { enabledModules, loading } = useCompanyModules();

  const navItems = useMemo(() => {
    if (loading) {
      return buildPortalNav(portal, []);
    }
    return buildPortalNav(portal, enabledModules);
  }, [portal, enabledModules, loading]);

  return (
    <PortalLayout
      config={{
        ...config,
        navItems,
        showPortalSwitcher: config.showPortalSwitcher ?? true,
        navLoading: loading,
      }}
    >
      {children}
    </PortalLayout>
  );
}
