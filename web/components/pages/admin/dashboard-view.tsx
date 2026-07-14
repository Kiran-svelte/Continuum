import Link from 'next/link';
import { Users, Building, Activity, UserPlus, FileText, Download, ClipboardCheck } from 'lucide-react';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireRole, AuthError } from '@/lib/auth-guard';
import {
  getCapabilityRoute,
  getCapabilityResolution,
  getRoleCatalogFromCompany,
  normalizeRoleList,
  parseCapabilityOwnerOverrides,
  type CapabilityKey,
} from '@/lib/capability-access';
import { Input } from '@/components/ui/input';
import { DashboardTemplate } from '@/components/layouts/dashboard-template';
import { BentoCell, BentoGrid, DataTableShell, StatCard } from '@/components/design-system';
import { LeavePulseRow, LEAVE_PULSE_ICONS } from '@/components/dashboard/leave-pulse-row';

/**
 * ADMIN DASHBOARD
 * 
 * Design Decisions:
 * 1. Density: High density, slightly more whitespace than Super Admin but retaining tight table layouts.
 * 2. Focus: Managing the organization, users, and overall module provisioning.
 * 3. Typography: System sans-serif for high readability on lists and directories.
 * 4. Actions: Prominent bulk actions ("Export", "Add User") are placed at the primary eyelines (top right headers).
 * 5. Mobile vs Desktop: The Quick Actions toolbar reflows from horizontal to vertically stacked on mobile.
 */

function formatTimeAgo(timestamp: Date): string {
  const diffMs = Date.now() - timestamp.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} min ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hr ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}

export default async function DashboardView() {
  let authEmployee;
  try {
    authEmployee = await getAuthEmployee();
    requireRole(authEmployee, 'admin', 'super_admin');
    requirePermissionGuard(authEmployee, 'company.edit_settings');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/admin/dashboard&error=auth_required`);
    }
    throw err;
  }

  if (!authEmployee.org_id) {
    redirect('/onboarding');
  }

  const companyId = authEmployee.org_id;
  const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

  console.info('[ADMIN DASHBOARD] Loading metrics', {
    actorId: authEmployee.id,
    companyId,
  });

  const [
    totalEmployees,
    pendingInvitations,
    pendingLeaveRequests,
    auditEvents24h,
    recentEmployees,
    recentAuditLogs,
    companyProfile,
    companySettings,
    staffedEmployeeRoles,
  ] = await Promise.all([
    prisma.employee.count({ where: { deleted_at: null, org_id: companyId } }),
    prisma.userInvite.count({ where: { status: 'pending', company_id: companyId } }),
    prisma.leaveRequest.count({ where: { status: 'pending', company_id: companyId } }),
    prisma.auditLog.count({ where: { company_id: companyId, created_at: { gte: last24Hours } } }),
    prisma.employee.findMany({
      where: { deleted_at: null, org_id: companyId },
      orderBy: { created_at: 'desc' },
      take: 8,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        primary_role: true,
        department: true,
        status: true,
        manager: {
          select: { first_name: true, last_name: true },
        },
      },
    }),
    prisma.auditLog.findMany({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
      take: 6,
      select: {
        id: true,
        action: true,
        entity_type: true,
        created_at: true,
      },
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: {
        enabled_roles: true,
      },
    }),
    prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: {
        hr_alerts: true,
      },
    }),
    prisma.employee.findMany({
      where: { deleted_at: null, org_id: companyId },
      distinct: ['primary_role'],
      select: {
        primary_role: true,
      },
    }),
  ]);

  const roleCatalog = getRoleCatalogFromCompany(companyProfile?.enabled_roles);
  const ownerOverrides = parseCapabilityOwnerOverrides(companySettings?.hr_alerts);
  const staffedRoles = normalizeRoleList(staffedEmployeeRoles.map((employee) => employee.primary_role));
  const capabilityContext = { ownerOverrides, staffedRoles };

  const peopleOps = getCapabilityResolution('people_operations', roleCatalog, capabilityContext);
  const governance = getCapabilityResolution('organization_governance', roleCatalog, capabilityContext);
  const approvalOps = getCapabilityResolution('approval_operations', roleCatalog, capabilityContext);

  const actionRoutes: Record<CapabilityKey, string> = {
    organization_governance: getCapabilityRoute('organization_governance', roleCatalog, capabilityContext),
    people_operations: getCapabilityRoute('people_operations', roleCatalog, capabilityContext),
    approval_operations: getCapabilityRoute('approval_operations', roleCatalog, capabilityContext),
    employee_self_service: getCapabilityRoute('employee_self_service', roleCatalog, capabilityContext),
    security_and_audit: getCapabilityRoute('security_and_audit', roleCatalog, capabilityContext),
  };

  const fallbackWarnings = [governance, peopleOps, approvalOps].filter(
    (resolution) => resolution.fallbackApplied
  );

  const metrics = [
    {
      label: 'Total Employees',
      value: totalEmployees.toLocaleString(),
      sub: 'Active directory count',
      icon: Users,
      color: 'muted',
    },
    {
      label: 'Pending Invitations',
      value: pendingInvitations.toLocaleString(),
      sub: 'Awaiting acceptance',
      icon: Activity,
      color: 'warning',
    },
    {
      label: 'Pending Leaves',
      value: pendingLeaveRequests.toLocaleString(),
      sub: 'Awaiting approval',
      icon: ClipboardCheck,
      color: 'success',
    },
    {
      label: 'Audit Events (24h)',
      value: auditEvents24h.toLocaleString(),
      sub: 'Recent governance activity',
      icon: FileText,
      color: 'primary',
    },
  ];

  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 max-w-[1400px] mx-auto w-full">
      {/* Header section */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-[var(--border)]">
        <div>
          <h1 className="text-h2 flex items-center gap-2">
            <Building className="w-6 h-6 text-[var(--primary)]" /> 
            Organization Administration
          </h1>
          <p className="text-body text-sm mt-1">Manage users, security policies, and organization settings.</p>
          {fallbackWarnings.length > 0 && (
            <p className="mt-2 inline-flex items-center rounded-md border border-[var(--warning)]/30 bg-[var(--warning-bg)] px-2.5 py-1 text-xs text-[var(--warning)]">
              Fallback mode active: {fallbackWarnings.map((item) => item.capabilityLabel).join(', ')} reassigned due missing owner roles.
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link href={actionRoutes.security_and_audit} className="btn btn-outline btn-sm"><Download className="w-4 h-4" /> Export Audit Log</Link>
          <Link href={actionRoutes.people_operations} className="btn btn-primary btn-sm"><UserPlus className="w-4 h-4" /> Provision User</Link>
        </div>
      </header>

      <LeavePulseRow
        actions={[
          {
            label: 'Leave queue',
            description: `${pendingLeaveRequests} request(s) awaiting company approval`,
            href: '/admin/leave-requests',
            icon: LEAVE_PULSE_ICONS.approvals,
            emphasis: pendingLeaveRequests > 0 ? 'primary' : 'default',
            badge: pendingLeaveRequests,
          },
          {
            label: 'Holiday calendar',
            description: 'Manage national, regional, and company holidays',
            href: '/admin/holidays',
            icon: LEAVE_PULSE_ICONS.request,
          },
          {
            label: 'Leave policy',
            description: 'Leave types, accrual, and encashment rules',
            href: '/admin/policy-settings',
            icon: LEAVE_PULSE_ICONS.balance,
          },
          {
            label: 'Company analytics',
            description: 'Headcount, audit activity, and org health',
            href: '/admin/dashboard',
            icon: ClipboardCheck,
          },
        ]}
      />

      {/* Metrics Row - 4 columns */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, i) => (
          <div key={i} className="card p-5 group hover:border-[var(--primary)] transition-colors">
            <div className="flex justify-between items-start mb-2">
              <span className="text-sm font-medium text-[var(--muted-foreground)]">{metric.label}</span>
              <div className={`p-2 rounded-md bg-[var(--${metric.color || 'muted'})] bg-opacity-10`}>
                <metric.icon className={`w-4 h-4 text-[var(--${metric.color || 'primary'})]`} />
              </div>
            </div>
            <div className="text-num text-2xl font-semibold mb-1">{metric.value}</div>
            <div className="text-xs text-[var(--muted-foreground)]">{metric.sub}</div>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* User Directory Preview - Takes 2 columns */}
        <section className="card p-0 col-span-1 lg:col-span-2 flex flex-col h-[500px]">
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-h4 font-semibold">User Directory</h3>
            <div className="flex gap-2">
              <Input type="text" placeholder="Search users..." aria-label="Search users" className="input py-1 px-3 text-sm w-48 hidden md:block" />
              <Link href="/admin/directory" className="btn btn-ghost btn-sm">Directory</Link>
              <Link href="/admin/people" className="btn btn-ghost btn-sm">View All</Link>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[var(--card)] z-10 shadow-sm">
                <tr className="border-b border-[var(--border)]">
                  <th className="py-3 px-4 text-xs font-semibold text-[var(--muted-foreground)]">Name</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[var(--muted-foreground)] hidden sm:table-cell">Role</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[var(--muted-foreground)] hidden md:table-cell">Department</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[var(--muted-foreground)] hidden lg:table-cell">Reports To</th>
                  <th className="py-3 px-4 text-xs font-semibold text-[var(--muted-foreground)] text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentEmployees.map((user) => (
                  <tr key={user.id} className="border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors cursor-pointer">
                    <td className="py-3 px-4">
                      <div className="font-medium text-sm">{`${user.first_name} ${user.last_name}`.trim()}</div>
                      <div className="text-xs text-[var(--muted-foreground)]">{user.email}</div>
                    </td>
                    <td className="py-3 px-4 text-sm hidden sm:table-cell">{user.primary_role}</td>
                    <td className="py-3 px-4 text-sm hidden md:table-cell text-[var(--muted-foreground)]">{user.department || 'Unassigned'}</td>
                    <td className="py-3 px-4 text-sm hidden lg:table-cell text-[var(--muted-foreground)]">
                      {user.manager
                        ? `${user.manager.first_name} ${user.manager.last_name}`.trim()
                        : 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className={`px-2 py-1 text-[11px] font-medium rounded-full ${
                        user.status === 'active' ? 'bg-[var(--success-bg)] text-[var(--success)]' :
                        user.status === 'on_notice' || user.status === 'probation' ? 'bg-[var(--warning-bg)] text-[var(--warning)]' :
                        'bg-[var(--danger-bg)] text-[var(--danger)]'
                      }`}>
                        {user.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* System Logs / Recent Activity - 1 column */}
        <section className="card p-0 col-span-1 flex flex-col h-[500px]">
          <div className="p-4 border-b border-[var(--border)] bg-[var(--muted)] rounded-t-[var(--radius)]">
            <h3 className="text-h4 font-semibold flex items-center gap-2">
              <FileText className="w-4 h-4" /> Audit Log
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
            {recentAuditLogs.map((log) => (
              <div key={log.id} className="relative pl-6 border-l-2 border-[var(--border)]">
                <div className="absolute w-3 h-3 bg-[var(--primary)] rounded-full -left-[7px] top-1"></div>
                <p className="text-sm font-medium">{log.action}</p>
                <p className="text-xs text-[var(--muted-foreground)]">Entity: {log.entity_type}</p>
                <p className="text-[10px] text-[var(--muted-foreground)] mt-1">{formatTimeAgo(log.created_at)}</p>
              </div>
            ))}
            {recentAuditLogs.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)]">No recent audit activity found.</p>
            )}
          </div>
          <div className="p-3 border-t border-[var(--border)] text-center">
            <Link href="/admin/audit-logs" className="text-xs font-semibold text-[var(--info)] hover:underline">View Full Logs</Link>
          </div>
        </section>
      </div>
    </div>
  );
}
