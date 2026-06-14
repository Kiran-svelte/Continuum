import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import {
  ADMIN_NAV_ITEMS,
  HR_NAV_ITEMS,
  MANAGER_NAV_ITEMS,
  buildPortalNav,
} from '@/lib/navigation/portal-nav';

async function readSource(relativePath: string): Promise<string> {
  const fs = await import('node:fs');
  const path = fileURLToPath(new URL(relativePath, import.meta.url));
  return fs.readFileSync(path, 'utf-8');
}

function hasHref(items: { href: string }[], href: string): boolean {
  return items.some((item) => item.href === href);
}

describe('Leave Role Surface Coverage', () => {
  it('manager portal exposes request leave and approvals surfaces', async () => {
    const nav = buildPortalNav('manager', ['leave', 'attendance', 'employees', 'compliance']);
    const requestLeavePage = await readSource('../app/manager/(main)/request-leave/page.tsx');
    const approvalsPage = await readSource('../app/manager/(main)/approvals/page.tsx');

    assert.ok(hasHref(nav, '/manager/request-leave'), 'manager nav should expose request leave');
    assert.ok(hasHref(nav, '/manager/approvals'), 'manager nav should expose approvals');
    assert.ok(hasHref(MANAGER_NAV_ITEMS, '/manager/request-leave'), 'manager catalog should define request leave');
    assert.ok(
      requestLeavePage.includes('@/components/pages/manager/request-leave-view') ||
        requestLeavePage.includes("employee/(main)/request-leave/page"),
      'manager request leave page should map to canonical leave request UI'
    );
    assert.ok(
      approvalsPage.includes("action: 'approve' | 'reject'") && approvalsPage.includes('/api/leaves/${action}/'),
      'manager approvals page should support approve/reject actions'
    );
  });

  it('hr portal exposes request leave and leave approval/review surfaces', async () => {
    const nav = buildPortalNav('hr', ['leave', 'attendance', 'employees', 'compliance']);
    const requestLeavePage = await readSource('../app/hr/(main)/request-leave/page.tsx');
    const leaveRequestsPage = await readSource('../app/hr/(main)/leave-requests/page.tsx');

    assert.ok(hasHref(nav, '/hr/request-leave'), 'hr nav should expose request leave');
    assert.ok(hasHref(nav, '/hr/leave-requests'), 'hr nav should expose leave requests');
    assert.ok(hasHref(HR_NAV_ITEMS, '/hr/request-leave'), 'hr catalog should define request leave');
    assert.ok(
      requestLeavePage.includes('@/components/pages/hr/request-leave-view') ||
        requestLeavePage.includes("employee/(main)/request-leave/page"),
      'hr request leave page should map to canonical leave request UI'
    );
    assert.ok(
      leaveRequestsPage.includes('@/components/pages/hr/leave-requests-view') ||
        (leaveRequestsPage.includes("action: 'approve' | 'reject'") &&
          leaveRequestsPage.includes('/api/leaves/${action}/')),
      'hr leave requests page should map to canonical approval UI'
    );
  });

  it('admin portal exposes leave approval/review surfaces without request leave', async () => {
    const nav = buildPortalNav('admin', ['leave', 'attendance', 'employees', 'compliance']);
    const leaveRequestsPage = await readSource('../app/admin/(main)/leave-requests/page.tsx');

    assert.ok(!hasHref(nav, '/admin/request-leave'), 'admin nav should not expose request leave');
    assert.ok(hasHref(nav, '/admin/leave-requests'), 'admin nav should expose leave requests');
    assert.ok(hasHref(ADMIN_NAV_ITEMS, '/admin/leave-requests'), 'admin catalog should define leave requests');
    assert.ok(
      leaveRequestsPage.includes('@/components/pages/admin/leave-requests-view') ||
        leaveRequestsPage.includes("hr/(main)/leave-requests/page"),
      'admin leave requests page should map to canonical approval UI'
    );
  });
});
