import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('onboarding finalize delegates to canonical completion state', () => {
  const route = read('app/api/onboarding/finalize/route.ts');
  const server = read('lib/onboarding/server.ts');

  assert.ok(route.includes('completeOnboardingState'));
  assert.ok(server.includes('onboarding_completed'));
  assert.ok(server.includes('onboarding_step'));
  assert.ok(server.includes('13'));
});

