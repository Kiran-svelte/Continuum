'use client';

import { ModuleFilteredPortalLayout } from '@/components/module-filtered-portal-layout';

export default function ManagerLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleFilteredPortalLayout
      portal="manager"
      config={{
        portalName: 'Manager Portal',
        portalSlug: 'manager',
        accentColor: 'amber',
        roleLabel: 'Manager',
      }}
    >
      {children}
    </ModuleFilteredPortalLayout>
  );
}
