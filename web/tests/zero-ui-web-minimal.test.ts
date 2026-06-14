import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { readMessagingPolicy } from '../lib/portal-policy-backfill';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('WM-01/WM-02: profile phone UI explains WhatsApp verification', () => {
  const employee = read('components/pages/employee/profile-view.tsx');
  const shared = read('components/profile/role-profile-page.tsx');
  assert.ok(employee.includes('Used to verify WhatsApp HR'));
  assert.ok(shared.includes('Used to verify WhatsApp HR'));
  assert.ok(employee.includes('autoComplete="tel"'));
  assert.ok(shared.includes('autoComplete="tel"'));
});

test('WM-03: admin invite sends Mobile WhatsApp phone', () => {
  const invite = read('components/pages/admin/people-invite-view.tsx');
  const route = read('app/api/hr/invites/route.ts');
  assert.ok(invite.includes('Mobile (WhatsApp)'));
  assert.ok(invite.includes('phone.trim() || undefined'));
  assert.ok(route.includes('normalizePhone(phone)'));
});

test('WM-04/WM-05: WhatsApp admin page is feature-flag guarded', () => {
  const page = read('app/admin/integrations/whatsapp/page.tsx');
  assert.ok(page.includes("process.env.NEXT_PUBLIC_WHATSAPP_ENABLED !== 'true'"));
  assert.ok(page.includes('notFound()'));
});

test('WM-08: phone save revokes linked WhatsApp identities', () => {
  const profile = read('app/api/employee/profile/route.ts');
  assert.ok(profile.includes('normalizePhone'));
  assert.ok(profile.includes('revokeChannelLinksForEmployee'));
});

test('L5-07-005: messaging policy defaults are safe before WhatsApp launch', () => {
  const policy = readMessagingPolicy(null);
  assert.equal(policy.require_employee_phone, false);
  assert.equal(policy.whatsapp_opt_in_required, true);
  assert.equal(policy.chat_retention_days, 90);
});
