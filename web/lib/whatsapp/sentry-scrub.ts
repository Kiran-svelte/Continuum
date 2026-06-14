/**
 * Sentry scrubbing helpers for WhatsApp/channel payloads.
 * Implements L5-06 security ops.
 */

const SENSITIVE_PATTERNS = [
  /access_token/i,
  /authorization/i,
  /otp/i,
  /code/i,
  /phone/i,
  /secret/i,
];

/**
 * Returns a scrubbed copy safe for Sentry breadcrumbs/extras.
 */
export function scrubChannelPayload(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (SENSITIVE_PATTERNS.some((pattern) => pattern.test(key))) {
      out[key] = '[Filtered]';
      continue;
    }
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = scrubChannelPayload(value as Record<string, unknown>);
    } else {
      out[key] = value;
    }
  }
  return out;
}
