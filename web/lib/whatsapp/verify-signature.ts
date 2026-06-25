/**
 * HMAC-SHA256 signature verification for WhatsApp Cloud API webhooks.
 *
 * Meta sends: X-Hub-Signature-256: sha256=<hex>
 * We verify against the raw request body using WHATSAPP_WEBHOOK_SECRET.
 *
 * Uses crypto.timingSafeEqual to prevent timing attacks.
 * Implements G5 Zero UI security gate.
 *
 * @see https://developers.facebook.com/docs/whatsapp/webhooks/getting-started#verification-requests
 */
import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Verifies the X-Hub-Signature-256 header against the raw request body.
 *
 * @param rawBody   - The raw (unparsed) request body as a Buffer.
 * @param signature - Value of the X-Hub-Signature-256 header (format: "sha256=<hex>").
 * @param secret    - The app-level webhook secret (WHATSAPP_WEBHOOK_SECRET env var).
 * @returns true if valid; false if missing, malformed, or HMAC mismatch.
 */
export function verifyWhatsAppSignature(
  rawBody: Buffer,
  signature: string | null | undefined,
  secret: string
): boolean {
  if (!signature) return false;

  // Meta always prefixes with "sha256="
  if (!signature.startsWith('sha256=')) return false;

  const receivedHex = signature.slice('sha256='.length);

  // Compute expected HMAC
  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');

  // Constant-time compare to prevent timing oracle
  try {
    const expectedBuf = Buffer.from(expected, 'hex');
    const receivedBuf = Buffer.from(receivedHex, 'hex');

    // Buffers must be same length for timingSafeEqual
    if (expectedBuf.length !== receivedBuf.length) return false;

    return timingSafeEqual(expectedBuf, receivedBuf);
  } catch {
    return false;
  }
}
