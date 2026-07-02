import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getDefaultPortalForRole, normalizeSafeRedirectTarget } from '@/lib/auth-routing';
import { buildAppUrl } from '@/lib/url-origin';

/**
 * GET /api/auth/callback
 *
 * Handles auth callback redirects. With the hybrid auth approach (Firebase primary),
 * the actual token verification happens client-side. This endpoint simply handles
 * the redirect to the intended destination.
 *
 * Previously this exchanged Supabase auth codes for sessions. That flow is no longer
 * used — Firebase handles auth entirely client-side, and the session is created
 * via POST /api/auth/session.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const nextParam = searchParams.get('next') ?? searchParams.get('redirect');
  const target = normalizeSafeRedirectTarget(nextParam) ?? getDefaultPortalForRole();
  return NextResponse.redirect(buildAppUrl(target, { request }));
}
