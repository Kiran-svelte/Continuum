import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';
import { answerWithKnowledge } from '@/lib/continuum-assistant/knowledge';
import { canUseAssistantAction } from '@/lib/continuum-assistant/actions/permissions';
import type { AssistantContext } from '@/lib/continuum-assistant/types';
import { buildPortalNav, type PortalSlug } from '@/lib/navigation/portal-nav';
import {
  DEFAULT_ROLE_PERMISSIONS,
  filterPermissionsByModules,
  type PermissionCode,
  type UserRole,
} from '@/lib/rbac';
import { MODULE_SLUGS, type ModuleSlug } from '@/lib/core-functions/catalog';

const MANDATORY: ModuleSlug[] = ['employees', 'leave', 'attendance', 'compliance'];

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

function context(params: {
  role?: UserRole;
  portalSlug?: PortalSlug;
  enabledModules: ModuleSlug[];
  permissions?: PermissionCode[];
}): AssistantContext {
  const role = params.role ?? 'employee';
  const portalSlug = params.portalSlug ?? 'employee';
  const permissions =
    params.permissions ??
    filterPermissionsByModules(DEFAULT_ROLE_PERMISSIONS[role], params.enabledModules);

  return {
    employeeId: 'emp-1',
    companyId: 'company-1',
    companyName: 'Acme',
    role,
    portalSlug,
    displayName: 'Test User',
    enabledModules: params.enabledModules,
    permissions,
    navHints: buildPortalNav(portalSlug, params.enabledModules, permissions),
    personalSnapshot: null,
  };
}

describe('enterprise scenario matrix S1-S6', () => {
  it('S1 leave-only: payroll nav, permission, and assistant payslip access are blocked', () => {
    const enabled = [...MANDATORY];
    const permissions = filterPermissionsByModules(DEFAULT_ROLE_PERMISSIONS.employee, enabled);
    const nav = buildPortalNav('employee', enabled, permissions);
    const reply = answerWithKnowledge('show my payslip', context({ enabledModules: enabled, permissions }));

    assert.ok(!nav.some((item) => item.href === '/employee/payslips'));
    assert.ok(!permissions.includes('payroll.view_own'));
    assert.match(reply?.reply ?? '', /MODULE_DISABLED/);
    assert.deepEqual(reply?.links, []);
  });

  it('S2 leave plus payroll: employee sees own payslip capability only', () => {
    const enabled: ModuleSlug[] = [...MANDATORY, 'payroll'];
    const permissions = filterPermissionsByModules(DEFAULT_ROLE_PERMISSIONS.employee, enabled);
    const nav = buildPortalNav('employee', enabled, permissions);
    const reply = answerWithKnowledge('show my payslip', context({ enabledModules: enabled, permissions }));

    assert.ok(nav.some((item) => item.href === '/employee/payslips'));
    assert.ok(permissions.includes('payroll.view_own'));
    assert.ok(!permissions.includes('payroll.generate'));
    assert.ok(reply?.links.some((link) => link.href === '/employee/payslips'));
  });

  it('S3 leave plus attendance: payroll remains blocked while attendance stays visible', () => {
    const enabled = [...MANDATORY];
    const nav = buildPortalNav('employee', enabled);

    assert.ok(nav.some((item) => item.href === '/employee/attendance'));
    assert.ok(!nav.some((item) => item.href === '/employee/payslips'));
  });

  it('S4 all modules: HR nav exposes the full enabled enterprise surface', () => {
    const enabled = [...MODULE_SLUGS];
    const permissions = filterPermissionsByModules(DEFAULT_ROLE_PERMISSIONS.hr, enabled);
    const nav = buildPortalNav('hr', enabled, permissions).map((item) => item.href);

    for (const href of ['/hr/payroll', '/hr/performance', '/hr/recruitment', '/hr/learning', '/hr/documents']) {
      assert.ok(nav.includes(href), `expected ${href}`);
    }
  });

  it('S5 cap greater than enabled: only enabled optional module groups surface', () => {
    const enabled: ModuleSlug[] = [...MANDATORY, 'payroll', 'documents'];
    const nav = buildPortalNav('hr', enabled, filterPermissionsByModules(DEFAULT_ROLE_PERMISSIONS.hr, enabled));
    const hrefs = nav.map((item) => item.href);

    assert.ok(hrefs.includes('/hr/payroll'));
    assert.ok(hrefs.includes('/hr/documents'));
    assert.ok(!hrefs.includes('/hr/performance'));
    assert.ok(!hrefs.includes('/hr/recruitment'));
  });

  it('S6 mid-session disable: recomputed permissions and assistant reply fail closed', () => {
    const withPayroll: ModuleSlug[] = [...MANDATORY, 'payroll'];
    const withoutPayroll = [...MANDATORY];

    const before = filterPermissionsByModules(DEFAULT_ROLE_PERMISSIONS.employee, withPayroll);
    const after = filterPermissionsByModules(before, withoutPayroll);
    const reply = answerWithKnowledge('download salary slip', context({ enabledModules: withoutPayroll, permissions: after }));

    assert.ok(before.includes('payroll.view_own'));
    assert.ok(!after.includes('payroll.view_own'));
    assert.match(reply?.reply ?? '', /MODULE_DISABLED/);
  });
});

describe('enterprise role matrix R1-R2', () => {
  it('R1 HR/admin fallback can approve with leave.approve_any', () => {
    const result = canUseAssistantAction(
      context({
        role: 'hr',
        portalSlug: 'hr',
        enabledModules: [...MANDATORY],
        permissions: ['leave.approve_any'],
      }),
      'approve_leave'
    );

    assert.deepEqual(result, { allowed: true });
  });

  it('R2 manager hierarchy can approve team leave, while employees cannot approve', () => {
    const managerResult = canUseAssistantAction(
      context({
        role: 'manager',
        portalSlug: 'manager',
        enabledModules: [...MANDATORY],
        permissions: ['leave.approve_team'],
      }),
      'approve_leave'
    );
    const employeeResult = canUseAssistantAction(
      context({ enabledModules: [...MANDATORY], permissions: ['leave.apply_own'] }),
      'approve_leave'
    );

    assert.deepEqual(managerResult, { allowed: true });
    assert.equal(employeeResult.allowed, false);
  });
});

describe('enterprise channel matrix C1-C3', () => {
  it('C1 web assistant persists conversation draft and messages server-side', () => {
    const route = read('app/api/ai/assistant/route.ts');

    assert.match(route, /loadConversationDraft\(employee\.org_id,\s*employee\.id,\s*'web'\)/);
    assert.match(route, /saveConversationDraft\(employee\.org_id,\s*employee\.id,\s*'web'/);
    assert.match(route, /appendConversationMessages\(employee\.org_id,\s*employee\.id,\s*'web'/);
  });

  it('C2 WhatsApp assistant uses linked identity, persisted draft, and headless responder', () => {
    const route = read('app/api/webhooks/whatsapp/route.ts');

    assert.match(route, /buildContextFromLink\(link/);
    assert.match(route, /loadConversationDraft\(\s*link\.company_id,\s*link\.employee_id,\s*'whatsapp'/);
    assert.match(route, /respondHeadless\(messageText,\s*history,\s*execCtx,\s*actionDraft\)/);
    assert.match(route, /saveConversationDraft\(link\.company_id,\s*link\.employee_id,\s*'whatsapp'/);
  });

  it('C3 mixed continuity has one server store keyed by company, employee, and channel', () => {
    const store = read('lib/whatsapp/conversation-store.ts');
    const schema = read('prisma/schema.prisma');

    assert.match(store, /AssistantConversationChannel = 'web' \| 'whatsapp'/);
    assert.match(schema, /@@unique\(\[company_id,\s*employee_id,\s*channel\]\)/);
    assert.match(schema, /model AssistantMessageRecord/);
  });
});
