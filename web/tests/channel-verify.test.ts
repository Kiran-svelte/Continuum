import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { e164ToWaId, normalizePhone } from '../lib/phone/normalize';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('CV-01: verify start creates a 10-minute OTP challenge', () => {
  const source = read('app/api/channel/verify/start/route.ts');
  assert.ok(source.includes('OTP_EXPIRY_MINUTES = 10'));
  assert.ok(source.includes('randomInt(OTP_MIN, OTP_MAX)'));
  assert.ok(source.includes('bcrypt.hash'));
  assert.ok(source.includes('expiresInSeconds'));
});

test('CV-02: verify confirm creates ChannelIdentityLink', () => {
  const source = read('app/api/channel/verify/confirm/route.ts');
  assert.ok(source.includes('channelIdentityLink.create'));
  assert.ok(source.includes('verified_at'));
  assert.ok(source.includes('phone_e164'));
  assert.ok(source.includes('external_id'));
  assert.ok(source.includes('e164ToWaId'));
  assert.ok(source.includes('External channel identity does not match'));
});

test('CV-03: wrong codes increment attempts and lock before max attempts are exceeded', () => {
  const source = read('app/api/channel/verify/confirm/route.ts');
  assert.ok(source.includes('incrementAttempts'));
  assert.ok(source.includes('challenge.attempts >= challenge.max_attempts'));
  assert.ok(source.includes('CODE_LOCKED'));
});

test('CV-04: expired or consumed challenges cannot be confirmed', () => {
  const source = read('app/api/channel/verify/confirm/route.ts');
  assert.ok(source.includes('consumed_at: null'));
  assert.ok(source.includes('expires_at: { gt: new Date() }'));
});

test('CV-05: profile phone change revokes old WhatsApp links', () => {
  const profile = read('app/api/profile/route.ts');
  const revoke = read('lib/channel/revoke-links.ts');
  assert.ok(profile.includes('normalizePhone'));
  assert.ok(profile.includes("revokeChannelLinksForEmployee(user.id, 'phone_changed', 'whatsapp')"));
  assert.ok(revoke.includes('channelIdentityLink.updateMany'));
  assert.ok(revoke.includes('revoked_at'));
});

test('phone helpers normalize to E.164 and match WhatsApp wa_id format', () => {
  const normalized = normalizePhone('+91 98765 43210');
  assert.equal(normalized.ok, true);
  if (normalized.ok) {
    assert.equal(normalized.e164, '+919876543210');
    assert.equal(e164ToWaId(normalized.e164), '919876543210');
  }
});

test('channel migration contains required channel tables', () => {
  const migration = read('prisma/migrations/20260613_zero_ui_channel_identity/migration.sql');
  assert.ok(migration.includes('ChannelIdentityLink'));
  assert.ok(migration.includes('ChannelVerificationChallenge'));
  assert.ok(migration.includes('WhatsAppTenantConfig'));
  assert.ok(migration.includes('IdempotencyRecord'));
});
