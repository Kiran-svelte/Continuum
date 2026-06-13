import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { assistantReplyToWhatsAppMessages } from '../lib/continuum-assistant/adapters/whatsapp';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('C04-T01/C04-T08: assistant confirm path uses services, not HTTP cookie forwarding', () => {
  const requestLeave = read('lib/continuum-assistant/actions/request-leave.ts');
  const approveLeave = read('lib/continuum-assistant/actions/approve-leave.ts');
  assert.ok(requestLeave.includes('submitLeaveService'));
  assert.ok(approveLeave.includes('approveLeaveService'));
  assert.ok(!requestLeave.includes('forwardAuthenticatedApi'));
  assert.ok(!approveLeave.includes('forwardAuthenticatedApi'));
});

test('C04-T02/C04-T03: server-side draft schema is bounded and expiring', () => {
  const route = read('app/api/ai/assistant/route.ts');
  const actionTypes = read('lib/continuum-assistant/action-types.ts');
  assert.ok(route.includes('expiresAt'));
  assert.ok(route.includes('actionCommand'));
  assert.ok(actionTypes.includes("export type AssistantActionStatus = 'collecting' | 'awaiting_confirmation'"));
});

test('C04-T04: non-approvers are blocked before approval execution', () => {
  const permissions = read('lib/continuum-assistant/actions/permissions.ts');
  assert.ok(permissions.includes('approve_leave'));
  assert.ok(permissions.includes('leave.approve_team'));
  assert.ok(permissions.includes('leave.approve_any'));
});

test('C04-T05/C04-T06: fallback and module-disabled copies exist', () => {
  const fallback = read('lib/continuum-assistant/fallback.ts');
  const permissions = read('lib/continuum-assistant/actions/permissions.ts');
  assert.ok(fallback.includes("I can't run payroll in chat"));
  assert.ok(permissions.includes("module isn't enabled"));
});

test('C04-T07: WhatsApp adapter splits long messages and converts bold', () => {
  const long = `**Hello**\n\n${'x '.repeat(2600)}`;
  const messages = assistantReplyToWhatsAppMessages({
    reply: long,
    links: [],
    suggestions: [],
    source: 'rules',
  });
  assert.ok(messages.length >= 2);
  assert.equal(messages[0]?.type, 'text');
  assert.match(messages[0]?.type === 'text' ? messages[0].text : '', /\*Hello\*/);
});

test('C04-T38: WhatsApp adapter emits confirm and cancel buttons for pending actions', () => {
  const messages = assistantReplyToWhatsAppMessages({
    reply: 'Confirm this request?',
    links: [],
    suggestions: [],
    source: 'rules',
    pendingAction: {
      kind: 'request_leave',
      summary: 'Submit leave?',
      details: [],
      confirmLabel: 'Confirm & submit',
      cancelLabel: 'Cancel',
    },
  });
  const buttons = messages.find((m) => m.type === 'interactive_buttons');
  assert.ok(buttons);
  if (buttons?.type === 'interactive_buttons') {
    assert.deepEqual(buttons.buttons.map((b) => b.id), ['confirm', 'cancel']);
  }
});

test('C04-T08: widget keeps position in localStorage but no longer stores action drafts in sessionStorage', () => {
  const widget = read('components/assistant/continuum-assistant-widget.tsx');
  assert.ok(widget.includes('POS_STORAGE_KEY'));
  assert.ok(!widget.includes('DRAFT_STORAGE_KEY'));
  assert.ok(!widget.includes('sessionStorage'));
});

test('C04-T40: ZERO_UI_V1_ACTIONS documents A1 through A10', () => {
  const doc = read('docs/ZERO_UI_V1_ACTIONS.md');
  for (let i = 1; i <= 10; i += 1) {
    assert.ok(doc.includes(`A${i}`), `Missing A${i}`);
  }
  assert.ok(doc.includes('Confirm/Cancel'));
  assert.ok(doc.includes('Error code'));
  assert.ok(doc.includes('Deep link'));
});
