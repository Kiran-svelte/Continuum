import { redirect } from 'next/navigation';
import { getDefaultPortalForRole } from '@/lib/auth-routing';
import type { AuthEmployee } from '@/lib/auth-guard';
import type { UserRole } from '@/lib/rbac';

export type PortalSlug = 'admin' | 'hr' | 'manager' | 'employee';

const PORTAL_ALLOWED_PRIMARY_ROLES: Record<PortalSlug, readonly UserRole[]> = {
  admin: ['admin'],
  hr: ['hr'],
  manager: ['manager', 'director', 'team_lead'],
  employee: ['employee'],
};

const ROLE_LABELS: Record<string, string> = {
  super_admin: 'Platform Administrator',
  admin: 'Company Admin',
  hr: 'HR',
  director: 'Director',
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
};

/** Human-readable label for sidebar / profile chrome from primary_role only. */
export function getPortalRoleLabel(primaryRole?: string | null): string {
  const key = (primaryRole || '').trim().toLowerCase();
  return ROLE_LABELS[key] || (key ? key.replace(/_/g, ' ') : 'User');
}

/**
 * Server layout guard: one credential → one portal (primary_role only).
 * Redirects to the user's home portal when they hit another role's routes.
 */
export function enforcePortalPrimaryRole(employee: AuthEmployee, portal: PortalSlug): void {
  if (employee.primary_role === 'super_admin') {
    redirect('/super-admin/dashboard');
  }

  const allowed = PORTAL_ALLOWED_PRIMARY_ROLES[portal];
  if (!allowed.includes(employee.primary_role as UserRole)) {
    redirect(getDefaultPortalForRole(employee.primary_role));
  }
}
