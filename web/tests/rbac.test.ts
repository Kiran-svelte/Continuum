import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSION_CODES,
  hasPermission,
  getAccessScope,
  getEffectiveRoles,
  VALID_ROLES,
} from '@/lib/rbac';
import type { UserRole, EmployeeWithRole } from '@/lib/rbac';

describe('DEFAULT_ROLE_PERMISSIONS - admin', () => {
  it('admin has all permissions', () => {
    const adminPerms = DEFAULT_ROLE_PERMISSIONS.admin;
    assert.strictEqual(adminPerms.length, ALL_PERMISSION_CODES.length);
    for (const code of ALL_PERMISSION_CODES) {
      assert.ok(adminPerms.includes(code), `admin missing permission: ${code}`);
    }
  });
});

describe('DEFAULT_ROLE_PERMISSIONS - employee', () => {
  it('employee has only self-service permissions', () => {
    const empPerms = DEFAULT_ROLE_PERMISSIONS.employee;
    const selfServiceCodes = [
      'leave.apply_own',
      'attendance.mark_own',
      'payroll.view_own',
      'employee.view_own',
      'audit.view_own',
    ];
    assert.strictEqual(empPerms.length, selfServiceCodes.length);
    for (const code of selfServiceCodes) {
      assert.ok(empPerms.includes(code as any), `employee missing: ${code}`);
    }
  });

  it('employee does not have admin permissions', () => {
    const empPerms = DEFAULT_ROLE_PERMISSIONS.employee;
    assert.ok(!empPerms.includes('company.edit_settings'));
    assert.ok(!empPerms.includes('security.manage_roles'));
    assert.ok(!empPerms.includes('payroll.generate'));
  });
});

describe('hasPermission', () => {
  it('returns true for valid permission in set', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.employee;
    assert.strictEqual(hasPermission(perms, 'leave.apply_own'), true);
  });

  it('returns false for permission not in set', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.employee;
    assert.strictEqual(hasPermission(perms, 'payroll.generate'), false);
  });

  it('returns true for admin checking any permission', () => {
    const perms = DEFAULT_ROLE_PERMISSIONS.admin;
    assert.strictEqual(hasPermission(perms, 'security.manage_roles'), true);
    assert.strictEqual(hasPermission(perms, 'leave.apply_own'), true);
  });
});

describe('getAccessScope', () => {
  it('admin gets company scope', () => {
    assert.strictEqual(getAccessScope('admin'), 'company');
  });

  it('hr gets company scope', () => {
    assert.strictEqual(getAccessScope('hr'), 'company');
  });

  it('employee gets self scope', () => {
    assert.strictEqual(getAccessScope('employee'), 'self');
  });

  it('manager gets team scope', () => {
    assert.strictEqual(getAccessScope('manager'), 'team');
  });

  it('team_lead gets team scope', () => {
    assert.strictEqual(getAccessScope('team_lead'), 'team');
  });

  it('director gets department scope', () => {
    assert.strictEqual(getAccessScope('director'), 'department');
  });
});

describe('getEffectiveRoles', () => {
  it('returns primary role when no secondary roles', () => {
    const emp: EmployeeWithRole = {
      id: '1',
      org_id: 'org1',
      primary_role: 'employee',
      secondary_roles: null,
    };
    const roles = getEffectiveRoles(emp);
    assert.deepStrictEqual(roles, ['employee']);
  });

  it('combines primary + secondary roles', () => {
    const emp: EmployeeWithRole = {
      id: '1',
      org_id: 'org1',
      primary_role: 'employee',
      secondary_roles: ['team_lead'],
    };
    const roles = getEffectiveRoles(emp);
    assert.ok(roles.includes('employee'));
    assert.ok(roles.includes('team_lead'));
    assert.strictEqual(roles.length, 2);
  });

  it('deduplicates roles', () => {
    const emp: EmployeeWithRole = {
      id: '1',
      org_id: 'org1',
      primary_role: 'manager',
      secondary_roles: ['manager', 'team_lead'],
    };
    const roles = getEffectiveRoles(emp);
    const managerCount = roles.filter((r) => r === 'manager').length;
    assert.strictEqual(managerCount, 1);
  });

  it('ignores invalid secondary roles', () => {
    const emp: EmployeeWithRole = {
      id: '1',
      org_id: 'org1',
      primary_role: 'employee',
      secondary_roles: ['invalid_role' as any],
    };
    const roles = getEffectiveRoles(emp);
    assert.deepStrictEqual(roles, ['employee']);
  });
});

describe('Role validation', () => {
  it('VALID_ROLES contains all 6 expected roles', () => {
    const expected: UserRole[] = ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'];
    assert.strictEqual(VALID_ROLES.length, expected.length);
    for (const role of expected) {
      assert.ok(VALID_ROLES.includes(role), `Missing role: ${role}`);
    }
  });

  it('role hierarchy: admin has more permissions than hr', () => {
    assert.ok(
      DEFAULT_ROLE_PERMISSIONS.admin.length >= DEFAULT_ROLE_PERMISSIONS.hr.length
    );
  });

  it('role hierarchy: hr has more permissions than employee', () => {
    assert.ok(
      DEFAULT_ROLE_PERMISSIONS.hr.length > DEFAULT_ROLE_PERMISSIONS.employee.length
    );
  });
});
