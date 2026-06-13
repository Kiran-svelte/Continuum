import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';

describe('sentry-config', () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env };
    delete process.env.SENTRY_DSN;
    delete process.env.NEXT_PUBLIC_SENTRY_DSN;
  });

  afterEach(() => {
    process.env = env;
  });

  it('is disabled without DSN', async () => {
    const { isSentryEnabled, resolveSentryDsn } = await import('@/lib/sentry-config');
    assert.strictEqual(resolveSentryDsn(), undefined);
    assert.strictEqual(isSentryEnabled(), false);
  });

  it('enables when SENTRY_DSN is set', async () => {
    process.env.SENTRY_DSN = 'https://example@o0.ingest.sentry.io/0';
    const { isSentryEnabled, resolveSentryDsn } = await import('@/lib/sentry-config');
    assert.ok(resolveSentryDsn()?.includes('sentry.io'));
    assert.strictEqual(isSentryEnabled(), true);
  });
});
