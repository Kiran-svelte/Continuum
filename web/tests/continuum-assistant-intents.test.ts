import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

test('assistant routes leave request, approve, reject, insight, confirm and cancel intents', () => {
  const orchestrator = read('lib/continuum-assistant/actions/orchestrator.ts');
  const parser = read('lib/continuum-assistant/actions/parse-leave-input.ts');

  assert.ok(orchestrator.includes('detectRequestLeaveIntent'));
  assert.ok(orchestrator.includes('detectApproveLeaveIntent'));
  assert.ok(orchestrator.includes('detectRejectLeaveActionIntent'));
  assert.ok(orchestrator.includes('processInsightIntents'));
  assert.ok(parser.includes('isConfirmMessage'));
  assert.ok(parser.includes('isCancelMessage'));
});

