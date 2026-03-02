/**
 * Encryption Service for Continuum
 *
 * Primary: HashiCorp Vault Transit engine
 * Fallback: Local AES-256-GCM (when Vault unavailable)
 *
 * All encrypted values are prefixed:
 *   - vault:v1:  — encrypted via Vault Transit
 *   - local:v1:  — encrypted via local AES-256-GCM
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';
import { vault } from './vault';

// ─── Constants ───────────────────────────────────────────────────────────────

const VAULT_PREFIX = 'vault:v1:';
const LOCAL_PREFIX = 'local:v1:';
const TRANSIT_KEY = 'field-encryption';
const AES_KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12; // 96 bits for GCM
const AUTH_TAG_LENGTH = 16;

// ─── Local Encryption Helpers ────────────────────────────────────────────────

function getLocalKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    throw new Error('[Encryption] ENCRYPTION_KEY env var is required for local fallback');
  }
  // Derive a 256-bit key from the env var using scrypt
  return scryptSync(envKey, 'continuum-salt', AES_KEY_LENGTH);
}

function localEncrypt(plaintext: string, context?: string): string {
  const key = getLocalKey();
  const iv = randomBytes(IV_LENGTH);

  const cipher = createCipheriv('aes-256-gcm', key, iv);
  if (context) {
    cipher.setAAD(Buffer.from(context, 'utf-8'));
  }

  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  // Format: base64(iv + authTag + encrypted)
  const combined = Buffer.concat([iv, authTag, encrypted]);
  return `${LOCAL_PREFIX}${combined.toString('base64')}`;
}

function localDecrypt(ciphertext: string, context?: string): string {
  const key = getLocalKey();
  const data = Buffer.from(ciphertext.slice(LOCAL_PREFIX.length), 'base64');

  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  if (context) {
    decipher.setAAD(Buffer.from(context, 'utf-8'));
  }

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]).toString('utf-8');
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Check if a value is already encrypted */
export function isEncrypted(value: string): boolean {
  if (typeof value !== 'string') return false;
  return value.startsWith(VAULT_PREFIX) || value.startsWith(LOCAL_PREFIX);
}

/** Encrypt a single field value */
export async function encryptField(value: string, context?: string): Promise<string> {
  if (isEncrypted(value)) return value;

  // Try Vault Transit first
  if (vault.isAvailable()) {
    try {
      const result = await vault.encrypt(TRANSIT_KEY, value);
      if (result) return result;
    } catch {
      console.warn('[Encryption] Vault encrypt failed, falling back to local');
    }
  }

  // Local AES-256-GCM fallback
  try {
    return localEncrypt(value, context);
  } catch (error) {
    console.error('[Encryption] Local encryption failed:', error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Encryption failed — no encryption backend available');
  }
}

/** Decrypt a single field value */
export async function decryptField(ciphertext: string, context?: string): Promise<string> {
  if (!isEncrypted(ciphertext)) return ciphertext;

  // Vault-encrypted value
  if (ciphertext.startsWith(VAULT_PREFIX)) {
    if (!vault.isAvailable()) {
      throw new Error('Cannot decrypt Vault-encrypted value — Vault unavailable');
    }
    const result = await vault.decrypt(TRANSIT_KEY, ciphertext);
    if (result === null) {
      throw new Error('Vault decryption failed');
    }
    return result;
  }

  // Local-encrypted value
  if (ciphertext.startsWith(LOCAL_PREFIX)) {
    try {
      return localDecrypt(ciphertext, context);
    } catch (error) {
      console.error('[Encryption] Local decryption failed:', error instanceof Error ? error.message : 'Unknown error');
      throw new Error('Local decryption failed');
    }
  }

  return ciphertext;
}

/** Encrypt specified fields in an object, returning a new object */
export async function encryptObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): Promise<T> {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    if (field in result && typeof result[field] === 'string') {
      const value = result[field] as string;
      if (!isEncrypted(value)) {
        (result as Record<string, unknown>)[field] = await encryptField(value, field);
      }
    }
  }

  return result;
}

/** Decrypt specified fields in an object, returning a new object */
export async function decryptObject<T extends Record<string, unknown>>(
  obj: T,
  sensitiveFields: string[]
): Promise<T> {
  const result = { ...obj };

  for (const field of sensitiveFields) {
    if (field in result && typeof result[field] === 'string') {
      const value = result[field] as string;
      if (isEncrypted(value)) {
        (result as Record<string, unknown>)[field] = await decryptField(value, field);
      }
    }
  }

  return result;
}
