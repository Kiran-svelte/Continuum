import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-service';
import { StaticPortalLayout } from '@/components/static-portal-layout';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user || user.role !== 'super_admin') {
    redirect('/admin/login');
  }

  return (
    <StaticPortalLayout
      portal="super_admin"
      config={{
        portalName: 'Super Admin',
        portalSlug: 'super-admin',
        accentColor: 'violet',
        roleLabel: 'Super Admin',
        showPortalSwitcher: false,
      }}
    >
      {children}
    </StaticPortalLayout>
  );
}
