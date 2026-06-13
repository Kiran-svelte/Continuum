/**
 * Better Stack (Logtail) remote logging transport for Winston.
 * @see https://betterstack.com/docs/logs/javascript/winston/
 */

import type winston from 'winston';

export interface BetterStackLoggingConfig {
  sourceToken: string;
  ingestHost?: string;
}

export function resolveBetterStackConfig(): BetterStackLoggingConfig | null {
  const sourceToken =
    process.env.BETTERSTACK_SOURCE_TOKEN?.trim() ||
    process.env.LOGTAIL_SOURCE_TOKEN?.trim() ||
    process.env.BETTERSTACK_TELEMETRY_TOKEN?.trim();

  if (!sourceToken) return null;

  const ingestHost =
    process.env.BETTERSTACK_LOGS_HOST?.trim() ||
    process.env.LOGTAIL_INGEST_HOST?.trim() ||
    'in.logs.betterstack.com';

  return { sourceToken, ingestHost };
}

export function isBetterStackConfigured(): boolean {
  return resolveBetterStackConfig() !== null;
}

/**
 * Creates a Winston transport that ships JSON logs to Better Stack.
 * Returns null when not configured or packages fail to load.
 */
export function createBetterStackWinstonTransport(): winston.transport | null {
  const config = resolveBetterStackConfig();
  if (!config) return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Logtail } = require('@logtail/node') as typeof import('@logtail/node');
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { LogtailTransport } = require('@logtail/winston') as typeof import('@logtail/winston');

    const endpoint = config.ingestHost!.startsWith('http')
      ? config.ingestHost!
      : `https://${config.ingestHost}`;

    const logtail = new Logtail(config.sourceToken, { endpoint });
    return new LogtailTransport(logtail);
  } catch (error) {
    console.warn(
      '[BetterStack] Failed to initialize Logtail transport:',
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
