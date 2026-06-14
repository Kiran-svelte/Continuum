import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePortalLegacyRedirect } from '@/lib/portal-legacy-redirects';

test('legacy manager people list redirects to my team', () => {
  assert.equal(resolvePortalLegacyRedirect('/manager/people'), '/manager/team');
});

test('legacy redirect preserves invite sub-route', () => {
  assert.equal(resolvePortalLegacyRedirect('/manager/people/invite'), null);
});
