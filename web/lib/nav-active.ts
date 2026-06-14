/**
 * Segment-boundary nav active matching.
 * Prevents `/manager/team` from matching `/manager/team-attendance`.
 */
export function isNavItemActive(pathname: string, href: string): boolean {
  if (!pathname || !href) return false;
  if (pathname === href) return true;
  return pathname.startsWith(`${href}/`);
}
