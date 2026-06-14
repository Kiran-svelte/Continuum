import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';
import { ADMIN_NAV_ITEMS } from '@/lib/navigation/portal-nav';

async function readWorkspaceFile(relativePathFromTests: string): Promise<string> {
  const fs = await import('node:fs');
  const filePath = fileURLToPath(new URL(relativePathFromTests, import.meta.url));
  return fs.readFileSync(filePath, 'utf-8');
}

describe('RBAC Effectiveness Hardening', () => {
  it('admin settings navigation should stay in admin scope (not hr settings)', async () => {
    const layout = await readWorkspaceFile('../app/admin/(main)/layout.tsx');
    const settingsHref = ADMIN_NAV_ITEMS.find((item) => item.label === 'Company Settings')?.href;

    assert.ok(settingsHref === '/admin/company-settings');
    assert.ok(!ADMIN_NAV_ITEMS.some((item) => item.href === '/hr/settings'));
    assert.ok(!layout.includes("href: '/hr/settings'"));
  });
});
