/**
 * Shared Sentry initialization options for client, server, and edge runtimes.
 * DSN is read from SENTRY_DSN (server) or NEXT_PUBLIC_SENTRY_DSN (client build).
 */
import type { ErrorEvent } from '@sentry/nextjs';
import type { BrowserOptions, EdgeOptions, NodeOptions } from '@sentry/nextjs';

const SENSITIVE_KEYS = ['password', 'token', 'authorization', 'secret', 'apiKey', 'api_key'];

export function resolveSentryDsn(): string | undefined {
  return (
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    undefined
  );
}

export function isSentryEnabled(): boolean {
  return Boolean(resolveSentryDsn());
}

function scrubEvent<T extends { breadcrumbs?: Array<{ data?: Record<string, unknown> }> }>(
  event: T,
): T {
  const breadcrumbs = event.breadcrumbs ?? [];
  for (const crumb of breadcrumbs) {
    if (!crumb.data) continue;
    for (const key of Object.keys(crumb.data)) {
      if (SENSITIVE_KEYS.some((s) => key.toLowerCase().includes(s))) {
        delete crumb.data[key];
      }
    }
  }
  return event;
}

const baseOptions = {
  dsn: resolveSentryDsn(),
  enabled: isSentryEnabled(),
  environment:
    process.env.SENTRY_ENVIRONMENT ||
    process.env.VERCEL_ENV ||
    process.env.NODE_ENV ||
    'development',
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  /** HR platform: do not send IP/headers by default. */
  sendDefaultPii: false,
  beforeSend(event: ErrorEvent) {
    return scrubEvent(event);
  },
} satisfies Partial<NodeOptions>;

export const sentryServerOptions: NodeOptions = {
  ...baseOptions,
};

export const sentryEdgeOptions: EdgeOptions = {
  ...baseOptions,
};

export const sentryClientOptions: BrowserOptions = {
  ...baseOptions,
  integrations: (defaults) => defaults,
};
