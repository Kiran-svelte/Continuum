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

describe('Sign-up Page', () => {
  it('should use Supabase for sign-up', async () => {
    const fs = await import('node:fs');
    const signUpPath = fileURLToPath(new URL('../app/(auth)/sign-up/page.tsx', import.meta.url));
    const content = fs.readFileSync(signUpPath, 'utf-8');

    assert.ok(
      content.includes('supabaseSignUp'),
      'sign-up page should use supabaseSignUp'
    );
    assert.ok(
      !content.includes('firebaseSignUp'),
      'sign-up page should not reference firebaseSignUp'
    );
  });

  it('should have timeout on session fetch', async () => {
    const fs = await import('node:fs');
    const signUpPath = fileURLToPath(new URL('../app/(auth)/sign-up/page.tsx', import.meta.url));
    const content = fs.readFileSync(signUpPath, 'utf-8');

    assert.ok(
      content.includes('sessionController') && content.includes('AbortController'),
      'sign-up page should use AbortController for session fetch'
    );
  });
});

// ─── Sign-in Page Tests ─────────────────────────────────────────────────────

describe('Sign-in Page', () => {
  it('should use Supabase for sign-in', async () => {
    const fs = await import('node:fs');
    const signInPath = fileURLToPath(new URL('../app/(auth)/sign-in/page.tsx', import.meta.url));
    const content = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(
      content.includes('supabaseSignIn'),
      'sign-in page should use supabaseSignIn'
    );
    assert.ok(
      content.includes('supabaseSignInWithGoogle'),
      'sign-in page should have Google sign-in via Supabase'
    );
  });

  it('should have timeout on session fetch', async () => {
    const fs = await import('node:fs');
    const signInPath = fileURLToPath(new URL('../app/(auth)/sign-in/page.tsx', import.meta.url));
    const content = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(
      content.includes('sessionController') && content.includes('AbortController'),
      'sign-in page should use AbortController for session fetch'
    );
  });

  it('should handle common auth errors', async () => {
    const fs = await import('node:fs');
    const signInPath = fileURLToPath(new URL('../app/(auth)/sign-in/page.tsx', import.meta.url));
    const content = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(
      content.includes('Invalid login credentials'),
      'sign-in page should handle invalid credentials error'
    );
    assert.ok(
      content.includes('AbortError'),
      'sign-in page should handle timeout AbortError'
    );
  });
});

// ─── Session Management Tests ─────────────────────────────────────────────

describe('Session Management', () => {
  it('session API should use Supabase token verification', async () => {
    const fs = await import('node:fs');
    const sessionPath = fileURLToPath(new URL('../app/api/auth/session/route.ts', import.meta.url));
    const content = fs.readFileSync(sessionPath, 'utf-8');

    assert.ok(
      content.includes('verifySupabaseToken'),
      'session API should use verifySupabaseToken'
    );
    assert.ok(
      content.includes('accessToken'),
      'session API should accept accessToken (not idToken)'
    );
  });

  it('session.ts should require SESSION_SECRET', async () => {
    const fs = await import('node:fs');
    const sessionPath = fileURLToPath(new URL('../lib/session.ts', import.meta.url));
    const content = fs.readFileSync(sessionPath, 'utf-8');

    assert.ok(
      content.includes('SESSION_SECRET'),
      'session.ts should reference SESSION_SECRET'
    );
    assert.ok(
      content.includes('HS256'),
      'session.ts should use HS256 algorithm'
    );
  });
});
