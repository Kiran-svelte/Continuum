// ─── XSS Sanitization ────────────────────────────────────────────────────────

const DANGEROUS_HTML_REGEX = /<[^>]*>/g;
const SCRIPT_PATTERN = /<script\b[^<]*(?:(?!<\/script\s*>)<[^<]*)*<\/script\s*>/gi;
const EVENT_HANDLER_PATTERN = /\s*on\w+\s*=\s*["'][^"']*["']/gi;
const JAVASCRIPT_URI_PATTERN = /javascript\s*:/gi;
const DATA_URI_PATTERN = /data\s*:\s*text\/html/gi;
const EXPRESSION_PATTERN = /expression\s*\(/gi;
const NULL_BYTE_PATTERN = /\0/g;

/**
 * Removes XSS attack vectors from a string.
 * Applies sanitization in a loop until the output stabilizes
 * to handle nested/constructed attack patterns.
 */
export function sanitizeXSS(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;
  let previous: string;

  // Loop until stable to handle nested patterns like <scr<script>ipt>
  do {
    previous = sanitized;

    // Remove script tags and content
    sanitized = sanitized.replace(SCRIPT_PATTERN, '');

    // Remove event handlers
    sanitized = sanitized.replace(EVENT_HANDLER_PATTERN, '');

    // Remove javascript: URIs
    sanitized = sanitized.replace(JAVASCRIPT_URI_PATTERN, '');

    // Remove data: URIs with HTML
    sanitized = sanitized.replace(DATA_URI_PATTERN, '');

    // Remove CSS expressions
    sanitized = sanitized.replace(EXPRESSION_PATTERN, '');

    // Remove null bytes
    sanitized = sanitized.replace(NULL_BYTE_PATTERN, '');

    // Remove remaining HTML tags
    sanitized = sanitized.replace(DANGEROUS_HTML_REGEX, '');
  } while (sanitized !== previous);

  return sanitized.trim();
}

// ─── SQL Injection Prevention ────────────────────────────────────────────────

const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|TRUNCATE|DECLARE)\b)/gi,
  /(--|#|\/\*|\*\/)/g,
  /(\b(OR|AND)\b\s+\d+\s*=\s*\d+)/gi,
  /(';?\s*(DROP|DELETE|INSERT|UPDATE|SELECT))/gi,
];

/**
 * Detects and removes common SQL injection patterns.
 * Note: This is a defense-in-depth measure — Prisma already uses
 * parameterized queries for primary protection.
 */
export function sanitizeSQL(input: string): string {
  if (typeof input !== 'string') return '';

  let sanitized = input;

  for (const pattern of SQL_INJECTION_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Remove semicolons that could terminate SQL statements
  sanitized = sanitized.replace(/;/g, '');

  return sanitized.trim();
}

// ─── Combined Sanitization ──────────────────────────────────────────────────

/** Applies both XSS and SQL injection sanitization */
export function sanitizeAll(input: string): string {
  return sanitizeSQL(sanitizeXSS(input));
}

/** Recursively sanitizes all string values in an object */
export function deepSanitize<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeAll(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) => {
        if (typeof item === 'string') return sanitizeAll(item);
        if (typeof item === 'object' && item !== null) {
          return deepSanitize(item as Record<string, unknown>);
        }
        return item;
      });
    } else if (typeof value === 'object' && value !== null) {
      result[key] = deepSanitize(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/** Validates that an email address is properly formatted */
export function sanitizeEmail(email: string): string {
  const sanitized = sanitizeXSS(email).toLowerCase().trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(sanitized)) {
    throw new Error('Invalid email format');
  }
  return sanitized;
}

/** Validates and sanitizes a UUID */
export function sanitizeUUID(uuid: string): string {
  const sanitized = sanitizeXSS(uuid).trim();
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(sanitized)) {
    throw new Error('Invalid UUID format');
  }
  return sanitized;
}
