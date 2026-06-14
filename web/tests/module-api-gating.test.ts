import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { moduleDisabledResponse } from '@/lib/api-errors';
import { requireEmployeeListAccess } from '@/lib/auth-guard';
import type { AuthEmployee } from '@/lib/auth-guard';
import { buildPortalNav } from '@/lib/navigation/portal-nav';
import { moduleSlugForPortalPath } from '@/lib/middleware-module-paths';

const webRoot = resolve(process.cwd());

function readApi(relPath: string): string {
  return readFileSync(resolve(webRoot, relPath), 'utf8');
}

describe('moduleDisabledResponse', () => {
  it('returns MODULE_DISABLED envelope', async () => {
    const res = moduleDisabledResponse('documents');
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.error, 'MODULE_DISABLED');
    assert.equal(body.module, 'documents');
  });
});

describe('requireEmployeeListAccess', () => {
  const base: AuthEmployee = {
    id: 'e1',
    auth_id: 'a1',
    email: 'hr@example.com',
    first_name: 'Hr',
    last_name: 'User',
    org_id: 'c1',
    primary_role: 'hr',
    secondary_roles: null,
    department: null,
    gender: null,
    status: 'active',
    permissions: ['employee.view_all'],
    accessScope: 'company',
    tutorialCompleted: true,
    mustChangePassword: false,
  };

  it('allows employee.view_all without view_team', () => {
    assert.doesNotThrow(() => requireEmployeeListAccess(base));
  });

  it('allows employee.view_team', () => {
    assert.doesNotThrow(() =>
      requireEmployeeListAccess({
        ...base,
        primary_role: 'manager',
        permissions: ['employee.view_team'],
      })
    );
  });

  it('rejects view_own only', () => {
    assert.throws(
      () =>
        requireEmployeeListAccess({
          ...base,
          primary_role: 'employee',
          permissions: ['employee.view_own'],
        }),
      /Forbidden/
    );
  });
});

describe('module API route guards (source)', () => {
  it('directory route asserts directory module', () => {
    const src = readApi('app/api/directory/route.ts');
    assert.match(src, /assertModule\(employee\.org_id!,\s*'directory'\)/);
  });

  it('organization route asserts directory module', () => {
    const src = readApi('app/api/hr/organization/route.ts');
    assert.match(src, /assertModule\(employee\.org_id!,\s*'directory'\)/);
  });

  it('documents routes assert documents module', () => {
    const list = readApi('app/api/documents/route.ts');
    const upload = readApi('app/api/documents/upload/route.ts');
    assert.match(list, /assertModule\(employee\.org_id!,\s*'documents'\)/);
    assert.match(upload, /assertModule\(employee\.org_id!,\s*'documents'\)/);
  });

  it('review-cycles assert performance module', () => {
    const src = readApi('app/api/review-cycles/route.ts');
    assert.match(src, /assertModule\(employee\.org_id!,\s*'performance'\)/);
  });

  const leaveRoutes = [
    'app/api/leaves/list/route.ts',
    'app/api/leaves/balances/route.ts',
    'app/api/leaves/submit/route.ts',
    'app/api/leaves/cancel/[requestId]/route.ts',
    'app/api/leaves/approve/[requestId]/route.ts',
    'app/api/leaves/reject/[requestId]/route.ts',
    'app/api/leaves/bulk-approve/route.ts',
    'app/api/leaves/check-constraints/route.ts',
    'app/api/leaves/encash/route.ts',
    'app/api/leaves/encash/[id]/route.ts',
    'app/api/company/leave-types/route.ts',
  ];

  for (const routePath of leaveRoutes) {
    it(`${routePath} asserts leave module`, () => {
      const src = readApi(routePath);
      assert.match(
        src,
        /requireModuleForOrg\(employee\.org_id,\s*'leave'\)/,
        `${routePath} must call requireModuleForOrg for leave`
      );
    });
  }
});

describe('portal nav directory', () => {
  it('shows employee directory when directory enabled', () => {
    const nav = buildPortalNav('employee', [
      'leave',
      'attendance',
      'employees',
      'compliance',
      'directory',
    ]);
    assert.ok(nav.some((n) => n.href === '/employee/directory'));
  });

  it('hides employee directory when directory disabled', () => {
    const nav = buildPortalNav('employee', [
      'leave',
      'attendance',
      'employees',
      'compliance',
    ]);
    assert.ok(!nav.some((n) => n.href === '/employee/directory'));
  });
});

describe('middleware directory paths', () => {
  it('maps employee and manager directory routes', () => {
    assert.equal(moduleSlugForPortalPath('/employee/directory'), 'directory');
    assert.equal(moduleSlugForPortalPath('/manager/directory'), 'directory');
  });
});
