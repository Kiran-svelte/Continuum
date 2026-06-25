import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { buildAppUrl } from '@/lib/url-origin';
import { sendEmailVerificationLinkEmail } from '@/lib/email-service';
import {
  createOpaqueToken,
  getVerificationExpiryDate,
  hashToken,
  isEmailVerified,
} from '@/lib/product-readiness';
import { buildActionOutcome, sideEffectFromEmail } from '@/lib/action-outcome';

export const dynamic = 'force-dynamic';

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!user.orgId) return NextResponse.json({ error: 'Company context required' }, { status: 400 });

  if (await isEmailVerified(user.id)) {
    return NextResponse.json({ success: true, message: 'Email is already verified.' });
  }

  const employee = await prisma.employee.findUnique({
    where: { id: user.id },
    select: { email: true, first_name: true },
  });
  if (!employee) return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
  if (!employee.email.includes('@') || employee.email.endsWith('@users.continuum.local')) {
    return NextResponse.json({ error: 'A real email address is required for verification.' }, { status: 400 });
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

  const verificationUrl = buildAppUrl(`/sign-in?verify_token=${encodeURIComponent(token)}`);
  // Await delivery — this email is the entire point of the request. A
  // fire-and-forget send is killed when the serverless function freezes.
  const emailResult = await sendEmailVerificationLinkEmail(
    employee.email,
    employee.first_name || 'there',
    verificationUrl,
  ).catch((err) => {
    console.error('[EmailVerification] Send failed:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Email delivery failed' };
  });
  const actionOutcome = buildActionOutcome({
    primarySucceeded: true,
    title: emailResult.success ? 'Verification email sent' : 'Verification token created - email not delivered',
    message: emailResult.success
      ? `Verification email sent to ${employee.email}.`
      : `Verification token was created, but email delivery failed: ${emailResult.error ?? 'Email delivery failed'}.`,
    sideEffects: [sideEffectFromEmail(`Verification email to ${employee.email}`, emailResult)],
  });

  return NextResponse.json({
    success: true,
    emailSent: emailResult.success,
    emailError: emailResult.success ? null : emailResult.error ?? 'Email delivery failed',
    actionOutcome,
    expiresAt: expiresAt.toISOString(),
  });
}
