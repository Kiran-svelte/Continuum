import { describe, it } from 'node:test';
import assert from 'node:assert';
import { fileURLToPath } from 'node:url';

// ─── Auth Implementation Tests ─────────────────────────────────────────────

describe('Sign-up Page', () => {
  it('should show invitation-required gate by default', async () => {
    const fs = await import('node:fs');
    const signUpPath = fileURLToPath(new URL('../components/pages/auth/sign-up-view.tsx', import.meta.url));
    const content = fs.readFileSync(signUpPath, 'utf-8');

    assert.ok(
      content.includes('Invitation Required'),
      'sign-up page should show invitation required message'
    );
    assert.ok(
      content.includes('How to get access'),
      'sign-up page should explain access steps'
    );
    assert.ok(
      content.includes('Who can send invitations'),
      'sign-up page should list who can invite'
    );
  });

  it('should provide public credential-first signup when enabled', async () => {
    const fs = await import('node:fs');
    const signUpPath = fileURLToPath(new URL('../components/pages/auth/sign-up-view.tsx', import.meta.url));
    const content = fs.readFileSync(signUpPath, 'utf-8');

    assert.ok(
      content.includes('Create your workspace account'),
      'sign-up page should expose account creation messaging'
    );
    assert.ok(
      content.includes('Credential-first onboarding') && content.includes('Username'),
      'sign-up page should describe credential-first setup with username support'
    );
    assert.ok(
      content.includes('<form') && content.includes('Create account'),
      'sign-up page should render signup form'
    );
    assert.ok(
      content.includes("router.push('/onboarding')"),
      'sign-up page should enter company onboarding after first sign-in'
    );
  });

  it('should submit to custom signup endpoint and auto-signin flow', async () => {
    const fs = await import('node:fs');
    const signUpPath = fileURLToPath(new URL('../components/pages/auth/sign-up-view.tsx', import.meta.url));
    const content = fs.readFileSync(signUpPath, 'utf-8');

    assert.ok(
      content.includes("fetch('/api/auth/signup'") && content.includes("fetch('/api/auth/signin'"),
      'sign-up page should call signup API then signin API'
    );
  });
});

// ─── Sign-in Page Tests ─────────────────────────────────────────────────────

describe('Sign-in Page', () => {
  it('should use custom JWT auth (not Supabase)', async () => {
    const fs = await import('node:fs');
    const signInPath = fileURLToPath(new URL('../components/ui/modern-stunning-sign-in.tsx', import.meta.url));
    const content = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(
      content.includes('/api/auth/login') || content.includes('/api/auth/signin'),
      'sign-in page should call custom auth endpoint'
    );
    assert.ok(
      !content.includes('supabase'),
      'sign-in page should not reference Supabase'
    );
  });

  it('should redirect to role-based portal after login', async () => {
    const fs = await import('node:fs');
    const signInPath = fileURLToPath(new URL('../components/ui/modern-stunning-sign-in.tsx', import.meta.url));
    const content = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(
      content.includes('resolvePostSignInPath') && content.includes('router.push'),
      'sign-in page should route users via shared post-sign-in resolver'
    );
    assert.ok(
      content.includes('resolvePostSignInPath(me') || content.includes('resolvePostSignInPath(me,'),
      'sign-in page should use /api/auth/me payload with resolvePostSignInPath'
    );
    assert.ok(
      content.includes("resolvePostSignInPath") && content.includes('/onboarding'),
      'sign-in page should route admins in setup to company onboarding via shared resolver'
    );
  });

  it('should handle authentication errors', async () => {
    const fs = await import('node:fs');
    const signInPath = fileURLToPath(new URL('../components/ui/modern-stunning-sign-in.tsx', import.meta.url));
    const content = fs.readFileSync(signInPath, 'utf-8');

    assert.ok(
      content.includes('setError(data.error || "Sign in failed. Please try again.")') && content.includes('Sign in failed. Please check your connection.'),
      'sign-in component should surface auth and network failures to the UI'
    );
  });
});

// ─── Session Management Tests ─────────────────────────────────────────────

describe('Session Management', () => {
  it('session API should use JWT verification (not Supabase)', async () => {
    const fs = await import('node:fs');
    const sessionPath = fileURLToPath(new URL('../app/api/auth/session/route.ts', import.meta.url));
    const content = fs.readFileSync(sessionPath, 'utf-8');

    assert.ok(
      content.includes('verifyAccessToken') || content.includes('getAccessTokenFromCookies'),
      'session API should use JWT token verification'
    );
    assert.ok(
      !content.includes('supabase') && !content.includes('verifySupabaseToken'),
      'session API should not reference Supabase'
    );
  });

  it('should return proper session structure', async () => {
    const fs = await import('node:fs');
    const sessionPath = fileURLToPath(new URL('../app/api/auth/session/route.ts', import.meta.url));
    const content = fs.readFileSync(sessionPath, 'utf-8');

    assert.ok(
      content.includes('authenticated') && content.includes('unauthenticated'),
      'session API should return proper status'
    );
    assert.ok(
      content.includes('uid') && content.includes('role') && content.includes('email'),
      'session API should return user info'
    );
  });

  it('client auth should attempt refresh on 401 from /api/auth/me', async () => {
    const fs = await import('node:fs');
    const clientAuthPath = fileURLToPath(new URL('../lib/client-auth.ts', import.meta.url));
    const content = fs.readFileSync(clientAuthPath, 'utf-8');

    assert.ok(
      content.includes('/api/auth/refresh') &&
        content.includes('if (res.status === 401)') &&
        content.includes('tryRefreshSession'),
      'client auth should retry session by calling /api/auth/refresh on 401'
    );
  });

  it('client auth should force cookie cleanup when refresh fails', async () => {
    const fs = await import('node:fs');
    const clientAuthPath = fileURLToPath(new URL('../lib/client-auth.ts', import.meta.url));
    const content = fs.readFileSync(clientAuthPath, 'utf-8');

    assert.ok(
      content.includes("fetch('/api/auth/sign-out'") && content.includes("fetch('/api/auth/session', { method: 'DELETE'"),
      'client auth should clear auth cookies when refresh cannot recover the session'
    );
    assert.ok(
      content.includes("window.location.replace('/sign-in')"),
      'client auth should redirect to sign-in after cleanup'
    );
  });
});

// ─── Auth Libraries Tests ─────────────────────────────────────────────────

describe('Auth Libraries', () => {
  it('should not have any Supabase imports in auth files', async () => {
    const fs = await import('node:fs');

    const filesToCheck = [
      '../app/(auth)/sign-in/page.tsx',
      '../app/(auth)/sign-up/page.tsx',
      '../app/api/auth/session/route.ts',
      '../lib/auth-service.ts',
      '../lib/jwt-service.ts',
    ];

    for (const file of filesToCheck) {
      const filePath = fileURLToPath(new URL(file, import.meta.url));
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf-8');
        assert.ok(
          !content.includes('@supabase/') && !content.includes('supabase.'),
          `${file} should not import or use Supabase`
        );
      }
    }
  });

  it('should use JWT-based auth service', async () => {
    const fs = await import('node:fs');
    const authServicePath = fileURLToPath(new URL('../lib/auth-service.ts', import.meta.url));
    
    if (fs.existsSync(authServicePath)) {
      const content = fs.readFileSync(authServicePath, 'utf-8');
      assert.ok(
        content.includes('jwt') || content.includes('token'),
        'auth service should use JWT tokens'
      );
      assert.ok(
        content.includes('isDemoAuthEnabled') && content.includes("if (!isDemoAuthEnabled())"),
        'auth service should gate demo super-admin fallback outside production/demo'
      );
      assert.ok(
        content.includes('SESSION_COOKIE_NAME') && content.includes('clearAuthCookies'),
        'auth service should wire legacy session cleanup into the shared logout path'
      );
    }
  });
});

// ─── CSP Configuration Tests ─────────────────────────────────────────────────

describe('Content-Security-Policy Configuration', () => {
  it('next.config.ts CSP should allow Supabase domains for auth/storage', async () => {
    const fs = await import('node:fs');
    const configPath = fileURLToPath(new URL('../next.config.ts', import.meta.url));
    
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf-8');
      assert.ok(
        content.includes('supabase.co'),
        'next.config.ts CSP should include Supabase domains'
      );
    }
  });

  it('middleware.ts should keep CORS explicit instead of wildcarding Supabase origins', async () => {
    const fs = await import('node:fs');
    const middlewarePath = fileURLToPath(new URL('../middleware.ts', import.meta.url));
    
    if (fs.existsSync(middlewarePath)) {
      const content = fs.readFileSync(middlewarePath, 'utf-8');
      assert.ok(
        content.includes('ENV_ALLOWED_ORIGINS') && !content.includes('https://*.supabase.co'),
        'middleware.ts should rely on configured app origins, not Supabase wildcard origins'
      );
    }
  });
});

describe('Middleware resilience', () => {
  it('middleware has a top-level catch fallback to avoid blanket 500 outages', async () => {
    const fs = await import('node:fs');
    const middlewarePath = fileURLToPath(new URL('../middleware.ts', import.meta.url));
    const content = fs.readFileSync(middlewarePath, 'utf-8');

    assert.ok(
      content.includes('try {') && content.includes('catch (error)'),
      'middleware should wrap main execution in try/catch'
    );
    assert.ok(
      content.includes("[MIDDLEWARE] Unhandled middleware error") && content.includes('NextResponse.next()'),
      'middleware should log errors and return a fallback next response'
    );
  });

  it('middleware should preserve pathname and query string in post-login redirect param', async () => {
    const fs = await import('node:fs');
    const middlewarePath = fileURLToPath(new URL('../middleware.ts', import.meta.url));
    const content = fs.readFileSync(middlewarePath, 'utf-8');

    assert.ok(
      content.includes('const redirectTarget = normalizeSafeRedirectTarget(`${pathname}${request.nextUrl.search}`) ?? pathname;') &&
      content.includes("signInUrl.searchParams.set('redirect', redirectTarget);"),
      'middleware should preserve query string and keep redirect param internal'
    );
  });

  it('auth callback route should use shared origin and redirect sanitization helpers', async () => {
    const fs = await import('node:fs');
    const callbackPath = fileURLToPath(new URL('../app/api/auth/callback/route.ts', import.meta.url));
    const content = fs.readFileSync(callbackPath, 'utf-8');

    assert.ok(
      content.includes("import { getDefaultPortalForRole, normalizeSafeRedirectTarget } from '@/lib/auth-routing';"),
      'callback route should reuse shared auth-routing destination policy'
    );
    assert.ok(
      content.includes("import { buildAppUrl } from '@/lib/url-origin';"),
      'callback route should build redirect URL from canonical origin helper'
    );
    assert.ok(
      !content.includes('x-forwarded-host') && !content.includes('https://${forwardedHost}'),
      'callback route should not trust raw forwarded host string concatenation'
    );
    assert.ok(
      content.includes('const target = normalizeSafeRedirectTarget(nextParam) ?? getDefaultPortalForRole();') &&
      content.includes('return NextResponse.redirect(buildAppUrl(target, { request }));'),
      'callback route should sanitize target and redirect using canonical app URL builder'
    );
  });
});

// ─── Onboarding Gate Tests ─────────────────────────────────────────────────

describe('Onboarding Gate', () => {
  it('auth me route should set onboarding status cookie for middleware', async () => {
    const fs = await import('node:fs');
    const mePath = fileURLToPath(new URL('../app/api/auth/me/route.ts', import.meta.url));
    const content = fs.readFileSync(mePath, 'utf-8');

    assert.ok(
      content.includes('hydrateAuthResponseCookies') || content.includes('COOKIE_ONBOARDING'),
      'auth me route should set onboarding cookie for middleware gating'
    );
  });

  it('sign in route should set onboarding status cookie', async () => {
    const fs = await import('node:fs');
    const signInApiPath = fileURLToPath(new URL('../app/api/auth/signin/route.ts', import.meta.url));
    const content = fs.readFileSync(signInApiPath, 'utf-8');

    assert.ok(
      content.includes('hydrateAuthResponseCookies') || content.includes('COOKIE_ONBOARDING'),
      'sign in route should set onboarding status cookie on successful login'
    );
  });

  it('refresh route should set onboarding status cookie', async () => {
    const fs = await import('node:fs');
    const refreshPath = fileURLToPath(new URL('../app/api/auth/refresh/route.ts', import.meta.url));
    const content = fs.readFileSync(refreshPath, 'utf-8');

    assert.ok(
      content.includes('hydrateAuthResponseCookies') || content.includes('COOKIE_ONBOARDING'),
      'refresh route should keep onboarding cookie in sync with token refresh'
    );
  });
});

// ─── API Guard Hardening Tests ─────────────────────────────────────────────

describe('API Guard Hardening', () => {
  it('test-supabase route should require super admin auth', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/test-supabase/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');

    assert.ok(
      content.includes('requireSuperAdmin') && content.includes('getAuthEmployee'),
      'test-supabase route should enforce authenticated super admin access'
    );
  });

  it('password-change audit route should require authenticated actor for logging', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/password-change/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');

    assert.ok(
      content.includes('getAuthEmployee'),
      'password-change route should resolve authenticated actor before audit write'
    );
    assert.ok(
      content.includes('return NextResponse.json({ logged: false })'),
      'password-change route should skip logging when unauthenticated to prevent spoofed audit writes'
    );
    assert.ok(
      content.includes('signOutAll(employee.id)'),
      'password-change route should revoke all refresh tokens for the affected employee'
    );
  });

  it('flow 8: forgot-password uses email transport and omits delivery hints in production (anti-enumeration)', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/forgot-password/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');

    assert.ok(content.includes('sendPasswordResetEmail'), 'forgot-password should use the shared email transport');
    assert.ok(
      content.includes("process.env.NODE_ENV === 'production'") && content.includes('neutralMessage'),
      'forgot-password should return a neutral body in production without leaking account existence'
    );
    assert.ok(
      content.includes('delivered') && content.includes('reset_link'),
      'forgot-password may still expose delivered/reset_link for non-production diagnostics'
    );
  });

  it('sign-out route should revoke refresh tokens through the auth service helper', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/sign-out/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');

    assert.ok(
      content.includes('signOut(refreshToken)') && content.includes('clearAuthCookies'),
      'sign-out route should use the shared revocation path and clear all auth cookies'
    );
  });
});

// ─── FLOW chunk C1 (matrix IDs 1–2, 4, 7, 9, 11–12) ──────────────────────────
// Flows 3,5–6,8,10 are covered by "Session Management", "API Guard Hardening", and "Onboarding Gate" above.

describe('FLOW chunk C1: signin / refresh / me / reset API contracts', () => {
  it('flows 1–2: signin sets cookies and supports employee + super_admin auth paths', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/signin/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');
    assert.ok(content.includes('setAuthCookies'), 'signin should attach JWT cookies on success');
    assert.ok(
      content.includes('signIn(') && content.includes('signInSuperAdmin'),
      'signin should delegate to employee and super-admin auth services'
    );
    assert.ok(content.includes('is_super_admin'), 'signin should honor super-admin body flag');
  });

  it('flow 4: refresh rotates via refreshTokens and clears cookies on failure', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/refresh/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');
    assert.ok(content.includes('refreshTokens'), 'refresh should use shared token rotation');
    assert.ok(
      content.includes('clearAuthCookies') && content.includes('requiresReauth'),
      'refresh should clear session and signal reauth when rotation fails'
    );
  });

  it('flow 7: me resolves actor via getAuthEmployee before profile payload', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/me/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');
    assert.ok(content.includes('getAuthEmployee'), 'me should use shared auth guard');
    assert.ok(
      content.includes("primary_role === 'super_admin'"),
      'me should branch for super-admin profile shape'
    );
    assert.ok(
      content.includes('buildRolesList') && content.includes('extractEmailVerificationState'),
      'me should derive roles list and email verification from shared helpers / DB prefs'
    );
  });

  it('flow 9: reset-password verifies token, updates hash, and revokes all sessions', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/reset-password/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');
    assert.ok(
      content.includes('verifyPasswordResetToken') && content.includes('hashPassword'),
      'reset-password should verify signed token then hash new password'
    );
    assert.ok(
      content.includes('signOutAll('),
      'reset-password should revoke outstanding refresh tokens after password change'
    );
  });
});

describe('FLOW chunk C1: failed-login (11) + callback (12) contracts', () => {
  it('flow 11: failed-login uses zod + LOGIN_FAILED audit path + non-leaky responses', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/failed-login/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');

    assert.ok(content.includes("z.object({"), 'failed-login should validate JSON with zod');
    assert.ok(
      content.includes('AUDIT_ACTIONS.LOGIN_FAILED') && content.includes('createAuditLog'),
      'failed-login should record LOGIN_FAILED via audit helper when org is known'
    );
    assert.ok(
      content.includes('return NextResponse.json({ logged:'),
      'failed-login should return a stable JSON envelope'
    );
  });

  it('flow 12: callback redirect is single-hop via normalizeSafeRedirectTarget + buildAppUrl', async () => {
    const fs = await import('node:fs');
    const routePath = fileURLToPath(new URL('../app/api/auth/callback/route.ts', import.meta.url));
    const content = fs.readFileSync(routePath, 'utf-8');
    assert.ok(
      content.includes('normalizeSafeRedirectTarget') && content.includes('buildAppUrl(target'),
      'callback should sanitize next/redirect and build absolute URL safely'
    );
    assert.ok(
      content.includes('NextResponse.redirect'),
      'callback should respond with a redirect only'
    );
  });
});
