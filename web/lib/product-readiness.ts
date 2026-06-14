import { createHash, randomBytes } from 'crypto';
import prisma from '@/lib/prisma';

const EMAIL_VERIFICATION_TTL_MINUTES = 30;

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

export async function setEmailVerificationState(employeeId: string, verified: boolean): Promise<void> {
  if (!verified) return;
  await prisma.employee.update({
    where: { id: employeeId },
    data: { updated_at: new Date() },
  });
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
