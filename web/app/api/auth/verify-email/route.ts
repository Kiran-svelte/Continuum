import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { consumeEmailVerificationToken } from '@/lib/product-readiness';
import { hydrateAuthResponseCookies } from '@/lib/auth-state-cookies';
import { buildAppUrl } from '@/lib/url-origin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/verify-email?token=...
 *
 * The link target for verification emails. Confirming server-side on a plain
 * navigation is what makes this reliable: the previous design pointed the email
 * at `/sign-in?verify_token=...` and relied on a client effect to POST the
 * token, so anything that redirected the page or dropped the query string
 * (middleware's authenticated-user bounce, a stale session, a slow mount)
 * silently discarded the verification while still telling the user their email
 * was unverified.
 */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token')?.trim() || '';

  const redirectTo = (params: Record<string, string>) => {
    const url = new URL(buildAppUrl('/sign-in', { request }));
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
    return NextResponse.redirect(url, 303);
  };

  if (!token) {
    return redirectTo({ verify_error: 'missing' });
  }

  const result = await consumeEmailVerificationToken(token);

  if (result.status === 'expired') {
    return redirectTo({ verify_error: 'expired' });
  }
  if (result.status === 'invalid') {
    return redirectTo({ verify_error: 'invalid' });
  }

  const response = redirectTo({ verified: '1' });

  // Refresh the email-verified cookie now so the middleware gate lets the user
  // through immediately instead of waiting for their next token refresh.
  const employee = await prisma.employee.findUnique({
    where: { id: result.employeeId },
    select: { id: true, primary_role: true, secondary_roles: true, org_id: true },
  });
  if (employee) {
    await hydrateAuthResponseCookies(response, {
      employeeId: employee.id,
      primaryRole: employee.primary_role,
      secondaryRoles: employee.secondary_roles as string[] | null,
      orgId: employee.org_id,
    });
  }

  return response;
}
