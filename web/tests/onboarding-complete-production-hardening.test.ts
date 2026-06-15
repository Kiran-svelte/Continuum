import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

test('onboarding completion does not leak raw internal failures to users', () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), 'app/api/onboarding/complete/route.ts'),
    'utf8'
  );

  assert.ok(
    routeSource.includes('ONBOARDING_COMPLETE_ERROR_RESPONSE'),
    'route should use a stable safe error response'
  );
  assert.ok(
    !routeSource.includes("NextResponse.json({ error: message }, { status: 500 })"),
    'route should not return raw error.message for unexpected failures'
  );
  assert.ok(
    routeSource.includes("logOnboardingApiError('complete'"),
    'route should preserve diagnostics in server logs'
  );
});

test('onboarding setup API routes use safe unexpected-error responses', () => {
  const routeFiles = [
    'app/api/onboarding/complete/route.ts',
    'app/api/onboarding/finalize/route.ts',
    'app/api/onboarding/defaults/route.ts',
    'app/api/onboarding/holidays/route.ts',
    'app/api/onboarding/step/[step]/route.ts',
  ];

  for (const routeFile of routeFiles) {
    const routeSource = readFileSync(resolve(process.cwd(), routeFile), 'utf8');

    assert.ok(
      routeSource.includes('onboardingSafeErrorBody') ||
        routeSource.includes('ONBOARDING_COMPLETE_ERROR_RESPONSE'),
      `${routeFile} should use a safe 500 response body`
    );
    assert.ok(
      routeSource.includes('logOnboardingApiError') ||
        routeSource.includes("logger.error('Onboarding completion failed'"),
      `${routeFile} should log unexpected failures server-side`
    );
    assert.ok(
      !routeSource.includes("const message = error instanceof Error ? error.message"),
      `${routeFile} should not prepare raw error.message for unexpected 500 responses`
    );
    assert.ok(
      !routeSource.includes('NextResponse.json({ error: message }, { status: 500 })'),
      `${routeFile} should not return raw error.message for unexpected 500 responses`
    );
  }
});

test('notification template seeding cannot expire the onboarding transaction', () => {
  const routeSource = readFileSync(
    resolve(process.cwd(), 'app/api/onboarding/complete/route.ts'),
    'utf8'
  );

  const transactionStart = routeSource.indexOf('await prisma.$transaction(async (tx) => {');
  const transactionEnd = routeSource.indexOf('}, ONBOARDING_TRANSACTION_OPTIONS);');
  const seedCall = routeSource.indexOf('void seedDefaultNotificationTemplates(companyId)');
  const txNotificationTemplateAccess = routeSource.indexOf('tx.notificationTemplate');

  assert.ok(transactionStart >= 0, 'completion should still use an atomic transaction');
  assert.ok(transactionEnd > transactionStart, 'transaction should use explicit timeout options');
  assert.ok(seedCall > transactionEnd, 'template seeding should run only after the transaction closes');
  assert.equal(txNotificationTemplateAccess, -1, 'template seeding must not use the transaction client');
});

test('onboarding page maps API failures to safe retry copy', () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), 'app/onboarding/page.tsx'),
    'utf8'
  );

  assert.ok(
    pageSource.includes('getOnboardingApiErrorMessage'),
    'page should sanitize onboarding completion API errors'
  );
  assert.ok(
    pageSource.includes('ONBOARDING_FETCH_TIMEOUT_MS'),
    'page should use the extended onboarding timeout'
  );
  assert.ok(
    !pageSource.includes("setError(json.error ?? 'Failed to save onboarding data')"),
    'page should not directly render API error strings from completion'
  );
  assert.ok(
    !pageSource.includes("setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.')"),
    'page should not render raw caught error messages from completion'
  );
});
