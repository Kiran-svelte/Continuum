import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifySupabaseToken } from '@/lib/supabase-server';
import {
  verifySessionToken,
  SESSION_COOKIE_NAME,
  type SessionPayload,
} from '@/lib/session';
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
  gender: string | null;
  status: string;
  permissions: PermissionCode[];
  accessScope: AccessScope;
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

// ─── Token Verification Helpers ─────────────────────────────────────────────

/**
 * Verifies a Supabase access token and returns the user.
 */
async function verifyBearerToken(token: string): Promise<DecodedUser> {
  const user = await verifySupabaseToken(token);
  if (!user) throw new Error('Invalid Supabase token');
  return {
    uid: user.id,
    email: user.email,
  };
}

// ─── Request-Level Auth (for API routes that receive raw requests) ───────────

/**
 * Gets the authenticated user from either Bearer token (Authorization header)
 * or session cookie.
 *
 * Auth resolution order:
 * 1. Bearer token → verify via Supabase Admin API
 * 2. continuum-session cookie → verify signed JWT locally (no network call)
 */
export async function getAuthUserFromRequest(request: Request): Promise<{ user: DecodedUser | null; error: Error | null }> {
  // 1. Check Authorization header first
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const user = await verifyBearerToken(token);
      return { user, error: null };
    } catch (err) {
      return { user: null, error: err instanceof Error ? err : new Error('Invalid token') };
    }
  }

  // 2. Check session cookie
  const cookieHeader = request.headers.get('cookie');
  if (cookieHeader) {
    const cookieMap = Object.fromEntries(
      cookieHeader.split('; ').map(c => {
        const [key, ...val] = c.split('=');
        return [key, val.join('=')];
      })
    );

    // Try continuum-session JWT (primary — no network call needed)
    const sessionToken = cookieMap[SESSION_COOKIE_NAME];
    if (sessionToken) {
      try {
        const session = await verifySessionToken(sessionToken);
        return { user: { uid: session.uid, email: session.email }, error: null };
      } catch {
        // Session JWT invalid/expired, fall through
      }
    }
  }

  return { user: null, error: new Error('No authentication token found') };
}

// ─── Auth Guards (Server Components / Route Handlers via cookies()) ─────────

/**
 * Extracts auth from session cookie, looks up Employee via Prisma.
 *
 * Auth resolution order:
 * 1. continuum-session JWT cookie → verify locally (no network call)
 *
 * Returns the authenticated employee with role, company, and permissions.
 */
export async function getAuthEmployee(): Promise<AuthEmployee> {
  const cookieStore = await cookies();

  let decodedUser: DecodedUser | null = null;

  // Try continuum-session JWT (primary — fast, no network call)
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) {
    try {
      const session = await verifySessionToken(sessionCookie.value);
      decodedUser = { uid: session.uid, email: session.email };
    } catch {
      // Session JWT invalid/expired
    }
  }

  if (!decodedUser) {
    throw new AuthError('Authentication required', 401);
  }

  const employee = await prisma.employee.findUnique({
    where: { auth_id: decodedUser.uid },
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
    },
  });

  if (!employee) {
    throw new AuthError('Employee record not found', 401);
  }

  if (employee.status === 'terminated' || employee.status === 'exited' || employee.status === 'suspended') {
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
    gender: employee.gender ?? null,
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
