/**
 * Shared constants used across the application.
 * Centralizes configuration to avoid duplication.
 */

// ─── Role Definitions ─────────────────────────────────────────────────────────

/**
 * Valid user roles matching Prisma schema enum.
 * Ordered from highest to lowest privilege.
 */
export const VALID_ROLES = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'] as const;
export type ValidRole = typeof VALID_ROLES[number];

/**
 * Maps portal paths to the roles that can access them.
 * Used by middleware, sign-in page, and portal-switcher.
 */
export const PORTAL_ROLE_MAP: Record<string, ValidRole[]> = {
  '/admin': ['admin'],
  '/hr': ['admin', 'hr'],
  '/manager': ['admin', 'hr', 'director', 'manager', 'team_lead'],
  '/employee': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
};

/**
 * Portal definitions with metadata.
 * Used by sign-in portal picker and portal-switcher.
 */
export const PORTALS = [
  {
    key: 'admin' as const,
    label: 'Admin Portal',
    description: 'System settings, RBAC, health monitoring',
    href: '/admin/dashboard',
    roles: ['admin'] as ValidRole[],
    color: 'text-red-500',
    bg: 'bg-red-500/10',
    border: 'border-red-200 dark:border-red-900',
  },
  {
    key: 'hr' as const,
    label: 'HR Portal',
    description: 'Employees, payroll, policies, reports',
    href: '/hr/dashboard',
    roles: ['admin', 'hr'] as ValidRole[],
    color: 'text-purple-500',
    bg: 'bg-purple-500/10',
    border: 'border-purple-200 dark:border-purple-900',
  },
  {
    key: 'manager' as const,
    label: 'Manager Portal',
    description: 'Team, approvals, attendance, calendar',
    href: '/manager/dashboard',
    roles: ['admin', 'hr', 'director', 'manager', 'team_lead'] as ValidRole[],
    color: 'text-blue-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-200 dark:border-blue-900',
  },
  {
    key: 'employee' as const,
    label: 'Employee Portal',
    description: 'Leave, attendance, payslips, documents',
    href: '/employee/dashboard',
    roles: ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'] as ValidRole[],
    color: 'text-emerald-500',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-900',
  },
] as const;

export type PortalKey = typeof PORTALS[number]['key'];

/**
 * Returns the default portal for a given role.
 */
export function getDefaultPortalForRole(role: ValidRole): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'hr') return '/hr/dashboard';
  if (['manager', 'director', 'team_lead'].includes(role)) return '/manager/dashboard';
  return '/employee/dashboard';
}

/**
 * Returns all accessible portals for a set of roles.
 */
export function getAccessiblePortals(roles: string[]): typeof PORTALS[number][] {
  return PORTALS.filter((p) => p.roles.some((r) => roles.includes(r)));
}
