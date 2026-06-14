import type { ModuleSlug } from '@/lib/core-functions/catalog';
import {
  ADMIN_NAV_ITEMS,
  EMPLOYEE_NAV_ITEMS,
  HR_NAV_ITEMS,
  MANAGER_NAV_ITEMS,
  type ModuleNavItem,
} from '@/lib/navigation/portal-nav';
import { moduleSlugForPortalPath } from '@/lib/middleware-module-paths';

const ALL_NAV_ITEMS: ModuleNavItem[] = [
  ...ADMIN_NAV_ITEMS,
  ...HR_NAV_ITEMS,
  ...MANAGER_NAV_ITEMS,
  ...EMPLOYEE_NAV_ITEMS,
];

export interface NavMiddlewareGap {
  href: string;
  expectedSlug: ModuleSlug;
  resolvedSlug: ModuleSlug | null;
}

/**
 * Returns nav hrefs that require module gating but are not covered by middleware prefix rules.
 */
export function findNavMiddlewareGaps(): NavMiddlewareGap[] {
  const gaps: NavMiddlewareGap[] = [];

  for (const navItem of ALL_NAV_ITEMS) {
    if (!navItem.moduleSlug) continue;
    const resolved = moduleSlugForPortalPath(navItem.href);
    if (resolved !== navItem.moduleSlug) {
      gaps.push({
        href: navItem.href,
        expectedSlug: navItem.moduleSlug,
        resolvedSlug: resolved,
      });
    }
  }

  return gaps;
}
