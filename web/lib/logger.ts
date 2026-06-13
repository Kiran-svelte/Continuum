/**
 * Structured logger for Continuum HR.
 *
 * Replaces raw `console.log/error/warn` with structured JSON output
 * that includes request context, user identity, and PII redaction.
 *
 * Uses Winston under the hood for transport management and log levels.
 * Outputs structured JSON to stdout (12-factor compliant).
 *
 * @module logger
 */

import winston from 'winston';

// ─── Types ───────────────────────────────────────────────────────────────────

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogContext {
  /** Request ID for tracing */
  requestId?: string;
  /** Authenticated user/employee ID */
  userId?: string;
  /** Company/tenant ID */
  companyId?: string;
  /** Action being performed */
  action?: string;
  /** Duration in milliseconds */
  durationMs?: number;
  /** HTTP method */
  method?: string;
  /** Request path */
  path?: string;
  /** HTTP status code */
  statusCode?: number;
  /** IP address */
  ip?: string;
  /** Additional structured fields */
  [key: string]: unknown;
}

// ─── Constants ───────────────────────────────────────────────────────────────

/** Fields that must never appear in logs */
const REDACTED_FIELDS = new Set([
  'password',
  'password_hash',
  'token',
  'secret',
  'authorization',
  'cookie',
  'refresh_token',
  'access_token',
  'api_key',
  'credit_card',
  'ssn',
  'aadhaar',
  'pan_number',
]);

/** Replacement value for redacted fields */
const REDACTED_VALUE = '[REDACTED]';

// ─── PII Redaction ───────────────────────────────────────────────────────────

/**
 * Recursively redacts sensitive fields from a log payload.
 * Operates on a shallow copy — never mutates the original.
 *
 * @param obj - Object to redact
 * @param depth - Current recursion depth (max 5 to prevent infinite loops)
 * @returns Redacted copy of the object
 */
function redactSensitiveFields(obj: Record<string, unknown>, depth: number = 0): Record<string, unknown> {
  if (depth > 5 || obj === null || typeof obj !== 'object') {
    return obj;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();

    if (REDACTED_FIELDS.has(lowerKey)) {
      result[key] = REDACTED_VALUE;
      continue;
    }

    if (typeof value === 'object' && value !== null && !(value instanceof Date)) {
      result[key] = Array.isArray(value)
        ? value.map((item) =>
            typeof item === 'object' && item !== null
              ? redactSensitiveFields(item as Record<string, unknown>, depth + 1)
              : item
          )
        : redactSensitiveFields(value as Record<string, unknown>, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result;
}

// ─── Winston Instance ────────────────────────────────────────────────────────

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  format: winston.format.combine(
    winston.format.timestamp({ format: 'ISO' }),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  defaultMeta: {
    service: 'continuum-hr',
    environment: process.env.NODE_ENV || 'development',
  },
  transports: [
    new winston.transports.Console({
      // Human-readable in dev, JSON in production
      format: process.env.NODE_ENV === 'production'
        ? winston.format.json()
        : winston.format.combine(
            winston.format.colorize(),
            winston.format.printf(({ level, message, timestamp, ...meta }) => {
              const contextStr = Object.keys(meta).length > 2
                ? ` ${JSON.stringify(redactSensitiveFields(meta))}`
                : '';
              return `${timestamp} ${level}: ${message}${contextStr}`;
            }),
          ),
    }),
  ],
});

// ─── Public Logger API ───────────────────────────────────────────────────────

/**
 * Structured logger with PII redaction and request context.
 *
 * @example
 * ```ts
 * logger.info('Leave approved', { userId: emp.id, companyId: emp.org_id, action: 'LEAVE_APPROVE', leaveId });
 * logger.error('Payment failed', { orderId, error: err.message });
 * ```
 */
export const logger = {
  /**
   * Debug-level log — development diagnostics only.
   * Stripped in production unless LOG_LEVEL=debug.
   */
  debug(message: string, context?: LogContext): void {
    winstonLogger.debug(message, context ? redactSensitiveFields(context) : undefined);
  },

  /**
   * Info-level log — normal operational events.
   * Use for: request completed, user action, feature toggle.
   */
  info(message: string, context?: LogContext): void {
    winstonLogger.info(message, context ? redactSensitiveFields(context) : undefined);
  },

  /**
   * Warn-level log — unexpected but recoverable situations.
   * Use for: rate limit hit, deprecated API usage, missing optional config.
   */
  warn(message: string, context?: LogContext): void {
    winstonLogger.warn(message, context ? redactSensitiveFields(context) : undefined);
  },

  /**
   * Error-level log — failures that need attention.
   * Use for: unhandled exceptions, external service failures, data integrity issues.
   */
  error(message: string, context?: LogContext): void {
    winstonLogger.error(message, context ? redactSensitiveFields(context) : undefined);
  },

  /**
   * Fatal-level log — system cannot continue.
   * Use for: database connection lost, auth secret missing, unrecoverable state.
   */
  fatal(message: string, context?: LogContext): void {
    winstonLogger.log('error', `[FATAL] ${message}`, context ? redactSensitiveFields(context) : undefined);
  },
};

// ─── Request Logger Helper ───────────────────────────────────────────────────

/**
 * Creates a child logger bound to a specific request context.
 * All logs from this child will automatically include the request metadata.
 *
 * @param requestContext - Base context for all logs from this request
 * @returns Logger with pre-bound context
 *
 * @example
 * ```ts
 * const log = createRequestLogger({ requestId, userId: employee.id, companyId: employee.org_id });
 * log.info('Processing leave request', { leaveId });
 * log.error('Validation failed', { errors });
 * ```
 */
export function createRequestLogger(requestContext: LogContext) {
  return {
    debug(message: string, extra?: LogContext): void {
      logger.debug(message, { ...requestContext, ...extra });
    },
    info(message: string, extra?: LogContext): void {
      logger.info(message, { ...requestContext, ...extra });
    },
    warn(message: string, extra?: LogContext): void {
      logger.warn(message, { ...requestContext, ...extra });
    },
    error(message: string, extra?: LogContext): void {
      logger.error(message, { ...requestContext, ...extra });
    },
    fatal(message: string, extra?: LogContext): void {
      logger.fatal(message, { ...requestContext, ...extra });
    },
  };
}

export default logger;
