import prisma from '@/lib/prisma';
import type { PrismaClient } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'hr' | 'director' | 'manager' | 'team_lead' | 'employee';

export type PermissionCode =
  // Leave (9)
  | 'leave.apply_own'
  | 'leave.approve_team'
  | 'leave.approve_any'
  | 'leave.view_team'
  | 'leave.view_all'
  | 'leave.cancel_any'
  | 'leave.adjust_balance'
  | 'leave.override'
  | 'leave.encash'
  // Attendance (5)
  | 'attendance.mark_own'
  | 'attendance.view_team'
  | 'attendance.view_all'
  | 'attendance.regularize'
  | 'attendance.override'
  // Payroll (5)
  | 'payroll.view_own'
  | 'payroll.view_all'
  | 'payroll.generate'
  | 'payroll.approve'
  | 'payroll.process'
  // Employee (6)
  | 'employee.view_own'
  | 'employee.view_team'
  | 'employee.view_all'
  | 'employee.edit_any'
  | 'employee.onboard'
  | 'employee.terminate'
  // Company (4)
  | 'company.view_settings'
  | 'company.edit_settings'
  | 'company.manage_policies'
  | 'company.manage_billing'
  // Reports (3)
  | 'reports.view_team'
  | 'reports.view_all'
  | 'reports.export'
  // Audit (3)
  | 'audit.view_own'
  | 'audit.view_all'
  | 'audit.export'
  // Notifications (2)
  | 'notifications.manage_templates'
  | 'notifications.configure'
  // Security (3)
  | 'security.manage_api_keys'
  | 'security.view_logs'
  | 'security.manage_roles';

export type AccessScope = 'self' | 'team' | 'department' | 'company';

export interface PermissionDefinition {
  code: PermissionCode;
  module: string;
  description: string;
}

export interface EmployeeWithRole {
  id: string;
  org_id: string;
  primary_role: string;
  secondary_roles?: string[] | null;
  manager_id?: string | null;
}

// ─── Permission Catalog (40 unique codes) ────────────────────────────────────

export const PERMISSION_CATALOG: PermissionDefinition[] = [
  // Leave module
  { code: 'leave.apply_own', module: 'leave', description: 'Apply for own leave' },
  { code: 'leave.approve_team', module: 'leave', description: 'Approve team leave requests' },
  { code: 'leave.approve_any', module: 'leave', description: 'Approve any leave request' },
  { code: 'leave.view_team', module: 'leave', description: 'View team leave data' },
  { code: 'leave.view_all', module: 'leave', description: 'View all leave data' },
  { code: 'leave.cancel_any', module: 'leave', description: 'Cancel any approved leave' },
  { code: 'leave.adjust_balance', module: 'leave', description: 'Manually adjust leave balance' },
  { code: 'leave.override', module: 'leave', description: 'Override leave policy constraints' },
  { code: 'leave.encash', module: 'leave', description: 'Process leave encashment' },
  // Attendance module
  { code: 'attendance.mark_own', module: 'attendance', description: 'Mark own attendance' },
  { code: 'attendance.view_team', module: 'attendance', description: 'View team attendance' },
  { code: 'attendance.view_all', module: 'attendance', description: 'View all attendance' },
  { code: 'attendance.regularize', module: 'attendance', description: 'Approve attendance regularization' },
  { code: 'attendance.override', module: 'attendance', description: 'Override attendance records' },
  // Payroll module
  { code: 'payroll.view_own', module: 'payroll', description: 'View own payslip' },
  { code: 'payroll.view_all', module: 'payroll', description: 'View all payroll data' },
  { code: 'payroll.generate', module: 'payroll', description: 'Generate payroll run' },
  { code: 'payroll.approve', module: 'payroll', description: 'Approve payroll run' },
  { code: 'payroll.process', module: 'payroll', description: 'Process payroll payments' },
  // Employee module
  { code: 'employee.view_own', module: 'employee', description: 'View own profile' },
  { code: 'employee.view_team', module: 'employee', description: 'View team profiles' },
  { code: 'employee.view_all', module: 'employee', description: 'View all employee profiles' },
  { code: 'employee.edit_any', module: 'employee', description: 'Edit any employee profile' },
  { code: 'employee.onboard', module: 'employee', description: 'Onboard new employees' },
  { code: 'employee.terminate', module: 'employee', description: 'Terminate employees' },
  // Company module
  { code: 'company.view_settings', module: 'company', description: 'View company settings' },
  { code: 'company.edit_settings', module: 'company', description: 'Edit company settings' },
  { code: 'company.manage_policies', module: 'company', description: 'Manage leave policies' },
  { code: 'company.manage_billing', module: 'company', description: 'Manage billing and subscription' },
  // Reports module
  { code: 'reports.view_team', module: 'reports', description: 'View team reports' },
  { code: 'reports.view_all', module: 'reports', description: 'View all reports' },
  { code: 'reports.export', module: 'reports', description: 'Export reports' },
  // Audit module
  { code: 'audit.view_own', module: 'audit', description: 'View own audit trail' },
  { code: 'audit.view_all', module: 'audit', description: 'View all audit logs' },
  { code: 'audit.export', module: 'audit', description: 'Export audit logs' },
  // Notifications module
  { code: 'notifications.manage_templates', module: 'notifications', description: 'Manage notification templates' },
  { code: 'notifications.configure', module: 'notifications', description: 'Configure notification settings' },
  // Security module
  { code: 'security.manage_api_keys', module: 'security', description: 'Manage API keys' },
  { code: 'security.view_logs', module: 'security', description: 'View security logs' },
  { code: 'security.manage_roles', module: 'security', description: 'Manage roles and permissions' },
];

export const ALL_PERMISSION_CODES: PermissionCode[] = PERMISSION_CATALOG.map((p) => p.code);

// ─── Default Role Permissions ────────────────────────────────────────────────

const EMPLOYEE_PERMISSIONS: PermissionCode[] = [
  'leave.apply_own',
  'attendance.mark_own',
  'payroll.view_own',
  'employee.view_own',
  'audit.view_own',
];

const TEAM_LEAD_PERMISSIONS: PermissionCode[] = [
  ...EMPLOYEE_PERMISSIONS,
  'leave.approve_team',
  'leave.view_team',
  'attendance.view_team',
  'employee.view_team',
  'reports.view_team',
];

const MANAGER_PERMISSIONS: PermissionCode[] = [
  ...TEAM_LEAD_PERMISSIONS,
  'attendance.regularize',
];

const DIRECTOR_PERMISSIONS: PermissionCode[] = [
  ...MANAGER_PERMISSIONS,
  'leave.view_all',
  'attendance.view_all',
  'employee.view_all',
  'reports.view_all',
  'company.view_settings',
];

const HR_PERMISSIONS: PermissionCode[] = [
  ...DIRECTOR_PERMISSIONS,
  'leave.approve_any',
  'leave.cancel_any',
  'leave.adjust_balance',
  'leave.encash',
  'attendance.override',
  'payroll.view_all',
  'payroll.generate',
  'employee.edit_any',
  'employee.onboard',
  'employee.terminate',
  'reports.export',
  'audit.view_all',
  'audit.export',
  'company.edit_settings',
  'company.manage_policies',
  'notifications.manage_templates',
  'notifications.configure',
];

const ADMIN_PERMISSIONS: PermissionCode[] = [...ALL_PERMISSION_CODES];

export const DEFAULT_ROLE_PERMISSIONS: Record<UserRole, PermissionCode[]> = {
  admin: ADMIN_PERMISSIONS,
  hr: HR_PERMISSIONS,
  director: DIRECTOR_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  team_lead: TEAM_LEAD_PERMISSIONS,
  employee: EMPLOYEE_PERMISSIONS,
};

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Fetches permissions for an employee. Uses company-specific overrides from DB
 * if available, otherwise falls back to default role permissions.
 */
export async function getUserPermissions(
  empId: string,
  companyId: string
): Promise<PermissionCode[]> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: empId },
      select: { primary_role: true, secondary_roles: true },
    });

    if (!employee) return [];

    const roles = getEffectiveRoles(employee as EmployeeWithRole);

    // Check for company-specific overrides
    const companyOverrides = await prisma.rolePermission.findMany({
      where: {
        company_id: companyId,
        role: { in: roles as string[] },
      },
      include: { permission: true },
    });

    if (companyOverrides.length > 0) {
      const overridePerms: PermissionCode[] = companyOverrides.map(
        (rp: { permission: { code: string } }) => rp.permission.code as PermissionCode
      );
      return [...new Set(overridePerms)] as PermissionCode[];
    }

    // Fall back to default permissions for all effective roles
    const permissions = new Set<PermissionCode>();
    for (const role of roles) {
      const rolePerms = DEFAULT_ROLE_PERMISSIONS[role] || [];
      rolePerms.forEach((p) => permissions.add(p));
    }

    return [...permissions];
  } catch {
    // On DB error, return defaults for the primary role only
    return DEFAULT_ROLE_PERMISSIONS.employee;
  }
}

/** Check if a permission set includes a specific code */
export function hasPermission(
  permissions: PermissionCode[],
  code: PermissionCode
): boolean {
  return permissions.includes(code);
}

/** Combine primary + secondary roles into a deduplicated set */
export function getEffectiveRoles(employee: EmployeeWithRole): UserRole[] {
  const roles = new Set<UserRole>();
  roles.add(employee.primary_role as UserRole);

  if (employee.secondary_roles && Array.isArray(employee.secondary_roles)) {
    for (const role of employee.secondary_roles) {
      if (isValidRole(role)) {
        roles.add(role);
      }
    }
  }

  return [...roles];
}

/** Returns the access scope for a role */
export function getAccessScope(role: UserRole): AccessScope {
  switch (role) {
    case 'admin':
    case 'hr':
      return 'company';
    case 'director':
      return 'department';
    case 'manager':
    case 'team_lead':
      return 'team';
    case 'employee':
    default:
      return 'self';
  }
}

/**
 * Walks the manager chain up to 4 levels to verify if managerId
 * is a manager of employeeId.
 */
export async function isManagerOf(
  managerId: string,
  employeeId: string,
  db: PrismaClient = prisma
): Promise<boolean> {
  const MAX_LEVELS = 4;
  let currentId: string | null = employeeId;

  for (let i = 0; i < MAX_LEVELS; i++) {
    const emp = await db.employee.findUnique({
      where: { id: currentId! },
      select: { manager_id: true },
    }) as { manager_id: string | null } | null;

    if (!emp || !emp.manager_id) return false;
    if (emp.manager_id === managerId) return true;

    currentId = emp.manager_id;
  }

  return false;
}

/** Get all direct reports and their reports (team members) for a manager */
export async function getTeamMembers(
  managerId: string,
  companyId: string,
  db: PrismaClient = prisma
): Promise<string[]> {
  const teamIds: string[] = [];
  const queue: string[] = [managerId];
  const visited = new Set<string>();
  const MAX_DEPTH = 4;
  let depth = 0;

  while (queue.length > 0 && depth < MAX_DEPTH) {
    const currentBatch = [...queue];
    queue.length = 0;
    depth++;

    const directReports = await db.employee.findMany({
      where: {
        manager_id: { in: currentBatch },
        org_id: companyId,
        deleted_at: null,
      },
      select: { id: true },
    });

    for (const report of directReports) {
      if (!visited.has(report.id)) {
        visited.add(report.id);
        teamIds.push(report.id);
        queue.push(report.id);
      }
    }
  }

  return teamIds;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const VALID_ROLES: UserRole[] = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'];

function isValidRole(role: string): role is UserRole {
  return VALID_ROLES.includes(role as UserRole);
}

export { VALID_ROLES };
