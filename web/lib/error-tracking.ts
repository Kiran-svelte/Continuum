/**
 * Error tracking service.
 *
 * Provides a unified interface for capturing and reporting errors.
 * Works standalone with structured logging out of the box.
 * When Sentry is configured (SENTRY_DSN env var), errors are also
 * forwarded to Sentry for alerting and grouping.
 *
 * This is the ONLY place in the codebase that should interface with
 * external error tracking providers. All API routes should use this
 * service instead of calling console.error directly for unhandled errors.
 *
 * @module error-tracking
 */

import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ErrorContext {
  /** Request ID for correlation */
  requestId?: string;
  /** User/employee ID */
  userId?: string;
  /** Company/tenant ID */
  companyId?: string;
  /** Which API route or function */
  source?: string;
  /** HTTP method */
  method?: string;
  /** Request path */
  path?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

// ─── Sentry Lazy Init ────────────────────────────────────────────────────────

let isSentryInitialized = false;
let sentryModule: { captureException: (error: unknown, context?: unknown) => void } | null = null;

/**
 * Lazily initializes Sentry if SENTRY_DSN is configured.
 * Returns null if Sentry is not available.
 */
async function getSentry(): Promise<typeof sentryModule> {
  if (isSentryInitialized) return sentryModule;
  isSentryInitialized = true;

  const dsn = process.env.SENTRY_DSN;
  if (!dsn) {
    logger.debug('Sentry not configured (SENTRY_DSN not set) — errors logged locally only');
    return null;
  }

  try {
    // Dynamic import — only loads Sentry if configured. Package is optional.
    // We cast to unknown first to fully bypass type checking since the package
    // may not be installed. All access is guarded by try/catch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const Sentry = (await import('@sentry/nextjs' as string)) as any;
    if (typeof Sentry?.isInitialized === 'function' && !Sentry.isInitialized()) {
      Sentry.init({
        dsn,
        environment: process.env.NODE_ENV || 'development',
        tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        beforeSend(event: any) {
          const breadcrumbs = event?.breadcrumbs ?? [];
          for (const crumb of breadcrumbs) {
            if (crumb?.data) {
              delete crumb.data.password;
              delete crumb.data.token;
              delete crumb.data.authorization;
            }
          }
          return event;
        },
      });
    }
    sentryModule = Sentry;
    logger.info('Sentry error tracking initialized');
    return sentryModule;
  } catch {
    logger.warn('Sentry SDK not installed — install @sentry/nextjs to enable error tracking');
    return null;
  }
}


// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Captures an error with structured context.
 *
 * Always logs the error via the structured logger.
 * If Sentry is configured, also forwards to Sentry.
 *
 * @param error - The error to capture
 * @param context - Structured context for debugging
 *
 * @example
 * ```ts
 * try {
 *   await processPayroll(companyId);
 * } catch (error) {
 *   captureError(error, { source: 'PayrollRun', companyId, requestId });
 *   return NextResponse.json({ error: 'Internal error' }, { status: 500 });
 * }
 * ```
 */
export async function captureError(error: unknown, context?: ErrorContext): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // Always log locally with full context
  logger.error(message, {
    ...context,
    stack,
    errorType: error instanceof Error ? error.constructor.name : typeof error,
  });

  // Forward to Sentry if available
  const sentry = await getSentry();
  if (sentry) {
    sentry.captureException(error, {
      extra: context,
      tags: {
        source: context?.source,
        companyId: context?.companyId,
      },
    });
  }
}

/**
 * Captures a warning-level event (not a crash, but worth tracking).
 *
 * @param message - Warning message
 * @param context - Structured context
 */
export function captureWarning(message: string, context?: ErrorContext): void {
  logger.warn(message, context);
}

/**
 * Creates an error handler bound to a specific API route context.
 *
 * Provides a one-liner for API route catch blocks that logs,
 * tracks, and returns a proper error response.
 *
 * @param source - Route identifier (e.g., 'LeaveApprove', 'PayrollRun')
 * @returns Error handler function
 *
 * @example
 * ```ts
 * const handleError = createRouteErrorHandler('LeaveApprove');
 *
 * export async function POST(request: NextRequest) {
 *   try {
 *     // ... route logic
 *   } catch (error) {
 *     return handleError(error, request);
 *   }
 * }
 * ```
 */
export function createRouteErrorHandler(source: string) {
  return async function handleRouteError(
    error: unknown,
    request?: { headers: { get: (name: string) => string | null }; method?: string; url?: string },
  ) {
    const requestId = request?.headers?.get('x-request-id') ?? 'unknown';

    await captureError(error, {
      source,
      requestId,
      method: request?.method,
      path: request?.url ? new URL(request.url).pathname : undefined,
    });

    // Return a generic error — never expose internals
    const { NextResponse } = await import('next/server');
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred.',
          requestId,
        },
      },
      { status: 500 },
    );
  };
}
