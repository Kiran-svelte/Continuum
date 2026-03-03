/**
 * Tests for dynamic leave engine:
 * - Onboarding schema validation
 * - Settings PATCH schema validation
 * - Policy PATCH schema validation
 * - Auto-approve threshold logic
 * - generateConstraintRules integration with company config
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { z } from 'zod';
import { generateConstraintRules } from '@/lib/constraint-rules-config';
import { LEAVE_TYPE_CATALOG, getLeaveTypeByCode } from '@/lib/leave-types-config';

// ─── Onboarding schema (mirror of API schema) ────────────────────────────────

const blackoutDateSchema = z.object({
  name: z.string().min(1).max(200),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

const onboardingConstraintConfigSchema = z.object({
  min_coverage_percent: z.number().min(0).max(100).optional(),
  max_concurrent: z.number().int().min(1).max(50).optional(),
  blackout_dates: z.array(blackoutDateSchema).optional(),
  auto_approve: z.boolean().optional(),
  auto_approve_threshold: z.number().min(0).max(1).optional(),
});

const settingsPatchSchema = z.object({
  sla_hours: z.number().int().min(1).max(336).optional(),
  negative_balance: z.boolean().optional(),
  probation_period_days: z.number().int().min(0).max(730).optional(),
  auto_approve: z.boolean().optional(),
  auto_approve_threshold: z.number().min(0).max(1).optional(),
  email_notifications: z.boolean().optional(),
});

const policyRuleUpdateSchema = z.object({
  rule_id: z.string().min(1).max(20),
  is_active: z.boolean().optional(),
  is_blocking: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

const policyPatchSchema = z.object({
  rules: z.array(policyRuleUpdateSchema).min(1).max(20),
});

// ─── Onboarding constraint config validation ─────────────────────────────────

describe('Onboarding constraint config schema', () => {
  it('accepts empty config', () => {
    const result = onboardingConstraintConfigSchema.safeParse({});
    assert.strictEqual(result.success, true);
  });

  it('accepts full valid config', () => {
    const result = onboardingConstraintConfigSchema.safeParse({
      min_coverage_percent: 60,
      max_concurrent: 3,
      blackout_dates: [{ name: 'Q4 Freeze', start: '2025-10-01', end: '2025-10-07' }],
      auto_approve: true,
      auto_approve_threshold: 0.9,
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects coverage > 100', () => {
    const result = onboardingConstraintConfigSchema.safeParse({ min_coverage_percent: 110 });
    assert.strictEqual(result.success, false);
  });

  it('rejects coverage < 0', () => {
    const result = onboardingConstraintConfigSchema.safeParse({ min_coverage_percent: -1 });
    assert.strictEqual(result.success, false);
  });

  it('rejects max_concurrent of 0', () => {
    const result = onboardingConstraintConfigSchema.safeParse({ max_concurrent: 0 });
    assert.strictEqual(result.success, false);
  });

  it('rejects auto_approve_threshold > 1', () => {
    const result = onboardingConstraintConfigSchema.safeParse({ auto_approve_threshold: 1.5 });
    assert.strictEqual(result.success, false);
  });

  it('rejects blackout date with invalid format', () => {
    const result = onboardingConstraintConfigSchema.safeParse({
      blackout_dates: [{ name: 'Freeze', start: '01-01-2025', end: '01-07-2025' }],
    });
    assert.strictEqual(result.success, false);
  });

  it('accepts blackout with valid ISO dates', () => {
    const result = onboardingConstraintConfigSchema.safeParse({
      blackout_dates: [{ name: 'Diwali Break', start: '2025-10-20', end: '2025-10-24' }],
    });
    assert.strictEqual(result.success, true);
  });
});

// ─── Settings PATCH schema validation ─────────────────────────────────────────

describe('Settings PATCH schema', () => {
  it('accepts empty patch', () => {
    const result = settingsPatchSchema.safeParse({});
    assert.strictEqual(result.success, true);
  });

  it('accepts valid full patch', () => {
    const result = settingsPatchSchema.safeParse({
      sla_hours: 48,
      negative_balance: false,
      probation_period_days: 180,
      auto_approve: true,
      auto_approve_threshold: 0.9,
      email_notifications: true,
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects sla_hours of 0', () => {
    const result = settingsPatchSchema.safeParse({ sla_hours: 0 });
    assert.strictEqual(result.success, false);
  });

  it('rejects sla_hours exceeding 336 (2 weeks)', () => {
    const result = settingsPatchSchema.safeParse({ sla_hours: 400 });
    assert.strictEqual(result.success, false);
  });

  it('rejects probation_period_days > 730', () => {
    const result = settingsPatchSchema.safeParse({ probation_period_days: 800 });
    assert.strictEqual(result.success, false);
  });

  it('accepts probation_period_days of 0 (no probation)', () => {
    const result = settingsPatchSchema.safeParse({ probation_period_days: 0 });
    assert.strictEqual(result.success, true);
  });

  it('rejects threshold > 1', () => {
    const result = settingsPatchSchema.safeParse({ auto_approve_threshold: 1.1 });
    assert.strictEqual(result.success, false);
  });

  it('accepts threshold of 0.5', () => {
    const result = settingsPatchSchema.safeParse({ auto_approve_threshold: 0.5 });
    assert.strictEqual(result.success, true);
  });
});

// ─── Policy PATCH schema validation ─────────────────────────────────────────

describe('Policy PATCH schema', () => {
  it('accepts single rule update', () => {
    const result = policyPatchSchema.safeParse({
      rules: [{ rule_id: 'RULE003', config: { min_coverage_percent: 70 } }],
    });
    assert.strictEqual(result.success, true);
  });

  it('rejects empty rules array', () => {
    const result = policyPatchSchema.safeParse({ rules: [] });
    assert.strictEqual(result.success, false);
  });

  it('accepts multiple rule updates', () => {
    const result = policyPatchSchema.safeParse({
      rules: [
        { rule_id: 'RULE003', config: { min_coverage_percent: 70 } },
        { rule_id: 'RULE004', config: { max_concurrent: 3 } },
        { rule_id: 'RULE005', is_active: true, config: { blackout_dates: [] } },
      ],
    });
    assert.strictEqual(result.success, true);
  });

  it('accepts is_blocking override', () => {
    const result = policyPatchSchema.safeParse({
      rules: [{ rule_id: 'RULE006', is_blocking: true }],
    });
    assert.strictEqual(result.success, true);
  });

  it('accepts is_active toggle', () => {
    const result = policyPatchSchema.safeParse({
      rules: [{ rule_id: 'RULE011', is_active: false }],
    });
    assert.strictEqual(result.success, true);
  });
});

// ─── Auto-approve threshold logic ────────────────────────────────────────────

describe('Auto-approve threshold logic', () => {
  function shouldAutoApprove(
    enabled: boolean,
    threshold: number,
    confidence: number,
    recommendation: string
  ): boolean {
    return (
      enabled &&
      recommendation === 'APPROVE' &&
      confidence >= threshold
    );
  }

  it('auto-approves when enabled, recommendation APPROVE, confidence above threshold', () => {
    assert.strictEqual(shouldAutoApprove(true, 0.9, 1.0, 'APPROVE'), true);
  });

  it('does not auto-approve when disabled', () => {
    assert.strictEqual(shouldAutoApprove(false, 0.9, 1.0, 'APPROVE'), false);
  });

  it('does not auto-approve when recommendation is REVIEW', () => {
    assert.strictEqual(shouldAutoApprove(true, 0.7, 0.8, 'REVIEW'), false);
  });

  it('does not auto-approve when recommendation is REJECT', () => {
    assert.strictEqual(shouldAutoApprove(true, 0.5, 0.0, 'REJECT'), false);
  });

  it('does not auto-approve when confidence is below threshold', () => {
    assert.strictEqual(shouldAutoApprove(true, 0.9, 0.7, 'APPROVE'), false);
  });

  it('auto-approves when confidence exactly equals threshold', () => {
    assert.strictEqual(shouldAutoApprove(true, 0.9, 0.9, 'APPROVE'), true);
  });

  it('auto-approves with low threshold (0.5)', () => {
    assert.strictEqual(shouldAutoApprove(true, 0.5, 0.6, 'APPROVE'), true);
  });
});

// ─── generateConstraintRules with company config ─────────────────────────────

describe('generateConstraintRules with company config (integration)', () => {
  const selectedTypes = LEAVE_TYPE_CATALOG.filter((lt) => ['CL', 'SL', 'PL', 'ML'].includes(lt.code));

  it('generates 13 rules regardless of company config', () => {
    const rules = generateConstraintRules(selectedTypes, {
      probation_period_days: 90,
      sla_hours: 24,
      negative_balance: true,
    });
    assert.strictEqual(rules.length, 13);
  });

  it('RULE001 only contains selected leave type codes', () => {
    const rules = generateConstraintRules(selectedTypes);
    const rule001 = rules.find((r) => r.rule_id === 'RULE001')!;
    const maxDays = rule001.config.max_days as Record<string, number>;
    const codes = Object.keys(maxDays);
    assert.ok(codes.includes('CL'));
    assert.ok(codes.includes('SL'));
    assert.ok(codes.includes('PL'));
    assert.ok(codes.includes('ML'));
    // Non-selected types should NOT appear
    assert.ok(!codes.includes('EL'));
    assert.ok(!codes.includes('AL'));
  });

  it('RULE002 allow_negative reflects company config', () => {
    const rulesWithNeg = generateConstraintRules(selectedTypes, { negative_balance: true });
    const rule002 = rulesWithNeg.find((r) => r.rule_id === 'RULE002')!;
    assert.strictEqual(rule002.config.allow_negative, true);

    const rulesNoNeg = generateConstraintRules(selectedTypes, { negative_balance: false });
    const rule002b = rulesNoNeg.find((r) => r.rule_id === 'RULE002')!;
    assert.strictEqual(rule002b.config.allow_negative, false);
  });

  it('RULE010 probation_months is derived from probation_period_days', () => {
    const rules90 = generateConstraintRules(selectedTypes, { probation_period_days: 90 });
    const rule010 = rules90.find((r) => r.rule_id === 'RULE010')!;
    assert.strictEqual(rule010.config.probation_months, 3); // ceil(90/30)

    const rules180 = generateConstraintRules(selectedTypes, { probation_period_days: 180 });
    const rule010b = rules180.find((r) => r.rule_id === 'RULE010')!;
    assert.strictEqual(rule010b.config.probation_months, 6); // ceil(180/30)
  });

  it('RULE006 notice_days only contains selected leave type codes', () => {
    const rules = generateConstraintRules(selectedTypes);
    const rule006 = rules.find((r) => r.rule_id === 'RULE006')!;
    const noticeDays = rule006.config.notice_days as Record<string, number>;
    const codes = Object.keys(noticeDays);
    assert.ok(codes.every((c) => ['CL', 'SL', 'PL', 'ML'].includes(c)));
  });

  it('does not mutate DEFAULT_CONSTRAINT_RULES', () => {
    const { DEFAULT_CONSTRAINT_RULES } = require('@/lib/constraint-rules-config');
    const originalRule002Allow = (DEFAULT_CONSTRAINT_RULES.find(
      (r: { rule_id: string; config: Record<string, unknown> }) => r.rule_id === 'RULE002'
    ) as { config: { allow_negative: boolean } }).config.allow_negative;

    generateConstraintRules(selectedTypes, { negative_balance: !originalRule002Allow });

    const afterRule002Allow = (DEFAULT_CONSTRAINT_RULES.find(
      (r: { rule_id: string; config: Record<string, unknown> }) => r.rule_id === 'RULE002'
    ) as { config: { allow_negative: boolean } }).config.allow_negative;

    assert.strictEqual(originalRule002Allow, afterRule002Allow);
  });
});

// ─── Blackout dates runtime merging logic ────────────────────────────────────

describe('Blackout dates config merging', () => {
  function mergeBlackoutConfig(
    existingConfig: Record<string, unknown>,
    newBlackoutDates: Array<{ name: string; start: string; end: string }>
  ): Record<string, unknown> {
    return { ...existingConfig, blackout_dates: newBlackoutDates };
  }

  it('merges blackout dates into existing rule config', () => {
    const existing = { blackout_dates: [], exempt_leave_types: ['SL', 'BL', 'ML'] };
    const newDates = [{ name: 'Q4 Freeze', start: '2025-10-01', end: '2025-10-07' }];
    const merged = mergeBlackoutConfig(existing, newDates);
    assert.deepStrictEqual(merged.blackout_dates, newDates);
    assert.deepStrictEqual(merged.exempt_leave_types, ['SL', 'BL', 'ML']);
  });

  it('preserves exempt_leave_types when adding blackout dates', () => {
    const existing = { blackout_dates: [], exempt_leave_types: ['SL'] };
    const merged = mergeBlackoutConfig(existing, [
      { name: 'Freeze 1', start: '2025-01-01', end: '2025-01-05' },
      { name: 'Freeze 2', start: '2025-06-01', end: '2025-06-07' },
    ]);
    assert.strictEqual((merged.blackout_dates as unknown[]).length, 2);
    assert.deepStrictEqual(merged.exempt_leave_types, ['SL']);
  });

  it('replaces old blackout dates with new ones', () => {
    const existing = {
      blackout_dates: [{ name: 'Old Freeze', start: '2024-01-01', end: '2024-01-07' }],
    };
    const merged = mergeBlackoutConfig(existing, [
      { name: 'New Freeze', start: '2025-10-01', end: '2025-10-07' },
    ]);
    const dates = merged.blackout_dates as Array<{ name: string }>;
    assert.strictEqual(dates.length, 1);
    assert.strictEqual(dates[0].name, 'New Freeze');
  });
});

// ─── Leave type config for getLeaveTypeByCode ────────────────────────────────

describe('getLeaveTypeByCode for onboarding leave type selection', () => {
  it('returns CL config correctly', () => {
    const lt = getLeaveTypeByCode('CL');
    assert.ok(lt);
    assert.strictEqual(lt.code, 'CL');
    assert.strictEqual(lt.defaultQuota, 12);
    assert.strictEqual(lt.paid, true);
  });

  it('returns ML config with 182 days quota', () => {
    const lt = getLeaveTypeByCode('ML');
    assert.ok(lt);
    assert.strictEqual(lt.defaultQuota, 182);
    assert.strictEqual(lt.genderSpecific, 'female');
  });

  it('returns undefined for unknown code', () => {
    const lt = getLeaveTypeByCode('UNKNOWN');
    assert.strictEqual(lt, undefined);
  });

  it('all leave types in catalog have required fields', () => {
    for (const lt of LEAVE_TYPE_CATALOG) {
      assert.ok(lt.code, `Missing code for ${lt.name}`);
      assert.ok(lt.name, `Missing name for ${lt.code}`);
      assert.ok(typeof lt.defaultQuota === 'number', `defaultQuota should be number for ${lt.code}`);
      assert.ok(['all', 'male', 'female'].includes(lt.genderSpecific), `genderSpecific invalid for ${lt.code}`);
      assert.ok(['common', 'statutory', 'special', 'unpaid'].includes(lt.category), `category invalid for ${lt.code}`);
    }
  });
});
