import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertValidCompanyTimezone,
  dateKeyToUtcRange,
  getDateKeyInTimeZone,
  normalizeCompanyTimezone,
  parseBoundedInt,
  parseDateKey,
  parseDateOnlyRange,
  resolveOperationalTimezone,
} from '@/lib/api-guards';

describe('api guards', () => {
  it('parses bounded integers with defaults and clamps', () => {
    assert.equal(parseBoundedInt('500', { defaultValue: 20, min: 1, max: 100 }), 100);
    assert.equal(parseBoundedInt('-5', { defaultValue: 20, min: 1, max: 100 }), 1);
    assert.equal(parseBoundedInt('foo', { defaultValue: 20, min: 1, max: 100 }), 20);
  });

  it('accepts only valid date keys', () => {
    assert.equal(parseDateKey('2026-04-05'), '2026-04-05');
    assert.equal(parseDateKey('2026-02-30'), null);
    assert.equal(parseDateKey('05-04-2026'), null);
  });

  it('builds UTC day ranges from date keys', () => {
    const range = dateKeyToUtcRange('2026-04-05');
    assert.equal(range.start.toISOString(), '2026-04-05T00:00:00.000Z');
    assert.equal(range.endExclusive.toISOString(), '2026-04-06T00:00:00.000Z');
  });

  it('returns timezone day key', () => {
    const key = getDateKeyInTimeZone(new Date('2026-04-05T20:30:00.000Z'), 'Asia/Kolkata');
    assert.equal(key, '2026-04-06');
  });

  it('normalizes escaped timezone values before validation', () => {
    const normalized = normalizeCompanyTimezone('&quot;Asia&#x2F;Kolkata&quot;');
    assert.ok(normalized.value === 'Asia/Kolkata' || normalized.value === 'Asia/Calcutta');
    assert.equal(normalized.reason, null);
  });

  it('rejects malformed timezone values for writes', () => {
    assert.throws(() => assertValidCompanyTimezone('Asia<Kolkata'));
    const normalized = normalizeCompanyTimezone('Asia<Kolkata');
    assert.equal(normalized.value, null);
  });

  it('falls back to UTC for malformed legacy timezone reads', () => {
    const resolved = resolveOperationalTimezone('Asia&lt;Kolkata');
    assert.equal(resolved.timezone, 'UTC');
    assert.equal(resolved.fallbackApplied, true);

    const key = getDateKeyInTimeZone(new Date('2026-04-05T20:30:00.000Z'), 'Asia&lt;Kolkata');
    assert.equal(key, '2026-04-05');
  });

  it('parses valid explicit date ranges', () => {
    const range = parseDateOnlyRange({
      startDateRaw: '2026-01-01',
      endDateRaw: '2026-01-31',
      defaultStart: new Date('2026-01-01T00:00:00.000Z'),
      defaultEndExclusive: new Date('2026-02-01T00:00:00.000Z'),
      maxDays: 366,
    });

    assert.equal(range.ok, true);
    if (range.ok) {
      assert.equal(range.start.toISOString(), '2026-01-01T00:00:00.000Z');
      assert.equal(range.endExclusive.toISOString(), '2026-02-01T00:00:00.000Z');
    }
  });

  it('rejects partial date ranges and oversized ranges', () => {
    const partial = parseDateOnlyRange({
      startDateRaw: '2026-01-01',
      endDateRaw: null,
      defaultStart: new Date('2026-01-01T00:00:00.000Z'),
      defaultEndExclusive: new Date('2026-01-02T00:00:00.000Z'),
      maxDays: 30,
    });

    assert.equal(partial.ok, false);

    const oversized = parseDateOnlyRange({
      startDateRaw: '2026-01-01',
      endDateRaw: '2026-03-31',
      defaultStart: new Date('2026-01-01T00:00:00.000Z'),
      defaultEndExclusive: new Date('2026-01-02T00:00:00.000Z'),
      maxDays: 30,
    });

    assert.equal(oversized.ok, false);
  });
});
