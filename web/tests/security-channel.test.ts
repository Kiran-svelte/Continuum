import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { randomBytes } from 'node:crypto';
import { encryptToken, decryptToken } from '../lib/whatsapp/crypto';
import { logChannelEvent } from '../lib/whatsapp/safe-logger';
import { scrubChannelPayload } from '../lib/whatsapp/sentry-scrub';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('SEC-10: WhatsApp token crypto round-trips with AES-256-GCM', () => {
  const key = randomBytes(32).toString('base64');
  const ciphertext = encryptToken('secret-token', key);
  assert.notEqual(ciphertext, 'secret-token');
  assert.equal(decryptToken(ciphertext, key), 'secret-token');
});

test('SEC-17: channel logger redacts restricted keys recursively', () => {
  const lines: string[] = [];
  const original = console.info;
  console.info = (value?: unknown) => {
    lines.push(String(value));
  };
  try {
    logChannelEvent('info', 'wa_inbound', {
      messageId: 'wamid.1',
      text: 'hello',
      nested: { authorization: 'Bearer token' },
    });
  } finally {
    console.info = original;
  }
  assert.equal(lines.length, 1);
  assert.ok(lines[0]?.includes('"messageId":"wamid.1"'));
  assert.ok(!lines[0]?.includes('hello'));
  assert.ok(!lines[0]?.includes('Bearer token'));
  assert.ok(lines[0]?.includes('[REDACTED]'));
});

test('SEC-04/SEC-33: Sentry scrub removes phone, token, code, and secret fields', () => {
  const scrubbed = scrubChannelPayload({
    messageId: 'wamid.1',
    phone: '+919876543210',
    access_token: 'token',
    nested: { code: '123456', secret: 'x' },
  });
  assert.equal(scrubbed.messageId, 'wamid.1');
  assert.equal(scrubbed.phone, '[Filtered]');
  assert.equal(scrubbed.access_token, '[Filtered]');
  assert.deepEqual(scrubbed.nested, { code: '[Filtered]', secret: '[Filtered]' });
});

test('SEC-07/SEC-09: purge cron requires bearer secret and deletes assistant messages', () => {
  const route = read('app/api/internal/purge-chat-history/route.ts');
  assert.ok(route.includes('CRON_SECRET'));
  assert.ok(route.includes('authorization'));
  assert.ok(route.includes('assistantMessageRecord.deleteMany'));
  assert.ok(route.includes('401'));
});

test('SEC-11/SEC-13: WhatsApp admin page is feature flagged before Chunk 05', () => {
  const page = read('app/admin/integrations/whatsapp/page.tsx');
  const view = read('components/pages/admin/whatsapp-integration-view.tsx');
  assert.ok(page.includes('NEXT_PUBLIC_WHATSAPP_ENABLED'));
  assert.ok(page.includes('notFound()'));
  assert.ok(view.includes('Connect your company WhatsApp Business Account'));
  assert.ok(view.includes('Open Meta Business Manager'));
});

test('SEC-34: WhatsApp webhook verifies Meta HMAC signatures', () => {
  const route = read('app/api/webhooks/whatsapp/route.ts');
  assert.ok(route.includes('x-hub-signature-256'));
  assert.ok(route.includes('createHmac'));
  assert.ok(route.includes('timingSafeEqual'));
  assert.ok(route.includes('WHATSAPP_APP_SECRET'));
  assert.ok(route.includes('401'));
});

test('SEC-20: disabling WhatsApp does not touch web leave service execution', () => {
  const leave = read('lib/services/leave-submit.ts');
  assert.ok(!leave.includes('WhatsAppTenantConfig'));
  assert.ok(leave.includes('submitLeaveService'));
});

test('SEC-28: assistant audit metadata includes channel fields', () => {
  const audit = read('lib/continuum-assistant/actions/http-execute.ts');
  assert.ok(audit.includes('ASSISTANT_ACTION'));
  assert.ok(audit.includes('channel'));
  assert.ok(audit.includes('external_message_id'));
  assert.ok(audit.includes('idempotency_key'));
});

test('SEC-32: phone changes revoke active WhatsApp links', () => {
  const profile = read('app/api/profile/route.ts');
  assert.ok(profile.includes("phone_changed"));
  assert.ok(profile.includes('revokeChannelLinksForEmployee'));
});

test('SEC-06: blocklist model is present for silent channel blocks', () => {
  const schema = read('prisma/schema.prisma');
  assert.ok(schema.includes('model ChannelBlocklist'));
  assert.ok(schema.includes('@@unique([company_id, channel, external_id])'));
});

test('SEC docs: logging policy and operations runbook are committed', () => {
  assert.ok(read('docs/WHATSAPP_LOGGING_POLICY.md').includes('Forbidden Patterns'));
  assert.ok(read('../docs/runbooks/whatsapp-operations.md').includes('Invalid Signature'));
  assert.ok(read('../docs/DISASTER_RECOVERY_PLAN.md').includes('ChannelIdentityLink'));
});
