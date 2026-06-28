import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_ROLE_PERMISSIONS,
  ALL_PERMISSION_CODES,
  PERMISSION_CATALOG,
  filterPermissionsByModules,
  hasPermission,
  getAccessScope,
  getEffectiveRoles,
  VALID_ROLES,
} from '@/lib/rbac';
import type { UserRole, EmployeeWithRole } from '@/lib/rbac';
import { getPermissionModuleSlug } from '@/lib/core-functions/permission-module-map';

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

  it('honors wildcard permissions', () => {
    assert.strictEqual(hasPermission(['*'], 'security.manage_roles'), true);
    assert.strictEqual(hasPermission(['*'], 'payroll.generate'), true);
  });
});

describe('filterPermissionsByModules', () => {
  it('removes permissions for modules disabled by the tenant', () => {
    const filtered = filterPermissionsByModules(
      [
        'leave.apply_own',
        'attendance.mark_own',
        'employee.view_own',
        'payroll.view_own',
        'performance.manage_reviews',
        'audit.view_own',
        'company.view_settings',
      ],
      ['employees', 'leave', 'attendance', 'compliance']
    );

    assert.ok(filtered.includes('leave.apply_own'));
    assert.ok(filtered.includes('attendance.mark_own'));
    assert.ok(filtered.includes('employee.view_own'));
    assert.ok(filtered.includes('audit.view_own'));
    assert.ok(filtered.includes('company.view_settings'));
    assert.ok(!filtered.includes('payroll.view_own'));
    assert.ok(!filtered.includes('performance.manage_reviews'));
  });

  it('keeps payroll and compensation permissions only when payroll is enabled', () => {
    const filtered = filterPermissionsByModules(
      ['payroll.generate', 'compensation.approve', 'reimbursement.approve_any'],
      ['employees', 'leave', 'attendance', 'compliance', 'payroll']
    );

    assert.ok(filtered.includes('payroll.generate'));
    assert.ok(filtered.includes('compensation.approve'));
    assert.ok(!filtered.includes('reimbursement.approve_any'));
  });

  it('maps every permission catalog module tag to a module gate or infrastructure exemption', () => {
    const missing = [...new Set(PERMISSION_CATALOG.map((permission) => permission.module))]
      .filter((moduleTag) => getPermissionModuleSlug(moduleTag) === undefined);

    assert.deepStrictEqual(missing, []);
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
  it('VALID_ROLES contains all 7 expected roles', () => {
    const expected: UserRole[] = ['super_admin', 'admin', 'hr', 'director', 'manager', 'team_lead', 'employee'];
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
