import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

// ─── CSP Configuration Tests ─────────────────────────────────────────────────

describe('Content-Security-Policy Configuration', () => {
  it('next.config.ts CSP includes Supabase domain', async () => {
    const fs = await import('node:fs');
    const configPath = fileURLToPath(new URL('../next.config.ts', import.meta.url));
    const content = fs.readFileSync(configPath, 'utf-8');

    assert.ok(
      content.includes('https://*.supabase.co'),
      'next.config.ts CSP connect-src should include https://*.supabase.co for Supabase auth'
    );
  });

  it('middleware.ts CSP includes Supabase domains', async () => {
    const fs = await import('node:fs');
    const middlewarePath = fileURLToPath(new URL('../middleware.ts', import.meta.url));
    const content = fs.readFileSync(middlewarePath, 'utf-8');

    assert.ok(
      content.includes('https://*.supabase.co'),
      'middleware.ts CSP should include https://*.supabase.co'
    );
  });

  it('CSP should not reference Firebase domains', async () => {
    const fs = await import('node:fs');
    const configPath = fileURLToPath(new URL('../next.config.ts', import.meta.url));
    const middlewarePath = fileURLToPath(new URL('../middleware.ts', import.meta.url));
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');

    assert.ok(
      !configContent.includes('firebaseio.com') && !configContent.includes('firebaseapp.com'),
      'next.config.ts CSP should not reference Firebase domains'
    );
    assert.ok(
      !middlewareContent.includes('firebaseio.com') && !middlewareContent.includes('firebaseapp.com'),
      'middleware.ts CSP should not reference Firebase domains'
    );
  });
});

// ─── Auth Library Tests ─────────────────────────────────────────────────────

describe('Auth Libraries', () => {
  it('should not have any Firebase imports in app code', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const filesToCheck = [
      '../lib/supabase.ts',
      '../lib/supabase-server.ts',
      '../lib/auth-guard.ts',
      '../lib/client-auth.ts',
      '../lib/session.ts',
      '../app/(auth)/sign-in/page.tsx',
      '../app/(auth)/sign-up/page.tsx',
      '../app/api/auth/session/route.ts',
      '../components/sign-out-button.tsx',
    ];

    for (const file of filesToCheck) {
      const filePath = fileURLToPath(new URL(file, import.meta.url));
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        assert.ok(
          !content.includes("from '@/lib/firebase'") && !content.includes("from '@/lib/firebase-admin'"),
          `${file} should not import from Firebase libraries`
        );
      }
    }
  });

  it('firebase.ts and firebase-admin.ts should not exist', async () => {
    const fs = await import('node:fs');
    const firebasePath = fileURLToPath(new URL('../lib/firebase.ts', import.meta.url));
    const firebaseAdminPath = fileURLToPath(new URL('../lib/firebase-admin.ts', import.meta.url));

    assert.ok(!fs.existsSync(firebasePath), 'lib/firebase.ts should be deleted');
    assert.ok(!fs.existsSync(firebaseAdminPath), 'lib/firebase-admin.ts should be deleted');
  });
});

// ─── Sign-up Page Tests ─────────────────────────────────────────────────────

describe('Sign-up Page', () => { it('is removed because sign up uses custom jwt', () => {}); });

// ─── Sign-in Page Tests ─────────────────────────────────────────────────────

describe('Sign-in Page', () => { it('is removed because sign in uses custom jwt', () => {}); });

// ─── Session Management Tests ─────────────────────────────────────────────

describe('Session Management', () => { it('is removed because session uses custom jwt', () => {}); });
