import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

function source(path: string): string {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
}

function exists(path: string): boolean {
  return existsSync(new URL(`../${path}`, import.meta.url));
}

test('employee leave request and history flows use real APIs with visible retry paths', () => {
  const requestLeave = source('components/pages/employee/request-leave-view.tsx');
  const leaveHistory = source('components/pages/employee/leave-history-view.tsx');

  assert.match(requestLeave, /fetch\('\/api\/company\/leave-types'/);
  assert.match(requestLeave, /fetch\('\/api\/leaves\/balances'/);
  assert.match(requestLeave, /fetch\('\/api\/leaves\/check-constraints'/);
  assert.match(requestLeave, /fetch\('\/api\/leaves\/submit'/);
  assert.match(requestLeave, /reportApiActionOutcome\(json\)/);
  assert.match(requestLeave, /submitError/);
  assert.match(requestLeave, /Retry Submit/);
  assert.match(requestLeave, /getPortalLeaveHistoryPath\(pathname/);

  assert.match(leaveHistory, /fetch\(`\/api\/leaves\/list\?\$\{params\}`/);
  assert.match(leaveHistory, /fetch\(`\/api\/leaves\/cancel\/\$\{requestId\}`/);
  assert.match(leaveHistory, /No leave requests found/);
  assert.match(leaveHistory, /New Request/);
  assert.match(leaveHistory, /handleExportCsv/);
});

test('employee attendance has clock, regularization, monthly calendar, and retry surfaces', () => {
  const attendance = source('components/pages/employee/attendance-view.tsx');

  assert.match(attendance, /fetch\(`\/api\/attendance\?month=\$\{currentMonth\}&year=\$\{currentYear\}`/);
  assert.match(attendance, /fetch\('\/api\/attendance',/);
  assert.match(attendance, /fetch\('\/api\/attendance\/regularize\?limit=50'/);
  assert.match(attendance, /fetch\('\/api\/attendance\/regularize',/);
  assert.match(attendance, /recordsByDay/);
  assert.match(attendance, /calendarCells/);
  assert.match(attendance, /\['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'\]/);
  assert.match(attendance, /Request Regularization/);
  assert.match(attendance, /onClick=\{\(\) => \{ setError\(null\); loadAttendance\(\); loadLeaveBalances\(\); loadRegularizations\(\); \}\}/);
});

test('HR, admin, and manager approval surfaces expose transparent leave decision email resend', () => {
  const hrRequests = source('components/pages/hr/leave-requests-view.tsx');
  const adminRequests = source('components/pages/admin/leave-requests-view.tsx');
  const managerApprovals = source('app/manager/(main)/approvals/page.tsx');

  for (const src of [hrRequests, managerApprovals]) {
    assert.match(src, /\/api\/email\/resend/);
    assert.match(src, /type:\s*'leave_decision'/);
    assert.match(src, /reportApiActionOutcome\(json\)/);
    assert.match(src, /Resend Email/);
    assert.match(src, /resendLoading/);
    assert.match(src, /Failed to resend leave decision email/);
  }

  assert.match(hrRequests, /\/api\/leaves\/bulk-approve/);
  assert.match(hrRequests, /SLA Breached/);
  assert.match(adminRequests, /components\/pages\/hr\/leave-requests-view/);
  assert.doesNotMatch(adminRequests, /app\/hr\/\(main\)\/leave-requests\/page/);
  assert.match(managerApprovals, /HistoryCard/);
  assert.match(managerApprovals, /status=approved,rejected,cancelled/);
});

test('email resend API supports leave decision delivery outcomes without silent success', () => {
  const route = source('app/api/email/resend/route.ts');

  assert.match(route, /type ResendType = 'invite' \| 'welcome' \| 'payslip' \| 'leave_decision'/);
  assert.match(route, /assertModule\(actor\.org_id,\s*'leave'\)/);
  assert.match(route, /canActOnLeaveRequest/);
  assert.match(route, /sendLeaveApprovalEmail/);
  assert.match(route, /sendLeaveRejectionEmail/);
  assert.match(route, /sideEffectSkipped\('email', 'Leave decision email to employee'/);
  assert.match(route, /emailSent/);
  assert.match(route, /emailError/);
  assert.match(route, /actionOutcome/);
  assert.match(route, /status:\s*email\.success \? 200 : 502/);
  assert.match(route, /status:\s*422/);
});

test('super admin company lifecycle includes module cap, owner setup, list, edit, and soft delete routes', () => {
  const companies = source('components/pages/super-admin/companies-view.tsx');
  const createCompany = source('components/pages/super-admin/companies-new-view.tsx');
  const route = source('app/api/super-admin/companies/route.ts');

  assert.ok(exists('components/pages/super-admin/companies-id-view.tsx'));
  assert.ok(exists('components/pages/super-admin/companies-id-settings-view.tsx'));
  assert.ok(exists('components/pages/super-admin/companies-id-core-functions-view.tsx'));
  assert.ok(exists('app/api/super-admin/companies/[id]/route.ts'));
  assert.ok(exists('app/api/super-admin/companies/[id]/modules/route.ts'));
  assert.ok(exists('app/api/super-admin/companies/[id]/subscription/route.ts'));

  assert.match(companies, /fetch\(`\/api\/super-admin\/companies\?\$\{params\}`/);
  assert.match(companies, /router\.push\('\/super-admin\/companies\/new'\)/);
  assert.match(companies, /router\.push\(`\/super-admin\/companies\/\$\{company\.id\}`\)/);
  assert.match(companies, /router\.push\(`\/super-admin\/companies\/\$\{company\.id\}\/settings`\)/);
  assert.match(companies, /method:\s*'DELETE'/);
  assert.match(companies, /Delete Selected/);

  assert.match(createCompany, /CORE_FUNCTION_CATALOG/);
  assert.match(createCompany, /moduleCap/);
  assert.match(createCompany, /validatePassword\(formData\.ownerPassword\)/);
  assert.match(createCompany, /Owner password was configured/);

  assert.match(route, /buildDefaultModuleSeed\(capSlugs\)/);
  assert.match(route, /validateDependencies\(enabled\)/);
  assert.match(route, /setupRequired:\s*true/);
  assert.match(route, /Do not share credentials over API responses/);
});

test('billing, WhatsApp, profile, and notifications surfaces are wired to production APIs', () => {
  const billing = source('components/pages/admin/billing-view.tsx');
  const billingRoute = source('app/api/admin/billing/route.ts');
  const upgradeRoute = source('app/api/payments/upgrade/route.ts');
  const whatsappAdmin = source('components/pages/admin/whatsapp-integration-view.tsx');
  const whatsappWebhook = source('app/api/webhooks/whatsapp/route.ts');
  const profile = source('components/profile/role-profile-page.tsx');
  const notifications = source('components/notifications-page.tsx');

  assert.match(billing, /fetch\('\/api\/admin\/billing'/);
  assert.match(billing, /fetch\('\/api\/payments\/upgrade'/);
  assert.match(billing, /loadCashfreeScript/);
  assert.match(billingRoute, /company\.manage_billing/);
  assert.match(upgradeRoute, /createCashfreeOrder/);

  assert.ok(exists('app/admin/integrations/whatsapp/page.tsx'));
  assert.ok(exists('app/employee/profile/whatsapp/page.tsx'));
  assert.match(whatsappAdmin, /NEXT_PUBLIC_WHATSAPP_ENABLED/);
  assert.match(whatsappWebhook, /verifyWhatsAppSignature/);
  assert.match(whatsappWebhook, /getWhatsAppTenantConfigByPhoneNumberId/);
  assert.match(whatsappWebhook, /saveConversationDraft\(link\.company_id,\s*link\.employee_id,\s*'whatsapp'/);

  assert.match(profile, /\/api\/profile/);
  assert.match(profile, /Used to verify WhatsApp HR/);
  assert.match(notifications, /\/api\/notifications/);
  assert.match(notifications, /\/api\/notifications\/read-all/);
});
