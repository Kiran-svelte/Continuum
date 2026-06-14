'use client';

import { ModuleFilteredPortalLayout } from '@/components/module-filtered-portal-layout';

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <ModuleFilteredPortalLayout
      portal="employee"
      config={{
        portalName: 'Employee Portal',
        portalSlug: 'employee',
        accentColor: 'blue',
        roleLabel: 'Employee',
      }}
    >
      {children}
    </ModuleFilteredPortalLayout>
  );
}
