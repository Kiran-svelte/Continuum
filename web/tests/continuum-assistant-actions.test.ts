import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  detectRequestLeaveIntent,
  isConfirmMessage,
  isCancelMessage,
  parseNaturalDateRange,
  inferLeaveTypeCode,
  looksLikeLeaveRequestDetails,
  isLeaveBalanceOrPolicyQuestion,
  shouldAbandonLeaveDraft,
  parseEmployeeNameHint,
  detectHalfDay,
} from '../lib/continuum-assistant/actions/parse-leave-input';

function read(rel: string): string {
  return readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');
}

describe('Continuum assistant actions — parsing', () => {
  it('detects confirm and cancel phrases', () => {
    assert.equal(isConfirmMessage('confirm'), true);
    assert.equal(isConfirmMessage('yes please'), true);
    assert.equal(isCancelMessage('cancel'), true);
    assert.equal(isConfirmMessage('maybe'), false);
    assert.equal(isConfirmMessage('ok how do I view payslips'), false);
  });

  it('does not treat balance questions as leave submission', () => {
    assert.equal(isLeaveBalanceOrPolicyQuestion('how many sick leave days do I have'), true);
    assert.equal(looksLikeLeaveRequestDetails('how many sick leave days do I have'), false);
    assert.equal(shouldAbandonLeaveDraft('how do I view my payslip'), true);
    assert.equal(shouldAbandonLeaveDraft('sick leave on 25 May — fever'), false);
  });

  it('parses natural single-day dates', () => {
    const d = parseNaturalDateRange('fever on 25th may');
    assert.ok(d);
    assert.equal(d!.start_date, d!.end_date);
    assert.match(d!.start_date, /-05-25$/);
  });

  it('parses month-day ranges and multi-day from phrases', () => {
    const range = parseNaturalDateRange('June 20th to June 25th');
    assert.ok(range);
    assert.match(range!.start_date, /-06-20$/);
    assert.match(range!.end_date, /-06-25$/);

    const fiveDays = parseNaturalDateRange(
      'Request annual leave for 5 days from June 5th for neha wedding'
    );
    assert.ok(fiveDays);
    assert.match(fiveDays!.start_date, /-06-05$/);
    assert.notEqual(fiveDays!.start_date, fiveDays!.end_date);

    assert.equal(detectHalfDay('half day leave on 22nd may 2026'), true);
    assert.equal(looksLikeLeaveRequestDetails('June 20th to June 25th'), true);
    assert.ok(parseEmployeeNameHint('approve leave for Riya Rajveer'));
  });

  it('infers sick leave type from message', () => {
    assert.equal(inferLeaveTypeCode('sick leave for fever', ['SL', 'CL']), 'SL');
  });

  it('detects request leave intent', () => {
    assert.equal(detectRequestLeaveIntent('I need to request sick leave'), true);
    assert.equal(detectRequestLeaveIntent('I need you to request behalf of me'), true);
    assert.equal(detectRequestLeaveIntent('can you submit sick leave for me'), true);
    assert.equal(detectRequestLeaveIntent('hello'), false);
  });
});

describe('Continuum assistant actions — human-in-the-loop contracts', () => {
  it('API accepts actionDraft and returns pendingAction fields', () => {
    const route = read('../app/api/ai/assistant/route.ts');
    assert.ok(route.includes('actionDraft'));
    assert.ok(route.includes('actionCommand'));
    assert.ok(route.includes('pendingAction'));
  });

  it('orchestrator runs before knowledge fallback', () => {
    const respond = read('../lib/continuum-assistant/respond.ts');
    assert.ok(respond.includes('processAssistantActions'));
    assert.ok(respond.indexOf('processAssistantActions') < respond.indexOf('answerWithKnowledge'));
  });

  it('request leave flow requires awaiting_confirmation before execute', () => {
    const req = read('../lib/continuum-assistant/actions/request-leave.ts');
    assert.ok(req.includes('awaiting_confirmation'));
    assert.ok(req.includes('Confirm & submit'));
    assert.ok(req.includes('forwardAuthenticatedApi'));
    assert.ok(req.includes('logAssistantAction'));
  });

  it('widget exposes confirm and cancel controls', () => {
    const widget = read('../components/assistant/continuum-assistant-widget.tsx');
    assert.ok(widget.includes('pendingAction'));
    assert.ok(widget.includes('actionCommand'));
    assert.ok(widget.includes('confirmPendingAction'));
  });
});
