'use client';

import { ModuleFilteredPortalLayout } from '@/components/module-filtered-portal-layout';

export default function HRLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleFilteredPortalLayout
      portal="hr"
      config={{
        portalName: 'HR Portal',
        portalSlug: 'hr',
        accentColor: 'emerald',
        roleLabel: 'HR Admin',
      }}
    >
      {children}
    </ModuleFilteredPortalLayout>
  );
}
