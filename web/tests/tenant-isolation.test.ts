import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('channel link context rejects employee and link company mismatches', () => {
  const context = read('lib/channel/context-from-link.ts');

  assert.ok(context.includes('employee.org_id !== link.company_id'));
  assert.ok(context.includes('Tenant isolation violation'));
});

test('headless service reads and writes are tenant scoped by orgId/company_id', () => {
  const files = [
    'lib/services/leave-submit.ts',
    'lib/services/leave-approve.ts',
    'lib/services/leave-cancel.ts',
    'lib/services/attendance-clock.ts',
    'lib/services/attendance-today.ts',
    'lib/services/payslip-latest.ts',
  ];

  for (const file of files) {
    const source = read(file);
    assert.ok(source.includes('company_id'), `${file} missing company_id scope`);
  }
});

