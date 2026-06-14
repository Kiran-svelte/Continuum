import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ADMIN_NAV_ITEMS,
  EMPLOYEE_NAV_ITEMS,
  HR_NAV_ITEMS,
  MANAGER_NAV_ITEMS,
  buildPortalNav,
} from '@/lib/navigation/portal-nav';

function hasHref(items: { href: string }[], href: string): boolean {
  return items.some((item) => item.href === href);
}

test('role portals expose profile navigation entry', () => {
  const adminLayout = readFileSync(resolve(process.cwd(), 'app/admin/(main)/layout.tsx'), 'utf8');
  const enabled = ['leave', 'attendance', 'employees', 'compliance', 'payroll', 'documents'] as const;

  assert.equal(hasHref(ADMIN_NAV_ITEMS, '/admin/profile'), true);
  assert.equal(hasHref(buildPortalNav('hr', enabled), '/hr/profile'), true);
  assert.equal(hasHref(buildPortalNav('manager', enabled), '/manager/profile'), true);
  assert.equal(hasHref(buildPortalNav('employee', enabled), '/employee/profile'), true);

  assert.equal(hasHref(HR_NAV_ITEMS, '/hr/profile'), true);
  assert.equal(hasHref(MANAGER_NAV_ITEMS, '/manager/profile'), true);
  assert.equal(hasHref(EMPLOYEE_NAV_ITEMS, '/employee/profile'), true);

  assert.equal(adminLayout.includes("href: '/admin/profile'"), false, 'admin layout should migrate to portal-nav in a follow-up PR');
});

test('profile API supports edit and emergency add/delete operations', () => {
  const profileApi = readFileSync(resolve(process.cwd(), 'app/api/profile/route.ts'), 'utf8');

  assert.equal(profileApi.includes('export async function PUT'), true);
  assert.equal(profileApi.includes('export async function POST'), true);
  assert.equal(profileApi.includes('export async function DELETE'), true);
  assert.equal(profileApi.includes('emergency_contact_name'), true);
  assert.equal(profileApi.includes('emergency_contact_phone'), true);
  assert.equal(profileApi.includes('emergency_contact_relationship'), true);
});
