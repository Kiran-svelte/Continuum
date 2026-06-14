/**
 * Portal navigation definitions with module gating.
 * Single source of truth for all role portal sidebars.
 */

import type { NavItem } from '@/components/portal-layout';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

export type PortalSlug = 'admin' | 'hr' | 'manager' | 'employee' | 'super_admin';

export interface ModuleNavItem extends NavItem {
  /** Module slug required to show this item (employees = always on). */
  moduleSlug?: ModuleSlug;
  /** Any one of these module slugs may show this item. */
  requiresAnyModule?: readonly ModuleSlug[];
}

const ALWAYS_VISIBLE = new Set<ModuleSlug>(['employees']);

function item(partial: ModuleNavItem): ModuleNavItem {
  return partial;
}

export const ADMIN_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Getting Started', href: '/admin/getting-started', icon: 'Rocket', group: 'Overview' }),
  item({ label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard', group: 'Overview' }),
  item({ label: 'Organization Setup', href: '/admin/setup-wizard', icon: 'Settings', group: 'Organization' }),
  item({ label: 'Company Settings', href: '/admin/company-settings', icon: 'Building2', group: 'Organization' }),
  item({ label: 'People Ops', href: '/admin/people', icon: 'Users', group: 'Organization', moduleSlug: 'employees' }),
  item({ label: 'Directory', href: '/admin/directory', icon: 'Building2', group: 'Organization', moduleSlug: 'employees' }),
  item({ label: 'Reporting Structure', href: '/admin/org-chart', icon: 'GitBranch', group: 'Organization', moduleSlug: 'employees' }),
  item({ label: 'Leave Requests', href: '/admin/leave-requests', icon: 'ClipboardList', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Holidays', href: '/admin/holidays', icon: 'CalendarDays', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Policy Settings', href: '/admin/policy-settings', icon: 'SlidersHorizontal', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Payroll', href: '/admin/payroll', icon: 'Banknote', group: 'Payroll', moduleSlug: 'payroll' }),
  item({ label: 'Salary Structures', href: '/admin/salary-structures', icon: 'IndianRupee', group: 'Payroll', moduleSlug: 'payroll' }),
  item({ label: 'Salary Components', href: '/admin/salary-components', icon: 'Layers', group: 'Payroll', moduleSlug: 'payroll' }),
  item({ label: 'Shifts', href: '/admin/shifts', icon: 'Timer', group: 'Attendance', moduleSlug: 'attendance' }),
  item({ label: 'Compliance', href: '/admin/compliance', icon: 'Scale', group: 'Governance', moduleSlug: 'compliance' }),
  item({ label: 'RBAC & Permissions', href: '/admin/rbac', icon: 'ShieldCheck', group: 'Governance' }),
  item({ label: 'Audit Logs', href: '/admin/audit-logs', icon: 'Shield', group: 'Governance', moduleSlug: 'compliance' }),
  item({ label: 'System Health', href: '/admin/system-health', icon: 'Activity', group: 'Governance' }),
  item({ label: 'Notifications', href: '/admin/notifications', icon: 'Bell', group: 'Account' }),
  item({ label: 'Profile', href: '/admin/profile', icon: 'User', group: 'Account' }),
  item({ label: 'Billing', href: '/admin/billing', icon: 'CreditCard', group: 'Account' }),
];

export const HR_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Dashboard', href: '/hr/dashboard', icon: 'LayoutDashboard', group: 'Overview' }),
  item({ label: 'Request Leave', href: '/hr/request-leave', icon: 'FilePlus', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Requests', href: '/hr/leave-requests', icon: 'ClipboardList', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Calendar', href: '/hr/leave-calendar', icon: 'CalendarCheck', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Balance', href: '/hr/leave-balance', icon: 'Scale', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Quotas', href: '/hr/leave-quotas', icon: 'Sliders', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Encashment', href: '/hr/leave-encashment', icon: 'Banknote', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Holidays', href: '/hr/holidays', icon: 'CalendarDays', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Approvals', href: '/hr/approvals', icon: 'CheckSquare', group: 'Workflow', moduleSlug: 'leave' }),
  item({ label: 'Approval Config', href: '/hr/approval-config', icon: 'GitBranch', group: 'Workflow', moduleSlug: 'leave' }),
  item({ label: 'Escalation', href: '/hr/escalation', icon: 'AlertTriangle', group: 'Workflow', moduleSlug: 'leave' }),
  item({ label: 'Attendance', href: '/hr/attendance', icon: 'Clock', group: 'Attendance', moduleSlug: 'attendance' }),
  item({ label: 'Shifts', href: '/hr/shifts', icon: 'Timer', group: 'Attendance', moduleSlug: 'attendance' }),
  item({ label: 'Employees', href: '/hr/employees', icon: 'Users', group: 'People', moduleSlug: 'employees' }),
  item({ label: 'Bulk Import', href: '/hr/bulk-import', icon: 'Upload', group: 'People', moduleSlug: 'employees' }),
  item({ label: 'Directory', href: '/hr/directory', icon: 'Building2', group: 'People', moduleSlug: 'employees' }),
  item({ label: 'Reporting Structure', href: '/hr/org-chart', icon: 'GitBranch', group: 'People', moduleSlug: 'employees' }),
  item({ label: 'Organization', href: '/hr/organization', icon: 'GitBranch', group: 'People', moduleSlug: 'directory' }),
  item({ label: 'Employee Movements', href: '/hr/employee-movements', icon: 'ArrowRightLeft', group: 'People', moduleSlug: 'employees' }),
  item({ label: 'Exit Checklist', href: '/hr/exit-checklist', icon: 'ListChecks', group: 'People', moduleSlug: 'exit' }),
  item({ label: 'Payroll', href: '/hr/payroll', icon: 'Wallet', group: 'Payroll', moduleSlug: 'payroll' }),
  item({ label: 'Salary Structures', href: '/hr/salary-structures', icon: 'IndianRupee', group: 'Payroll', moduleSlug: 'payroll' }),
  item({ label: 'Salary Components', href: '/hr/salary-components', icon: 'Layers', group: 'Payroll', moduleSlug: 'payroll' }),
  item({ label: 'Compensation', href: '/hr/compensation', icon: 'DollarSign', group: 'Payroll', moduleSlug: 'payroll' }),
  item({ label: 'Reimbursements', href: '/hr/reimbursements', icon: 'Receipt', group: 'Payroll', moduleSlug: 'reimbursements' }),
  item({ label: 'Performance', href: '/hr/performance', icon: 'Target', group: 'Performance', moduleSlug: 'performance' }),
  item({ label: 'Goals', href: '/hr/goals', icon: 'Crosshair', group: 'Performance', moduleSlug: 'performance' }),
  item({ label: 'Reviews', href: '/hr/reviews', icon: 'Star', group: 'Performance', moduleSlug: 'performance' }),
  item({ label: 'Recruitment', href: '/hr/recruitment', icon: 'UserPlus', group: 'Recruitment', moduleSlug: 'recruitment' }),
  item({ label: 'Job Board', href: '/hr/job-board', icon: 'Megaphone', group: 'Recruitment', moduleSlug: 'recruitment' }),
  item({ label: 'Learning', href: '/hr/learning', icon: 'BookOpen', group: 'Learning', moduleSlug: 'learning' }),
  item({ label: 'Travel & Expense', href: '/hr/travel', icon: 'Plane', group: 'Travel', moduleSlug: 'expenses' }),
  item({ label: 'Reports', href: '/hr/reports', icon: 'BarChart3', group: 'Reports', moduleSlug: 'analytics' }),
  item({ label: 'Report Builder', href: '/hr/report-builder', icon: 'FileSpreadsheet', group: 'Reports', moduleSlug: 'analytics' }),
  item({ label: 'Documents', href: '/hr/documents', icon: 'FolderOpen', group: 'Documents', moduleSlug: 'documents' }),
  item({ label: 'Policy Settings', href: '/hr/policy-settings', icon: 'SlidersHorizontal', group: 'Settings', moduleSlug: 'leave' }),
  item({ label: 'Compliance', href: '/hr/compliance', icon: 'Scale', group: 'Settings', moduleSlug: 'compliance' }),
  item({ label: 'Audit Logs', href: '/hr/audit-logs', icon: 'Shield', group: 'Settings', moduleSlug: 'compliance' }),
  item({ label: 'Notifications', href: '/hr/notifications', icon: 'Bell', group: 'Settings' }),
  item({ label: 'Profile', href: '/hr/profile', icon: 'User', group: 'Settings' }),
  item({ label: 'Settings', href: '/hr/settings', icon: 'Settings', group: 'Settings' }),
];

export const MANAGER_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Dashboard', href: '/manager/dashboard', icon: 'LayoutDashboard', group: 'Overview' }),
  item({ label: 'Request Leave', href: '/manager/request-leave', icon: 'FilePlus', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Team Calendar', href: '/manager/team-calendar', icon: 'CalendarDays', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Requests', href: '/manager/leave-requests', icon: 'ClipboardList', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Approvals', href: '/manager/approvals', icon: 'CheckSquare', group: 'Workflow', moduleSlug: 'leave' }),
  item({ label: 'Team Attendance', href: '/manager/team-attendance', icon: 'Clock', group: 'Team', moduleSlug: 'attendance' }),
  item({ label: 'My Attendance', href: '/manager/my-attendance', icon: 'Clock', group: 'Team', moduleSlug: 'attendance' }),
  item({ label: 'My Team', href: '/manager/team', icon: 'Users', group: 'Team', moduleSlug: 'employees' }),
  item({ label: 'Invite Team Member', href: '/manager/people/invite', icon: 'UserPlus', group: 'Team', moduleSlug: 'employees' }),
  item({ label: 'Directory', href: '/manager/directory', icon: 'Building2', group: 'Team', moduleSlug: 'employees' }),
  item({ label: 'Reporting Structure', href: '/manager/org-chart', icon: 'GitBranch', group: 'Team', moduleSlug: 'employees' }),
  item({ label: 'Performance', href: '/manager/performance', icon: 'Target', group: 'Team', moduleSlug: 'performance' }),
  item({ label: 'Reimbursements', href: '/manager/reimbursements', icon: 'Receipt', group: 'Finance', moduleSlug: 'reimbursements' }),
  item({ label: 'Payslips', href: '/manager/payslips', icon: 'Banknote', group: 'Finance', moduleSlug: 'payroll' }),
  item({ label: 'Reports', href: '/manager/reports', icon: 'BarChart3', group: 'Reports', moduleSlug: 'analytics' }),
  item({ label: 'Notifications', href: '/manager/notifications', icon: 'Bell', group: 'Account' }),
  item({ label: 'Profile', href: '/manager/profile', icon: 'User', group: 'Account' }),
  item({ label: 'Settings', href: '/manager/settings', icon: 'Settings', group: 'Account' }),
];

export const EMPLOYEE_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Dashboard', href: '/employee/dashboard', icon: 'LayoutDashboard', group: 'Overview' }),
  item({ label: 'Request Leave', href: '/employee/request-leave', icon: 'FilePlus', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave History', href: '/employee/leave-history', icon: 'CalendarDays', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Attendance', href: '/employee/attendance', icon: 'Clock', group: 'Time', moduleSlug: 'attendance' }),
  item({ label: 'Documents', href: '/employee/documents', icon: 'FolderOpen', group: 'Profile', moduleSlug: 'documents' }),
  item({ label: 'Directory', href: '/employee/directory', icon: 'Building2', group: 'Profile', moduleSlug: 'employees' }),
  item({ label: 'Payslips', href: '/employee/payslips', icon: 'Banknote', group: 'Finance', moduleSlug: 'payroll' }),
  item({ label: 'Reimbursements', href: '/employee/reimbursements', icon: 'Receipt', group: 'Finance', moduleSlug: 'reimbursements' }),
  item({ label: 'Travel & Expense', href: '/employee/travel', icon: 'Plane', group: 'Finance', moduleSlug: 'expenses' }),
  item({ label: 'My Learning', href: '/employee/learning', icon: 'BookOpen', group: 'Growth', moduleSlug: 'learning' }),
  item({ label: 'Performance', href: '/employee/performance', icon: 'Target', group: 'Growth', moduleSlug: 'performance' }),
  item({ label: 'Exit Checklist', href: '/employee/exit-checklist', icon: 'ClipboardList', group: 'Lifecycle', moduleSlug: 'exit' }),
  item({ label: 'Notifications', href: '/employee/notifications', icon: 'Bell', group: 'Account' }),
  item({ label: 'Profile', href: '/employee/profile', icon: 'User', group: 'Account' }),
  item({ label: 'Settings', href: '/employee/settings', icon: 'Settings', group: 'Account' }),
];

export const SUPER_ADMIN_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Dashboard', href: '/super-admin/dashboard', icon: 'LayoutDashboard', group: 'Platform' }),
  item({ label: 'Companies', href: '/super-admin/companies', icon: 'Building2', group: 'Platform' }),
  item({ label: 'Users', href: '/super-admin/users', icon: 'Users', group: 'Platform' }),
  item({ label: 'Invitations', href: '/super-admin/users/new', icon: 'FilePlus', group: 'Platform' }),
  item({ label: 'Operations', href: '/super-admin/operations', icon: 'Activity', group: 'Platform' }),
];

const PORTAL_NAV: Record<PortalSlug, ModuleNavItem[]> = {
  admin: ADMIN_NAV_ITEMS,
  hr: HR_NAV_ITEMS,
  manager: MANAGER_NAV_ITEMS,
  employee: EMPLOYEE_NAV_ITEMS,
  super_admin: SUPER_ADMIN_NAV_ITEMS,
};

function isModuleNavItemVisible(
  navItem: ModuleNavItem,
  enabled: Set<ModuleSlug>,
  permissionSet: Set<string>,
  hasWildcard: boolean
): boolean {
  if (navItem.permission && !hasWildcard && !permissionSet.has(navItem.permission)) {
    return false;
  }

  if (navItem.requiresAnyModule?.length) {
    return navItem.requiresAnyModule.some(
      (slug) => ALWAYS_VISIBLE.has(slug) || enabled.has(slug)
    );
  }

  if (!navItem.moduleSlug) {
    return true;
  }

  if (ALWAYS_VISIBLE.has(navItem.moduleSlug)) {
    return true;
  }

  return enabled.has(navItem.moduleSlug);
}

export function buildPortalNav(
  portal: PortalSlug,
  enabledSlugs: readonly ModuleSlug[],
  permissions: readonly string[] = []
): NavItem[] {
  const enabled = new Set(enabledSlugs);
  const permissionSet = new Set(permissions);
  const hasWildcard = permissionSet.has('*');

  return PORTAL_NAV[portal]
    .filter((navItem) => isModuleNavItemVisible(navItem, enabled, permissionSet, hasWildcard))
    .map(({ moduleSlug: _moduleSlug, requiresAnyModule: _requiresAnyModule, ...nav }) => nav);
}

export function getPortalNavDefinitions(portal: PortalSlug): ModuleNavItem[] {
  return PORTAL_NAV[portal];
}

/** Full nav for portals without module filtering (e.g. super admin). */
export function getStaticPortalNav(portal: PortalSlug): NavItem[] {
  return PORTAL_NAV[portal].map(
    ({ moduleSlug: _moduleSlug, requiresAnyModule: _requiresAnyModule, ...nav }) => nav
  );
}

/** Role portals that share the manager shell (manager + team_lead). */
export const MANAGER_LIKE_PORTALS: readonly PortalSlug[] = ['manager'];
