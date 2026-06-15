import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('assistant widget uses API-returned draft state and does not store action drafts in sessionStorage', () => {
  const widget = read('components/assistant/continuum-assistant-widget.tsx');

  assert.ok(widget.includes('setActionDraft(nextDraft)'));
  assert.ok(widget.includes('data.actionDraft'));
  assert.ok(!widget.includes('sessionStorage'));
});

test('assistant turn processor accepts explicit draft and confirm/cancel command', () => {
  const processTurn = read('lib/continuum-assistant/engine/process-turn.ts');

  assert.ok(processTurn.includes('actionDraft?: AssistantActionDraft | null'));
  assert.ok(processTurn.includes("actionCommand?: 'confirm' | 'cancel'"));
  assert.ok(processTurn.includes('respondAssistantMessage'));
});

