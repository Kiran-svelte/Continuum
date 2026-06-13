import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  answerPersonalLeaveQuery,
  isPersonalDataQuery,
  isTeamDataQuery,
  type AssistantPersonalSnapshot,
} from '@/lib/continuum-assistant/personal-snapshot';
import type { AssistantContext } from '@/lib/continuum-assistant/types';

const snapshot: AssistantPersonalSnapshot = {
  year: 2026,
  pendingLeaveRequests: 1,
  leaveBalances: [
    {
      leaveType: 'sick',
      displayName: 'Sick Leave',
      available: 5,
      used: 2,
      pending: 1,
      entitlement: 8,
      carriedForward: 0,
    },
    {
      leaveType: 'casual',
      displayName: 'Casual Leave',
      available: 10,
      used: 0,
      pending: 0,
      entitlement: 12,
      carriedForward: 0,
    },
  ],
};

const ctx: AssistantContext = {
  employeeId: 'emp-1',
  companyId: 'co-1',
  companyName: 'Acme',
  role: 'employee',
  portalSlug: 'employee',
  displayName: 'Alex',
  enabledModules: ['leave'],
  navHints: [],
};

describe('continuum assistant personal queries', () => {
  it('detects personal balance questions', () => {
    assert.equal(isPersonalDataQuery('How many sick leave days do I have left?'), true);
    assert.equal(isPersonalDataQuery('What is my leave balance?'), true);
  });

  it('rejects team balance questions as personal', () => {
    assert.equal(isTeamDataQuery("What is John's sick leave balance?"), true);
    assert.equal(isPersonalDataQuery("What is John's sick leave balance?"), false);
  });

  it('answers sick leave with scoped numbers', () => {
    const result = answerPersonalLeaveQuery('How many sick leave days remaining?', snapshot, ctx);
    assert.ok(result?.reply.includes('5'));
    assert.ok(result?.reply.includes('Sick Leave'));
  });
});
