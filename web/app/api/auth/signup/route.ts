import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import type { Prisma, Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/password-service';
import { validatePassword } from '@/lib/password-validation';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { sendEmailVerificationLinkEmail } from '@/lib/email-service';
import { buildAppUrl } from '@/lib/url-origin';
import { isPublicSignupEnabled } from '@/lib/public-signup';
import { buildDefaultModuleSeed } from '@/lib/core-functions/resolve';
import { createOpaqueToken, getVerificationExpiryDate, hashToken } from '@/lib/product-readiness';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }
  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

const JOIN_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += JOIN_CODE_CHARS[Math.floor(Math.random() * JOIN_CODE_CHARS.length)];
    }
    const existing = await prisma.company.findUnique({
      where: { join_code: code },
      select: { id: true },
    });
    if (!existing) return code;
  }
  throw new Error('Unable to generate a unique company join code. Please try again.');
}

/**
 * POST /api/auth/signup
 *
 * Self-serve workspace registration using the platform's own JWT/bcrypt auth
 * (no external auth provider). Creates the company (unonboarded), its owner
 * (admin role), default module settings, and an email-verification token in
 * one transaction, then sends the verification link via the shared email
 * transport. The owner signs in after verifying and lands in guided
 * onboarding via the middleware onboarding gate.
 */
export async function POST(request: NextRequest) {
  try {
    // Server-side gate — the sign-up form is flag-gated in the UI, but the
    // API must enforce the same policy or "invitation-only" is fiction.
    if (!isPublicSignupEnabled()) {
      return NextResponse.json(
        { error: 'Public sign-up is disabled. Ask your organization administrator for an invitation.' },
        { status: 403 },
      );
    }

    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rl = await checkApiRateLimit(`signup:${ip}`, 'auth');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rl) },
      );
    }

    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : '';
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : '';
    const companyName = typeof body.companyName === 'string' ? body.companyName.trim() : '';

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 },
      );
    }

    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      return NextResponse.json(
        { error: pwResult.errors[0] },
        { status: 400 },
      );
    }

    const existing = await prisma.employee.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: 'This email is already registered. Please sign in instead.', code: 'USER_EXISTS' },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const joinCode = await generateUniqueJoinCode();
    const ownerFirstName = firstName || email.split('@')[0];
    const workspaceName = companyName || `${ownerFirstName}'s workspace`;

    const verifyToken = createOpaqueToken();
    const verifyTokenHash = hashToken(verifyToken);
    const verifyExpiresAt = getVerificationExpiryDate();

    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          id: randomUUID(),
          name: workspaceName,
          country_code: 'IN',
          timezone: 'Asia/Kolkata',
          join_code: joinCode,
          onboarding_completed: false,
          updated_at: new Date(),
        },
      });

      const owner = await tx.employee.create({
        data: {
          id: randomUUID(),
          email,
          first_name: ownerFirstName,
          last_name: lastName,
          org_id: company.id,
          primary_role: 'admin' as Role,
          password_hash: passwordHash,
          status: 'onboarding',
          invited_by_type: 'self_signup',
          updated_at: new Date(),
        },
      });

      const moduleSeed = buildDefaultModuleSeed();
      await tx.companySettings.create({
        data: {
          id: randomUUID(),
          company_id: company.id,
          hr_alerts: moduleSeed as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
      });

      await tx.otpToken.create({
        data: {
          id: randomUUID(),
          emp_id: owner.id,
          company_id: company.id,
          action: 'email_verify',
          code_hash: verifyTokenHash,
          expires_at: verifyExpiresAt,
          attempts: 0,
          is_used: false,
        },
      });

      return { company, owner };
    });

    void createAuditLog({
      companyId: result.company.id,
      actorId: result.owner.id,
      action: AUDIT_ACTIONS.COMPANY_REGISTER,
      entityType: 'Company',
      entityId: result.company.id,
      ipAddress: ip,
      userAgent: request.headers.get('user-agent') || undefined,
      newState: {
        company_name: result.company.name,
        owner_email: email,
        created_by: 'self_signup',
      },
    }).catch(() => {});

    const verificationUrl = buildAppUrl(
      `/api/auth/verify-email?token=${encodeURIComponent(verifyToken)}`,
      { request },
    );
    const emailResult = await sendEmailVerificationLinkEmail(
      email,
      ownerFirstName,
      verificationUrl,
    ).catch((err) => {
      console.error('[AUTH SIGNUP] Failed to send verification email:', err);
      return { success: false as const, error: 'send_failed' };
    });

    return NextResponse.json({
      success: true,
      emailVerificationRequired: true,
      emailDelivered: Boolean(emailResult && emailResult.success),
      email,
    });
  } catch (err) {
    if (getPrismaErrorCode(err) === 'P2002') {
      return NextResponse.json(
        { error: 'This email is already registered. Please sign in instead.', code: 'USER_EXISTS' },
        { status: 409 },
      );
    }
    console.error('[AUTH SIGNUP] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
