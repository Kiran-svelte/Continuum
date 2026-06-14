/**
 * Safe channel event logger — redacts PII/secrets before logging.
 * Implements L5-06-002.
 */
const REDACT_KEYS = new Set([
  'text',
  'body',
  'message',
  'password',
  'token',
  'accesstoken',
  'access_token',
  'code',
  'otp',
  'authorization',
  'cookie',
  'secret',
  'phone',
  'phone_e164',
]);

function redactMeta(meta: Record<string, unknown>): Record<string, unknown> {
  const safe: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(meta)) {
    if (REDACT_KEYS.has(key.toLowerCase())) {
      safe[key] = '[REDACTED]';
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      safe[key] = redactMeta(value as Record<string, unknown>);
    } else {
      safe[key] = value;
    }
  }
  return safe;
}

/**
 * Logs a structured channel event with sensitive fields redacted.
 */
export function logChannelEvent(
  level: 'info' | 'warn' | 'error',
  event: string,
  meta: Record<string, unknown> = {}
): void {
  const safe = redactMeta(meta);
  const payload = JSON.stringify({ ts: new Date().toISOString(), event, ...safe });
  if (level === 'error') {
    console.error(payload);
  } else if (level === 'warn') {
    console.warn(payload);
  } else {
    console.info(payload);
  }
}
