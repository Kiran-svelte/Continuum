import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email-service';
import { buildAppUrl } from '@/lib/url-origin';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
});

const neutralMessage = 'If that email exists in our system, we have sent a reset link.';

function neutralResponse(extra: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ success: true, message: neutralMessage });
  }

  return NextResponse.json({ success: true, message: neutralMessage, ...extra });
}

/**
 * POST /api/auth/forgot-password
 *
 * Initiates the forgot password flow by generating a token and sending an email.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Enter a valid email address.' },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    const emailLower = email.toLowerCase();

    // Check if the user exists (check both employee and super admin)
    const employee = await prisma.employee.findUnique({
      where: { email: emailLower },
      select: { id: true }
    });

    const superAdmin = !employee ? await prisma.superAdmin.findUnique({
      where: { email: emailLower },
      select: { id: true }
    }) : null;

    // To prevent email enumeration, we always return success
    if (!employee && !superAdmin) {
      return neutralResponse({ delivered: false });
    }

    // Generate token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Token expires in 1 hour
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // Save token to DB
    await prisma.passwordResetToken.create({
      data: {
        email: emailLower,
        token_hash: tokenHash,
        expires_at: expiresAt,
      }
    });

    // Send email
    const resetUrl = buildAppUrl(
      `/reset-password?token=${rawToken}&email=${encodeURIComponent(emailLower)}`,
      { request }
    );

    const emailResult = await sendPasswordResetEmail(emailLower, resetUrl);
    if (!emailResult.success) {
      console.error('[AUTH FORGOT PASSWORD] Email delivery failed:', emailResult.error);
      return neutralResponse({
        delivered: false,
        email_error: emailResult.error,
        reset_link: resetUrl,
      });
    }

    return neutralResponse({
      delivered: true,
      transport: emailResult.transport,
      reset_link: resetUrl,
    });

  } catch (error) {
    console.error('[AUTH FORGOT PASSWORD] Error:', error);
    if (process.env.NODE_ENV === 'production') {
      return neutralResponse();
    }

    return NextResponse.json(
      { error: 'Failed to process request.' },
      { status: 500 }
    );
  }
}
