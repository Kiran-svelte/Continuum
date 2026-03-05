import { describe, it } from 'node:test';
import assert from 'node:assert';

// ─── CSP Configuration Tests ─────────────────────────────────────────────────

describe('Content-Security-Policy Configuration', () => {
  // Read the CSP values from the config files to verify they include Firebase domains
  
  it('next.config.ts CSP includes Firebase googleapis domain', async () => {
    const fs = await import('node:fs');
    const configPath = new URL('../next.config.ts', import.meta.url).pathname;
    const content = fs.readFileSync(configPath, 'utf-8');
    
    assert.ok(
      content.includes('https://*.googleapis.com'),
      'next.config.ts CSP connect-src should include https://*.googleapis.com for Firebase Auth API'
    );
  });

  it('next.config.ts CSP includes Firebase firebaseio domain', async () => {
    const fs = await import('node:fs');
    const configPath = new URL('../next.config.ts', import.meta.url).pathname;
    const content = fs.readFileSync(configPath, 'utf-8');
    
    assert.ok(
      content.includes('https://*.firebaseio.com'),
      'next.config.ts CSP connect-src should include https://*.firebaseio.com for Firebase services'
    );
  });

  it('next.config.ts CSP includes Firebase firebaseapp domain', async () => {
    const fs = await import('node:fs');
    const configPath = new URL('../next.config.ts', import.meta.url).pathname;
    const content = fs.readFileSync(configPath, 'utf-8');
    
    assert.ok(
      content.includes('https://*.firebaseapp.com'),
      'next.config.ts CSP connect-src should include https://*.firebaseapp.com for Firebase Auth'
    );
  });

  it('next.config.ts CSP should not reference supabase', async () => {
    const fs = await import('node:fs');
    const configPath = new URL('../next.config.ts', import.meta.url).pathname;
    const content = fs.readFileSync(configPath, 'utf-8');
    
    assert.ok(
      !content.includes('supabase'),
      'next.config.ts CSP should not reference supabase since the app uses Firebase'
    );
  });

  it('middleware.ts CSP includes Firebase domains', async () => {
    const fs = await import('node:fs');
    const middlewarePath = new URL('../middleware.ts', import.meta.url).pathname;
    const content = fs.readFileSync(middlewarePath, 'utf-8');
    
    assert.ok(
      content.includes('https://*.googleapis.com'),
      'middleware.ts CSP should include https://*.googleapis.com'
    );
    assert.ok(
      content.includes('https://*.firebaseio.com'),
      'middleware.ts CSP should include https://*.firebaseio.com'
    );
    assert.ok(
      content.includes('https://*.firebaseapp.com'),
      'middleware.ts CSP should include https://*.firebaseapp.com'
    );
  });

  it('CSP connect-src is consistent between next.config.ts and middleware.ts', async () => {
    const fs = await import('node:fs');
    const configPath = new URL('../next.config.ts', import.meta.url).pathname;
    const middlewarePath = new URL('../middleware.ts', import.meta.url).pathname;
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
    
    // Extract connect-src values from both files
    const configMatch = configContent.match(/connect-src\s+([^;]+);/);
    const middlewareMatch = middlewareContent.match(/connect-src\s+([^;]+);/);
    
    assert.ok(configMatch, 'next.config.ts should have a connect-src directive');
    assert.ok(middlewareMatch, 'middleware.ts should have a connect-src directive');
    
    // Normalize and compare the domains
    const configDomains = new Set(configMatch![1].trim().split(/\s+/).sort());
    const middlewareDomains = new Set(middlewareMatch![1].trim().split(/\s+/).sort());
    
    assert.deepStrictEqual(
      configDomains,
      middlewareDomains,
      'CSP connect-src domains should be consistent between next.config.ts and middleware.ts'
    );
  });
});

// ─── Firebase Admin Credential Validation Tests ─────────────────────────────

describe('Firebase Admin SDK Credential Validation', () => {
  it('firebase-admin.ts should validate credentials before initialization', async () => {
    const fs = await import('node:fs');
    const adminPath = new URL('../lib/firebase-admin.ts', import.meta.url).pathname;
    const content = fs.readFileSync(adminPath, 'utf-8');
    
    // Verify that the file checks for missing credentials
    assert.ok(
      content.includes('!projectId') && content.includes('!privateKey') && content.includes('!clientEmail'),
      'firebase-admin.ts should check for missing projectId, privateKey, and clientEmail'
    );
    
    // Verify it throws an error with a helpful message
    assert.ok(
      content.includes('Firebase Admin SDK credentials are not configured'),
      'firebase-admin.ts should throw a descriptive error when credentials are missing'
    );
  });
});

// ─── Sign-up Page Timeout Tests ─────────────────────────────────────────────

describe('Sign-up Page Timeout Handling', () => {
  it('sign-up page should have timeout on session fetch', async () => {
    const fs = await import('node:fs');
    const signUpPath = new URL('../app/(auth)/sign-up/page.tsx', import.meta.url).pathname;
    const content = fs.readFileSync(signUpPath, 'utf-8');
    
    // Check that session fetch uses AbortController
    assert.ok(
      content.includes('sessionController') && content.includes('AbortController'),
      'sign-up page should use AbortController for session fetch'
    );
    assert.ok(
      content.includes('signal: sessionController.signal'),
      'sign-up page session fetch should use the AbortController signal'
    );
  });

  it('sign-up page should handle network errors', async () => {
    const fs = await import('node:fs');
    const signUpPath = new URL('../app/(auth)/sign-up/page.tsx', import.meta.url).pathname;
    const content = fs.readFileSync(signUpPath, 'utf-8');
    
    assert.ok(
      content.includes('auth/network-request-failed'),
      'sign-up page should handle auth/network-request-failed error'
    );
    assert.ok(
      content.includes('auth/too-many-requests'),
      'sign-up page should handle auth/too-many-requests error'
    );
  });
});

// ─── Sign-in Page Timeout Tests ─────────────────────────────────────────────

describe('Sign-in Page Timeout Handling', () => {
  it('sign-in page should have timeout on session fetch', async () => {
    const fs = await import('node:fs');
    const signInPath = new URL('../app/(auth)/sign-in/page.tsx', import.meta.url).pathname;
    const content = fs.readFileSync(signInPath, 'utf-8');
    
    // Check that session fetch uses AbortController
    assert.ok(
      content.includes('sessionController') && content.includes('AbortController'),
      'sign-in page should use AbortController for session fetch'
    );
    assert.ok(
      content.includes('signal: sessionController.signal'),
      'sign-in page session fetch should use the AbortController signal'
    );
  });

  it('sign-in page should have timeout on auth/me fetch', async () => {
    const fs = await import('node:fs');
    const signInPath = new URL('../app/(auth)/sign-in/page.tsx', import.meta.url).pathname;
    const content = fs.readFileSync(signInPath, 'utf-8');
    
    assert.ok(
      content.includes('meController') && content.includes('AbortController'),
      'sign-in page should use AbortController for auth/me fetch'
    );
    assert.ok(
      content.includes('signal: meController.signal'),
      'sign-in page auth/me fetch should use the AbortController signal'
    );
  });

  it('sign-in page should handle common Firebase auth errors', async () => {
    const fs = await import('node:fs');
    const signInPath = new URL('../app/(auth)/sign-in/page.tsx', import.meta.url).pathname;
    const content = fs.readFileSync(signInPath, 'utf-8');
    
    assert.ok(
      content.includes('auth/wrong-password') || content.includes('auth/invalid-credential'),
      'sign-in page should handle wrong password / invalid credential errors'
    );
    assert.ok(
      content.includes('auth/user-not-found'),
      'sign-in page should handle user not found error'
    );
    assert.ok(
      content.includes('AbortError'),
      'sign-in page should handle timeout AbortError'
    );
  });
});
