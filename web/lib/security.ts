import { createHash, createHmac, randomBytes } from 'crypto';

// ─── Input Sanitization ─────────────────────────────────────────────────────

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#96;',
};

const HTML_REGEX = /[&<>"'`/]/g;

/** Strips HTML tags and encodes dangerous characters to prevent XSS */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;
  let previous: string;

  // Loop until stable to handle nested/constructed patterns
  do {
    previous = sanitized;

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Encode remaining dangerous characters
    sanitized = sanitized.replace(HTML_REGEX, (char) => HTML_ENTITY_MAP[char] || char);

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Remove common script patterns
    sanitized = sanitized.replace(/javascript\s*:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');
    sanitized = sanitized.replace(/data\s*:\s*text\/html/gi, '');
  } while (sanitized !== previous);

  return sanitized.trim();
}

/** Recursively sanitizes all string fields in an object */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => {
        if (typeof item === 'string') return sanitizeInput(item);
        if (typeof item === 'object' && item !== null) {
          return sanitizeObject(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized as T;
}

// ─── CSRF Protection ────────────────────────────────────────────────────────

const CSRF_TOKEN_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

/** Generates an HMAC-based CSRF token with embedded timestamp for 24h expiry */
export function generateCSRFToken(secret: string): string {
  const timestamp = Date.now().toString();
  const nonce = randomBytes(16).toString('hex');
  const payload = `${timestamp}.${nonce}`;
  const signature = createHmac('sha256', secret).update(payload).digest('hex');
  return `${payload}.${signature}`;
}

/** Validates a CSRF token: checks HMAC signature and 24h expiry */
export function validateCSRFToken(token: string, secret: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [timestamp, nonce, signature] = parts;
  const payload = `${timestamp}.${nonce}`;

  // Verify signature
  const expectedSignature = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  if (signature !== expectedSignature) return false;

  // Check expiry
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime)) return false;

  return Date.now() - tokenTime < CSRF_TOKEN_EXPIRY_MS;
}

// ─── Hashing ─────────────────────────────────────────────────────────────────

/** SHA-256 hash of a value */
export function hashPassword(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

// ─── Security Headers ───────────────────────────────────────────────────────

/** Returns standard security response headers */
export function getSecurityHeaders(): Record<string, string> {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.pusher.com https://*.pusher.com;",
  };
}

// ─── PII Masking ─────────────────────────────────────────────────────────────

/**
 * Masks sensitive fields in an object.
 * e.g., maskSensitiveData({ email: "user@mail.com", name: "John" }, ["email"])
 * → { email: "u***@mail.com", name: "John" }
 */
export function maskSensitiveData<T extends Record<string, unknown>>(
  obj: T,
  fields: string[]
): T {
  if (!obj || typeof obj !== 'object') return obj;

  const masked: Record<string, unknown> = { ...obj };

  for (const field of fields) {
    if (field in masked && typeof masked[field] === 'string') {
      const value = masked[field] as string;

      if (value.includes('@')) {
        const [local, domain] = value.split('@');
        masked[field] = `${local[0]}${'*'.repeat(Math.max(local.length - 1, 2))}@${domain}`;
      } else if (value.length > 4) {
        masked[field] = `${value.slice(0, 2)}${'*'.repeat(value.length - 4)}${value.slice(-2)}`;
      } else {
        masked[field] = '****';
      }
    }
  }

  return masked as T;
}
