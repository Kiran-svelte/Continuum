import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import {
  AUTH_ENTRY_ROUTES,
  PORTAL_ROLE_MAP,
  canAccessPath,
  getDefaultPortalForRole,
  getPortalPrefixForPath,
  normalizeSafeRedirectTarget,
} from '@/lib/auth-routing';
import { AuthSecretError, getAuthSecretKey } from '@/lib/auth-secret';
import { requiresCompanyOnboarding, requiresEmployeeOnboarding } from '@/lib/employee-onboarding';
import { checkApiRateLimitAsync, getRateLimitHeaders } from '@/lib/api-rate-limit';

import {
  COOKIE_ACCESS,
  COOKIE_COMPANY_SETUP,
  COOKIE_ENABLED_MODULES,
  COOKIE_ONBOARDING,
  COOKIE_EMP_ONBOARDING,
  COOKIE_EMP_WELCOME,
  COOKIE_ROLE,
  COOKIE_ROLES,
  COOKIE_SESSION,
  BRAND_JWT_ISSUER,
  BRAND_JWT_AUDIENCES,
} from '@/lib/brand';
import { moduleSlugForPortalPath } from '@/lib/middleware-module-paths';

// ─── JWT Token Verification (Edge-compatible) ────────────────────────────────

/** @see lib/brand.ts — all cookie names derived from COOKIE_PREFIX env var */
const ACCESS_TOKEN_COOKIE = COOKIE_ACCESS;
const COMPANY_ONBOARDING_STATUS_COOKIE = COOKIE_ONBOARDING;
const EMPLOYEE_ONBOARDING_STATUS_COOKIE = COOKIE_EMP_ONBOARDING;
const EMPLOYEE_WELCOME_PENDING_COOKIE = COOKIE_EMP_WELCOME;

/**
 * Verify the access JWT in middleware (Edge runtime).
 * Uses jose which is Edge-compatible. Returns decoded payload or null.
 */
async function verifyAccessToken(token: string): Promise<{
  sub: string;
  email: string;
  role?: string;
  roles?: string[];
  org_id?: string;
  } | null> {
  const secretKey = getAuthSecretKey();

  try {
    const { payload } = await jwtVerify(token, secretKey, {
      issuer: BRAND_JWT_ISSUER,
      audience: BRAND_JWT_AUDIENCES,
    });
    
    // Normalize payload: sub is required for our internal routing, 
    // but session tokens (continuum-session) use 'uid' instead.
    const sub = (payload.sub || payload.uid) as string;
    const email = payload.email as string;
    
    if (!sub || !email) return null;
    
    return { 
      sub, 
      email, 
      role: payload.role as string | undefined, 
      roles: payload.roles as string[] | undefined, 
      org_id: payload.org_id as string | undefined 
    };
  } catch {
    return null;
  }
}

// ─── Configuration ──────────────────────────────────────────────────────────

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const CANONICAL_ORIGIN = toOrigin(process.env.NEXT_PUBLIC_APP_URL);

function toOrigin(urlOrOrigin: string | undefined): string | null {
  const value = (urlOrOrigin || '').trim();
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function parseCorsAllowedOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => toOrigin(part))
    .filter((origin): origin is string => Boolean(origin));
}

// Environment-driven CORS allowlist.
// - Production: ONLY env-configured origins (and same-origin) are allowed.
// - Non-production: localhost dev origins are also allowed for local development.
const ENV_ALLOWED_ORIGINS = new Set<string>([
  ...parseCorsAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS),
  toOrigin(process.env.NEXT_PUBLIC_APP_URL),
].filter((o): o is string => Boolean(o)));

const DEV_ALLOWED_ORIGINS = new Set<string>([
  'http://localhost:3000',
  'http://localhost:3001',
]);

function isAllowedCorsOrigin(origin: string | null, request: NextRequest): origin is string {
  if (!origin) return false;

  // Always allow same-origin requests.
  if (origin === request.nextUrl.origin) return true;

  if (ENV_ALLOWED_ORIGINS.has(origin)) return true;
  if (!IS_PRODUCTION && DEV_ALLOWED_ORIGINS.has(origin)) return true;

  return false;
}

const constraintEngineUrl = process.env.CONSTRAINT_ENGINE_URL;
const hasUnsafeConstraintEngineUrl = Boolean(
  constraintEngineUrl && !constraintEngineUrl.startsWith('https://')
);
let hasLoggedUnsafeConstraintEngineUrl = false;

function warnUnsafeConstraintEngineUrlOnce(): void {
  if (!hasUnsafeConstraintEngineUrl || hasLoggedUnsafeConstraintEngineUrl) {
    return;
  }

  hasLoggedUnsafeConstraintEngineUrl = true;
  if (process.env.NODE_ENV === 'production') {
    // Keep the enforcement message explicit without crashing all requests at module load.
    console.error('[CONFIG] CONSTRAINT_ENGINE_URL must use HTTPS in production');
    return;
  }

  console.warn('[CONFIG] Constraint engine using HTTP - unsafe for production');
}

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',              // Redirects to invitation-only page
  '/forgot-password',
  '/reset-password',
  '/admin/login',          // Super admin login page
  '/invite/accept',        // Invite acceptance (dynamic route)
  '/status',
  '/terms',
  '/privacy',
  '/cookies',
  '/support',
  '/help',
  '/api/health',
  '/api/enterprise/metrics',
];

// API routes that are public
const PUBLIC_API_PATTERNS = [
  '/api/health',
  '/api/enterprise/metrics',
  '/api/auth/session',
  '/api/auth/signin',
  '/api/auth/sign-out',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/refresh',
  '/api/auth/callback',
  '/api/invite/accept',    // Accept invitation
  '/api/auth/invite',      // Validate invite token (GET only)
];

// Cron routes that use CRON_SECRET instead of user auth
const CRON_ROUTES = [
  '/api/cron/',
];

// Sensitive routes that should be logged
const SENSITIVE_ROUTES = [
  '/api/security/',
  '/api/hr/adjust-balance',
  '/api/payroll/',
  '/api/leaves/approve/',
  '/api/leaves/reject/',
  '/hr/settings',
  '/hr/policy-settings',
  '/hr/security',
];


const MAX_JSON_BODY_BYTES = 1 * 1024 * 1024; // 1 MB
const MAX_MULTIPART_BODY_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_OTHER_BODY_BYTES = 2 * 1024 * 1024; // 2 MB

// ─── Rate Limiting ──────────────────────────────────────────────────────────
//
// Note: In-memory rate limiting is non-functional in serverless/Edge environments
// because each cold start gets a fresh Map. Rate limiting per route is handled
// at the API route level using lib/api-rate-limit.ts (backed by Upstash Redis).
// The middleware enforces body size limits and request ID tracing.

function getRateLimitEndpoint(pathname: string): string {
  // Placeholder — real rate limiting is done in each API route handler.
  // This returns allowed=true so the middleware never blocks based on an
  // in-memory counter that gets reset on every cold start.
  if (pathname.startsWith('/api/auth/')) return 'auth';
  if (pathname.startsWith('/api/security/')) return 'security/otp';
  if (pathname.startsWith('/api/payroll/')) return 'payroll';
  if (pathname.startsWith('/api/leaves/submit')) return 'leaves/submit';
  if (pathname.startsWith('/api/leaves/approve')) return 'leaves/approve';
  if (pathname.startsWith('/api/leaves/reject')) return 'leaves/reject';
  if (pathname.startsWith('/api/hr/')) return 'hr';
  return 'general';
}

function requiresDistributedRateLimit(pathname: string): boolean {
  return IS_PRODUCTION && (
    pathname.startsWith('/api/auth/') ||
    pathname.startsWith('/api/security/') ||
    pathname.startsWith('/api/super-admin/')
  );
}


// ─── Security Headers ───────────────────────────────────────────────────────

function createNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

function addSecurityHeaders(response: NextResponse, nonce?: string): void {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );

  const scriptSrc = nonce
    ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https: http:`
    : "script-src 'self'";

  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      scriptSrc,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://accounts.google.com",
      "frame-src 'self' https://accounts.google.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join('; ')
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// ─── Request ID Generator ───────────────────────────────────────────────────

function generateRequestId(): string {
  return crypto.randomUUID();
}

// ─── CORS Handler ───────────────────────────────────────────────────────────

function handleCORS(request: NextRequest, response: NextResponse): NextResponse | null {
  const origin = request.headers.get('origin');

  // Pre-flight OPTIONS
  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    if (isAllowedCorsOrigin(origin, request)) {
      preflight.headers.set('Access-Control-Allow-Origin', origin);
      preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Cron-Secret');
      preflight.headers.set('Access-Control-Allow-Credentials', 'true');
      preflight.headers.set('Access-Control-Max-Age', '86400');
      preflight.headers.set('Vary', 'Origin');
    }
    return preflight;
  }

  // Actual request — set CORS headers if origin is allowed
  if (isAllowedCorsOrigin(origin, request)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

  return null;
}

function getMaxBodySizeForRequest(request: NextRequest): number {
  const contentType = (request.headers.get('content-type') || '').toLowerCase();
  if (contentType.includes('multipart/form-data')) {
    return MAX_MULTIPART_BODY_BYTES;
  }
  if (contentType.includes('application/json')) {
    return MAX_JSON_BODY_BYTES;
  }
  return MAX_OTHER_BODY_BYTES;
}

function parseBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }
  return token;
}

async function sha256(input: string): Promise<Uint8Array> {
  const encoded = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return new Uint8Array(digest);
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function isValidCronRequest(request: NextRequest): Promise<boolean> {
  const expectedSecret = process.env.CRON_SECRET;
  if (!expectedSecret) return false;

  const providedSecret =
    request.headers.get('x-cron-secret') ||
    parseBearerToken(request.headers.get('authorization'));

  if (!providedSecret) return false;

  const [expectedHash, providedHash] = await Promise.all([
    sha256(expectedSecret),
    sha256(providedSecret),
  ]);

  return constantTimeEqual(expectedHash, providedHash);
}

// ─── Path Traversal Protection ──────────────────────────────────────────────

function hasPathTraversal(pathname: string): boolean {
  try {
    const decoded = decodeURIComponent(pathname);
    return decoded.includes('..') || decoded.includes('%2e') || decoded.includes('%2E');
  } catch {
    // Malformed URI encoding is suspicious and should be blocked.
    return true;
  }
}

// ─── Helper Functions ───────────────────────────────────────────────────────

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));
}

function isPublicApiRoute(pathname: string): boolean {
  return PUBLIC_API_PATTERNS.some(pattern => pathname.startsWith(pattern));
}

function isCronRoute(pathname: string): boolean {
  return CRON_ROUTES.some(pattern => pathname.startsWith(pattern));
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith('/api/');
}

function isSensitiveRoute(pathname: string): boolean {
  return SENSITIVE_ROUTES.some(pattern => pathname.startsWith(pattern));
}

function getClientIP(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown';
}

// ─── Main Middleware ────────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const requestId = generateRequestId();
  const nonce = createNonce();

  try {
  warnUnsafeConstraintEngineUrlOnce();

  // 1. Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // Force canonical host in production for browser page traffic.
  // This prevents users from remaining on stale immutable deployment URLs.
  if (
    IS_PRODUCTION &&
    CANONICAL_ORIGIN &&
    request.nextUrl.origin !== CANONICAL_ORIGIN &&
    !isApiRoute(pathname) &&
    (request.method === 'GET' || request.method === 'HEAD')
  ) {
    const canonicalUrl = new URL(`${pathname}${request.nextUrl.search}`, CANONICAL_ORIGIN);
    const redirectResponse = NextResponse.redirect(canonicalUrl, 307);
    addSecurityHeaders(redirectResponse, nonce);
    redirectResponse.headers.set('X-Request-Id', requestId);
    return redirectResponse;
  }

  // 2. Path traversal protection
  if (hasPathTraversal(pathname)) {
    console.warn(
      JSON.stringify({
        level: 'WARN',
        event: 'path_traversal_blocked',
        requestId,
        method: request.method,
        pathname,
        ip: getClientIP(request),
        ts: new Date().toISOString(),
      })
    );
    return NextResponse.json({ error: 'Bad request' }, { status: 400 });
  }

  // 3. Security headers on all responses
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  addSecurityHeaders(response, nonce);

  // 4. Request tracing header
  response.headers.set('X-Request-Id', requestId);

  // 5. CORS handling for API routes
  if (isApiRoute(pathname)) {
    const corsResponse = handleCORS(request, response);
    if (corsResponse) return corsResponse; // OPTIONS pre-flight handled

    if (['POST', 'PUT', 'PATCH'].includes(request.method)) {
      const contentLength = Number.parseInt(request.headers.get('content-length') || '', 10);
      if (Number.isFinite(contentLength) && contentLength > getMaxBodySizeForRequest(request)) {
        return NextResponse.json(
          { error: 'Request payload too large.' },
          {
            status: 413,
            headers: {
              'X-Frame-Options': 'DENY',
              'X-Content-Type-Options': 'nosniff',
              'X-Request-Id': requestId,
            }
          }
        );
      }
    }
  }

  // 6. Rate limiting for API routes
  if (isApiRoute(pathname)) {
    const clientIP = getClientIP(request);
    const rateLimit = await checkApiRateLimitAsync(clientIP, getRateLimitEndpoint(pathname), {
      requireRedis: requiresDistributedRateLimit(pathname),
    });

    for (const [key, value] of Object.entries(getRateLimitHeaders(rateLimit))) {
      response.headers.set(key, value);
    }

    if (rateLimit.unavailable) {
      console.error(
        JSON.stringify({
          level: 'ERROR',
          event: 'rate_limiter_unavailable',
          requestId,
          method: request.method,
          pathname,
          ip: clientIP,
          source: rateLimit.source,
          ts: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { error: 'Rate limiter unavailable', requestId },
        {
          status: 503,
          headers: {
            ...getRateLimitHeaders(rateLimit),
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Request-Id': requestId,
          },
        }
      );
    }

    if (!rateLimit.allowed) {
      console.warn(
        JSON.stringify({
          level: 'WARN',
          event: 'rate_limit_exceeded',
          requestId,
          method: request.method,
          pathname,
          ip: clientIP,
          ts: new Date().toISOString(),
        })
      );
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        {
          status: 429,
          headers: {
            ...getRateLimitHeaders(rateLimit),
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Retry-After': '60',
            'X-Request-Id': requestId,
          }
        }
      );
    }
  }

  // 7. Public routes — allow through
  //    Special case: authenticated users should not stay on auth entry pages.
  if (!isApiRoute(pathname) && AUTH_ENTRY_ROUTES.has(pathname)) {
    // Safety escape: force_login=true bypasses the auth redirect.
    // This allows error boundaries to break stale-session redirect loops.
    const isForceLogin = request.nextUrl.searchParams.get('force_login') === 'true';
    if (isForceLogin) {
      // Clear the stale access token cookie so the user gets a fresh login form
      const clearResponse = NextResponse.next();
      addSecurityHeaders(clearResponse, nonce);
      clearResponse.headers.set('X-Request-Id', requestId);
      clearResponse.cookies.delete(ACCESS_TOKEN_COOKIE);
      clearResponse.cookies.delete(COOKIE_SESSION);
      clearResponse.cookies.delete(COOKIE_ROLE);
      clearResponse.cookies.delete(COOKIE_ROLES);
      return clearResponse;
    }

    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || 
                        request.cookies.get(COOKIE_SESSION)?.value;
    const tokenPayload = accessToken ? await verifyAccessToken(accessToken) : null;

    if (tokenPayload) {
      const userRoles = tokenPayload.roles
        ? tokenPayload.roles.map((r) => r.toLowerCase())
        : tokenPayload.role
          ? [tokenPayload.role.toLowerCase()]
          : [];

      const requestedRedirect = normalizeSafeRedirectTarget(request.nextUrl.searchParams.get('redirect'));
      const primaryRole = tokenPayload.role?.toLowerCase() || userRoles[0];
      const requestedRedirectPathname = requestedRedirect?.split('?')[0] ?? null;

      // Keep /admin/login stable unless user is returning from a protected-route
      // bounce with an explicit valid redirect target.
      // This avoids millisecond redirect loops when a stale/partial auth state exists.
      if (pathname === '/admin/login' && !requestedRedirectPathname) {
        return response;
      }

      const redirectPath = (
        requestedRedirectPathname && canAccessPath(requestedRedirectPathname, userRoles)
          ? requestedRedirect
          : null
      ) ?? getDefaultPortalForRole(primaryRole);

      const redirectUrl = request.nextUrl.clone();
      const parsedRedirect = new URL(redirectPath, request.nextUrl.origin);
      redirectUrl.pathname = parsedRedirect.pathname;
      redirectUrl.search = parsedRedirect.search;
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isPublicRoute(pathname) || isPublicApiRoute(pathname)) {
    return response;
  }

  // 8. Cron routes — verify CRON_SECRET
  if (isCronRoute(pathname)) {
    if (!(await isValidCronRequest(request))) {
      if (isApiRoute(pathname)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return response;
  }

  // M3: Legacy /onboarding/company → 308 permanent redirect to /onboarding (L5-01-007)
  if (pathname === '/onboarding/company' || pathname.startsWith('/onboarding/company/')) {
    return NextResponse.redirect(new URL('/onboarding', request.url), 308);
  }

  // 8.5 Role-aware onboarding gate for authenticated users on non-API routes.
  if (!isApiRoute(pathname) && pathname.startsWith('/onboarding')) {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || 
                        request.cookies.get(COOKIE_SESSION)?.value;
    const tokenPayload = accessToken ? await verifyAccessToken(accessToken) : null;

    let primaryRole = tokenPayload?.role?.toLowerCase() ?? '';
    if (!primaryRole) {
      primaryRole = request.cookies.get(COOKIE_ROLE)?.value?.toLowerCase() || '';
    }

    // Employees and non-admin business roles must never enter company-admin onboarding.
    if (primaryRole && requiresEmployeeOnboarding(primaryRole) && !requiresCompanyOnboarding(primaryRole)) {
      const employeeOnboardingStatus = request.cookies.get(EMPLOYEE_ONBOARDING_STATUS_COOKIE)?.value;
      const employeeWelcomePending = request.cookies.get(EMPLOYEE_WELCOME_PENDING_COOKIE)?.value;

      const targetUrl = request.nextUrl.clone();
      if (employeeOnboardingStatus === '0') {
        targetUrl.pathname = '/employee/onboarding';
      } else if (employeeWelcomePending === '1') {
        targetUrl.pathname = '/employee/welcome';
      } else {
        targetUrl.pathname = '/employee/dashboard';
      }
      targetUrl.search = '';
      return NextResponse.redirect(targetUrl);
    }
  }

  if (
    !isApiRoute(pathname) &&
    !pathname.startsWith('/onboarding') &&
    !pathname.startsWith('/employee/onboarding') &&
    !pathname.startsWith('/employee/welcome')
  ) {
    const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || 
                        request.cookies.get(COOKIE_SESSION)?.value;
    const tokenPayload = accessToken ? await verifyAccessToken(accessToken) : null;

    let primaryRole = tokenPayload?.role?.toLowerCase() ?? '';
    if (!primaryRole) {
      primaryRole = request.cookies.get(COOKIE_ROLE)?.value?.toLowerCase() || '';
    }

    const companyOnboardingStatus = request.cookies.get(COMPANY_ONBOARDING_STATUS_COOKIE)?.value;
    if (requiresCompanyOnboarding(primaryRole) && companyOnboardingStatus === '0') {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = '/onboarding';
      onboardingUrl.search = '';
      return NextResponse.redirect(onboardingUrl);
    }

    const employeeOnboardingStatus = request.cookies.get(EMPLOYEE_ONBOARDING_STATUS_COOKIE)?.value;
    if (requiresEmployeeOnboarding(primaryRole) && employeeOnboardingStatus === '0') {
      const onboardingUrl = request.nextUrl.clone();
      onboardingUrl.pathname = '/employee/onboarding';
      onboardingUrl.search = '';
      return NextResponse.redirect(onboardingUrl);
    }

    const employeeWelcomePending = request.cookies.get(EMPLOYEE_WELCOME_PENDING_COOKIE)?.value;
    if (requiresEmployeeOnboarding(primaryRole) && employeeWelcomePending === '1') {
      const welcomeUrl = request.nextUrl.clone();
      welcomeUrl.pathname = '/employee/welcome';
      welcomeUrl.search = '';
      return NextResponse.redirect(welcomeUrl);
    }
  }

  // 8b. HR portal blocked until company onboarding is complete (all roles read company-setup cookie)
  if (
    !isApiRoute(pathname) &&
    pathname.startsWith('/hr') &&
    !pathname.startsWith('/hr/login')
  ) {
    const companySetup = request.cookies.get(COOKIE_COMPANY_SETUP)?.value;
    if (companySetup === '0') {
      const blocked = request.nextUrl.clone();
      blocked.pathname = '/admin/getting-started';
      blocked.searchParams.set('reason', 'company-setup-incomplete');
      blocked.search = blocked.searchParams.toString();
      return NextResponse.redirect(blocked);
    }
  }

  // 8c. Module path guard (enabled-modules cookie set on sign-in / me / refresh)
  if (!isApiRoute(pathname)) {
    const moduleSlug = moduleSlugForPortalPath(pathname);
    if (moduleSlug) {
      const enabledRaw = request.cookies.get(COOKIE_ENABLED_MODULES)?.value ?? '';
      const enabled = new Set(
        enabledRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      );
      const hasSessionCookie =
        Boolean(request.cookies.get(ACCESS_TOKEN_COOKIE)?.value) ||
        Boolean(request.cookies.get(COOKIE_SESSION)?.value);

      // Fail closed: authenticated portal visit without module cookie must not bypass gating.
      if (enabled.size === 0 && hasSessionCookie) {
        const stale = request.nextUrl.clone();
        stale.pathname = '/sign-in';
        stale.searchParams.set('reason', 'module-session-stale');
        stale.searchParams.set('redirect', pathname);
        stale.search = stale.searchParams.toString();
        return NextResponse.redirect(stale);
      }

      if (enabled.size > 0 && !enabled.has(moduleSlug)) {
        const disabled = request.nextUrl.clone();
        disabled.pathname = '/module-disabled';
        disabled.searchParams.set('module', moduleSlug);
        disabled.search = disabled.searchParams.toString();
        return NextResponse.redirect(disabled);
      }
    }
  }

  // 9. Portal role enforcement — verify access JWT and extract roles
  //    Only applies to portal page routes, NOT API routes (those use requireRole server-side)
  if (!isApiRoute(pathname)) {
    const portalPrefix = getPortalPrefixForPath(pathname);

    if (portalPrefix) {
      // Cryptographically verify the access JWT (not just check cookie existence)
      const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value || 
                          request.cookies.get(COOKIE_SESSION)?.value;
      const tokenPayload = accessToken ? await verifyAccessToken(accessToken) : null;

      if (!tokenPayload) {
        // No valid session → redirect to sign-in
        const signInUrl = request.nextUrl.clone();
        signInUrl.pathname = '/sign-in';
        const redirectTarget = normalizeSafeRedirectTarget(`${pathname}${request.nextUrl.search}`) ?? pathname;
        signInUrl.searchParams.set('redirect', redirectTarget);
        signInUrl.searchParams.set('error', 'auth_required');
        return NextResponse.redirect(signInUrl);
      }

      // Extract roles from verified JWT (not from a forgeable plain cookie)
      const userRoles = tokenPayload.roles
        ? tokenPayload.roles.map((r) => r.toLowerCase())
        : tokenPayload.role
          ? [tokenPayload.role.toLowerCase()]
          : [];

      // If no roles in JWT yet (new user before enrichment),
      // fall back to the role cookies as a hint.
      // This is safe because the access JWT itself was verified cryptographically.
      if (userRoles.length === 0) {
        const rolesCookie = request.cookies.get(COOKIE_ROLES)?.value;
        if (rolesCookie) {
          userRoles.push(...rolesCookie.split(',').map((r) => r.trim().toLowerCase()));
        }
      }

      if (userRoles.length === 0) {
        const signInUrl = request.nextUrl.clone();
        signInUrl.pathname = '/sign-in';
        signInUrl.searchParams.set('error', 'role_required');
        signInUrl.search = signInUrl.searchParams.toString();
        return NextResponse.redirect(signInUrl);
      }

      const allowedRoles = PORTAL_ROLE_MAP[portalPrefix];
      const hasAccess = userRoles.some((role) => allowedRoles.includes(role));

      if (!hasAccess) {
        // Authenticated but wrong role → redirect to their correct portal
        console.warn(
          JSON.stringify({
            level: 'WARN',
            event: 'portal_access_denied',
            requestId,
            pathname,
            userRoles,
            requiredRoles: allowedRoles,
            ip: getClientIP(request),
            ts: new Date().toISOString(),
          })
        );

        // Determine the correct portal for this user
        const primaryRole = tokenPayload.role?.toLowerCase() || userRoles[0];
        const correctPortal = getDefaultPortalForRole(primaryRole);

        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = correctPortal;
        redirectUrl.searchParams.set('error', 'access_denied');
        return NextResponse.redirect(redirectUrl);
      }
    }
  }

  // 10. Sensitive route structured logging
  if (isSensitiveRoute(pathname)) {
    console.log(
      JSON.stringify({
        level: 'INFO',
        event: 'sensitive_route_access',
        requestId,
        method: request.method,
        pathname,
        ip: getClientIP(request),
        userAgent: request.headers.get('user-agent')?.slice(0, 120) || 'unknown',
        ts: new Date().toISOString(),
      })
    );
  }

    return response;
  } catch (error) {
    if (error instanceof AuthSecretError) {
      console.error('[MIDDLEWARE] Auth signing secret misconfigured', {
        requestId,
        pathname,
        error: error.message,
      });

      const baseHeaders: Record<string, string> = {
        'Cache-Control': 'no-store',
        'X-Request-Id': requestId,
        'X-Content-Type-Options': 'nosniff',
      };

      const response = isApiRoute(pathname)
        ? NextResponse.json({ error: error.message }, { status: 500, headers: baseHeaders })
        : new NextResponse(
            `Authentication configuration error: ${error.message}\nRequest ID: ${requestId}\n`,
            {
              status: 500,
              headers: {
                ...baseHeaders,
                'Content-Type': 'text/plain; charset=utf-8',
              },
            }
          );

      addSecurityHeaders(response, nonce);
      return response;
    }

    // Fail closed: middleware errors must never silently grant access.
    // Page requests → redirect to sign-in with an error indicator.
    // API requests → return 500 so the client knows something went wrong.
    console.error('[MIDDLEWARE] Unhandled middleware error — failing closed', {
      requestId,
      pathname,
      error: error instanceof Error ? error.message : String(error),
    });

    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Internal server error', requestId },
        {
          status: 500,
          headers: {
            'Cache-Control': 'no-store',
            'X-Content-Type-Options': 'nosniff',
            'X-Request-Id': requestId,
          },
        }
      );
    }

    const errorSignIn = new URL('/sign-in', request.url);
    errorSignIn.searchParams.set('error', 'middleware_error');
    errorSignIn.searchParams.set('rid', requestId);
    return NextResponse.redirect(errorSignIn);
  }
}

// ─── Matcher Configuration ──────────────────────────────────────────────────

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
};
