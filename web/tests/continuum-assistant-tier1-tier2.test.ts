import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { formatConstraintPlainEnglish } from '../lib/continuum-assistant/insights/constraint-plain-english';
import { validateBulkImportCsv, formatBulkImportPreviewForChat } from '../lib/hr/bulk-import-preview';
import {
  detectConstraintExplainIntent,
  detectSuggestDatesIntent,
  detectApprovalSummaryIntent,
  detectSetupStatusIntent,
  detectPayrollPreflightIntent,
  detectPayslipExplainIntent,
  detectPolicyExplainerIntent,
} from '../lib/continuum-assistant/insights/intent-detect';
import { parseApprovalChainQuestion } from '../lib/continuum-assistant/insights/policy-explainer';
import { parsePayslipLineKeyword } from '../lib/continuum-assistant/insights/payslip-explain';
import {
  detectRejectReasonHelpIntent,
  parseRejectReasonFromMessage,
  formatRejectReasonSuggestions,
} from '../lib/continuum-assistant/insights/reject-reason-helper';
import { detectOnboardingDraftIntent } from '../lib/continuum-assistant/insights/onboarding-draft';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

describe('Tier 1 — constraint plain English', () => {
  it('formats blocking violations with advice', () => {
    const text = formatConstraintPlainEnglish({
      passed: false,
      violations: [
        {
          rule_id: 'RULE002',
          name: 'Leave Balance',
          message: 'Insufficient balance',
          is_blocking: true,
          details: { remaining_days: 1 },
        },
      ],
      warnings: [],
    });
    assert.ok(text.includes('blocked'));
    assert.ok(text.includes('1'));
  });
});

describe('Tier 1 — intent detection', () => {
  it('detects explain, suggest, approval summary, setup, payroll', () => {
    assert.equal(detectConstraintExplainIntent("why can't I take leave these dates"), true);
    assert.equal(detectSuggestDatesIntent('best dates for 3 days off'), true);
    assert.equal(detectApprovalSummaryIntent('summarize my pending approvals'), true);
    assert.equal(detectSetupStatusIntent('what is left to setup for payroll'), true);
    assert.equal(detectPayrollPreflightIntent('is payroll ready to generate'), true);
  });
});

describe('Tier 2 — bulk import preview', () => {
  it('flags missing columns and invalid rows', () => {
    const csv = `first_name,last_name,email
Ada,Lovelace,ada@test.com
,Babbage,bad
`;
    const preview = validateBulkImportCsv(csv);
    assert.equal(preview.summary.ok, 1);
    assert.equal(preview.summary.errors, 1);
    const formatted = formatBulkImportPreviewForChat(preview);
    assert.ok(formatted.includes('pre-flight'));
  });

  it('maps dept column alias', () => {
    const csv = `first_name,last_name,email,dept
A,B,a@t.com,Eng`;
    const preview = validateBulkImportCsv(csv);
    assert.ok(preview.headers.includes('department'));
  });
});

describe('Tier 1–2 — wired modules exist', () => {
  it('insight handlers and preview API are present', () => {
    assert.ok(read('../lib/continuum-assistant/insights/handlers.ts').includes('processInsightIntents'));
    assert.ok(read('../lib/continuum-assistant/insights/handlers.ts').includes('handlePayslipExplain'));
    assert.ok(read('../lib/continuum-assistant/insights/handlers.ts').includes('handlePolicyExplainer'));
    assert.ok(read('../components/pages/employee/request-leave-view.tsx').includes('formatWizardConstraintPlainEnglish'));
    assert.ok(read('../app/api/hr/bulk-import/preview/route.ts').includes('validateBulkImportCsv'));
    assert.ok(read('../components/pages/employee/request-leave-view.tsx').includes('smart-leave'));
    assert.ok(read('../components/pages/hr/bulk-import-view.tsx').includes('bulk-import/preview'));
  });
});
