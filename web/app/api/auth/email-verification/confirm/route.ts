import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashToken, setEmailVerificationState } from '@/lib/product-readiness';
import { hydrateAuthResponseCookies } from '@/lib/auth-state-cookies';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const token = String(body.token || '').trim();
  if (!token) return NextResponse.json({ error: 'Verification token is required.' }, { status: 400 });

  const tokenHash = hashToken(token);
  const verification = await prisma.otpToken.findFirst({
    where: {
      action: 'email_verify',
      code_hash: tokenHash,
    },
    orderBy: { created_at: 'desc' },
  });

  if (!verification) {
    return NextResponse.json({ error: 'Verification token is invalid.' }, { status: 400 });
  }
  if (verification.is_used) {
    return NextResponse.json({ error: 'Verification token is already used.' }, { status: 400 });
  }
  if (verification.expires_at <= new Date()) {
    return NextResponse.json({ error: 'Verification token has expired.' }, { status: 400, headers: { 'x-token-expired': '1' } });
  }

  const [, , employee] = await prisma.$transaction([
    prisma.otpToken.update({
      where: { id: verification.id },
      data: { is_used: true },
    }),
    prisma.employee.update({
      where: { id: verification.emp_id },
      data: { updated_at: new Date() },
    }),
    prisma.employee.findUnique({
      where: { id: verification.emp_id },
      select: { id: true, primary_role: true, secondary_roles: true, org_id: true },
    }),
  ]);

  await setEmailVerificationState(verification.emp_id, true);

  const response = NextResponse.json({ success: true });
  // Refresh the email-verified cookie immediately so the user isn't stuck
  // behind the middleware gate until their access token next refreshes.
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
