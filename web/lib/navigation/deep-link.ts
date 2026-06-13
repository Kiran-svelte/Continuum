/**
 * Builds portal deep links for notification payloads.
 * Implements L5-07 deep-link helper.
 */
import type { PortalSlug } from '@/lib/navigation/portal-nav';

/**
 * Returns an absolute app path for a portal route segment.
 */
export function buildPortalDeepLink(
  portalSlug: PortalSlug | string,
  path: string
): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? '';
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}/${portalSlug}${normalizedPath}`;
}
