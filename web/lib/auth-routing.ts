export const AUTH_ENTRY_ROUTES = new Set(['/sign-in', '/admin/login']);

export function isDemoAuthEnabled(): boolean {
  return process.env.NODE_ENV !== 'production';
}

// Shared role-to-portal access matrix used by middleware and UI routing.
export const PORTAL_ROLE_MAP: Record<string, string[]> = {
  '/super-admin': ['super_admin'],
  '/admin': ['admin', 'super_admin'],
  '/hr': ['admin', 'hr', 'super_admin'],
  '/manager': ['admin', 'hr', 'director', 'manager', 'team_lead', 'super_admin'],
  '/employee': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee', 'super_admin'],
};

export const DEFAULT_PORTAL_BY_ROLE: Record<string, string> = {
  super_admin: '/super-admin/dashboard',
  admin: '/admin/dashboard',
  hr: '/hr/dashboard',
  director: '/manager/dashboard',
  manager: '/manager/dashboard',
  team_lead: '/manager/dashboard',
  employee: '/employee/dashboard',
};

export function normalizeRoles(primaryRole?: string | null, secondaryRoles?: string[] | null): string[] {
  const roles = new Set<string>();
  if (typeof primaryRole === 'string' && primaryRole.trim()) {
    roles.add(primaryRole.trim().toLowerCase());
  }
  if (Array.isArray(secondaryRoles)) {
    for (const role of secondaryRoles) {
      if (typeof role === 'string' && role.trim()) {
        roles.add(role.trim().toLowerCase());
      }
    }
  }
  return Array.from(roles);
}

export function getPortalPrefixForPath(pathname: string): string | null {
  const prefix = Object.keys(PORTAL_ROLE_MAP).find(
    (candidate) => pathname === candidate || pathname.startsWith(candidate + '/')
  );
  return prefix || null;
}

export function canAccessPath(pathname: string, roles: string[]): boolean {
  const portalPrefix = getPortalPrefixForPath(pathname);
  if (!portalPrefix) return true;
  const allowedRoles = PORTAL_ROLE_MAP[portalPrefix];
  return roles.some((role) => allowedRoles.includes(role.toLowerCase()));
}

export function getDefaultPortalForRole(role?: string | null): string {
  const normalizedRole = (role || '').toLowerCase();
  return DEFAULT_PORTAL_BY_ROLE[normalizedRole] || '/employee/dashboard';
}

const ROLE_PORTAL_PRIORITY = [
  'super_admin',
  'admin',
  'hr',
  'director',
  'manager',
  'team_lead',
  'employee',
] as const;

export function getDefaultPortalForRoles(
  primaryRole?: string | null,
  secondaryRoles?: string[] | null
): string {
  const roles = normalizeRoles(primaryRole, secondaryRoles);
  for (const role of ROLE_PORTAL_PRIORITY) {
    if (roles.includes(role)) {
      return getDefaultPortalForRole(role);
    }
  }
  return getDefaultPortalForRole(primaryRole);
}

export function isSafeRedirectPath(pathname: string | null): pathname is string {
  if (!pathname) return false;
  if (!pathname.startsWith('/')) return false;
  if (pathname.startsWith('//')) return false;
  if (pathname.startsWith('/api/')) return false;
  if (AUTH_ENTRY_ROUTES.has(pathname)) return false;
  return true;
}

const INTERNAL_REDIRECT_BASE = 'http://continuum.internal';

export function normalizeSafeRedirectTarget(target: string | null): string | null {
  if (!target) return null;

  const candidate = target.trim();
  if (!candidate) return null;

  try {
    const parsed = new URL(candidate, INTERNAL_REDIRECT_BASE);
    if (parsed.origin !== INTERNAL_REDIRECT_BASE) return null;
    if (!isSafeRedirectPath(parsed.pathname)) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}
