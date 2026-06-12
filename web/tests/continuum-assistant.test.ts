import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { answerWithKnowledge, buildNavHintsForRole } from '@/lib/continuum-assistant/knowledge';
import type { AssistantContext } from '@/lib/continuum-assistant/types';

function makeContext(overrides: Partial<AssistantContext> = {}): AssistantContext {
  const navHints = buildNavHintsForRole('employee', ['leave', 'payroll', 'employees']);
  return {
    employeeId: 'emp-1',
    companyId: 'co-1',
    companyName: 'Acme Corp',
    role: 'employee',
    portalSlug: 'employee',
    displayName: 'Alex Employee',
    enabledModules: ['leave', 'payroll'],
    navHints,
    ...overrides,
  };
}

describe('continuum assistant knowledge', () => {
  it('answers leave balance questions with links', () => {
    const ctx = makeContext();
    const result = answerWithKnowledge('What is my leave balance?', ctx);
    assert.notEqual(result, null);
    assert.ok(result!.reply.toLowerCase().includes('balance'));
    assert.ok(result!.links.some((l) => l.href.includes('request-leave')));
  });

  it('answers where-to-find navigation', () => {
    const ctx = makeContext();
    const result = answerWithKnowledge('Where do I request leave?', ctx);
    assert.notEqual(result, null);
    assert.ok((result!.links.length ?? 0) > 0);
  });

  it('gives admin setup hints for admin role', () => {
    const navHints = buildNavHintsForRole('admin', ['leave', 'employees']);
    const ctx = makeContext({
      role: 'admin',
      portalSlug: 'admin',
      navHints,
    });
    const result = answerWithKnowledge('How do I finish company setup?', ctx);
    assert.notEqual(result, null);
    assert.match(result!.reply.toLowerCase(), /setup|getting started|organization/);
  });
});
