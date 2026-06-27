import Link from 'next/link';
import { Users, UserPlus } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import {
  getCapabilityRoute,
  getRoleCatalogFromCompany,
  normalizeRoleList,
  parseCapabilityOwnerOverrides,
} from '@/lib/capability-access';
import { PeopleTable } from '@/app/admin/(main)/people/people-table';

export const dynamic = 'force-dynamic';

/**
 * Admin People Operations page.
 * Server component that fetches employee data and delegates
 * interactive filtering to the PeopleTable client component.
 */
export default async function PeopleView() {
  let employee;
  try {
    employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'employee.view_all');
    requireCompanyContext(employee);
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/admin/people&error=auth_required`);
    }
    throw err;
  }

  const users = await prisma.employee.findMany({
    where: {
      org_id: employee.org_id,
      deleted_at: null,
    },
    orderBy: { created_at: 'desc' },
    // NOTE: Increased from 100 to 500. For orgs with 500+ employees,
    // the PeopleTable should switch to server-side paginated API (/api/employees).
    take: 500,
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

  const [company, companySettings] = await Promise.all([
    prisma.company.findUnique({
      where: { id: employee.org_id },
      select: { enabled_roles: true },
    }),
    prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
      select: { hr_alerts: true },
    }),
  ]);

  const availableRoles = getRoleCatalogFromCompany(company?.enabled_roles);
  const ownerOverrides = parseCapabilityOwnerOverrides(companySettings?.hr_alerts);
  const staffedRoles = normalizeRoleList(users.map((user) => user.primary_role));
  const provisionRoute = getCapabilityRoute('people_operations', availableRoles, {
    ownerOverrides,
    staffedRoles,
  });

  // Extract unique departments for the filter dropdown
  const departments = Array.from(
    new Set(users.map((u) => u.department).filter((d): d is string => Boolean(d)))
  ).sort();

  // Serialize dates for the client component
  const serializedUsers = users.map((u) => ({
    ...u,
    created_at: u.created_at.toISOString(),
  }));

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--border)] pb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
                <Users className="h-7 w-7 text-[var(--primary)]" />
                People Operations
              </h1>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Admin fallback surface for employee lifecycle when HR ownership is unavailable.
              </p>
            </div>
            <Link 
              href={provisionRoute} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--primary-foreground)] rounded-lg hover:bg-[var(--primary)]/90 transition-colors font-medium whitespace-nowrap"
            >
              <UserPlus className="h-4 w-4" />
              Provision User
            </Link>
          </div>

          <PeopleTable users={serializedUsers} departments={departments} />
        </div>
      </div>
    </div>
  );
}
