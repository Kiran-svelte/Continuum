import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ADMIN_NAV_ITEMS,
  EMPLOYEE_NAV_ITEMS,
  HR_NAV_ITEMS,
  MANAGER_NAV_ITEMS,
} from '@/lib/navigation/portal-nav';

function hrefs(items: { href: string }[]): string[] {
  return items.map((item) => item.href);
}

test('admin nav catalog does not include HR employees route', () => {
  const adminNavHrefs = hrefs(ADMIN_NAV_ITEMS);

  assert.equal(adminNavHrefs.includes('/hr/employees'), false);
  assert.equal(adminNavHrefs.includes('/admin/company-settings'), true);
});

test('portal nav keeps links inside each role prefix', () => {
  for (const href of hrefs(HR_NAV_ITEMS)) {
    assert.equal(href.startsWith('/hr/'), true, `HR nav leak: ${href}`);
  }

  for (const href of hrefs(MANAGER_NAV_ITEMS)) {
    assert.equal(href.startsWith('/manager/'), true, `Manager nav leak: ${href}`);
  }

  for (const href of hrefs(EMPLOYEE_NAV_ITEMS)) {
    assert.equal(href.startsWith('/employee/'), true, `Employee nav leak: ${href}`);
  }

  for (const href of hrefs(ADMIN_NAV_ITEMS)) {
    assert.equal(href.startsWith('/admin/'), true, `Admin nav leak: ${href}`);
  }
});
