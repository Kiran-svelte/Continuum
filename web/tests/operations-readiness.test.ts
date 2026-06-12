import { describe, it } from 'node:test';
import assert from 'node:assert';
import { OPERATIONS_CATEGORIES } from '@/lib/operations-readiness/catalog';
import { evaluateOperationsReadiness } from '@/lib/operations-readiness/evaluate';

describe('operations-readiness catalog', () => {
  it('defines exactly 20 categories', () => {
    assert.strictEqual(OPERATIONS_CATEGORIES.length, 20);
    const ids = OPERATIONS_CATEGORIES.map((c) => c.id).sort((a, b) => a - b);
    assert.deepStrictEqual(ids, Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it('has 10 critical tiers', () => {
    const critical = OPERATIONS_CATEGORIES.filter((c) => c.tier === 'critical');
    assert.strictEqual(critical.length, 10);
  });
});

describe('evaluateOperationsReadiness', () => {
  it('returns a report with all categories', async () => {
    const report = await evaluateOperationsReadiness();
    assert.strictEqual(report.categories.length, 20);
    assert.ok(['complete', 'partial', 'missing'].includes(report.overall));
    assert.strictEqual(
      report.summary.complete + report.summary.partial + report.summary.missing + report.summary.platform,
      20,
    );
  });

  it('marks security and rate limiting as complete in codebase', async () => {
    const report = await evaluateOperationsReadiness();
    const security = report.categories.find((c) => c.id === 6);
    const rateLimit = report.categories.find((c) => c.id === 9);
    assert.strictEqual(security?.status, 'complete');
    assert.strictEqual(rateLimit?.status, 'complete');
  });

  it('marks Vercel scaling categories as platform', async () => {
    const report = await evaluateOperationsReadiness();
    for (const id of [16, 17, 19]) {
      const row = report.categories.find((c) => c.id === id);
      assert.strictEqual(row?.status, 'platform', `expected platform for #${id}`);
    }
  });
});
