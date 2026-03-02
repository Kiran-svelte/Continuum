/**
 * Structured Logging Service for Continuum
 *
 * Primary: Winston + Loki transport (for Grafana Loki)
 * Fallback: Console output in structured JSON format
 */

import { hostname } from 'os';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LogMeta {
  companyId?: string;
  employeeId?: string;
  requestId?: string;
  [key: string]: unknown;
}

export interface RequestContext {
  requestId: string;
  method: string;
  url: string;
  ip: string;
  userAgent?: string;
  companyId?: string;
  employeeId?: string;
}

export interface Logger {
  info(message: string, meta?: LogMeta): void;
  error(message: string, error?: Error | null, meta?: LogMeta): void;
  warn(message: string, meta?: LogMeta): void;
  http(message: string, meta?: LogMeta): void;
  debug(message: string, meta?: LogMeta): void;
  security(message: string, meta?: LogMeta): void;
  audit(message: string, meta?: LogMeta): void;
  business(message: string, meta?: LogMeta): void;
}

// ─── Sensitive Data Redaction ────────────────────────────────────────────────

const SENSITIVE_KEYS = [
  'password',
  'token',
  'secret',
  'authorization',
  'cookie',
  'otp',
  'creditcard',
  'credit_card',
  'creditCard',
  'ssn',
  'apikey',
  'api_key',
  'apiKey',
  'private_key',
  'privateKey',
];

const REDACTED = '[REDACTED]';

export function redactSensitiveData(obj: unknown, seen = new WeakSet()): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;

  const objRef = obj as object;
  if (seen.has(objRef)) return '[Circular]';
  seen.add(objRef);

  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item, seen));
  }

  const redacted: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.some((sk) => key.toLowerCase().includes(sk.toLowerCase()))) {
      redacted[key] = REDACTED;
    } else if (typeof value === 'object' && value !== null) {
      redacted[key] = redactSensitiveData(value, seen);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

// ─── Default Labels ──────────────────────────────────────────────────────────

const defaultLabels = {
  service: 'continuum-web',
  environment: process.env.NODE_ENV || 'development',
  hostname: hostname(),
};

// ─── Winston Logger Creation ─────────────────────────────────────────────────

function createWinstonLogger(): Logger {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const winston = require('winston') as typeof import('winston');

    const isProduction = process.env.NODE_ENV === 'production';

    const consoleFormat = isProduction
      ? winston.format.combine(
          winston.format.timestamp(),
          winston.format.json()
        )
      : winston.format.combine(
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, ...rest }) => {
            const meta = Object.keys(rest).length ? ` ${JSON.stringify(rest)}` : '';
            return `${timestamp} [${level}] ${message}${meta}`;
          })
        );

    const transports: InstanceType<typeof winston.transports.Console>[] = [
      new winston.transports.Console({ format: consoleFormat }),
    ];

    // Loki transport (optional)
    if (process.env.LOKI_URL) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const LokiTransport = require('winston-loki');
        transports.push(
          new LokiTransport({
            host: process.env.LOKI_URL,
            labels: defaultLabels,
            json: true,
            batching: true,
            interval: 5,
            replaceTimestamp: true,
            gracefulShutdown: true,
            clearOnError: true,
          })
        );
      } catch {
        console.warn('[logger] winston-loki not available — Loki transport disabled');
      }
    }

    const winstonLogger = winston.createLogger({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      defaultMeta: defaultLabels,
      transports,
    });

    return {
      info(message: string, meta?: LogMeta) {
        winstonLogger.info(message, redactSensitiveData(meta || {}) as object);
      },
      error(message: string, error?: Error | null, meta?: LogMeta) {
        winstonLogger.error(message, {
          ...redactSensitiveData(meta || {}) as object,
          ...(error ? { error: { message: error.message, stack: error.stack, name: error.name } } : {}),
        });
      },
      warn(message: string, meta?: LogMeta) {
        winstonLogger.warn(message, redactSensitiveData(meta || {}) as object);
      },
      http(message: string, meta?: LogMeta) {
        winstonLogger.http(message, redactSensitiveData(meta || {}) as object);
      },
      debug(message: string, meta?: LogMeta) {
        winstonLogger.debug(message, redactSensitiveData(meta || {}) as object);
      },
      security(message: string, meta?: LogMeta) {
        winstonLogger.warn(message, {
          ...redactSensitiveData(meta || {}) as object,
          _category: 'security',
        });
      },
      audit(message: string, meta?: LogMeta) {
        winstonLogger.info(message, {
          ...redactSensitiveData(meta || {}) as object,
          _category: 'audit',
        });
      },
      business(message: string, meta?: LogMeta) {
        winstonLogger.info(message, {
          ...redactSensitiveData(meta || {}) as object,
          _category: 'business',
        });
      },
    };
  } catch {
    // Fallback to console logger
    return createConsoleLogger();
  }
}

// ─── Fallback Console Logger ─────────────────────────────────────────────────

function createConsoleLogger(): Logger {
  const log = (level: string, message: string, meta?: Record<string, unknown>) => {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      ...defaultLabels,
      ...redactSensitiveData(meta || {}) as object,
    };
    console.log(JSON.stringify(entry));
  };

  return {
    info: (msg, meta) => log('info', msg, meta),
    error: (msg, err, meta) =>
      log('error', msg, {
        ...meta,
        ...(err ? { error: { message: err.message, stack: err.stack } } : {}),
      }),
    warn: (msg, meta) => log('warn', msg, meta),
    http: (msg, meta) => log('http', msg, meta),
    debug: (msg, meta) => log('debug', msg, meta),
    security: (msg, meta) => log('security', msg, { ...meta, _category: 'security' }),
    audit: (msg, meta) => log('audit', msg, { ...meta, _category: 'audit' }),
    business: (msg, meta) => log('business', msg, { ...meta, _category: 'business' }),
  };
}

// ─── Request Logger ──────────────────────────────────────────────────────────

export function createRequestLogger(req: RequestContext): Logger {
  const baseLogger = logger;
  const context: LogMeta = {
    requestId: req.requestId,
    method: req.method,
    url: req.url,
    ip: req.ip,
    companyId: req.companyId,
    employeeId: req.employeeId,
  };

  const withContext = (meta?: LogMeta): LogMeta => ({ ...context, ...meta });

  return {
    info: (msg, meta) => baseLogger.info(msg, withContext(meta)),
    error: (msg, err, meta) => baseLogger.error(msg, err, withContext(meta)),
    warn: (msg, meta) => baseLogger.warn(msg, withContext(meta)),
    http: (msg, meta) => baseLogger.http(msg, withContext(meta)),
    debug: (msg, meta) => baseLogger.debug(msg, withContext(meta)),
    security: (msg, meta) => baseLogger.security(msg, withContext(meta)),
    audit: (msg, meta) => baseLogger.audit(msg, withContext(meta)),
    business: (msg, meta) => baseLogger.business(msg, withContext(meta)),
  };
}

export function logRequest(
  req: { method: string; url: string },
  res: { statusCode: number },
  duration: number
): void {
  const meta: LogMeta = {
    method: req.method,
    url: req.url,
    statusCode: res.statusCode,
    duration: `${duration.toFixed(2)}ms`,
  };

  if (res.statusCode >= 500) {
    logger.error(`${req.method} ${req.url} ${res.statusCode} ${duration.toFixed(2)}ms`, null, meta);
  } else if (res.statusCode >= 400) {
    logger.warn(`${req.method} ${req.url} ${res.statusCode} ${duration.toFixed(2)}ms`, meta);
  } else {
    logger.http(`${req.method} ${req.url} ${res.statusCode} ${duration.toFixed(2)}ms`, meta);
  }
}

// ─── Singleton Export ────────────────────────────────────────────────────────

export const logger: Logger = createWinstonLogger();
export default logger;
