import { createHash, randomInt } from 'crypto';
import prisma from '@/lib/prisma';

// ─── OTP-Protected Actions ──────────────────────────────────────────────────

export const OTP_REQUIRED_ACTIONS = [
  'settings_change',
  'delete_employee',
  'export_data',
  'billing_change',
  'leave_type_create',
  'leave_type_delete',
  'rule_change',
  'work_schedule_change',
] as const;

export type OTPAction = (typeof OTP_REQUIRED_ACTIONS)[number];

// ─── Constants ───────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_VERIFY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_ATTEMPTS = 3;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function hashOTP(code: string): string {
  return createHash('sha256').update(code).digest('hex');
}

function generateCode(): string {
  const min = Math.pow(10, OTP_LENGTH - 1);
  const max = Math.pow(10, OTP_LENGTH) - 1;
  return randomInt(min, max + 1).toString();
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Generates a 6-digit OTP, SHA-256 hashes it, stores in OtpToken.
 * Returns the plaintext code (to send via email/SMS).
 * Invalidates any existing unused OTPs for the same action.
 */
export async function generateOTP(
  empId: string,
  companyId: string,
  action: OTPAction
): Promise<string> {
  // Invalidate existing unused OTPs for this action
  await prisma.otpToken.updateMany({
    where: {
      emp_id: empId,
      company_id: companyId,
      action,
      is_used: false,
    },
    data: { is_used: true },
  });

  const code = generateCode();
  const codeHash = hashOTP(code);

  await prisma.otpToken.create({
    data: {
      emp_id: empId,
      company_id: companyId,
      action,
      code_hash: codeHash,
      expires_at: new Date(Date.now() + OTP_EXPIRY_MS),
      attempts: 0,
      is_used: false,
    },
  });

  return code;
}

/**
 * Verifies an OTP within the 5-minute verification window.
 * Increments attempt count. Marks as used on success.
 * Returns false if expired, already used, or max attempts exceeded.
 */
export async function verifyOTP(
  empId: string,
  companyId: string,
  action: OTPAction,
  code: string
): Promise<boolean> {
  const token = await prisma.otpToken.findFirst({
    where: {
      emp_id: empId,
      company_id: companyId,
      action,
      is_used: false,
    },
    orderBy: { created_at: 'desc' },
  });

  if (!token) return false;

  // Check max attempts
  if (token.attempts >= MAX_ATTEMPTS) {
    await prisma.otpToken.update({
      where: { id: token.id },
      data: { is_used: true },
    });
    return false;
  }

  // Increment attempts
  await prisma.otpToken.update({
    where: { id: token.id },
    data: { attempts: token.attempts + 1 },
  });

  // Check expiry (5-minute verification window)
  const verifyDeadline = new Date(token.created_at.getTime() + OTP_VERIFY_WINDOW_MS);
  if (new Date() > verifyDeadline) {
    return false;
  }

  // Check absolute expiry
  if (new Date() > token.expires_at) {
    return false;
  }

  // Verify hash
  const codeHash = hashOTP(code);
  if (codeHash !== token.code_hash) {
    return false;
  }

  // Mark as used on successful verification
  await prisma.otpToken.update({
    where: { id: token.id },
    data: { is_used: true },
  });

  return true;
}

/** Check if an action requires OTP verification */
export function isOTPRequired(action: string): boolean {
  return OTP_REQUIRED_ACTIONS.includes(action as OTPAction);
}
