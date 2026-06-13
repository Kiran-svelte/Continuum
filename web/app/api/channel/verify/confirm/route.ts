/**
 * POST /api/channel/verify/confirm
 *
 * Validates the OTP submitted by the employee and, on success, creates
 * a ChannelIdentityLink record that links their employee ID to their
 * WhatsApp external_id (wa_id).
 *
 * Any existing active link for the same employee+channel is revoked first
 * to prevent stale ghost links.
 *
 * Auth:   Requires valid employee session (getAuthEmployee).
 * Rate:   5 requests / 60 s per employee via 'security/otp' bucket.
 * Implements L5-03-006 confirm flow.
 */
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit } from '@/lib/api-rate-limit';
import { e164ToWaId, normalizePhone } from '@/lib/phone/normalize';
import prisma from '@/lib/prisma';
import { logger } from '@/lib/logger';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Rate-limit bucket for OTP confirm (shared with /start). */
const RATE_LIMIT_BUCKET = 'security/otp';

/** Revoke reason written on the displaced link. */
const REVOKE_REASON_NEW_VERIFICATION = 'new_verification';

// ─── Validation Schema ────────────────────────────────────────────────────────

/** Request body schema for /confirm. */
const confirmBodySchema = z.object({
  phone: z.string().min(7).max(20),
  /** 6-digit numeric OTP. */
  code: z.string().length(6).regex(/^\d{6}$/),
  channel: z.enum(['whatsapp']),
  /**
   * Meta wa_id — digits only, no +.
   * Min 7: shortest international (e.g., 1-digit country + 6-digit subscriber).
   * Max 20: conservatively above E.164 max of 15.
   */
  externalId: z.string().min(7).max(20).regex(/^\d+$/),
});

// ─── Route Handler ────────────────────────────────────────────────────────────

/**
 * POST /api/channel/verify/confirm
 *
 * Validates OTP challenge and creates ChannelIdentityLink on success.
 *
 * @param request - Incoming Next.js API request.
 * @returns JSON with { success, channel, linkedAt } on success.
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
    const parsed = confirmBodySchema.safeParse(body);

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

    const { phone, code, channel, externalId } = parsed.data;
    const normalized = normalizePhone(phone);

    if (!normalized.ok) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: normalized.message } },
        { status: 400 }
      );
    }

    if (externalId !== e164ToWaId(normalized.e164)) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: 'External channel identity does not match the verified phone number.',
          },
        },
        { status: 400 }
      );
    }

    const challenge = await findActiveChallenge(employee.id, channel, normalized.e164);
    if (!challenge) {
      return NextResponse.json(
        {
          error: {
            code: 'NOT_FOUND',
            message: 'No active verification found. Please request a new code.',
          },
        },
        { status: 400 }
      );
    }

    if (challenge.attempts >= challenge.max_attempts) {
      return NextResponse.json(
        {
          error: {
            code: 'CODE_LOCKED',
            message: 'Too many failed attempts. Please request a new code.',
          },
        },
        { status: 429 }
      );
    }

    const isCodeValid = await bcrypt.compare(code, challenge.code_hash);
    if (!isCodeValid) {
      await incrementAttempts(challenge.id);
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Invalid verification code.' } },
        { status: 400 }
      );
    }

    await createChannelLink(
      employee.id,
      employee.org_id ?? '',
      channel,
      externalId,
      normalized.e164
    );
    await markChallengeConsumed(challenge.id);

    logger.info('channel_link_created', {
      employeeId: employee.id,
      companyId: employee.org_id ?? undefined,
      channel,
      // Log only last 4 digits of the wa_id — never the full identifier.
      externalIdSuffix: externalId.slice(-4),
    });

    return NextResponse.json({
      success: true,
      channel,
      linkedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleRouteError(error, 'channel_verify_confirm_error');
  }
}

// ─── Private Helpers ─────────────────────────────────────────────────────────

/**
 * Looks up a non-expired, non-consumed challenge for the given
 * employee+channel+phone combination.
 *
 * @param employeeId - Authenticated employee's ID.
 * @param channel - Channel name (e.g. 'whatsapp').
 * @param phoneE164 - E.164-formatted phone number.
 * @returns Challenge record or null if none found.
 */
async function findActiveChallenge(
  employeeId: string,
  channel: string,
  phoneE164: string
) {
  return prisma.channelVerificationChallenge.findFirst({
    where: {
      employee_id: employeeId,
      channel,
      phone_e164: phoneE164,
      consumed_at: null,
      expires_at: { gt: new Date() },
    },
  });
}

/**
 * Increments the attempt counter on a challenge record.
 * Used to detect brute-force after configurable max_attempts.
 *
 * @param challengeId - Primary key of the challenge to update.
 */
async function incrementAttempts(challengeId: string): Promise<void> {
  await prisma.channelVerificationChallenge.update({
    where: { id: challengeId },
    data: { attempts: { increment: 1 } },
  });
}

/**
 * Revokes any existing active ChannelIdentityLink for this employee+channel,
 * then creates a fresh verified link.
 *
 * @param employeeId - Authenticated employee's ID.
 * @param companyId - Tenant company ID.
 * @param channel - Channel name (e.g. 'whatsapp').
 * @param externalId - Meta wa_id (digits only, no +).
 * @param phoneE164 - E.164-formatted phone number.
 */
async function createChannelLink(
  employeeId: string,
  companyId: string,
  channel: string,
  externalId: string,
  phoneE164: string
): Promise<void> {
  await prisma.channelIdentityLink.updateMany({
    where: { employee_id: employeeId, channel, revoked_at: null },
    data: { revoked_at: new Date(), revoke_reason: REVOKE_REASON_NEW_VERIFICATION },
  });

  await prisma.channelIdentityLink.create({
    data: {
      company_id: companyId,
      employee_id: employeeId,
      channel,
      external_id: externalId,
      phone_e164: phoneE164,
      verified_at: new Date(),
    },
  });
}

/**
 * Marks a challenge record as consumed so it cannot be replayed.
 *
 * @param challengeId - Primary key of the challenge to update.
 */
async function markChallengeConsumed(challengeId: string): Promise<void> {
  await prisma.channelVerificationChallenge.update({
    where: { id: challengeId },
    data: { consumed_at: new Date() },
  });
}

/**
 * Converts a route-level error into the canonical error response shape.
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
