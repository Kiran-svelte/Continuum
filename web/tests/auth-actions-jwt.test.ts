/**
 * C01 — Server actions must authenticate via JWT (getCurrentUser), not legacy continuum-session.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

function readFile(relativeFromTests: string): string {
  return readFileSync(fileURLToPath(new URL(relativeFromTests, import.meta.url)), 'utf-8');
}

describe('C01 auth actions JWT contract', () => {
  it('syncUser uses getCurrentUser instead of legacy session cookies', () => {
    const content = readFile('../app/actions/auth.ts');
    assert.ok(content.includes('getCurrentUser'), 'auth actions should import getCurrentUser');
    assert.ok(!content.includes('getSessionFromCookies'), 'legacy session cookie helper must be removed');
    assert.ok(content.includes('resolveAuthenticatedEmployee'), 'employee lookup should use id-first resolver');
  });

  it('createCompanyAndEmployee sets auth_id from JWT user id', () => {
    const content = readFile('../app/actions/auth.ts');
    assert.ok(content.includes('auth_id: user.id'), 'new employees should link auth_id to JWT subject');
  });
});
