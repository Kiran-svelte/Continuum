import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('core module guard returns MODULE_DISABLED envelope', () => {
  const guard = read('lib/core-functions/assert-module.ts');
  const error = read('lib/api-errors.ts');

  assert.ok(guard.includes('moduleDisabledResponse'));
  assert.ok(error.includes('MODULE_DISABLED'));
});

test('module-bound leave and attendance API routes call assertModule', () => {
  const leaves = read('app/api/leaves/route.ts');
  const attendance = read('app/api/attendance/route.ts');

  assert.ok(leaves.includes("assertModule(employee.org_id!, 'leave')"));
  assert.ok(attendance.includes("assertModule(employee.org_id!, 'attendance')"));
});
