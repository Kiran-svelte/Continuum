import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, it } from 'node:test';

function read(path: string): string {
  return readFileSync(resolve(process.cwd(), path), 'utf8');
}

describe('PRODERR-20260702 production console remediation', () => {
  it('allows Cloudflare Insights in every active CSP source', () => {
    for (const file of ['middleware.ts', 'next.config.ts', 'lib/production-security/security-headers.ts']) {
      const content = read(file);
      assert.match(content, /https:\/\/static\.cloudflareinsights\.com/, `${file} should allow the Cloudflare beacon script`);
      assert.match(content, /https:\/\/cloudflareinsights\.com/, `${file} should allow Cloudflare beacon collection`);
    }
  });

  it('ships the icon files referenced by metadata and manifest', () => {
    for (const file of [
      'public/favicon.ico',
      'public/icon.svg',
      'public/icon.png',
      'public/apple-icon.png',
      'public/apple-touch-icon.png',
      'public/og-image.png',
    ]) {
      const fullPath = resolve(process.cwd(), file);
      assert.ok(existsSync(fullPath), `${file} should exist`);
      assert.ok(statSync(fullPath).size > 100, `${file} should not be empty`);
    }
  });

  it('does not bootstrap protected auth on public auth pages', () => {
    const provider = read('components/auth/auth-provider.tsx');
    assert.match(provider, /shouldBootstrapAuth/);
    assert.match(provider, /\/forgot-password/);
    assert.match(provider, /\/reset-password/);
    assert.match(provider, /\/sign-in/);
  });

  it('keeps password reset request behavior neutral in production', () => {
    const forgotRoute = read('app/api/auth/forgot-password/route.ts');
    const forgotPage = read('app/(auth)/forgot-password/page.tsx');
    assert.match(forgotRoute, /neutralMessage/);
    assert.match(forgotRoute, /process\.env\.NODE_ENV === 'production'/);
    assert.match(forgotRoute, /reset_link/);
    assert.match(forgotPage, /If an account exists for that email/);
  });

  it('supports token-only reset-password clients', () => {
    const resetRoute = read('app/api/auth/reset-password/route.ts');
    assert.match(resetRoute, /email: z\.string\(\)\.email\(\)\.optional\(\)/);
    assert.match(resetRoute, /let targetEmail = resetRecord\?\.email\.toLowerCase\(\) \?\? null/);
    assert.match(resetRoute, /verifyPasswordResetToken\(token\)/);
  });

  it('uses platform-safe audit logging for super-admin company actions', () => {
    for (const file of [
      'app/api/super-admin/companies/route.ts',
      'app/api/super-admin/companies/[id]/route.ts',
      'app/api/super-admin/companies/[id]/modules/route.ts',
      'app/api/super-admin/companies/[id]/subscription/route.ts',
      'app/api/super-admin/companies/[id]/resend-credentials/route.ts',
    ]) {
      const content = read(file);
      assert.match(content, /createSuperAdminAuditLog/, `${file} should use the platform audit helper`);
      assert.doesNotMatch(content, /actorId:\s*currentUser\.id/, `${file} should not write SuperAdmin.id to AuditLog.actor_id`);
    }
  });

  it('includes the UserInvite module_cap migration and avoids unsupported company domain writes', () => {
    assert.ok(
      existsSync(resolve(process.cwd(), 'prisma/migrations/20260701120000_invite_module_cap/migration.sql')),
      'module_cap migration should be present'
    );
    const companyDetailRoute = read('app/api/super-admin/companies/[id]/route.ts');
    assert.doesNotMatch(companyDetailRoute, /\{\s*domain\s*\}/, 'Company route should not write a non-schema domain field');
    assert.match(companyDetailRoute, /legalName: company\.legalName/);
  });
});
