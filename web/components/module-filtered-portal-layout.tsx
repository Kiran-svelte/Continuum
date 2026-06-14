'use client';

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
 */
export function ModuleFilteredPortalLayout({
  portal,
  config,
  children,
}: ModuleFilteredPortalLayoutProps) {
  const { enabledModules, loading } = useCompanyModules();
  const navItems =
    enabledModules.length > 0 || !loading
      ? buildPortalNav(portal, enabledModules)
      : buildPortalNav(portal, ['leave', 'attendance', 'payroll', 'documents', 'employees']);

  return (
    <PortalLayout
      config={{
        ...config,
        navItems,
      }}
    >
      {children}
    </PortalLayout>
  );
}
