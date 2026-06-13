/**
 * Portal navigation definitions with module gating.
 */

import type { NavItem } from '@/components/portal-layout';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

export type PortalSlug = 'admin' | 'hr' | 'manager' | 'employee';

export interface ModuleNavItem extends NavItem {
  /** Module slug required to show this item (employees = always on). */
  moduleSlug?: ModuleSlug;
}

const ALWAYS_VISIBLE = new Set<ModuleSlug>(['employees']);

function item(
  partial: ModuleNavItem
): ModuleNavItem {
  return partial;
}

export const ADMIN_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Getting Started', href: '/admin/getting-started', icon: 'Rocket' }),
  item({ label: 'Dashboard', href: '/admin/dashboard', icon: 'LayoutDashboard' }),
  item({ label: 'Organization Setup', href: '/admin/setup-wizard', icon: 'Settings' }),
  item({ label: 'Leave Requests', href: '/admin/leave-requests', icon: 'ClipboardList', moduleSlug: 'leave' }),
  item({ label: 'People Ops', href: '/admin/people', icon: 'Users', moduleSlug: 'employees' }),
  item({ label: 'Payroll', href: '/hr/payroll', icon: 'Banknote', moduleSlug: 'payroll' }),
  item({ label: 'RBAC & Permissions', href: '/admin/rbac', icon: 'ShieldCheck' }),
  item({ label: 'System Health', href: '/admin/system-health', icon: 'Activity' }),
  item({ label: 'Notifications', href: '/admin/notifications', icon: 'Bell' }),
  item({ label: 'Profile', href: '/admin/profile', icon: 'User' }),
  item({ label: 'Audit Logs', href: '/admin/audit-logs', icon: 'Shield', moduleSlug: 'compliance' }),
  item({ label: 'Settings', href: '/admin/company-settings', icon: 'Building2' }),
  item({ label: 'Billing', href: '/admin/billing', icon: 'CreditCard' }),
];

export const HR_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Dashboard', href: '/hr/dashboard', icon: 'LayoutDashboard', group: 'Overview' }),
  item({ label: 'Leave Requests', href: '/hr/leave-requests', icon: 'ClipboardList', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Calendar', href: '/hr/leave-calendar', icon: 'CalendarCheck', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Balance', href: '/hr/leave-balance', icon: 'Scale', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Quotas', href: '/hr/leave-quotas', icon: 'Sliders', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Leave Encashment', href: '/hr/leave-encashment', icon: 'Banknote', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Holidays', href: '/hr/holidays', icon: 'CalendarDays', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Request Leave', href: '/hr/request-leave', icon: 'FilePlus', group: 'Leave', moduleSlug: 'leave' }),
  item({ label: 'Attendance', href: '/hr/attendance', icon: 'Clock', group: 'Attendance', moduleSlug: 'attendance' }),
  item({ label: 'Shifts', href: '/hr/shifts', icon: 'Timer', group: 'Attendance', moduleSlug: 'attendance' }),
  item({ label: 'Employees', href: '/hr/employees', icon: 'Users', group: 'People', moduleSlug: 'employees' }),
  item({ label: 'Bulk Import', href: '/hr/bulk-import', icon: 'Upload', group: 'People', moduleSlug: 'employees' }),
  item({ label: 'Organization', href: '/hr/organization', icon: 'Building2', group: 'People', moduleSlug: 'directory' }),
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
  item({ label: 'Approvals', href: '/hr/approvals', icon: 'CheckSquare', group: 'Workflow' }),
  item({ label: 'Approval Config', href: '/hr/approval-config', icon: 'GitBranch', group: 'Workflow', moduleSlug: 'leave' }),
  item({ label: 'Escalation', href: '/hr/escalation', icon: 'AlertTriangle', group: 'Workflow', moduleSlug: 'leave' }),
  item({ label: 'Reports', href: '/hr/reports', icon: 'BarChart3', group: 'Reports', moduleSlug: 'analytics' }),
  item({ label: 'Report Builder', href: '/hr/report-builder', icon: 'FileSpreadsheet', group: 'Reports', moduleSlug: 'analytics' }),
  item({ label: 'Documents', href: '/hr/documents', icon: 'FolderOpen', group: 'Documents', moduleSlug: 'documents' }),
  item({ label: 'Policy Settings', href: '/hr/policy-settings', icon: 'SlidersHorizontal', group: 'Settings' }),
  item({ label: 'Compliance', href: '/hr/compliance', icon: 'Scale', group: 'Settings', moduleSlug: 'compliance' }),
  item({ label: 'Audit Logs', href: '/hr/audit-logs', icon: 'Shield', group: 'Settings', moduleSlug: 'compliance' }),
  item({ label: 'Notifications', href: '/hr/notifications', icon: 'Bell', group: 'Settings' }),
  item({ label: 'Profile', href: '/hr/profile', icon: 'User', group: 'Settings' }),
  item({ label: 'Settings', href: '/hr/settings', icon: 'Settings', group: 'Settings' }),
];

export const MANAGER_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Dashboard', href: '/manager/dashboard', icon: 'LayoutDashboard' }),
  item({ label: 'Request Leave', href: '/manager/request-leave', icon: 'FilePlus', moduleSlug: 'leave' }),
  item({ label: 'Team Calendar', href: '/manager/team-calendar', icon: 'CalendarDays', moduleSlug: 'leave' }),
  item({ label: 'Approvals', href: '/manager/approvals', icon: 'CheckSquare' }),
  item({ label: 'Team Attendance', href: '/manager/team-attendance', icon: 'Clock', moduleSlug: 'attendance' }),
  item({ label: 'Team', href: '/manager/team', icon: 'Users', moduleSlug: 'employees' }),
  item({ label: 'Reimbursements', href: '/manager/reimbursements', icon: 'Receipt', moduleSlug: 'reimbursements' }),
  item({ label: 'Reports', href: '/manager/reports', icon: 'BarChart3', moduleSlug: 'analytics' }),
  item({ label: 'Notifications', href: '/manager/notifications', icon: 'Bell' }),
  item({ label: 'Profile', href: '/manager/profile', icon: 'User' }),
  item({ label: 'Settings', href: '/manager/settings', icon: 'Settings' }),
];

export const EMPLOYEE_NAV_ITEMS: ModuleNavItem[] = [
  item({ label: 'Dashboard', href: '/employee/dashboard', icon: 'LayoutDashboard' }),
  item({ label: 'Request Leave', href: '/employee/request-leave', icon: 'FilePlus', moduleSlug: 'leave' }),
  item({ label: 'Leave History', href: '/employee/leave-history', icon: 'CalendarDays', moduleSlug: 'leave' }),
  item({ label: 'Attendance', href: '/employee/attendance', icon: 'Clock', moduleSlug: 'attendance' }),
  item({ label: 'Documents', href: '/employee/documents', icon: 'FolderOpen', moduleSlug: 'documents' }),
  item({ label: 'Payslips', href: '/employee/payslips', icon: 'Banknote', moduleSlug: 'payroll' }),
  item({ label: 'Reimbursements', href: '/employee/reimbursements', icon: 'Receipt', moduleSlug: 'reimbursements' }),
  item({ label: 'My Learning', href: '/employee/learning', icon: 'BookOpen', moduleSlug: 'learning' }),
  item({ label: 'Travel & Expense', href: '/employee/travel', icon: 'Plane', moduleSlug: 'expenses' }),
  item({ label: 'Exit Checklist', href: '/employee/exit-checklist', icon: 'ClipboardList', moduleSlug: 'exit' }),
  item({ label: 'Notifications', href: '/employee/notifications', icon: 'Bell' }),
  item({ label: 'Profile', href: '/employee/profile', icon: 'User' }),
  item({ label: 'Settings', href: '/employee/settings', icon: 'Settings' }),
];

const PORTAL_NAV: Record<PortalSlug, ModuleNavItem[]> = {
  admin: ADMIN_NAV_ITEMS,
  hr: HR_NAV_ITEMS,
  manager: MANAGER_NAV_ITEMS,
  employee: EMPLOYEE_NAV_ITEMS,
};

export function buildPortalNav(
  portal: PortalSlug,
  enabledSlugs: readonly ModuleSlug[],
  permissions: readonly string[] = []
): NavItem[] {
  const enabled = new Set(enabledSlugs);
  const permissionSet = new Set(permissions);
  const hasWildcard = permissionSet.has('*');
  return PORTAL_NAV[portal]
    .filter((navItem) => {
      if (navItem.permission && !hasWildcard && !permissionSet.has(navItem.permission)) {
        return false;
      }
      if (!navItem.moduleSlug) return true;
      if (ALWAYS_VISIBLE.has(navItem.moduleSlug)) return true;
      return enabled.has(navItem.moduleSlug);
    })
    .map(({ moduleSlug: _moduleSlug, ...nav }) => nav);
}

export function getPortalNavDefinitions(portal: PortalSlug): ModuleNavItem[] {
  return PORTAL_NAV[portal];
}
