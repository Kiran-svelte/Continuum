import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import {
  buildReleasedEmail,
  employeeHoldsEmail,
  findEmployeeBlockingEmail,
  isReleasedEmail,
  RELEASED_EMAIL_DOMAIN,
} from '../lib/employee-email-lifecycle';

type DelegateFindUnique = (args: {
  where: Record<string, unknown>;
  select: Record<string, boolean>;
}) => Promise<{
  id: string;
  deleted_at: Date | null;
  status: string;
  email: string;
} | null>;

function makeEmployeePrismaStub(
  record: {
    id: string;
    deleted_at: Date | null;
    status: string;
    email: string;
  } | null
) {
  const findUnique: DelegateFindUnique = async (args) => {
    if (!record) return null;
    const email = args.where.email as string | undefined;
    if (email && email !== record.email) return null;
    return record;
  };

  return { employee: { findUnique } };
}

describe('employee email lifecycle', () => {
  it('builds deterministic released email tombstones', () => {
    const released = buildReleasedEmail('abc-123-def');
    assert.equal(released.endsWith(`@${RELEASED_EMAIL_DOMAIN}`), true);
    assert.equal(isReleasedEmail(released), true);
    assert.equal(isReleasedEmail('user@company.com'), false);
  });

  it('treats deactivated employees as not holding email', () => {
    assert.equal(
      employeeHoldsEmail({
        id: 'e1',
        email: 'user@company.com',
        deleted_at: new Date(),
        status: 'active',
      }),
      false
    );
    assert.equal(
      employeeHoldsEmail({
        id: 'e2',
        email: 'user@company.com',
        deleted_at: null,
        status: 'terminated',
      }),
      false
    );
    assert.equal(
      employeeHoldsEmail({
        id: 'e3',
        email: buildReleasedEmail('e3'),
        deleted_at: null,
        status: 'active',
      }),
      false
    );
    assert.equal(
      employeeHoldsEmail({
        id: 'e4',
        email: 'active@company.com',
        deleted_at: null,
        status: 'active',
      }),
      true
    );
  });

  it('findEmployeeBlockingEmail ignores deactivated rows', async () => {
    const blocking = await findEmployeeBlockingEmail(
      makeEmployeePrismaStub({
        id: 'e1',
        email: 'user@company.com',
        deleted_at: new Date(),
        status: 'terminated',
      }),
      'user@company.com'
    );
    assert.equal(blocking, null);
  });

  it('findEmployeeBlockingEmail returns active holders', async () => {
    const blocking = await findEmployeeBlockingEmail(
      makeEmployeePrismaStub({
        id: 'e1',
        email: 'user@company.com',
        deleted_at: null,
        status: 'active',
      }),
      'user@company.com'
    );
    assert.equal(blocking?.id, 'e1');
  });
});

describe('company purge contract', () => {
  it('DELETE route hard-purges via purgeCompanyById', () => {
    const routePath = resolve(
      process.cwd(),
      'app/api/super-admin/companies/[id]/route.ts'
    );
    const content = readFileSync(routePath, 'utf8');

    assert.equal(content.includes('purgeCompanyById'), true);
    assert.equal(content.includes('deleted_at: new Date()'), false);
    assert.match(content, /permanently deletes|purge/i);
  });

  it('purge helper performs prisma.company.delete', () => {
    const helperPath = resolve(process.cwd(), 'lib/tenancy/purge-company.ts');
    const content = readFileSync(helperPath, 'utf8');

    assert.equal(content.includes('company.delete'), true);
  });
});

describe('employee deactivation releases email', () => {
  it('employee DELETE uses deactivateEmployeeAndReleaseEmail transaction', () => {
    const routePath = resolve(process.cwd(), 'app/api/employees/[id]/route.ts');
    const content = readFileSync(routePath, 'utf8');

    assert.equal(content.includes('deactivateEmployeeAndReleaseEmail'), true);
    assert.equal(content.includes('prisma.$transaction'), true);
  });

  it('super-admin user DELETE uses deactivateEmployeeAndReleaseEmail', () => {
    const routePath = resolve(process.cwd(), 'app/api/super-admin/users/[id]/route.ts');
    const content = readFileSync(routePath, 'utf8');

    assert.equal(content.includes('deactivateEmployeeAndReleaseEmail'), true);
  });
});

describe('invite provisioning uses blocking email helper', () => {
  const inviteRoutes = [
    'app/api/company/invite-user/route.ts',
    'app/api/super-admin/companies/route.ts',
    'app/api/super-admin/users/route.ts',
    'app/api/hr/invites/route.ts',
    'app/api/employees/route.ts',
  ];

  for (const relativePath of inviteRoutes) {
    it(relativePath, () => {
      const content = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      assert.equal(content.includes('findEmployeeBlockingEmail'), true, relativePath);
    });
  }
});

describe('super-admin dashboard active tenant filters', () => {
  it('live dashboard page excludes deleted companies and deactivated employees', () => {
    const pagePath = resolve(process.cwd(), 'app/super-admin/dashboard/page.tsx');
    const content = readFileSync(pagePath, 'utf8');

    assert.equal(content.includes('activeCompanyWhere'), true);
    assert.equal(content.includes('activeEmployeeWhere'), true);
  });
});

describe('super-admin companies UI copy', () => {
  it('warns about permanent deletion', () => {
    const viewPath = resolve(process.cwd(), 'components/pages/super-admin/companies-view.tsx');
    const content = readFileSync(viewPath, 'utf8');

    assert.equal(content.includes('soft-delete'), false);
    assert.match(content, /permanently removes/i);
  });
});
