import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('leave submit and approve use idempotency records for channel retries', () => {
  const wrapper = read('lib/services/idempotency.ts');
  const submit = read('lib/services/leave-submit.ts');
  const approve = read('lib/services/leave-approve.ts');

  assert.ok(wrapper.includes('idempotencyRecord.findUnique'));
  assert.ok(wrapper.includes('idempotencyRecord.upsert'));
  assert.ok(submit.includes('withIdempotency'));
  assert.ok(approve.includes('withIdempotency'));
});

