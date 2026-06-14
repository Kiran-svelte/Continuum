/**
 * AES-256-GCM token encryption/decryption for WhatsApp access tokens.
 *
 * Tokens are never stored in plaintext — always encrypted at rest.
 * Required env variable: WHATSAPP_TOKEN_ENCRYPTION_KEY (32 bytes, base64-encoded).
 *
 * Wire format: base64( iv[12 bytes] || ciphertext || authTag[16 bytes] )
 *
 * Implements L5-03-002.
 */
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

// ─── Constants ───────────────────────────────────────────────────────────────

/** AES-GCM algorithm identifier. Node crypto requires this exact string. */
const ALGORITHM = 'aes-256-gcm' as const;

/**
 * IV length for AES-256-GCM.
 * NIST SP 800-38D recommends 12 bytes (96-bit) for GCM to avoid counter-wrap.
 */
const IV_LENGTH_BYTES = 12;

/**
 * GCM authentication tag length.
 * 16 bytes (128-bit) is the maximum and provides the strongest integrity check.
 */
const AUTH_TAG_LENGTH_BYTES = 16;

/**
 * Required AES-256 key length in bytes.
 * 32 bytes = 256 bits.
 */
const REQUIRED_KEY_LENGTH_BYTES = 32;

/**
 * Minimum length of a valid ciphertext buffer:
 * IV (12) + at least 1 byte of ciphertext + auth tag (16).
 */
const MIN_CIPHERTEXT_LENGTH = IV_LENGTH_BYTES + AUTH_TAG_LENGTH_BYTES + 1;

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * Output format: base64( iv[12] || ciphertext || authTag[16] )
 *
 * @param plaintext - String to encrypt (e.g. WhatsApp access token).
 * @param keyBase64 - 32-byte encryption key as base64 string (from env).
 * @returns Base64-encoded combined buffer: iv + ciphertext + auth tag.
 * @throws {Error} If keyBase64 does not decode to exactly 32 bytes.
 */
export function encryptToken(plaintext: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  assertKeyLength(key);

  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(Buffer.from(plaintext, 'utf8')),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, ciphertext, tag]).toString('base64');
}

/**
 * Decrypts a token previously encrypted with {@link encryptToken}.
 *
 * @param ciphertextBase64 - Base64-encoded combined buffer: iv[12] + ciphertext + authTag[16].
 * @param keyBase64 - 32-byte decryption key as base64 string (from env).
 * @returns Original plaintext string.
 * @throws {Error} If the key is wrong length, the buffer is too short,
 *   or decryption fails due to wrong key or tampered data.
 */
export function decryptToken(ciphertextBase64: string, keyBase64: string): string {
  const key = Buffer.from(keyBase64, 'base64');
  assertKeyLength(key);

  const combined = Buffer.from(ciphertextBase64, 'base64');
  assertMinCiphertextLength(combined);

  const iv = combined.subarray(0, IV_LENGTH_BYTES);
  const tag = combined.subarray(combined.length - AUTH_TAG_LENGTH_BYTES);
  const ciphertext = combined.subarray(IV_LENGTH_BYTES, combined.length - AUTH_TAG_LENGTH_BYTES);

  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString('utf8');
}

// ─── Private Guards ───────────────────────────────────────────────────────────

/**
 * Asserts that the key buffer is exactly {@link REQUIRED_KEY_LENGTH_BYTES} bytes.
 *
 * @param key - Decoded key buffer.
 * @throws {Error} If key length is not 32 bytes.
 */
function assertKeyLength(key: Buffer): void {
  if (key.length !== REQUIRED_KEY_LENGTH_BYTES) {
    throw new Error(
      `WHATSAPP_TOKEN_ENCRYPTION_KEY must decode to ${REQUIRED_KEY_LENGTH_BYTES} bytes, got ${key.length}`
    );
  }
}

/**
 * Asserts that the combined ciphertext buffer is long enough to contain
 * the IV, at least one byte of ciphertext, and the auth tag.
 *
 * @param combined - Decoded ciphertext buffer.
 * @throws {Error} If buffer is shorter than {@link MIN_CIPHERTEXT_LENGTH}.
 */
function assertMinCiphertextLength(combined: Buffer): void {
  if (combined.length < MIN_CIPHERTEXT_LENGTH) {
    throw new Error(
      `Ciphertext buffer is too short: expected at least ${MIN_CIPHERTEXT_LENGTH} bytes, got ${combined.length}`
    );
  }
}
