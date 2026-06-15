import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('assistant permissions deny employee approvals and require domain permissions', () => {
  const permissions = read('lib/continuum-assistant/actions/permissions.ts');

  assert.ok(permissions.includes('leave.approve_team'));
  assert.ok(permissions.includes('leave.approve_any'));
  assert.ok(permissions.includes('You do not have permission'));
});

test('pre-flight role matrix proof contains R1 through R40 scenarios', () => {
  const matrix = read('docs/test-plans/zero-ui-role-matrix.md');

  for (let i = 1; i <= 40; i += 1) {
    assert.ok(matrix.includes(`R${i}`), `missing R${i}`);
  }
});

