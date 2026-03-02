import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  DEFAULT_CONSTRAINT_RULES,
  generateConstraintRules,
  getRuleById,
  getRulesByCategory,
} from '@/lib/constraint-rules-config';
import type { ConstraintRuleConfig } from '@/lib/constraint-rules-config';
import { LEAVE_TYPE_CATALOG } from '@/lib/leave-types-config';

describe('DEFAULT_CONSTRAINT_RULES', () => {
  it('has 13 rules defined', () => {
    assert.strictEqual(DEFAULT_CONSTRAINT_RULES.length, 13);
  });

  it('rules are numbered RULE001 through RULE013', () => {
    for (let i = 1; i <= 13; i++) {
      const ruleId = `RULE${String(i).padStart(3, '0')}`;
      const rule = DEFAULT_CONSTRAINT_RULES.find((r) => r.rule_id === ruleId);
      assert.ok(rule, `Missing rule: ${ruleId}`);
    }
  });

  it('each rule has required fields: rule_id, name, category, is_blocking', () => {
    for (const rule of DEFAULT_CONSTRAINT_RULES) {
      assert.ok(rule.rule_id, `Missing rule_id`);
      assert.ok(rule.name, `Missing name for ${rule.rule_id}`);
      assert.ok(rule.category, `Missing category for ${rule.rule_id}`);
      assert.ok(typeof rule.is_blocking === 'boolean', `is_blocking should be boolean for ${rule.rule_id}`);
    }
  });

  it('each rule has description, priority, and config', () => {
    for (const rule of DEFAULT_CONSTRAINT_RULES) {
      assert.ok(rule.description, `Missing description for ${rule.rule_id}`);
      assert.ok(typeof rule.priority === 'number', `Missing priority for ${rule.rule_id}`);
      assert.ok(typeof rule.config === 'object', `Missing config for ${rule.rule_id}`);
    }
  });
});

describe('Blocking rules', () => {
  const blockingRuleIds = [
    'RULE001', 'RULE002', 'RULE003', 'RULE004', 'RULE005',
    'RULE008', 'RULE010', 'RULE011', 'RULE013',
  ];

  it('blocking rules are correctly marked', () => {
    for (const ruleId of blockingRuleIds) {
      const rule = getRuleById(ruleId);
      assert.ok(rule, `Rule ${ruleId} not found`);
      assert.strictEqual(rule.is_blocking, true, `${ruleId} should be blocking`);
    }
  });
});

describe('Warning-only (non-blocking) rules', () => {
  const warningRuleIds = ['RULE006', 'RULE007', 'RULE009', 'RULE012'];

  it('warning rules are not blocking', () => {
    for (const ruleId of warningRuleIds) {
      const rule = getRuleById(ruleId);
      assert.ok(rule, `Rule ${ruleId} not found`);
      assert.strictEqual(rule.is_blocking, false, `${ruleId} should not be blocking`);
    }
  });

  it('exactly 4 warning-only rules exist', () => {
    const nonBlocking = DEFAULT_CONSTRAINT_RULES.filter((r) => !r.is_blocking);
    assert.strictEqual(nonBlocking.length, 4);
  });
});

describe('getRuleById', () => {
  it('finds RULE001', () => {
    const rule = getRuleById('RULE001');
    assert.ok(rule);
    assert.strictEqual(rule.name, 'Max Leave Duration');
  });

  it('returns undefined for unknown rule', () => {
    assert.strictEqual(getRuleById('RULE999'), undefined);
  });
});

describe('getRulesByCategory', () => {
  it('returns validation rules', () => {
    const rules = getRulesByCategory('validation');
    assert.ok(rules.length > 0);
    for (const rule of rules) {
      assert.strictEqual(rule.category, 'validation');
    }
  });

  it('returns business rules', () => {
    const rules = getRulesByCategory('business');
    assert.ok(rules.length > 0);
    for (const rule of rules) {
      assert.strictEqual(rule.category, 'business');
    }
  });

  it('returns compliance rules', () => {
    const rules = getRulesByCategory('compliance');
    assert.ok(rules.length > 0);
    for (const rule of rules) {
      assert.strictEqual(rule.category, 'compliance');
    }
  });
});

describe('generateConstraintRules', () => {
  it('generates rules from leave types', () => {
    const rules = generateConstraintRules(LEAVE_TYPE_CATALOG);
    assert.strictEqual(rules.length, 13);
  });

  it('customizes RULE001 max_days based on leave types', () => {
    const subset = LEAVE_TYPE_CATALOG.filter((lt) => ['CL', 'SL'].includes(lt.code));
    const rules = generateConstraintRules(subset);
    const rule001 = rules.find((r) => r.rule_id === 'RULE001');
    assert.ok(rule001);
    const maxDays = rule001.config.max_days as Record<string, number>;
    assert.ok('CL' in maxDays);
    assert.ok('SL' in maxDays);
    assert.ok(!('PL' in maxDays));
  });

  it('customizes RULE002 allow_negative from company config', () => {
    const rules = generateConstraintRules(LEAVE_TYPE_CATALOG, {
      negative_balance: true,
    });
    const rule002 = rules.find((r) => r.rule_id === 'RULE002');
    assert.ok(rule002);
    assert.strictEqual(rule002.config.allow_negative, true);
  });

  it('customizes RULE010 probation from company config', () => {
    const rules = generateConstraintRules(LEAVE_TYPE_CATALOG, {
      probation_period_days: 90,
    });
    const rule010 = rules.find((r) => r.rule_id === 'RULE010');
    assert.ok(rule010);
    assert.strictEqual(rule010.config.probation_months, 3);
  });

  it('does not mutate original DEFAULT_CONSTRAINT_RULES', () => {
    const originalRule002 = DEFAULT_CONSTRAINT_RULES.find((r) => r.rule_id === 'RULE002');
    generateConstraintRules(LEAVE_TYPE_CATALOG, { negative_balance: true });
    assert.strictEqual(originalRule002!.config.allow_negative, false);
  });
});
