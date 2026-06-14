'use client';

import { ModuleFilteredPortalLayout } from '@/components/module-filtered-portal-layout';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleFilteredPortalLayout
      portal="admin"
      config={{
        portalName: 'Admin Portal',
        portalSlug: 'admin',
        accentColor: 'violet',
        roleLabel: 'Company Admin',
        showPortalSwitcher: true,
      }}
    >
      {children}
    </ModuleFilteredPortalLayout>
  );
}
