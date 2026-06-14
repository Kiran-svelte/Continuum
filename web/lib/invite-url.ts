import type { NextRequest } from 'next/server';
import { buildAppUrl } from '@/lib/url-origin';

/** Public invite acceptance URL (set password before sign-in). */
export function buildInviteAcceptUrl(
  token: string,
  options: { request?: NextRequest } = {}
): string {
  const encoded = encodeURIComponent(token);
  return buildAppUrl(`/invite/accept/${encoded}`, options);
}
