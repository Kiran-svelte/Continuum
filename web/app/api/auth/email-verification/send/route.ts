import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { buildAppUrl } from '@/lib/url-origin';
import { sendEmailVerificationLinkEmail } from '@/lib/email-service';
import {
  createOpaqueToken,
  findRecentVerificationToken,
  getVerificationExpiryDate,
  hashToken,
  isEmailVerified,
} from '@/lib/product-readiness';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.orgId) return NextResponse.json({ error: 'Company context required' }, { status: 400 });

  if (await isEmailVerified(user.id)) {
    return NextResponse.json({ success: true, alreadyVerified: true, message: 'Email is already verified.' });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: user.id },
    select: { email: true, first_name: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!employee.email.includes('@') || employee.email.endsWith('@users.continuum.local')) {
    return NextResponse.json({ error: 'A real email address is required for verification.' }, { status: 400 });
  }

  // A link that is still valid and was only just sent is the one the user is
  // most likely holding. Minting a replacement on every sign-in attempt pushed
  // the working link down their inbox and made the flow look broken.
  const recent = await findRecentVerificationToken(user.id);
  if (recent) {
    return NextResponse.json({
      success: true,
      throttled: true,
      message: 'A verification link was just sent. Check your inbox, including spam.',
    });
  }

  const token = createOpaqueToken();
  const tokenHash = hashToken(token);
  const expiresAt = getVerificationExpiryDate();

  await prisma.otpToken.create({
    data: {
      id: randomUUID(),
      emp_id: user.id,
      company_id: user.orgId,
      action: 'email_verify',
      code_hash: tokenHash,
      expires_at: expiresAt,
      attempts: 0,
      is_used: false,
    },
  });

  const verificationUrl = buildAppUrl(
    `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    { request },
  );
  const emailResult = await sendEmailVerificationLinkEmail(
    employee.email,
    employee.first_name || 'there',
    verificationUrl,
  ).catch(() => ({ success: false as const, error: 'send_failed' }));

  return NextResponse.json({
    success: true,
    delivered: Boolean(emailResult && emailResult.success),
    expiresAt: expiresAt.toISOString(),
  });
}
