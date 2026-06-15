import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('leave submit and approve services route through workflow and approver guards', () => {
  const submit = read('lib/services/leave-submit.ts');
  const approve = read('lib/services/leave-approve.ts');

  assert.ok(submit.includes('resolveLeaveApprovers'));
  assert.ok(submit.includes('current_approver_id'));
  assert.ok(approve.includes('canActOnLeaveRequest'));
  assert.ok(approve.includes('checkSequentialApproval'));
  assert.ok(approve.includes('current_approver_id'));
});
