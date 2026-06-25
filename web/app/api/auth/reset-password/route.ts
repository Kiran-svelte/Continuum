import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { validatePassword } from '@/lib/password-validation';
import { hashPassword } from '@/lib/password-service';
import { signOutAll } from '@/lib/auth-service';

export const dynamic = 'force-dynamic';

// ─── Helpers ─────────────────────────────────────────────────────────────────────────

/**
 * Verifies the signed password-reset token by SHA-256 hash lookup.
 * Returns the DB record when valid, null otherwise.
 */
async function verifyPasswordResetToken(email: string, rawToken: string) {
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  return prisma.passwordResetToken.findFirst({
    where: {
      email,
      token_hash: tokenHash,
      is_used: false,
      expires_at: { gt: new Date() },
    },
  });
}

const schema = z.object({
  email: z.string().email(),
  token: z.string().min(1),
  password: z.string().min(8),
});

/**
 * POST /api/auth/reset-password
 *
 * Verifies the token and sets a new password.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, token, password } = schema.parse(body);

    const emailLower = email.toLowerCase();

    // Verify signed reset token
    const resetRecord = await verifyPasswordResetToken(emailLower, token);

    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link.' },
        { status: 400 }
      );
    }

    // Validate password
    const pwValidation = validatePassword(password);
    if (!pwValidation.valid) {
      return NextResponse.json(
        { error: pwValidation.errors[0] },
        { status: 400 }
      );
    }

    // Hash new password
    const newPasswordHash = await hashPassword(password);

    // Update password for Employee OR SuperAdmin
    const employee = await prisma.employee.findUnique({ where: { email: emailLower } });
    if (employee) {
      await prisma.employee.update({
        where: { email: emailLower },
        data: {
          password_hash: newPasswordHash,
          password_changed_at: new Date(),
          must_change_password: false,
        }
      });
      // Revoke sessions
      await signOutAll(employee.id).catch(() => {});
    } else {
      const superAdmin = await prisma.superAdmin.findUnique({ where: { email: emailLower } });
      if (superAdmin) {
        await prisma.superAdmin.update({
          where: { email: emailLower },
          data: {
            password_hash: newPasswordHash,
            updated_at: new Date()
          }
        });
        // We don't have a specific sign-out-all for super admin refresh tokens unless they are tracked similarly.
      } else {
        return NextResponse.json(
          { error: 'User not found.' },
          { status: 404 }
        );
      }
    }

    // Mark token as used
    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { is_used: true }
    });

    // We can also trigger the password-change audit log via internal call or just rely on the existing mechanism
    // if the client calls the /api/auth/password-change endpoint after this completes.

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });

  } catch (error) {
    console.error('[AUTH RESET PASSWORD] Error:', error);
    return NextResponse.json(
      { error: 'Failed to reset password.' },
      { status: 500 }
    );
  }
}
