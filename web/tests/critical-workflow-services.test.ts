import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('CWA-SERVICE: payroll bank file route is a real processing workflow', () => {
  const src = read('app/api/payroll/bank-file/route.ts');

  assert.match(src, /requireModuleForOrg\(employee\.org_id,\s*'payroll'\)/);
  assert.match(src, /requirePermissionGuard\(employee,\s*'payroll\.process'\)/);
  assert.match(src, /EXPORTABLE_STATUSES = new Set\(\['approved', 'processed', 'paid'\]\)/);
  assert.match(src, /bank_account_number/);
  assert.match(src, /ifsc_code/);
  assert.match(src, /missingBankDetails/);
  assert.match(src, /Content-Type': 'text\/csv; charset=utf-8'/);
  assert.match(src, /payrollRun\.updateMany\(/);
  assert.match(src, /status: 'approved'/);
  assert.match(src, /AUDIT_ACTIONS\.PAYROLL_PROCESS/);
});

test('CWA-SERVICE: payroll self-service payslip PDF is available to employees', () => {
  const src = read('app/api/employee/payslip/download/route.ts');

  assert.match(src, /requireModuleForOrg\(employee\.org_id,\s*'payroll'\)/);
  assert.match(src, /Content-Type': 'application\/pdf'/);
  assert.match(src, /payroll_run_id_emp_id/);
  assert.match(src, /Cache-Control': 'no-store/);
});

test('CWA-SERVICE: audit hash chain has a protected scheduled verifier', () => {
  const route = read('app/api/cron/audit-verification/route.ts');
  const audit = read('lib/audit.ts');

  assert.match(route, /isValidCronRequest\(request\.headers\)/);
  assert.match(route, /verifyAuditChain\(company\.id\)/);
  assert.match(route, /AUDIT_ACTIONS\.AUDIT_VERIFY/);
  assert.match(route, /sendNotification\(/);
  assert.match(route, /status: failed\.length > 0 \? 207 : 200/);
  assert.match(audit, /AUDIT_VERIFY: 'AUDIT_VERIFY'/);
});

test('CWA-SERVICE: exit finalization revokes access after checklist completion', () => {
  const src = read('app/api/exit-checklist/finalize/route.ts');
  const checklist = read('app/api/exit-checklist/route.ts');

  assert.match(src, /assertModule\(actor\.org_id,\s*'exit'\)/);
  assert.match(src, /requirePermissionGuard\(actor,\s*'employee\.terminate'\)/);
  assert.match(src, /incompleteChecklists/);
  assert.match(src, /status: \{ not: 'completed' \}/);
  assert.match(src, /status: 'exited'/);
  assert.match(src, /employeeStatusHistory\.create/);
  assert.match(src, /revokeAllRefreshTokensForEmployee\(tx, employeeId/);
  assert.match(src, /revokeChannelLinksForEmployee\(employeeId,\s*'employee_terminated'\)/);
  assert.match(src, /AUDIT_ACTIONS\.EMPLOYEE_STATUS_CHANGE/);
  assert.match(checklist, /canManageChecklist/);
  assert.match(checklist, /checklist\.emp_id !== employee\.id/);
});

test('CWA-SERVICE: final leave approval syncs approved leave into attendance', () => {
  const src = read('lib/services/leave-approve.ts');

  assert.match(src, /syncApprovedLeaveToAttendance/);
  assert.match(src, /tx\.attendance\.findUnique/);
  assert.match(src, /select: \{ id: true, check_in: true, check_out: true \}/);
  assert.match(src, /existing\?\.check_in \|\| existing\?\.check_out/);
  assert.match(src, /status: params\.isHalfDay \? 'half_day' as const : 'on_leave' as const/);
  assert.match(src, /tx\.attendance\.update/);
  assert.match(src, /tx\.attendance\.create/);
  assert.match(src, /if \(isFinalApproval\) \{\s+await syncApprovedLeaveToAttendance/s);
});
