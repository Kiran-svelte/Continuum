/**
 * WhatsApp Webhook Security & Contract Tests
 *
 * Tests the Zero UI G5/G6 security gates:
 *   - HMAC signature verification (G5)
 *   - Deduplication guard
 *   - Conversation store round-trip
 *   - Tenant config loader
 *   - Outbound message format
 *   - Webhook route file structural contracts
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// ─── Import the pure functions we can test without DB ────────────────────────
import { verifyWhatsAppSignature } from '@/lib/whatsapp/verify-signature';
import { encryptToken, decryptToken } from '@/lib/whatsapp/crypto';
import { sendWhatsAppMessages } from '@/lib/whatsapp/send';
import { detectActionCommand } from '@/lib/continuum-assistant/respond-headless';

const webRoot = resolve(process.cwd());
const webhookSecret = 'test-webhook-secret-32chars-here!';
const webhookVerifyToken = 'test-verify-token';

process.env.WHATSAPP_WEBHOOK_SECRET = webhookSecret;
process.env.WHATSAPP_VERIFY_TOKEN = webhookVerifyToken;

function readFile(relPath: string): string {
  return readFileSync(resolve(webRoot, relPath), 'utf8');
}

function signWebhookBody(body: string, secret: string = webhookSecret): string {
  const hex = createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');
  return `sha256=${hex}`;
}

async function loadWebhookRoute() {
  return import('../app/api/webhooks/whatsapp/route');
}

// ─── G5: HMAC Signature Verification ────────────────────────────────────────

describe('G5: verifyWhatsAppSignature', () => {
  const secret = 'test-webhook-secret-32chars-here!';

  function makeSignature(body: string): string {
    const hex = createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');
    return `sha256=${hex}`;
  }

  it('accepts a valid HMAC-SHA256 signature', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig = makeSignature(body);
    assert.ok(verifyWhatsAppSignature(Buffer.from(body), sig, secret));
  });

  it('rejects a tampered body', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig = makeSignature(body);
    const tamperedBody = body + 'x';
    assert.ok(!verifyWhatsAppSignature(Buffer.from(tamperedBody), sig, secret));
  });

  it('rejects a wrong secret', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig = makeSignature(body);
    assert.ok(!verifyWhatsAppSignature(Buffer.from(body), sig, 'wrong-secret'));
  });

  it('rejects a missing signature (null)', () => {
    const body = '{"object":"whatsapp_business_account"}';
    assert.ok(!verifyWhatsAppSignature(Buffer.from(body), null, secret));
  });

  it('rejects a missing signature (empty string)', () => {
    const body = '{"object":"whatsapp_business_account"}';
    assert.ok(!verifyWhatsAppSignature(Buffer.from(body), '', secret));
  });

  it('rejects a signature without sha256= prefix', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const hex = createHmac('sha256', secret).update(Buffer.from(body)).digest('hex');
    assert.ok(!verifyWhatsAppSignature(Buffer.from(body), hex, secret));
  });

  it('rejects a truncated hex signature (prevents length extension)', () => {
    const body = '{"object":"whatsapp_business_account"}';
    const sig = makeSignature(body);
    const truncated = sig.slice(0, 20); // truncate hex
    assert.ok(!verifyWhatsAppSignature(Buffer.from(body), truncated, secret));
  });

  it('rejects an empty body with a forged signature', () => {
    const sig = `sha256=${createHmac('sha256', secret).update('').digest('hex')}`;
    const realBody = '{"real":"payload"}';
    assert.ok(!verifyWhatsAppSignature(Buffer.from(realBody), sig, secret));
  });

  it('rejects non-hex signatures without throwing', () => {
    const body = '{"object":"whatsapp_business_account"}';
    assert.equal(
      verifyWhatsAppSignature(Buffer.from(body), 'sha256=not-hex-data', secret),
      false
    );
  });
});

describe('Webhook route behavior', () => {
  it('GET returns the Meta challenge for a valid verify token', async () => {
    const { GET } = await loadWebhookRoute();
    const response = await GET(new Request(
      `http://localhost/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=${webhookVerifyToken}&hub.challenge=abc123`
    ) as Parameters<typeof GET>[0]);

    assert.equal(response.status, 200);
    assert.equal(await response.text(), 'abc123');
  });

  it('POST rejects invalid signatures before payload processing', async () => {
    const { POST } = await loadWebhookRoute();
    const body = '{"object":"whatsapp_business_account"}';
    const response = await POST(new Request('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'x-hub-signature-256': signWebhookBody(`${body}tampered`) },
      body,
    }) as Parameters<typeof POST>[0]);

    assert.equal(response.status, 401);
  });

  it('POST returns 200 for malformed but correctly signed JSON to stop retry loops', async () => {
    const { POST } = await loadWebhookRoute();
    const body = '{"object":';
    const response = await POST(new Request('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'x-hub-signature-256': signWebhookBody(body) },
      body,
    }) as Parameters<typeof POST>[0]);

    assert.equal(response.status, 200);
  });

  it('POST returns 200 for status-only webhooks without touching message flow', async () => {
    const { POST } = await loadWebhookRoute();
    const body = JSON.stringify({
      object: 'whatsapp_business_account',
      entry: [{
        id: 'waba-id',
        changes: [{
          value: {
            messaging_product: 'whatsapp',
            metadata: { phone_number_id: 'phone-number-id', display_phone_number: '15551234567' },
            statuses: [{ id: 'wamid.status', status: 'sent' }],
          },
        }],
      }],
    });
    const response = await POST(new Request('http://localhost/api/webhooks/whatsapp', {
      method: 'POST',
      headers: { 'x-hub-signature-256': signWebhookBody(body) },
      body,
    }) as Parameters<typeof POST>[0]);

    assert.equal(response.status, 200);
  });
});

// ─── G6: Outbound Message Format (structural) ────────────────────────────────

describe('G6: WhatsApp outbound send module contracts', () => {
  it('sendWhatsAppMessages sends text through the Cloud API with bearer auth', async () => {
    const originalFetch = globalThis.fetch;
    const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
    globalThis.fetch = (async (input, init) => {
      calls.push({ input, init });
      return new Response(JSON.stringify({ messages: [{ id: 'wamid.outbound' }] }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as typeof fetch;

    try {
      const result = await sendWhatsAppMessages(
        [{ type: 'text', text: 'Hello' }],
        '123456789',
        '919876543210',
        'secret-token'
      );

      const headers = calls[0]?.init?.headers as Record<string, string>;
      assert.equal(result.allOk, true);
      assert.equal(result.results[0]?.messageId, 'wamid.outbound');
      assert.equal(String(calls[0]?.input), 'https://graph.facebook.com/v19.0/123456789/messages');
      assert.equal(headers.Authorization, 'Bearer secret-token');
      assert.ok(!String(calls[0]?.input).includes('secret-token'));
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('sendWhatsAppMessages returns errors instead of throwing on API failure', async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () => new Response('bad request', { status: 400 })) as typeof fetch;

    try {
      const result = await sendWhatsAppMessages(
        [{ type: 'text', text: 'Hello' }],
        '123456789',
        '919876543210',
        'secret-token'
      );

      assert.equal(result.allOk, false);
      assert.match(result.results[0]?.error ?? '', /HTTP 400/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it('encrypts and decrypts WhatsApp access tokens with a 32-byte base64 key', () => {
    const key = Buffer.alloc(32, 7).toString('base64');
    const encrypted = encryptToken('plain-access-token', key);
    assert.notEqual(encrypted, 'plain-access-token');
    assert.equal(decryptToken(encrypted, key), 'plain-access-token');
  });

  it('send.ts uses Cloud API v19.0 URL', () => {
    const content = readFile('lib/whatsapp/send.ts');
    assert.ok(
      content.includes('graph.facebook.com') && content.includes('v19.0'),
      'send.ts must call Cloud API v19.0'
    );
  });

  it('send.ts uses Authorization: Bearer header — token never in URL', () => {
    const content = readFile('lib/whatsapp/send.ts');
    assert.ok(
      content.includes('Authorization') && content.includes('Bearer'),
      'token must be in Authorization header only'
    );
    // Ensure token is NOT appended to URL as query param
    assert.ok(
      !content.includes('access_token=') && !content.includes('?token='),
      'token must not appear in URL query params'
    );
  });

  it('send.ts never logs the access token', () => {
    const content = readFile('lib/whatsapp/send.ts');
    // The token variable should not be passed to logChannelEvent
    assert.ok(
      !content.includes('logChannelEvent') || !content.includes('accessToken,'),
      'accessToken must not be passed to logger'
    );
  });

  it('send.ts returns results without throwing', () => {
    const content = readFile('lib/whatsapp/send.ts');
    assert.ok(
      content.includes('SendBatchResult') && content.includes('allOk'),
      'send.ts must return SendBatchResult with allOk flag'
    );
    // Must not have bare `throw` in the main exported function
    const throwCount = (content.match(/^\s+throw /gm) ?? []).length;
    assert.equal(throwCount, 0, 'sendWhatsAppMessages must not throw');
  });

  it('tenant-config.ts decrypts token and returns null when not configured', () => {
    const content = readFile('lib/whatsapp/tenant-config.ts');
    assert.ok(content.includes('decryptToken'), 'must use decryptToken from crypto.ts');
    assert.ok(content.includes('messaging_enabled'), 'must check messaging_enabled flag');
    assert.ok(content.includes('return null'), 'must return null when not configured');
  });
});

// ─── Webhook Route: Structural Contracts ────────────────────────────────────

describe('Webhook route structural contracts', () => {
  const routePath = 'app/api/webhooks/whatsapp/route.ts';

  it('webhook route exists', () => {
    const content = readFile(routePath);
    assert.ok(content.length > 100, 'webhook route must be non-empty');
  });

  it('webhook GET handles hub.verify_token challenge', () => {
    const content = readFile(routePath);
    assert.ok(content.includes('hub.verify_token'), 'GET must check hub.verify_token');
    assert.ok(content.includes('hub.challenge'), 'GET must return hub.challenge');
  });

  it('webhook POST verifies HMAC before any DB access', () => {
    const content = readFile(routePath);
    const hmacIdx = content.indexOf('verifyWhatsAppSignature');
    const prismaIdx = content.indexOf('prisma.');
    assert.ok(hmacIdx > -1, 'must call verifyWhatsAppSignature');
    assert.ok(prismaIdx > hmacIdx, 'prisma must be called AFTER signature verification');
  });

  it('webhook POST performs deduplication', () => {
    const content = readFile(routePath);
    assert.ok(
      content.includes('idempotency') || content.includes('idempotencyKey'),
      'webhook must perform message deduplication'
    );
  });

  it('webhook POST checks ChannelBlocklist', () => {
    const content = readFile(routePath);
    assert.ok(
      content.includes('channelBlocklist') || content.includes('ChannelBlocklist'),
      'webhook must check blocklist'
    );
  });

  it('webhook POST calls buildContextFromLink for tenant isolation', () => {
    const content = readFile(routePath);
    assert.ok(content.includes('buildContextFromLink'), 'must use buildContextFromLink');
  });

  it('webhook resolves tenant by incoming phone_number_id before sender lookup', () => {
    const content = readFile(routePath);
    const tenantLookupIdx = content.indexOf('getWhatsAppTenantConfigByPhoneNumberId(phoneNumberId)');
    const linkLookupIdx = content.indexOf('prisma.channelIdentityLink.findFirst');
    assert.ok(tenantLookupIdx > -1, 'must resolve tenant config from incoming phone_number_id');
    assert.ok(linkLookupIdx > tenantLookupIdx, 'sender link lookup must happen after tenant resolution');
    assert.ok(
      content.includes('company_id: tenantConfig.companyId'),
      'sender lookup must be scoped to the receiving tenant company'
    );
  });

  it('webhook POST persists inbound + outbound to AssistantMessageRecord', () => {
    const content = readFile(routePath);
    const inboundAudit = content.includes("role: 'user'");
    const outboundAudit = content.includes("role: 'assistant'");
    assert.ok(inboundAudit && outboundAudit, 'must audit both inbound and outbound messages');
  });

  it('webhook POST always returns 200 (prevents WhatsApp retry loops)', () => {
    const content = readFile(routePath);
    // The function must always return ok200() which is { status: 200 }
    assert.ok(content.includes('ok200()'), 'must use ok200() helper to return 200');
    assert.ok(
      content.includes('// Always return 200') || content.includes('WhatsApp retries'),
      'must document why 200 is always returned'
    );
  });

  it('webhook schedules valid payload processing with Next after() and keeps an inline fallback', () => {
    const content = readFile(routePath);
    assert.ok(
      content.includes('after(() => processEntriesAsync'),
      'valid payload processing should use Next after()'
    );
    assert.ok(
      content.includes('await processEntriesAsync'),
      'route should keep an inline fallback when after() is unavailable'
    );
  });
});

// ─── Conversation Store: Contracts ───────────────────────────────────────────

describe('Conversation store contracts', () => {
  it('conversation-store.ts exports load and save functions', () => {
    const content = readFile('lib/whatsapp/conversation-store.ts');
    assert.ok(content.includes('loadConversationDraft'), 'must export loadConversationDraft');
    assert.ok(content.includes('saveConversationDraft'), 'must export saveConversationDraft');
  });

  it('conversation-store.ts enforces MAX_HISTORY limit', () => {
    const content = readFile('lib/whatsapp/conversation-store.ts');
    assert.ok(
      content.includes('MAX_HISTORY') || content.includes('slice(-6)') || content.includes('slice(-MAX_HISTORY)'),
      'must enforce history size limit'
    );
  });

  it('conversation-store.ts sets draft expiry', () => {
    const content = readFile('lib/whatsapp/conversation-store.ts');
    assert.ok(
      content.includes('draft_expires_at') && content.includes('DRAFT_TTL_MINUTES'),
      'must set draft expiry to prevent stale HITL loops'
    );
  });
});

// ─── Headless Responder: Contracts ────────────────────────────────────────────

describe('Channel identity context contracts', () => {
  it('context-from-link fails closed for non-WhatsApp channel links', () => {
    const content = readFile('lib/channel/context-from-link.ts');
    assert.ok(
      content.includes("link.channel !== 'whatsapp'"),
      'buildContextFromLink must reject non-WhatsApp channel links'
    );
    assert.ok(
      content.includes("channel: 'whatsapp'"),
      'WhatsApp link context should always produce whatsapp execution channel'
    );
  });
});

describe('Headless responder contracts', () => {
  it('detectActionCommand maps WhatsApp button replies and aliases', () => {
    assert.equal(detectActionCommand('confirm'), 'confirm');
    assert.equal(detectActionCommand('YES'), 'confirm');
    assert.equal(detectActionCommand('cancel'), 'cancel');
    assert.equal(detectActionCommand('no'), 'cancel');
    assert.equal(detectActionCommand('maybe'), null);
  });

  it('respond-headless.ts sanitizes markdown for WhatsApp', () => {
    const content = readFile('lib/continuum-assistant/respond-headless.ts');
    assert.ok(
      content.includes('sanitizeForWhatsApp'),
      'must apply WhatsApp-safe markdown sanitization'
    );
  });

  it('respond-headless.ts detects confirm/cancel button replies', () => {
    const content = readFile('lib/continuum-assistant/respond-headless.ts');
    assert.ok(
      content.includes('detectActionCommand'),
      'must detect confirm/cancel interactive button replies'
    );
  });

  it('respond-headless.ts uses no nav hints (WhatsApp has no sidebar)', () => {
    const content = readFile('lib/continuum-assistant/respond-headless.ts');
    assert.ok(
      content.includes('navHints: []'),
      'navHints must be empty for WhatsApp headless context'
    );
  });
});

// ─── Zero UI V1 Actions: Unblocked ───────────────────────────────────────────

describe('ZERO_UI_V1_ACTIONS unblock gate', () => {
  it('ZERO_UI_V1_ACTIONS.md no longer has Chunk 05 blocked notice', () => {
    const content = readFile('docs/ZERO_UI_V1_ACTIONS.md');
    assert.ok(
      !content.includes('remains blocked'),
      'ZERO_UI_V1_ACTIONS.md must not have "remains blocked" notice after G5/G6 sign-off'
    );
  });

  it('ZERO_UI_V1_ACTIONS.md declares G5 and G6 as signed off', () => {
    const content = readFile('docs/ZERO_UI_V1_ACTIONS.md');
    assert.ok(
      content.includes('G5') && content.includes('G6'),
      'ZERO_UI_V1_ACTIONS.md must reference G5 and G6 sign-off'
    );
  });
});
