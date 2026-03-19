// ─── Auth Guards ─────────────────────────────────────────────────────────
//
// Server-side authentication and authorization guards.
// Uses custom JWT auth (replaces Supabase).
//

import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import {
  verifyAccessToken,
  extractAccessToken,
  ACCESS_COOKIE_NAME,
  type AccessTokenPayload,
} from '@/lib/jwt-service';
import {
  getUserPermissions,
  hasPermission,
  type UserRole,
  type PermissionCode,
  type AccessScope,
  getAccessScope,
  VALID_ROLES,
} from '@/lib/rbac';
import type { Role } from '@prisma/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthEmployee {
  id: string;
  auth_id: string | null;
  email: string;
  first_name: string;
  last_name: string;
  org_id: string | null;
  primary_role: UserRole;
  secondary_roles: string[] | null;
  department: string | null;
  gender: string | null;
  status: string;
  permissions: PermissionCode[];
  accessScope: AccessScope;
  tutorialCompleted: boolean;
  mustChangePassword: boolean;
}

export interface DecodedUser {
  uid: string;
  email?: string;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

// ─── Request-Level Auth (for API routes that receive raw requests) ───────────

/**
 * Gets the authenticated user from access token (header or cookie).
 */
export async function getAuthUserFromRequest(request: Request): Promise<{ user: DecodedUser | null; error: Error | null }> {
  const token = extractAccessToken(request);
  
  if (!token) {
    return { user: null, error: new Error('No authentication token found') };
  }

  try {
    const payload = await verifyAccessToken(token);
    return {
      user: { uid: payload.sub, email: payload.email },
      error: null,
    };
  } catch (err) {
    return {
      user: null,
      error: err instanceof Error ? err : new Error('Invalid token'),
    };
  }
}

// ─── Auth Guards (Server Components / Route Handlers via cookies()) ─────────

/**
 * Extracts auth from access token cookie, looks up Employee via Prisma.
 * Returns the authenticated employee with role, company, and permissions.
 */
export async function getAuthEmployee(): Promise<AuthEmployee> {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get(ACCESS_COOKIE_NAME)?.value;

  if (!accessToken) {
    throw new AuthError('Authentication required', 401);
  }

  let payload: AccessTokenPayload;
  try {
    payload = await verifyAccessToken(accessToken);
  } catch {
    throw new AuthError('Invalid or expired token', 401);
  }

  // Handle super admin
  if (payload.role === 'super_admin') {
    const superAdmin = await prisma.superAdmin.findUnique({
      where: { id: payload.sub },
    });

    if (!superAdmin || !superAdmin.is_active) {
      throw new AuthError('Account not found or inactive', 401);
    }

    return {
      id: superAdmin.id,
      auth_id: null,
      email: superAdmin.email,
      first_name: superAdmin.name.split(' ')[0] || superAdmin.name,
      last_name: superAdmin.name.split(' ').slice(1).join(' ') || '',
      org_id: null,
      primary_role: 'super_admin' as UserRole,
      secondary_roles: null,
      department: null,
      gender: null,
      status: 'active',
      permissions: ['*'] as PermissionCode[], // Super admin has all permissions
      accessScope: 'platform' as AccessScope,
      tutorialCompleted: true,
      mustChangePassword: false,
    };
  }

  // Handle regular employees
  const employee = await prisma.employee.findUnique({
    where: { id: payload.sub },
    select: {
      id: true,
      auth_id: true,
      email: true,
      first_name: true,
      last_name: true,
      org_id: true,
      primary_role: true,
      secondary_roles: true,
      department: true,
      gender: true,
      status: true,
      tutorial_completed: true,
      must_change_password: true,
    },
  });

  if (!employee) {
    throw new AuthError('Employee record not found', 401);
  }

  if (employee.status === 'terminated' || employee.status === 'exited' || employee.status === 'suspended') {
    throw new AuthError('Account is no longer active', 403);
  }

  const permissions = employee.org_id 
    ? await getUserPermissions(employee.id, employee.org_id)
    : [];
  const primaryRole = employee.primary_role as UserRole;

  return {
    id: employee.id,
    auth_id: employee.auth_id,
    email: employee.email,
    first_name: employee.first_name,
    last_name: employee.last_name,
    org_id: employee.org_id,
    primary_role: primaryRole,
    secondary_roles: employee.secondary_roles as string[] | null,
    department: employee.department,
    gender: employee.gender ?? null,
    status: employee.status,
    permissions,
    accessScope: getAccessScope(primaryRole),
    tutorialCompleted: employee.tutorial_completed,
    mustChangePassword: employee.must_change_password,
  };
}

/** Throws 403 if employee does not hold any of the required roles */
export function requireRole(employee: AuthEmployee, ...roles: UserRole[]): void {
  // Super admin can access everything
  if (employee.primary_role === 'super_admin') {
    return;
  }

  const hasRole = roles.some(
    (role) =>
      employee.primary_role === role ||
      (employee.secondary_roles && employee.secondary_roles.includes(role))
  );

  if (!hasRole) {
    throw new AuthError(
      `Forbidden: requires one of [${roles.join(', ')}]`,
      403
    );
  }
}

/** Checks that the employee has a specific permission code */
export function requirePermissionGuard(
  employee: AuthEmployee,
  permissionCode: PermissionCode
): void {
  // Super admin has all permissions
  if (employee.primary_role === 'super_admin' || employee.permissions.includes('*' as PermissionCode)) {
    return;
  }

  if (!hasPermission(employee.permissions, permissionCode)) {
    throw new AuthError(
      `Forbidden: missing permission '${permissionCode}'`,
      403
    );
  }
}

/** Validates tenant isolation: employee must belong to the target company */
export function requireCompanyAccess(
  employee: AuthEmployee,
  targetCompanyId: string
): void {
  // Super admin can access any company
  if (employee.primary_role === 'super_admin') {
    return;
  }

  if (employee.org_id !== targetCompanyId) {
    throw new AuthError('Forbidden: cross-company access denied', 403);
  }
}

/** Requires super admin role */
export function requireSuperAdmin(employee: AuthEmployee): void {
  if (employee.primary_role !== 'super_admin') {
    throw new AuthError('Forbidden: super admin access required', 403);
  }
}

export { VALID_ROLES };
