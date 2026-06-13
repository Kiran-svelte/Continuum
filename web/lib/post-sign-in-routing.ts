import { canAccessPath, getDefaultPortalForRole, getPortalPrefixForPath, isSafeRedirectPath } from '@/lib/auth-routing';
import {
  requiresCompanyOnboarding,
  requiresEmployeeOnboarding,
} from '@/lib/employee-onboarding';
import { isPortalPathAllowedByModules } from '@/lib/middleware-module-paths';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

export type PostSignInMe = {
  primary_role?: string | null;
  org_id?: string | null;
  company?: { onboarding_completed?: boolean | null } | null;
  employee_onboarding_completed?: boolean;
  employee_welcome_pending?: boolean;
  enabledModules?: ModuleSlug[] | string[] | null;
};

/**
 * Single source of truth for where to send a user immediately after sign-in.
 * Uses primary_role only — never promotes via secondary_roles to company-admin onboarding.
 */
export function resolvePostSignInPath(
  me: PostSignInMe,
  options?: { redirectTarget?: string | null }
): string {
  const primaryRole = (me.primary_role || '').trim().toLowerCase();
  const redirectTarget = options?.redirectTarget ?? null;

  if (
    requiresCompanyOnboarding(primaryRole) &&
    (!me.org_id || me.company?.onboarding_completed === false)
  ) {
    return '/onboarding';
  }

  if (requiresEmployeeOnboarding(primaryRole)) {
    if (me.employee_onboarding_completed !== true) {
      return '/employee/onboarding';
    }
    if (me.employee_welcome_pending === true) {
      return '/employee/welcome';
    }
  }

  if (isSafeRedirectPath(redirectTarget)) {
    const target = redirectTarget as string;
    const pathname = target.split('?')[0] ?? target;
    const isCompanyOnboardingPath =
      pathname === '/onboarding' || pathname.startsWith('/onboarding/');
    const homePortalPrefix = getPortalPrefixForPath(getDefaultPortalForRole(primaryRole));
    const redirectPortalPrefix = getPortalPrefixForPath(pathname);
    const redirectAllowedForRole =
      homePortalPrefix !== null &&
      redirectPortalPrefix === homePortalPrefix &&
      canAccessPath(pathname, [primaryRole]) &&
      (!isCompanyOnboardingPath || requiresCompanyOnboarding(primaryRole));
    const redirectAllowedForModules = isPortalPathAllowedByModules(
      pathname,
      new Set(me.enabledModules ?? [])
    );
    if (redirectAllowedForRole && redirectAllowedForModules) {
      return target;
    }
  }

  return getDefaultPortalForRole(primaryRole);
}
