import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { verifyIdToken } from '@/lib/firebase-admin';
import { getSupabaseServerClient } from '@/lib/supabase-server';
import {
  verifyKeycloakToken,
  isKeycloakEnabled,
  KEYCLOAK_TOKEN_COOKIE,
  KEYCLOAK_REFRESH_COOKIE,
} from '@/lib/keycloak';
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

// ─── Supabase Auth Constants ────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Create admin client for server-side JWT verification
function getSupabaseAdmin() {
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ─── Supabase Auth Helpers ──────────────────────────────────────────────────

/**
 * Verifies a Supabase JWT token and returns the user
 */
async function verifySupabaseToken(token: string): Promise<DecodedUser> {
  const supabase = getSupabaseAdmin();
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  
  if (error || !user) {
    throw new Error(error?.message || 'Invalid token');
  }
  
  return {
    uid: user.id,
    email: user.email,
  };
}

/**
 * Verifies a Firebase ID token and returns the user
 */
async function verifyFirebaseToken(token: string): Promise<DecodedUser> {
  const decoded = await verifyIdToken(token);
  return {
    uid: decoded.uid,
    email: decoded.email,
  };
}

/**
 * Verifies a token by trying Keycloak first (if enabled), then Firebase, then Supabase.
 */
async function verifyToken(token: string): Promise<DecodedUser> {
  // Try Keycloak first if enabled
  if (isKeycloakEnabled()) {
    try {
      return await verifyKeycloakToken(token);
    } catch {
      // Fall through to Firebase
    }
  }

  // Try Firebase
  try {
    return await verifyFirebaseToken(token);
  } catch {
    // Fall back to Supabase
    return await verifySupabaseToken(token);
  }
}

/**
 * Gets the authenticated user from either Bearer token (Authorization header) or cookies.
 * Tries Firebase verification first, then falls back to Supabase.
 * Prefers Bearer token if present.
 */
export async function getAuthUserFromRequest(request: Request): Promise<{ user: DecodedUser | null; error: Error | null }> {
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const user = await verifyToken(token);
      return { user, error: null };
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

    // Try Firebase session cookie first
    const firebaseToken = cookies['firebase-auth-token'];
    if (firebaseToken) {
      try {
        const decoded = decodeURIComponent(firebaseToken);
        const user = await verifyFirebaseToken(decoded);
        return { user, error: null };
      } catch {
        // Firebase cookie invalid, fall through to Supabase
      }
    }

    // Fall back to Supabase access token in cookies
    // Dynamically find the Supabase auth cookie by looking for sb-*-auth-token pattern
    const supabaseCookieKey = Object.keys(cookies).find(key => key.startsWith('sb-') && key.endsWith('-auth-token'));
    const accessToken = supabaseCookieKey ? cookies[supabaseCookieKey] : undefined;
    if (accessToken) {
      try {
        // Parse the cookie JSON structure
        const tokenData = JSON.parse(decodeURIComponent(accessToken));
        const token = tokenData.access_token || tokenData;
        if (typeof token === 'string') {
          const user = await verifySupabaseToken(token);
          return { user, error: null };
        }
      } catch (err) {
        return { user: null, error: err instanceof Error ? err : new Error('Invalid token') };
      }
    }
  }
  
  return { user: null, error: new Error('No authentication token found') };
}

// ─── Auth Guards ─────────────────────────────────────────────────────────────

/**
 * Extracts the Supabase project ID from the URL for cookie name construction
 */
function getSupabaseProjectId(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  // URL format: https://<project-id>.supabase.co
  const match = url.match(/https:\/\/([^.]+)\.supabase/);
  return match?.[1] || 'default';
}

/**
 * Extracts auth from Firebase or Supabase, looks up Employee via Prisma.
 * Tries Firebase session cookie first, then falls back to Supabase server client.
 * Returns the authenticated employee with role, company, and permissions.
 */
export async function getAuthEmployee(): Promise<AuthEmployee> {
  const cookieStore = await cookies();

  let decodedUser: DecodedUser | null = null;

  // 1. Try Keycloak token first (if enabled)
  if (isKeycloakEnabled()) {
    const kcCookie = cookieStore.get(KEYCLOAK_TOKEN_COOKIE);
    if (kcCookie?.value) {
      try {
        decodedUser = await verifyKeycloakToken(kcCookie.value);
      } catch {
        // Keycloak token invalid, fall through to other providers
      }
    }
  }

  // 2. Try Firebase session cookie
  if (!decodedUser) {
    const firebaseCookie = cookieStore.get('firebase-auth-token');
    if (firebaseCookie?.value) {
      try {
        const token = decodeURIComponent(firebaseCookie.value);
        decodedUser = await verifyFirebaseToken(token);
      } catch {
        // Firebase cookie invalid, fall through to Supabase
      }
    }
  }

  // Fall back to Supabase server client (handles cookies automatically)
  if (!decodedUser) {
    try {
      const supabase = await getSupabaseServerClient();
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error || !user) {
        throw new AuthError('Authentication required', 401);
      }
      
      decodedUser = {
        uid: user.id,
        email: user.email,
      };
    } catch (err) {
      if (err instanceof AuthError) throw err;
      throw new AuthError('Invalid or expired token', 401);
    }
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
