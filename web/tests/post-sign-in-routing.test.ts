import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePostSignInPath } from '../lib/post-sign-in-routing';

test('invited employee routes to employee onboarding, never company admin wizard', () => {
  assert.equal(
    resolvePostSignInPath({
      primary_role: 'employee',
      org_id: 'org-1',
      company: { onboarding_completed: false },
      employee_onboarding_completed: false,
    }),
    '/employee/onboarding'
  );

  assert.equal(
    resolvePostSignInPath({
      primary_role: 'employee',
      org_id: 'org-1',
      company: { onboarding_completed: false },
      employee_onboarding_completed: undefined,
    }),
    '/employee/onboarding'
  );
});

test('company admin with incomplete setup routes to /onboarding', () => {
  assert.equal(
    resolvePostSignInPath({
      primary_role: 'admin',
      org_id: 'org-1',
      company: { onboarding_completed: false },
    }),
    '/onboarding'
  );
});

test('admin ignores redirect to employee portal after sign-in', () => {
  assert.equal(
    resolvePostSignInPath(
      {
        primary_role: 'admin',
        org_id: 'org-1',
        company: { onboarding_completed: true },
      },
      { redirectTarget: '/employee/profile' }
    ),
    '/admin/dashboard'
  );
});

test('admin ignores redirect to a disabled module path after sign-in', () => {
  assert.equal(
    resolvePostSignInPath(
      {
        primary_role: 'admin',
        org_id: 'org-1',
        company: { onboarding_completed: true },
        enabledModules: ['employees', 'leave', 'attendance', 'compliance'],
      },
      { redirectTarget: '/admin/payslips' }
    ),
    '/admin/dashboard'
  );
});

test('admin can follow redirect to an enabled module path after sign-in', () => {
  assert.equal(
    resolvePostSignInPath(
      {
        primary_role: 'admin',
        org_id: 'org-1',
        company: { onboarding_completed: true },
        enabledModules: ['employees', 'leave', 'attendance', 'compliance'],
      },
      { redirectTarget: '/admin/leave-requests' }
    ),
    '/admin/leave-requests'
  );
});

test('employee ignores redirect to company onboarding path', () => {
  assert.equal(
    resolvePostSignInPath(
      {
        primary_role: 'employee',
        org_id: 'org-1',
        employee_onboarding_completed: true,
        employee_welcome_pending: false,
      },
      { redirectTarget: '/onboarding' }
    ),
    '/employee/dashboard'
  );
});

test('onboarding layout file guards non-admin roles', async () => {
  const fs = await import('node:fs');
  const { fileURLToPath } = await import('node:url');
  const layoutPath = fileURLToPath(new URL('../app/onboarding/layout.tsx', import.meta.url));
  const content = fs.readFileSync(layoutPath, 'utf-8');
  assert.ok(content.includes("redirect('/employee/onboarding')"));
  assert.ok(content.includes('requiresEmployeeOnboarding'));
});
