import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { TOTAL_ONBOARDING_STEPS } from '../lib/onboarding-step-contract';

/**
 * G2 — onboarding step constant sync between contract and UI wizard.
 */
test('onboarding TOTAL_STEPS matches TOTAL_ONBOARDING_STEPS contract (G2)', () => {
  const viewSource = readFileSync(
    resolve(process.cwd(), 'components/pages/onboarding/onboarding-view.tsx'),
    'utf8'
  );
  const match = viewSource.match(/const TOTAL_STEPS = (\d+)/);
  assert.ok(match, 'TOTAL_STEPS constant must exist in onboarding-view.tsx');
  assert.equal(Number(match[1]), TOTAL_ONBOARDING_STEPS);
  assert.equal(TOTAL_ONBOARDING_STEPS, 13);
});

test('legacy /onboarding/company redirects to /onboarding (G2)', () => {
  const pageSource = readFileSync(
    resolve(process.cwd(), 'app/onboarding/company/page.tsx'),
    'utf8'
  );
  assert.ok(pageSource.includes("redirect('/onboarding')"));

  const middlewareSource = readFileSync(resolve(process.cwd(), 'middleware.ts'), 'utf8');
  assert.ok(middlewareSource.includes('/onboarding/company'));
  assert.ok(middlewareSource.includes("'/onboarding'"));
});

test('onboarding data map is committed for G2', () => {
  const doc = readFileSync(resolve(process.cwd(), 'docs/onboarding-data-map.md'), 'utf8');
  assert.ok(doc.includes('Company.onboarding_completed'));
  assert.ok(doc.includes('CompanySettings.hr_alerts.onboarding_draft'));
  assert.ok(doc.includes('COMPANY_SETUP_INCOMPLETE'));
});
