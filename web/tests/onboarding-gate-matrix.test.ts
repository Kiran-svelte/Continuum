import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('legacy company onboarding route redirects to canonical onboarding', () => {
  const legacyPage = read('app/onboarding/company/page.tsx');
  const middleware = read('middleware.ts');

  assert.ok(legacyPage.includes("redirect('/onboarding')"));
  assert.ok(middleware.includes("pathname === '/onboarding/company'"));
  assert.ok(middleware.includes("new URL('/onboarding', request.url), 308"));
});

test('active app surfaces do not push users to legacy onboarding company route', () => {
  const inviteAccept = read('app/invite/accept/[token]/page.tsx');
  assert.ok(!inviteAccept.includes("router.push('/onboarding/company')"));
  assert.ok(inviteAccept.includes("router.push('/onboarding')"));
});

