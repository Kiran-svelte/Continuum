/**
 * POST /api/channel/verify/start
 *
 * Initiates phone verification for WhatsApp channel linking.
 * Generates a 6-digit OTP, hashes it with bcrypt, stores the challenge
 * record, and delivers the code via email (stub in Chunk 02).
 *
 * Auth:   Requires valid employee session (getAuthEmployee).
 * Rate:   5 requests / 60 s per employee via 'security/otp' bucket.
 * Implements L5-03-006.
 */
import { NextResponse } from 'next/server';
import { randomInt } from 'crypto';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit } from '@/lib/api-rate-limit';
import { normalizePhone } from '@/lib/phone/normalize';
import prisma from '@/lib/prisma';
import { sendOTPEmail } from '@/lib/email-service';
import { logger } from '@/lib/logger';

// ─── Constants ───────────────────────────────────────────────────────────────

/** OTP validity window in minutes. */
const OTP_EXPIRY_MINUTES = 10;

/** Bcrypt cost factor — intentionally modest; codes are short-lived. */
const BCRYPT_COST = 10;

/** OTP lower bound (inclusive), produces 6 digits when formatted. */
const OTP_MIN = 100_000;

/** OTP upper bound (exclusive). */
const OTP_MAX = 1_000_000;

/** Rate-limit bucket identifier. */
const RATE_LIMIT_BUCKET = 'security/otp';

// ─── Validation Schema ────────────────────────────────────────────────────────

/** Request body schema for /start. */
const startBodySchema = z.object({
  phone: z.string().min(7).max(20),
  channel: z.enum(['whatsapp']),
});

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * POST /api/channel/verify/start
 *
 * Starts OTP phone challenge for WhatsApp channel linking.
 *
 * @param request - Incoming Next.js API request.
 * @returns JSON with { success, expiresInSeconds, channel } on success.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const employee = await getAuthEmployee(request);

    const rateLimitResult = checkApiRateLimit(employee.id, RATE_LIMIT_BUCKET);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { error: { code: 'RATE_LIMIT', message: 'Rate limit exceeded. Try again later.' } },
        { status: 429 }
      );
    }

    const body = await request.json() as unknown;
    const parsed = startBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request body',
            details: parsed.error.flatten(),
          },
        },
        { status: 400 }
      );
    }

    const { phone, channel } = parsed.data;
    const normalized = normalizePhone(phone);

    if (!normalized.ok) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: normalized.message } },
        { status: 400 }
      );
    }

    const phoneInUse = await prisma.channelIdentityLink.findFirst({
      where: {
        company_id: employee.org_id ?? '',
        phone_e164: normalized.e164,
        revoked_at: null,
        NOT: { employee_id: employee.id },
      },
    });

    if (phoneInUse) {
      return NextResponse.json(
        { error: { code: 'PHONE_IN_USE', message: 'This phone number is already linked to another employee.' } },
        { status: 409 }
      );
    }

    const code = String(randomInt(OTP_MIN, OTP_MAX));
    const codeHash = await bcrypt.hash(code, BCRYPT_COST);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1_000);

    await upsertVerificationChallenge(
      employee.id,
      employee.org_id ?? '',
      channel,
      normalized.e164,
      codeHash,
      expiresAt
    );

    await sendOtpEmail(employee.email, code, employee.first_name);

    logger.info('channel_otp_sent', {
      employeeId: employee.id,
      companyId: employee.org_id ?? undefined,
      channel,
      // Log only last 4 digits — never the full number.
      phoneLastFour: normalized.e164.slice(-4),
    });

    return NextResponse.json({
      success: true,
      expiresInSeconds: OTP_EXPIRY_MINUTES * 60,
      channel,
    });
  } catch (error) {
    return handleRouteError(error, 'channel_verify_start_error');
  }
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Deletes any pending (unconsumed) challenge for this employee+channel,
 * then creates a fresh one. Prevents OTP re-use from stale records.
 *
 * @param employeeId - Authenticated employee's ID.
 * @param companyId - Tenant company ID.
 * @param channel - Channel name (e.g. 'whatsapp').
 * @param phoneE164 - E.164-formatted phone number.
 * @param codeHash - bcrypt hash of the generated OTP.
 * @param expiresAt - UTC expiry timestamp.
 */
async function upsertVerificationChallenge(
  employeeId: string,
  companyId: string,
  channel: string,
  phoneE164: string,
  codeHash: string,
  expiresAt: Date
): Promise<void> {
  await prisma.channelVerificationChallenge.deleteMany({
    where: { employee_id: employeeId, channel, consumed_at: null },
  });

  await prisma.channelVerificationChallenge.create({
    data: {
      company_id: companyId,
      employee_id: employeeId,
      channel,
      phone_e164: phoneE164,
      code_hash: codeHash,
      expires_at: expiresAt,
    },
  });
}

/**
 * Delivers OTP to the employee via email.
 * Stubbed in Chunk 02 — wire to email-service.ts in Chunk 03.
 *
 * @param email - Recipient email address.
 * @param code - Plaintext 6-digit OTP (used in email body only, never logged).
 * @param firstName - Employee first name for email personalisation.
 */
async function sendOtpEmail(
  email: string,
  code: string,
  firstName: string
): Promise<void> {
  await sendOTPEmail(email, firstName, code, 'whatsapp_link').catch(() => {
    logger.info('otp_email_fallback', { emailDomain: email.split('@')[1] ?? 'unknown' });
  });
}

/**
 * Converts a route-level error into the canonical error response shape.
 * Maps AuthError.status to correct HTTP status codes.
 *
 * @param error - Caught error from try block.
 * @param logEvent - Structured log event name.
 * @returns NextResponse with error payload.
 */
function handleRouteError(error: unknown, logEvent: string): NextResponse {
  if (error instanceof AuthError) {
    const code = error.status === 401 ? 'UNAUTHORIZED' : 'FORBIDDEN';
    return NextResponse.json(
      { error: { code, message: error.message } },
      { status: error.status }
    );
  }

  logger.error(logEvent, {
    error: error instanceof Error ? error.message : 'unknown',
  });

  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } },
    { status: 500 }
  );
}
