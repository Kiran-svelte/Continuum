import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  ADMIN_NAV_ITEMS,
  buildPortalNav,
} from '@/lib/navigation/portal-nav';

function hasHref(items: { href: string }[], href: string): boolean {
  return items.some((item) => item.href === href);
}

test('role portals expose profile navigation entry', () => {
  const enabled = ['leave', 'attendance', 'employees', 'compliance', 'payroll', 'documents'] as const;

  assert.equal(hasHref(buildPortalNav('admin', enabled), '/admin/profile'), true);
  assert.equal(hasHref(buildPortalNav('hr', enabled), '/hr/profile'), true);
  assert.equal(hasHref(buildPortalNav('manager', enabled), '/manager/profile'), true);
  assert.equal(hasHref(buildPortalNav('employee', enabled), '/employee/profile'), true);
  assert.equal(hasHref(ADMIN_NAV_ITEMS, '/admin/profile'), true);
});

test('admin settings navigation stays in admin scope via portal-nav', () => {
  const adminLayout = readFileSync(resolve(process.cwd(), 'app/admin/(main)/layout.tsx'), 'utf8');
  const settingsHref = ADMIN_NAV_ITEMS.find((item) => item.label === 'Company Settings')?.href;

  assert.equal(settingsHref, '/admin/company-settings');
  assert.equal(
    ADMIN_NAV_ITEMS.some((item) => item.href === '/hr/settings'),
    false
  );
  assert.equal(adminLayout.includes("href: '/hr/settings'"), false);
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
