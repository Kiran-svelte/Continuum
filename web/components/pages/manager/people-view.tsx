import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Users, UserPlus } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import {
  getCapabilityAccessRoles,
  getCapabilityRoute,
  getRoleCatalogFromCompany,
  normalizeActorRoles,
  parseCapabilityOwnerOverrides,
} from '@/lib/capability-access';
import { getDefaultPortalForRoles } from '@/lib/auth-routing';

export const dynamic = 'force-dynamic';

export default async function PeopleView() {
  let employee;
  try {
    employee = await getAuthEmployee();
    requireCompanyContext(employee);
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/manager/people&error=auth_required`);
    }
    throw err;
  }

  const [company, settings] = await Promise.all([
    prisma.company.findUnique({
      where: { id: employee.org_id },
      select: { enabled_roles: true },
    }),
    prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
      select: { hr_alerts: true },
    }),
  ]);

  if (!company) {
    redirect(getDefaultPortalForRoles(employee.primary_role, employee.secondary_roles));
  }

  const availableRoles = getRoleCatalogFromCompany(company.enabled_roles);
  const ownerOverrides = parseCapabilityOwnerOverrides(settings?.hr_alerts);
  const allowedRoles = getCapabilityAccessRoles('people_operations', availableRoles, {
    ownerOverrides,
  });
  const actorRoles = normalizeActorRoles(employee.primary_role, employee.secondary_roles);
  const hasAccess = actorRoles.some((role) => allowedRoles.includes(role));

  if (!hasAccess) {
    redirect('/manager/team?error=people_ops_unavailable');
  }

  const users = await prisma.employee.findMany({
    where: {
      org_id: employee.org_id,
      deleted_at: null,
    },
    orderBy: { created_at: 'desc' },
    take: 100,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
      primary_role: true,
      department: true,
      status: true,
      created_at: true,
    },
  });

  const inviteRoute = getCapabilityRoute('people_operations', availableRoles, {
    ownerOverrides,
  });

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Users className="w-6 h-6 text-[var(--primary)]" />
                <h1 className="text-3xl font-bold tracking-tight">People Operations</h1>
              </div>
              <p className="text-[var(--muted-foreground)]">
                Manage your team members and view organizational structure
              </p>
            </div>
            <Link
              href={inviteRoute}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary)]/90 font-medium transition-colors whitespace-nowrap"
            >
              <UserPlus className="w-4 h-4" />
              Provision User
            </Link>
          </div>

          {/* Users Table Card */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg overflow-hidden">
            {users.length === 0 ? (
              <div className="p-12 text-center">
                <div className="inline-flex p-3 bg-[var(--muted)]/30 rounded-full mb-4">
                  <Users className="w-6 h-6 text-[var(--muted-foreground)]" />
                </div>
                <p className="text-[var(--muted-foreground)]">
                  No team members found in this organization.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-[var(--muted)]/40 border-b border-[var(--border)]">
                    <tr>
                      <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Name</th>
                      <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Email</th>
                      <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Role</th>
                      <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Department</th>
                      <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Status</th>
                      <th className="px-6 py-3 text-left font-semibold text-[var(--foreground)]">Joined</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-[var(--muted)]/20 transition-colors">
                        <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                          {`${user.first_name} ${user.last_name}`.trim()}
                        </td>
                        <td className="px-6 py-4 text-[var(--muted-foreground)]">{user.email}</td>
                        <td className="px-6 py-4">
                          <span className="px-2.5 py-1 inline-block rounded-full text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)]">
                            {user.primary_role}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[var(--muted-foreground)]">
                          {user.department || '—'}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2.5 py-1 inline-block rounded-full text-xs font-medium ${
                              user.status === 'active'
                                ? 'bg-[var(--status-success)]/10 text-[var(--status-success)]'
                                : 'bg-[var(--status-warning)]/10 text-[var(--status-warning)]'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[var(--muted-foreground)] text-xs">
                          {new Date(user.created_at).toLocaleDateString('en-IN', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Info Section */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-lg p-6">
            <p className="text-sm text-[var(--muted-foreground)]">
              Showing {users.length} team member{users.length !== 1 ? 's' : ''} in your organization.
              Use the "Provision User" button above to add new team members.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
