import assert from 'node:assert/strict';
import test from 'node:test';
import { findNavMiddlewareGaps } from '@/lib/navigation/middleware-nav-coverage';
import { moduleSlugForPortalPath } from '@/lib/middleware-module-paths';

test('portal nav module hrefs are covered by middleware prefix rules', () => {
  const gaps = findNavMiddlewareGaps();
  assert.deepEqual(
    gaps,
    [],
    gaps.length
      ? `Uncovered nav paths:\n${gaps
          .map(
            (gap) =>
              `  ${gap.href} expects ${gap.expectedSlug}, middleware resolved ${String(gap.resolvedSlug)}`
          )
          .join('\n')}`
      : undefined
  );
});

test('critical leave workflow paths resolve to leave module', () => {
  assert.equal(moduleSlugForPortalPath('/hr/approvals'), 'leave');
  assert.equal(moduleSlugForPortalPath('/manager/approvals'), 'leave');
  assert.equal(moduleSlugForPortalPath('/hr/policy-settings'), 'leave');
  assert.equal(moduleSlugForPortalPath('/hr/employees'), 'employees');
  assert.equal(moduleSlugForPortalPath('/manager/team'), 'employees');
});
