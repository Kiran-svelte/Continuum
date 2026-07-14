import assert from 'node:assert/strict';
import test from 'node:test';
import { findNavMiddlewareGaps } from '@/lib/navigation/middleware-nav-coverage';
import { isPortalPathAllowedByModules, moduleSlugForPortalPath } from '@/lib/middleware-module-paths';

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

test('employees module paths stay reachable when cookie omits employees slug', () => {
  const enabled = new Set(['leave', 'attendance']);
  assert.equal(isPortalPathAllowedByModules('/manager/team', enabled), true);
  assert.equal(isPortalPathAllowedByModules('/manager/org-chart', enabled), true);
  assert.equal(isPortalPathAllowedByModules('/manager/performance', enabled), false);
});

test('directory module paths are gated by the directory module, not treated as always-on employees paths', () => {
  const withoutDirectory = new Set(['leave', 'attendance']);
  const withDirectory = new Set(['leave', 'attendance', 'directory']);
  assert.equal(isPortalPathAllowedByModules('/manager/directory', withoutDirectory), false);
  assert.equal(isPortalPathAllowedByModules('/manager/directory', withDirectory), true);
});
