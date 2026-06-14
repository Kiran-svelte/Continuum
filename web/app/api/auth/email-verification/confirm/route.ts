import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashToken, setEmailVerificationState } from '@/lib/product-readiness';

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

  await prisma.$transaction([
    prisma.otpToken.update({
      where: { id: verification.id },
      data: { is_used: true },
    }),
    prisma.employee.update({
      where: { id: verification.emp_id },
      data: { updated_at: new Date() },
    }),
  ]);

  await setEmailVerificationState(verification.emp_id, true);
  return NextResponse.json({ success: true });
}
