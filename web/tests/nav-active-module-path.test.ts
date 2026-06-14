import assert from 'node:assert/strict';
import test from 'node:test';
import { isNavItemActive } from '@/lib/nav-active';
import { moduleSlugForPortalPath } from '@/lib/middleware-module-paths';

test('isNavItemActive avoids prefix collisions between team routes', () => {
  assert.equal(isNavItemActive('/manager/team', '/manager/team'), true);
  assert.equal(isNavItemActive('/manager/team/member-1', '/manager/team'), true);
  assert.equal(isNavItemActive('/manager/team-attendance', '/manager/team'), false);
  assert.equal(isNavItemActive('/manager/team-calendar', '/manager/team'), false);
});

test('moduleSlugForPortalPath uses segment boundaries and longest prefix', () => {
  assert.equal(moduleSlugForPortalPath('/manager/team'), 'employees');
  assert.equal(moduleSlugForPortalPath('/manager/team-attendance'), 'attendance');
  assert.equal(moduleSlugForPortalPath('/manager/team-calendar'), 'leave');
  assert.equal(moduleSlugForPortalPath('/admin/directory'), 'employees');
  assert.equal(moduleSlugForPortalPath('/hr/directory'), 'employees');
  assert.equal(moduleSlugForPortalPath('/employee/directory'), 'employees');
});
