import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { consumeEmailVerificationToken } from '@/lib/product-readiness';
import { hydrateAuthResponseCookies } from '@/lib/auth-state-cookies';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/email-verification/confirm
 *
 * Retained for links issued before verification moved to the GET redirect at
 * /api/auth/verify-email, and for the sign-in page's `?verify_token=` fallback.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || '').trim();
  if (!token) {
    return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });
  }

  const result = await consumeEmailVerificationToken(token);

  if (result.status === 'expired') {
    return NextResponse.json(
      { error: 'This verification link has expired. Request a new one below.', code: 'EXPIRED' },
      { status: 400, headers: { 'x-token-expired': '1' } },
    );
  }
  if (result.status === 'invalid') {
    return NextResponse.json(
      { error: 'This verification link is not valid. Request a new one below.', code: 'INVALID' },
      { status: 400 },
    );
  }

  const response = NextResponse.json({
    success: true,
    alreadyVerified: result.status === 'already_verified',
  });

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
