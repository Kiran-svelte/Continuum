import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const MODULE_FILTERED_LAYOUTS = [
  'app/admin/(main)/layout.tsx',
  'app/hr/(main)/layout.tsx',
  'app/manager/(main)/layout.tsx',
  'app/employee/(main)/layout.tsx',
];

const STATIC_PORTAL_LAYOUTS = ['app/super-admin/layout.tsx'];

test('module-filtered portal layouts delegate nav to portal-nav catalog', () => {
  for (const relativePath of MODULE_FILTERED_LAYOUTS) {
    const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');

    assert.equal(
      source.includes("import { ModuleFilteredPortalLayout } from '@/components/module-filtered-portal-layout'"),
      true,
      `${relativePath} should use ModuleFilteredPortalLayout`
    );
    assert.equal(source.includes('navItems:'), false, `${relativePath} should not inline navItems`);
    assert.equal(/icon:\s*[A-Z][A-Za-z0-9_]*/.test(source), false, `${relativePath} should not import Lucide icons for nav`);
  }
});

test('super-admin layout uses static portal shell', () => {
  for (const relativePath of STATIC_PORTAL_LAYOUTS) {
    const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
    assert.equal(
      source.includes("import { StaticPortalLayout } from '@/components/static-portal-layout'"),
      true,
      `${relativePath} should use StaticPortalLayout`
    );
    assert.equal(source.includes('href="/super-admin/'), false, `${relativePath} should not inline nav links`);
  }
});

test('portal-nav catalog uses string icon keys only', () => {
  const source = readFileSync(resolve(process.cwd(), 'lib/navigation/portal-nav.ts'), 'utf8');
  const iconLines = source.split('\n').filter((line) => line.includes("icon: '"));

  assert.equal(iconLines.length > 0, true, 'portal-nav should define nav item icons');
  iconLines.forEach((line) => {
    assert.equal(/icon:\s*'[^']+'/.test(line), true, `portal-nav has invalid icon config: ${line.trim()}`);
  });
});
