import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

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
  const { searchParams, origin } = new URL(request.url);
  const next = searchParams.get('next') ?? '/employee/dashboard';

  const forwardedHost = request.headers.get('x-forwarded-host');
  const isLocalEnv = process.env.NODE_ENV === 'development';

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  } else if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  } else {
    return NextResponse.redirect(`${origin}${next}`);
  }
}
