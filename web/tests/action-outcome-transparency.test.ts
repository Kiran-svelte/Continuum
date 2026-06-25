import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();

const outcomeRoutes = [
  'app/api/auth/signup/route.ts',
  'app/api/auth/email-verification/send/route.ts',
  'app/api/security/otp/route.ts',
  'app/api/channel/verify/start/route.ts',
  'app/api/leaves/approve/[requestId]/route.ts',
  'app/api/leaves/reject/[requestId]/route.ts',
  'lib/services/leave-submit.ts',
  'lib/services/leave-approve.ts',
];

test('critical user-facing action routes expose actionOutcome', () => {
  for (const relativePath of outcomeRoutes) {
    const source = readFileSync(join(root, relativePath), 'utf8');
    assert.match(source, /actionOutcome/, `${relativePath} should include actionOutcome`);
  }
});

test('post-response mail delivery wrapper notifies actors on failure', () => {
  const source = readFileSync(join(root, 'lib/email/deliver.ts'), 'utf8');
  assert.match(source, /after\(run\)/);
  assert.match(source, /notifyActorSideEffectFailure/);
});
