/**
 * Encrypted Audit Service for Continuum
 *
 * Extends base audit logging with field-level encryption for sensitive data.
 * Automatically detects and encrypts PII fields in audit log state objects.
 *
 * Sensitive fields auto-detected: phone, email, salary, bank_account,
 * pan_number, aadhaar
 */

import { createAuditLog, type CreateAuditLogParams } from '@/lib/audit';
import { encryptField, decryptField, isEncrypted } from './encryption';

// ─── Constants ───────────────────────────────────────────────────────────────

const SENSITIVE_FIELDS = [
  'phone',
  'email',
  'salary',
  'bank_account',
  'pan_number',
  'aadhaar',
  'basic_salary',
  'gross_salary',
  'net_salary',
  'tax_deducted',
  'account_number',
  'ifsc_code',
];

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EncryptedAuditLogParams extends CreateAuditLogParams {
  /** Skip encryption for this entry (e.g., non-PII data) */
  skipEncryption?: boolean;
}

export interface DecryptedAuditLog {
  id: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/** Encrypt sensitive fields in a state object */
async function encryptState(
  state: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> {
  if (!state) return null;

  const encrypted: Record<string, unknown> = { ...state };

  for (const field of SENSITIVE_FIELDS) {
    if (field in encrypted && typeof encrypted[field] === 'string') {
      const value = encrypted[field] as string;
      if (!isEncrypted(value)) {
        try {
          encrypted[field] = await encryptField(value, `audit:${field}`);
        } catch {
          // If encryption fails, mask the value rather than storing plaintext
          encrypted[field] = '***REDACTED***';
          console.warn(`[EncryptedAudit] Failed to encrypt field "${field}" — value redacted`);
        }
      }
    }
  }

  return encrypted;
}

/** Decrypt sensitive fields in a state object */
async function decryptState(
  state: Record<string, unknown> | null | undefined
): Promise<Record<string, unknown> | null> {
  if (!state) return null;

  const decrypted: Record<string, unknown> = { ...state };

  for (const field of SENSITIVE_FIELDS) {
    if (field in decrypted && typeof decrypted[field] === 'string') {
      const value = decrypted[field] as string;
      if (isEncrypted(value)) {
        try {
          decrypted[field] = await decryptField(value, `audit:${field}`);
        } catch {
          console.warn(`[EncryptedAudit] Failed to decrypt field "${field}"`);
          decrypted[field] = '***ENCRYPTED***';
        }
      }
    }
  }

  return decrypted;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Creates an audit log with encrypted PII fields in previous_state and new_state.
 * Falls back to creating a standard audit log with redacted values if encryption fails.
 */
export async function createEncryptedAuditLog(
  params: EncryptedAuditLogParams
): Promise<string> {
  const { skipEncryption, ...auditParams } = params;

  if (skipEncryption) {
    return createAuditLog(auditParams);
  }

  try {
    const encryptedPrevState = await encryptState(auditParams.previousState);
    const encryptedNewState = await encryptState(auditParams.newState);

    return createAuditLog({
      ...auditParams,
      previousState: encryptedPrevState,
      newState: encryptedNewState,
    });
  } catch (error) {
    console.error(
      '[EncryptedAudit] Encryption failed, creating audit with redacted data:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    // Create audit log with redacted sensitive data as last resort
    const redactedPrev = redactState(auditParams.previousState);
    const redactedNew = redactState(auditParams.newState);

    return createAuditLog({
      ...auditParams,
      previousState: redactedPrev,
      newState: redactedNew,
    });
  }
}

/**
 * Decrypt an audit log's state fields for authorized viewing.
 * Only call this for users with appropriate permissions.
 */
export async function decryptAuditLog(auditLog: {
  id: string;
  previous_state?: Record<string, unknown> | null;
  new_state?: Record<string, unknown> | null;
}): Promise<DecryptedAuditLog> {
  try {
    const decryptedPrev = await decryptState(auditLog.previous_state);
    const decryptedNew = await decryptState(auditLog.new_state);

    return {
      id: auditLog.id,
      previous_state: decryptedPrev,
      new_state: decryptedNew,
    };
  } catch (error) {
    console.error(
      '[EncryptedAudit] Decryption failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );

    return {
      id: auditLog.id,
      previous_state: auditLog.previous_state,
      new_state: auditLog.new_state,
    };
  }
}

/** Redact sensitive fields (replaces values with a placeholder) */
function redactState(
  state: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  if (!state) return null;

  const redacted: Record<string, unknown> = { ...state };

  for (const field of SENSITIVE_FIELDS) {
    if (field in redacted) {
      redacted[field] = '***REDACTED***';
    }
  }

  return redacted;
}
