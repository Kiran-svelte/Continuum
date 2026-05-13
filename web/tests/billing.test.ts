import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getRecommendedPlan } from '../lib/billing/plans.ts';

describe('getRecommendedPlan', () => {
  it('returns free for 0 employees', () => {
    assert.strictEqual(getRecommendedPlan(0), 'free');
  });

  it('returns free for 10 employees (boundary)', () => {
    assert.strictEqual(getRecommendedPlan(10), 'free');
  });

  it('returns starter for 11 employees (boundary)', () => {
    assert.strictEqual(getRecommendedPlan(11), 'starter');
  });

  it('returns starter for 50 employees (boundary)', () => {
    assert.strictEqual(getRecommendedPlan(50), 'starter');
  });

  it('returns growth for 51 employees (boundary)', () => {
    assert.strictEqual(getRecommendedPlan(51), 'growth');
  });

  it('returns growth for 200 employees (boundary)', () => {
    assert.strictEqual(getRecommendedPlan(200), 'growth');
  });

  it('returns enterprise for 201 employees (boundary)', () => {
    assert.strictEqual(getRecommendedPlan(201), 'enterprise');
  });

  it('returns enterprise for 1000 employees', () => {
    assert.strictEqual(getRecommendedPlan(1000), 'enterprise');
  });
});
