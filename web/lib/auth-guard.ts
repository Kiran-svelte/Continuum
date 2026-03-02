import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
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

// ─── Supabase Server Client ─────────────────────────────────────────────────

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Ignore cookie set errors in Server Components
          }
        },
      },
    }
  );
}

// ─── Auth Guards ─────────────────────────────────────────────────────────────

/**
 * Extracts auth from Supabase, looks up Employee via Prisma.
 * Returns the authenticated employee with role, company, and permissions.
 */
export async function getAuthEmployee(): Promise<AuthEmployee> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new AuthError('Authentication required', 401);
  }

  const employee = await prisma.employee.findUnique({
    where: { auth_id: user.id },
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
