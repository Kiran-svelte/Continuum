import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('CWA-RBAC: payroll APIs enforce payroll module and exact payroll permissions', () => {
  const slips = read('app/api/payroll/slips/route.ts');
  const status = read('app/api/payroll/status/route.ts');

  assert.match(slips, /requireModuleForOrg\(employee\.org_id,\s*'payroll'\)/);
  assert.match(slips, /requirePermissionGuard\(employee,\s*'payroll\.view_all'\)/);
  assert.match(slips, /requirePermissionGuard\(employee,\s*'payroll\.view_own'\)/);
  assert.match(status, /requireModuleForOrg\(employee\.org_id,\s*'payroll'\)/);
  assert.match(status, /requirePermissionGuard\(employee,\s*'payroll\.approve'\)/);
  assert.match(status, /requirePermissionGuard\(employee,\s*'payroll\.process'\)/);
  assert.match(status, /requirePermissionGuard\(employee,\s*'payroll\.generate'\)/);
});

test('CWA-RBAC: attendance regularization enforces module and scoped permissions', () => {
  const src = read('app/api/attendance/regularize/route.ts');

  assert.match(src, /requireModuleForOrg\(employee\.org_id,\s*'attendance'\)/);
  assert.match(src, /requirePermissionGuard\(employee,\s*'attendance\.mark_own'\)/);
  assert.match(src, /requirePermissionGuard\(employee,\s*'attendance\.view_team'\)/);
  assert.match(src, /requirePermissionGuard\(employee,\s*'attendance\.view_all'\)/);
});

test('CWA-RBAC: attendance shift roster APIs enforce module and exact permissions', () => {
  const shifts = read('app/api/shifts/route.ts');
  const attendanceShifts = read('app/api/attendance/shifts/route.ts');
  const assign = read('app/api/attendance/shifts/assign/route.ts');
  const monthlyReport = read('app/api/attendance/reports/monthly/route.ts');
  const attendanceSummary = read('app/api/reports/attendance-summary/route.ts');

  assert.match(shifts, /requireModuleForOrg\(employee\.org_id,\s*'attendance'\)/);
  assert.match(shifts, /requirePermissionGuard\(employee,\s*'attendance\.view_all'\)/);
  assert.match(shifts, /requirePermissionGuard\(employee,\s*'attendance\.override'\)/);
  assert.match(attendanceShifts, /export \{ GET, POST \} from '@\/app\/api\/shifts\/route'/);
  assert.match(assign, /export \{ PATCH as POST \} from '@\/app\/api\/shifts\/route'/);
  assert.match(monthlyReport, /export \{ GET \} from '@\/app\/api\/reports\/attendance-summary\/route'/);
  assert.match(attendanceSummary, /requirePermissionGuard\(employee,\s*'attendance\.view_all'\)/);
});

test('CWA-RBAC: settings APIs use permission-code RBAC', () => {
  const account = read('app/api/settings/account-management/route.ts');
  const alerts = read('app/api/settings/alerts/route.ts');
  const integrations = read('app/api/settings/integrations/route.ts');

  assert.match(account, /requirePermissionGuard\(employee,\s*'company\.view_settings'\)/);
  assert.match(account, /requirePermissionGuard\(employee,\s*'company\.edit_settings'\)/);
  assert.match(alerts, /requirePermissionGuard\(employee,\s*'company\.view_settings'\)/);
  assert.match(alerts, /requirePermissionGuard\(employee,\s*'notifications\.configure'\)/);
  assert.match(integrations, /requirePermissionGuard\(employee,\s*'company\.view_settings'\)/);
  assert.match(integrations, /requirePermissionGuard\(employee,\s*'company\.edit_settings'\)/);
});
