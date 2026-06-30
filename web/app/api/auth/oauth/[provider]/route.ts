import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const supportedProviders = new Set(['github', 'twitter', 'linkedin']);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> },
) {
  const { provider } = await params;
  const redirectUrl = new URL('/sign-in', request.url);

  if (!supportedProviders.has(provider)) {
    redirectUrl.searchParams.set('error', 'unsupported-oauth-provider');
    return NextResponse.redirect(redirectUrl);
  }

  redirectUrl.searchParams.set('error', 'oauth-not-configured');
  redirectUrl.searchParams.set('provider', provider);
  return NextResponse.redirect(redirectUrl);
}
