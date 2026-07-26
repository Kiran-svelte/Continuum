import { createHash, randomBytes, randomUUID } from 'crypto';
import prisma from '@/lib/prisma';

/**
 * Verification links land in an inbox, so the window has to survive a user who
 * reads their mail an hour later. The previous 30-minute TTL expired most links
 * before they were ever clicked, which read to users as "verification is broken".
 */
const EMAIL_VERIFICATION_TTL_MINUTES = 60 * 24;

/**
 * Minimum gap between two verification emails for the same person. Without it,
 * every sign-in attempt and every /sign-in mount minted a fresh token and sent
 * another email, burying the link the user was actually trying to click.
 */
const EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES = 5;

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonRecord) : {};
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function createOpaqueToken(): string {
  return randomBytes(24).toString('hex');
}

export function extractEmailVerificationState(rawPrefs: unknown): {
  verified: boolean;
  verifiedAt: string | null;
} {
  const prefs = asRecord(rawPrefs);
  const auth = asRecord(prefs.auth);
  const value = asRecord(auth.emailVerification);
  return {
    verified: Boolean(value.verified),
    verifiedAt: typeof value.verifiedAt === 'string' ? value.verifiedAt : null,
  };
}

export async function getEmailVerificationState(employeeId: string): Promise<{
  verified: boolean;
  verifiedAt: string | null;
}> {
  const token = await prisma.otpToken.findFirst({
    where: {
      emp_id: employeeId,
      action: 'email_verify',
      is_used: true,
    },
    orderBy: { created_at: 'desc' },
    select: { created_at: true },
  });
  return {
    verified: Boolean(token),
    verifiedAt: token?.created_at.toISOString() ?? null,
  };
}

export async function isEmailVerified(employeeId: string): Promise<boolean> {
  return (await getEmailVerificationState(employeeId)).verified;
}

export function getVerificationExpiryDate(): Date {
  return new Date(Date.now() + EMAIL_VERIFICATION_TTL_MINUTES * 60_000);
}

/**
 * Records an account as email-verified without an email round-trip.
 *
 * Verification state is stored as a consumed `email_verify` OtpToken, so
 * "verified" is expressed by writing one directly. Used when a human with
 * authority over the account (super admin issuing owner credentials, HR
 * provisioning an invited employee) has already vouched for the address —
 * those accounts must not be locked out behind a link they never requested.
 */
export async function markEmailVerified(
  employeeId: string,
  companyId: string | null
): Promise<void> {
  if (await isEmailVerified(employeeId)) return;

  let resolvedCompanyId = companyId;
  if (!resolvedCompanyId) {
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { org_id: true },
    });
    resolvedCompanyId = employee?.org_id ?? null;
  }

  // OtpToken rows are company-scoped. An account with no company cannot reach
  // the verification gate yet (it fires only for role-bearing portal traffic),
  // so there is nothing to unblock until the account joins one.
  if (!resolvedCompanyId) return;

  await prisma.otpToken.create({
    data: {
      id: randomUUID(),
      emp_id: employeeId,
      company_id: resolvedCompanyId,
      action: 'email_verify',
      code_hash: hashToken(`provisioned:${employeeId}:${randomUUID()}`),
      expires_at: new Date(),
      attempts: 0,
      is_used: true,
    },
  });
}

export async function setEmailVerificationState(
  employeeId: string,
  verified: boolean
): Promise<void> {
  if (!verified) return;
  await prisma.employee.update({
    where: { id: employeeId },
    data: { updated_at: new Date() },
  });
}

export type VerificationConsumeResult =
  | { status: 'verified'; employeeId: string }
  | { status: 'already_verified'; employeeId: string }
  | { status: 'expired' }
  | { status: 'invalid' };

/**
 * Consumes an emailed verification token.
 *
 * Deliberately idempotent: a token that was already consumed for an account
 * that is now verified reports success rather than an error. Mail clients and
 * security scanners routinely fetch links before the human does, and a hard
 * "already used" failure at that point strands the user with no way forward.
 */
export async function consumeEmailVerificationToken(
  rawToken: string
): Promise<VerificationConsumeResult> {
  const token = rawToken.trim();
  if (!token) return { status: 'invalid' };

  const verification = await prisma.otpToken.findFirst({
    where: { action: 'email_verify', code_hash: hashToken(token) },
    orderBy: { created_at: 'desc' },
  });

  if (!verification) return { status: 'invalid' };

  if (verification.is_used) {
    return (await isEmailVerified(verification.emp_id))
      ? { status: 'already_verified', employeeId: verification.emp_id }
      : { status: 'invalid' };
  }

  if (verification.expires_at <= new Date()) {
    return { status: 'expired' };
  }

  await prisma.otpToken.update({
    where: { id: verification.id },
    data: { is_used: true },
  });
  await setEmailVerificationState(verification.emp_id, true);

  return { status: 'verified', employeeId: verification.emp_id };
}

/**
 * Returns an unexpired, unused verification token issued within the cooldown
 * window, if one exists — the caller should reuse it instead of emailing again.
 */
export async function findRecentVerificationToken(employeeId: string) {
  return prisma.otpToken.findFirst({
    where: {
      emp_id: employeeId,
      action: 'email_verify',
      is_used: false,
      expires_at: { gt: new Date() },
      created_at: {
        gt: new Date(Date.now() - EMAIL_VERIFICATION_RESEND_COOLDOWN_MINUTES * 60_000),
      },
    },
    orderBy: { created_at: 'desc' },
    select: { id: true, created_at: true },
  });
}
