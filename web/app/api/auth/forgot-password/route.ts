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
 */
export async function POST(request: NextRequest) {
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

    // To prevent email enumeration, we always return success
    if (!employee && !superAdmin) {
      return NextResponse.json({ success: true, message: 'If that email exists in our system, we have sent a reset link.' });
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
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(emailLower)}`;

    await sendPasswordResetEmail(emailLower, resetUrl);

    return NextResponse.json({ success: true, message: 'If that email exists in our system, we have sent a reset link.' });

  } catch (error) {
    console.error('[AUTH FORGOT PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request.' },
      { status: 500 }
    );
  }
}
