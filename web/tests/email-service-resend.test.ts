import assert from 'node:assert/strict';
import test from 'node:test';
import { sendEmail } from '../lib/email-service';

test('sendEmail uses Resend when EMAIL_PROVIDER=resend', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    EMAIL_PROVIDER: process.env.EMAIL_PROVIDER,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
    EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
  };

  let requestUrl = '';
  let requestHeaders: HeadersInit | undefined;
  let requestBody: Record<string, unknown> | null = null;

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    requestUrl = String(input);
    requestHeaders = init?.headers;
    requestBody = JSON.parse(String(init?.body ?? '{}')) as Record<string, unknown>;
    return new Response(JSON.stringify({ id: 'resend-email-id' }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;

  process.env.EMAIL_PROVIDER = 'resend';
  process.env.RESEND_API_KEY = 'test_resend_key';
  process.env.RESEND_FROM_EMAIL = 'noreply@example.com';
  process.env.EMAIL_FROM_NAME = 'Continuum HR';

  try {
    const result = await sendEmail(
      'employee@example.com',
      'Continuum Resend Test',
      '<p>Hello</p>',
      { category: 'test' },
    );

    assert.equal(result.success, true);
    assert.equal(result.transport, 'resend');
    assert.equal(result.messageId, 'resend-email-id');
    assert.equal(requestUrl, 'https://api.resend.com/emails');
    assert.equal((requestHeaders as Record<string, string>).Authorization, 'Bearer test_resend_key');
    assert.equal(requestBody?.from, 'Continuum HR <noreply@example.com>');
    assert.deepEqual(requestBody?.to, ['employee@example.com']);
    assert.equal(requestBody?.subject, 'Continuum Resend Test');
  } finally {
    globalThis.fetch = originalFetch;
    process.env.EMAIL_PROVIDER = originalEnv.EMAIL_PROVIDER;
    process.env.RESEND_API_KEY = originalEnv.RESEND_API_KEY;
    process.env.RESEND_FROM_EMAIL = originalEnv.RESEND_FROM_EMAIL;
    process.env.EMAIL_FROM_NAME = originalEnv.EMAIL_FROM_NAME;
  }
});
