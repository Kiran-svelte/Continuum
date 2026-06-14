import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

/**
 * G3 - headless service layer contract tests (static + structural).
 * Full DB integration requires seeded staging; these prove G3 wiring.
 */
test('HE-19: service files do not import next/headers', () => {
  const serviceFiles = [
    'lib/services/leave-submit.ts',
    'lib/services/leave-approve.ts',
    'lib/services/leave-cancel.ts',
    'lib/services/attendance-clock.ts',
    'lib/services/payslip-latest.ts',
  ];

  for (const file of serviceFiles) {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    assert.ok(!source.includes("from 'next/headers'"), `${file} must not import next/headers`);
    assert.ok(!source.includes('NextRequest'), `${file} must not depend on NextRequest`);
  }
});

test('HE-01/HE-02: submitLeaveService and approveLeaveService are exported', () => {
  const submit = readFileSync(resolve(process.cwd(), 'lib/services/leave-submit.ts'), 'utf8');
  const approve = readFileSync(resolve(process.cwd(), 'lib/services/leave-approve.ts'), 'utf8');
  assert.ok(submit.includes('export async function submitLeaveService'));
  assert.ok(approve.includes('export async function approveLeaveService'));
});

test('HE-04: submit and approve services use idempotency keys', () => {
  const submit = readFileSync(resolve(process.cwd(), 'lib/services/leave-submit.ts'), 'utf8');
  const approve = readFileSync(resolve(process.cwd(), 'lib/services/leave-approve.ts'), 'utf8');
  assert.ok(submit.includes('withIdempotency'));
  assert.ok(submit.includes('ctx.idempotencyKey'));
  assert.ok(approve.includes('withIdempotency'));
  assert.ok(approve.includes('ctx.idempotencyKey'));
});

test('HE-05: channel link context enforces tenant isolation', () => {
  const source = readFileSync(resolve(process.cwd(), 'lib/channel/context-from-link.ts'), 'utf8');
  assert.ok(source.includes('employee.org_id !== link.company_id'));
  assert.ok(source.includes('Tenant isolation violation'));
});

test('HE-06/HE-07: shared service guards enforce modules and setup', () => {
  const guards = readFileSync(resolve(process.cwd(), 'lib/services/_shared/guards.ts'), 'utf8');
  assert.ok(guards.includes('COMPANY_SETUP_INCOMPLETE'));
  assert.ok(guards.includes('MODULE_DISABLED'));
  assert.ok(guards.includes('guardCompanySetup'));
  assert.ok(guards.includes('guardModule'));
});

test('HE-03: assistant actions no longer cookie-forward to APIs', () => {
  const requestLeave = readFileSync(
    resolve(process.cwd(), 'lib/continuum-assistant/actions/request-leave.ts'),
    'utf8'
  );
  const approveLeave = readFileSync(
    resolve(process.cwd(), 'lib/continuum-assistant/actions/approve-leave.ts'),
    'utf8'
  );
  assert.ok(!requestLeave.includes('forwardAuthenticatedApi'));
  assert.ok(!approveLeave.includes('forwardAuthenticatedApi'));
  assert.ok(requestLeave.includes('submitLeaveService'));
  assert.ok(approveLeave.includes('approveLeaveService'));
});

test('HE-20: routes delegate to service layer', () => {
  const submitRoute = readFileSync(
    resolve(process.cwd(), 'app/api/leaves/submit/route.ts'),
    'utf8'
  );
  assert.ok(submitRoute.includes('submitLeaveService'));
  assert.ok(submitRoute.includes('buildContextFromSession'));
});

test('HE-21: approve route delegates to approveLeaveService', () => {
  const route = readFileSync(
    resolve(process.cwd(), 'app/api/leaves/approve/[requestId]/route.ts'),
    'utf8'
  );
  assert.ok(route.includes('approveLeaveService'));
  assert.ok(route.includes('buildContextFromSession'));
});

test('HE-22: service layer exposes v1 read operations', () => {
  for (const [file, fn] of [
    ['lib/services/leave-balances.ts', 'getLeaveBalancesService'],
    ['lib/services/leave-list.ts', 'listOwnLeavesService'],
    ['lib/services/pending-approvals.ts', 'listPendingApprovalsService'],
    ['lib/services/attendance-clock.ts', 'clockAttendanceService'],
    ['lib/services/attendance-today.ts', 'getTodayAttendanceService'],
    ['lib/services/payslip-latest.ts', 'getLatestPayslipService'],
  ] as const) {
    const source = readFileSync(resolve(process.cwd(), file), 'utf8');
    assert.ok(source.includes(`export async function ${fn}`), `${file} must export ${fn}`);
  }
});

test('HE-23: assistant confirm path uses services directly', () => {
  const orchestrator = readFileSync(
    resolve(process.cwd(), 'lib/continuum-assistant/actions/orchestrator.ts'),
    'utf8'
  );
  assert.ok(orchestrator.includes('executeRequestLeave(actionDraft, ctx)'));
  assert.ok(orchestrator.includes('executeApproveLeave(actionDraft, ctx)'));
});

test('HE-25: buildContextFromSession maps portal slug', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'lib/channel/context-from-session.ts'),
    'utf8'
  );
  assert.ok(source.includes('portalSlug'));
  assert.ok(source.includes('getDefaultPortalForRole'));
});
