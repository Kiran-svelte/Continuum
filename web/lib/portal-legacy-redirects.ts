/**
 * Permanent redirects for legacy portal URLs that still appear in bookmarks,
 * tutorials, and capability routes. Keeps users on canonical surfaces.
 */
export const PORTAL_LEGACY_REDIRECTS: ReadonlyArray<{
  from: string;
  to: string;
}> = [
  { from: '/manager/people', to: '/manager/team' },
];

export function resolvePortalLegacyRedirect(pathname: string): string | null {
  const normalized = pathname.split('?')[0] ?? pathname;
  for (const rule of PORTAL_LEGACY_REDIRECTS) {
    if (normalized === rule.from) {
      return rule.to;
    }
  }
  return null;
}
