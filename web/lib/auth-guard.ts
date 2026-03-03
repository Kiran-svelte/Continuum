import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifyIdToken, type DecodedIdToken } from '@/lib/firebase-admin';
import {
  getUserPermissions,
  hasPermission,
  type UserRole,
  type PermissionCode,
  type AccessScope,
  getAccessScope,
  VALID_ROLES,
} from '@/lib/rbac';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AuthEmployee {
  id: string;
  auth_id: string;
  email: string;
  first_name: string;
  last_name: string;
  org_id: string;
  primary_role: UserRole;
  secondary_roles: string[] | null;
  department: string | null;
  status: string;
  permissions: PermissionCode[];
  accessScope: AccessScope;
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

// ─── Firebase Token Constants ───────────────────────────────────────────────

const AUTH_COOKIE_NAME = 'firebase-auth-token';

// ─── Firebase Auth Helpers ──────────────────────────────────────────────────

/**
 * Gets the Firebase ID token from the session cookie
 */
export async function getTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(AUTH_COOKIE_NAME)?.value ?? null;
}

/**
 * Gets the authenticated user from either Bearer token (Authorization header) or session cookies.
 * Prefers Bearer token if present.
 */
export async function getAuthUserFromRequest(request: Request): Promise<{ user: DecodedIdToken | null; error: Error | null }> {
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const decodedToken = await verifyIdToken(token);
      return { user: decodedToken, error: null };
    } catch (err) {
      return { user: null, error: err instanceof Error ? err : new Error('Invalid token') };
    }
  }
  
  // Fall back to cookie-based auth
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookies = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...val] = c.split('=');
        return [key, val.join('=')];
      })
    );
    const token = cookies[AUTH_COOKIE_NAME];
    if (token) {
      try {
        const decodedToken = await verifyIdToken(token);
        return { user: decodedToken, error: null };
      } catch (err) {
        return { user: null, error: err instanceof Error ? err : new Error('Invalid token') };
      }
    }
  }
  
  return { user: null, error: new Error('No authentication token found') };
}

// ─── Auth Guards ─────────────────────────────────────────────────────────────

/**
 * Extracts auth from Firebase, looks up Employee via Prisma.
 * Returns the authenticated employee with role, company, and permissions.
 */
export async function getAuthEmployee(): Promise<AuthEmployee> {
  const token = await getTokenFromCookies();
  
  if (!token) {
    throw new AuthError('Authentication required', 401);
  }

  let decodedToken: DecodedIdToken;
  try {
    decodedToken = await verifyIdToken(token);
  } catch {
    throw new AuthError('Invalid or expired token', 401);
  }

  const employee = await prisma.employee.findUnique({
    where: { auth_id: decodedToken.uid },
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
      status: true,
    },
  });

  if (!employee) {
    throw new AuthError('Employee record not found', 401);
  }

  if (employee.status === 'terminated' || employee.status === 'exited') {
    throw new AuthError('Account is no longer active', 403);
  }

  const permissions = await getUserPermissions(employee.id, employee.org_id);
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
    status: employee.status,
    permissions,
    accessScope: getAccessScope(primaryRole),
  };
}

/** Throws 403 if employee does not hold any of the required roles */
export function requireRole(employee: AuthEmployee, ...roles: UserRole[]): void {
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
  if (employee.org_id !== targetCompanyId) {
    throw new AuthError('Forbidden: cross-company access denied', 403);
  }
}

export { VALID_ROLES };
