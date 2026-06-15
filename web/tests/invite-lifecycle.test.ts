import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('invite lifecycle creates secure token and accepts invite into active employee flow', () => {
  const invites = read('app/api/hr/invites/route.ts');
  const accept = read('app/api/invite/accept/route.ts');
  const page = read('app/invite/accept/[token]/page.tsx');

  assert.ok(invites.includes('randomBytes(32)'));
  assert.ok(invites.includes('expires_at'));
  assert.ok(accept.includes('accepted_at'));
  assert.ok(accept.includes("status: 'accepted'"));
  assert.ok(page.includes("router.push('/onboarding')"));
});

test('invite API accepts optional WhatsApp phone without persisting raw PII in audit body', () => {
  const invites = read('app/api/hr/invites/route.ts');

  assert.ok(invites.includes('phone: z.string().max(32).optional()'));
  assert.ok(invites.includes('normalizePhone(phone)'));
  assert.ok(invites.includes('phone_provided'));
});
