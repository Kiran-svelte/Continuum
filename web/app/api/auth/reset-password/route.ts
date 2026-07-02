import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import crypto from 'crypto';
import { validatePassword } from '@/lib/password-validation';
import { hashPassword } from '@/lib/password-service';
import { signOutAll } from '@/lib/auth-service';
import { verifyPasswordResetToken } from '@/lib/password-reset';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email().optional(),
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
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid reset request.' },
        { status: 400 }
      );
    }

    const { email, token, password } = parsed.data;
    const emailLower = email?.toLowerCase();

    // Verify token
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    let resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        token_hash: tokenHash,
        is_used: false,
        expires_at: {
          gt: new Date()
        },
        ...(emailLower ? { email: emailLower } : {}),
      }
    });

    let targetEmail = resetRecord?.email.toLowerCase() ?? null;

    if (!resetRecord) {
      try {
        const signedToken = await verifyPasswordResetToken(token);
        const signedEmail = signedToken.email.toLowerCase();
        if (emailLower && signedEmail !== emailLower) {
          return NextResponse.json(
            { error: 'Invalid or expired reset link.' },
            { status: 400 }
          );
        }
        targetEmail = signedEmail;
      } catch {
        return NextResponse.json(
          { error: 'Invalid or expired reset link.' },
          { status: 400 }
        );
      }
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

    if (!targetEmail) {
      return NextResponse.json(
        { error: 'Invalid or expired reset link.' },
        { status: 400 }
      );
    }

    // Update password for Employee OR SuperAdmin
    const employee = await prisma.employee.findUnique({ where: { email: targetEmail } });
    if (employee) {
      await prisma.employee.update({
        where: { email: targetEmail },
        data: {
          password_hash: newPasswordHash,
          password_changed_at: new Date(),
          must_change_password: false,
        }
      });
      // Revoke sessions
      await signOutAll(employee.id).catch(() => {});
    } else {
      const superAdmin = await prisma.superAdmin.findUnique({ where: { email: targetEmail } });
      if (superAdmin) {
        await prisma.superAdmin.update({
          where: { email: targetEmail },
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
    if (resetRecord) {
      await prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { is_used: true }
      });
    }

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
