import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendPasswordResetEmail } from '@/lib/email-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
});

/**
 * POST /api/auth/forgot-password
 *
 * Initiates the forgot password flow by generating a token and sending an email.
 * In production, always returns the same neutral message to prevent email enumeration.
 */
export async function POST(request: NextRequest) {
  const neutralMessage = 'If that email exists in our system, we have sent a reset link.';

  try {
    const body = await request.json();
    const { email } = schema.parse(body);

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

    // In production, return the neutral response immediately to prevent enumeration
    if (process.env.NODE_ENV === 'production' && !employee && !superAdmin) {
      return NextResponse.json({ success: true, message: neutralMessage });
    }

    if (!employee && !superAdmin) {
      // Non-production: still neutral body but may include diagnostic hints below
      return NextResponse.json({ success: true, message: neutralMessage });
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
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || (request.headers.get('host') ? `https://${request.headers.get('host')}` : 'http://localhost:3000');
    const reset_link = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(emailLower)}`;

    await sendPasswordResetEmail(emailLower, reset_link);

    // In production, return neutral message — never reveal delivery status
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: true, message: neutralMessage });
    }

    // Non-production: expose diagnostic hints for development and testing
    return NextResponse.json({
      success: true,
      message: neutralMessage,
      delivered: true,
      reset_link,
    });

  } catch (error) {
    console.error('[AUTH FORGOT PASSWORD] Error:', error);
    // In production, return neutral response even on error to prevent enumeration
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ success: true, message: neutralMessage });
    }
    return NextResponse.json(
      { error: 'Failed to process request.' },
      { status: 500 }
    );
  }
}
