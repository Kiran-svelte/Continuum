/**
 * Tests for Layer 2-5 implementations:
 * - Pro-rata leave balance calculation (mid-year join)
 * - Notification template config completeness
 * - Leave accrual logic
 * - Year-end carry-forward logic
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { DEFAULT_NOTIFICATION_TEMPLATES } from '@/lib/notification-templates-config';

// ─── Pro-rata helpers (mirror of /api/auth/join) ─────────────────────────────

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function computeProRatedQuota(annualQuota: number, joinDate: Date, paid: boolean): number {
  if (!paid || annualQuota === 0) return annualQuota;

  const year = joinDate.getFullYear();
  const joinDay = new Date(year, joinDate.getMonth(), joinDate.getDate());
  const yearEnd = new Date(year, 11, 31);
  const totalDaysInYear = 365 + (isLeapYear(year) ? 1 : 0);
  const remainingDays =
    Math.round((yearEnd.getTime() - joinDay.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  const ratio = remainingDays / totalDaysInYear;
  const raw = annualQuota * ratio;
  const rounded = Math.ceil(raw * 2) / 2;
  return Math.max(1, rounded);
}

// ─── Pro-rata tests ──────────────────────────────────────────────────────────

describe('computeProRatedQuota', () => {
  it('returns full quota when joining on Jan 1', () => {
    const joinDate = new Date(2025, 0, 1); // Jan 1 2025
    const result = computeProRatedQuota(12, joinDate, true);
    // Should be very close to 12 (exactly 12 after rounding)
    assert.strictEqual(result, 12);
  });

  it('returns approximately half quota when joining on Jul 1', () => {
    const joinDate = new Date(2025, 6, 1); // Jul 1 2025
    const result = computeProRatedQuota(12, joinDate, true);
    // Remaining days: Jul 1 to Dec 31 = ~184 days out of 365 ≈ 50.4%
    // 12 × 0.504 = 6.05 → ceil to nearest 0.5 → 6.5
    assert.ok(result >= 5.5 && result <= 7, `Expected ~6 days, got ${result}`);
  });

  it('returns minimum 1 day even for very late joins', () => {
    const joinDate = new Date(2025, 11, 30); // Dec 30 2025
    const result = computeProRatedQuota(12, joinDate, true);
    assert.ok(result >= 1, `Expected at least 1, got ${result}`);
  });

  it('returns full quota for unpaid (LWP) leave types regardless of join date', () => {
    const joinDate = new Date(2025, 6, 1); // Mid-year
    const result = computeProRatedQuota(30, joinDate, false);
    assert.strictEqual(result, 30, 'Unpaid leave should never be pro-rated');
  });

  it('returns 0 when annual quota is 0', () => {
    const joinDate = new Date(2025, 6, 1);
    const result = computeProRatedQuota(0, joinDate, true);
    assert.strictEqual(result, 0);
  });

  it('rounds to nearest 0.5 day', () => {
    // Verify result is always a multiple of 0.5
    const testDates = [
      new Date(2025, 1, 15),  // Feb 15
      new Date(2025, 4, 20),  // May 20
      new Date(2025, 8, 10),  // Sep 10
      new Date(2025, 10, 25), // Nov 25
    ];
    for (const date of testDates) {
      const result = computeProRatedQuota(15, date, true);
      assert.strictEqual(result % 0.5, 0, `${result} is not a multiple of 0.5`);
    }
  });

  it('pro-rated value does not exceed annual quota', () => {
    const testDates = [
      new Date(2025, 0, 1),
      new Date(2025, 3, 1),
      new Date(2025, 6, 1),
      new Date(2025, 9, 1),
      new Date(2025, 11, 1),
    ];
    for (const date of testDates) {
      const result = computeProRatedQuota(12, date, true);
      assert.ok(
        result <= 12,
        `Pro-rated quota ${result} exceeds annual quota 12 for join date ${date.toISOString()}`
      );
    }
  });
});

// ─── Notification template config tests ──────────────────────────────────────

describe('DEFAULT_NOTIFICATION_TEMPLATES', () => {
  it('has templates defined', () => {
    assert.ok(
      DEFAULT_NOTIFICATION_TEMPLATES.length > 0,
      'Should have at least one notification template'
    );
  });

  it('every template has required fields: event, channel, subject, body', () => {
    for (const t of DEFAULT_NOTIFICATION_TEMPLATES) {
      assert.ok(t.event && t.event.length > 0, 'Template missing event');
      assert.ok(t.channel && t.channel.length > 0, 'Template missing channel');
      assert.ok(t.subject && t.subject.length > 0, `Template ${t.event} missing subject`);
      assert.ok(t.body && t.body.length > 0, `Template ${t.event} missing body`);
    }
  });

  it('channel values are valid (email | push | in_app)', () => {
    const validChannels = new Set(['email', 'push', 'in_app']);
    for (const t of DEFAULT_NOTIFICATION_TEMPLATES) {
      assert.ok(
        validChannels.has(t.channel),
        `Template ${t.event} has invalid channel: ${t.channel}`
      );
    }
  });

  it('covers the core leave lifecycle events', () => {
    const events = new Set(DEFAULT_NOTIFICATION_TEMPLATES.map((t) => t.event));
    const requiredEvents = [
      'LEAVE_SUBMITTED',
      'LEAVE_APPROVED',
      'LEAVE_REJECTED',
      'LEAVE_CANCELLED',
      'LEAVE_SLA_BREACH',
      'LEAVE_PENDING_MANAGER',
    ];
    for (const event of requiredEvents) {
      assert.ok(events.has(event), `Missing templates for event: ${event}`);
    }
  });

  it('covers employee registration lifecycle events', () => {
    const events = new Set(DEFAULT_NOTIFICATION_TEMPLATES.map((t) => t.event));
    assert.ok(events.has('EMPLOYEE_REGISTRATION_PENDING'), 'Missing EMPLOYEE_REGISTRATION_PENDING');
    assert.ok(events.has('EMPLOYEE_REGISTRATION_APPROVED'), 'Missing EMPLOYEE_REGISTRATION_APPROVED');
  });

  it('has at least one email template per core event', () => {
    const emailEvents = new Set(
      DEFAULT_NOTIFICATION_TEMPLATES.filter((t) => t.channel === 'email').map((t) => t.event)
    );
    const coreEvents = ['LEAVE_SUBMITTED', 'LEAVE_APPROVED', 'LEAVE_REJECTED', 'LEAVE_SLA_BREACH'];
    for (const event of coreEvents) {
      assert.ok(emailEvents.has(event), `Missing email template for event: ${event}`);
    }
  });

  it('all template bodies contain at least one placeholder variable', () => {
    for (const t of DEFAULT_NOTIFICATION_TEMPLATES) {
      const hasPlaceholder = /\{\{[a-z_]+\}\}/.test(t.body);
      assert.ok(
        hasPlaceholder,
        `Template ${t.event}/${t.channel} body has no placeholder variables`
      );
    }
  });

  it('no duplicate event+channel combinations', () => {
    const seen = new Set<string>();
    for (const t of DEFAULT_NOTIFICATION_TEMPLATES) {
      const key = `${t.event}:${t.channel}`;
      assert.ok(!seen.has(key), `Duplicate template: ${key}`);
      seen.add(key);
    }
  });
});

// ─── Carry-forward cap logic ─────────────────────────────────────────────────

describe('Year-end carry-forward cap logic', () => {
  function computeCarryForward(
    remaining: number,
    pendingDays: number,
    carryForward: boolean,
    maxCarryForward: number
  ): number {
    if (!carryForward) return 0;
    const effectiveRemaining = Math.max(0, remaining - pendingDays);
    return Math.min(effectiveRemaining, maxCarryForward);
  }

  it('caps carry-forward at maxCarryForward', () => {
    const result = computeCarryForward(20, 0, true, 15);
    assert.strictEqual(result, 15, 'Should be capped at maxCarryForward=15');
  });

  it('returns 0 when carry_forward is disabled', () => {
    const result = computeCarryForward(20, 0, false, 15);
    assert.strictEqual(result, 0);
  });

  it('subtracts pending days before computing carry-forward', () => {
    // 10 remaining, 4 pending → effective 6, capped at 10 → 6
    const result = computeCarryForward(10, 4, true, 10);
    assert.strictEqual(result, 6);
  });

  it('returns 0 when pending days exceed remaining', () => {
    const result = computeCarryForward(3, 5, true, 10);
    assert.strictEqual(result, 0);
  });

  it('returns 0 when remaining is 0', () => {
    const result = computeCarryForward(0, 0, true, 10);
    assert.strictEqual(result, 0);
  });
});

// ─── Monthly accrual rounding ─────────────────────────────────────────────────

describe('Leave accrual monthly rounding', () => {
  function roundToHalfDay(value: number): number {
    return Math.round(value * 2) / 2;
  }

  function monthlyAccrual(annualEntitlement: number): number {
    return roundToHalfDay(annualEntitlement / 12);
  }

  it('accrues 1.5 days/month for 15-day annual entitlement (EL/PL)', () => {
    // 15 / 12 = 1.25 → Math.round(1.25 × 2) / 2 = Math.round(2.5) / 2 = 3 / 2 = 1.5
    assert.strictEqual(monthlyAccrual(15), 1.5);
  });

  it('accrues 1 day/month for 12-day annual entitlement (CL/SL)', () => {
    assert.strictEqual(monthlyAccrual(12), 1);
  });

  it('result is always a multiple of 0.5', () => {
    for (let quota = 1; quota <= 30; quota++) {
      const result = monthlyAccrual(quota);
      assert.strictEqual(result % 0.5, 0, `monthlyAccrual(${quota})=${result} not multiple of 0.5`);
    }
  });

  it('returns 0 for 0 annual entitlement', () => {
    assert.strictEqual(monthlyAccrual(0), 0);
  });
});
