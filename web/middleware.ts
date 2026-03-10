import { NextResponse, type NextRequest } from 'next/server';

// ─── Configuration ──────────────────────────────────────────────────────────

// Allowed CORS origins (extend for production)
const ALLOWED_ORIGINS = new Set([
  process.env.NEXT_PUBLIC_APP_URL || '',
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean));

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/hr/sign-in',
  '/hr/sign-up',
  '/employee/sign-in',
  '/employee/sign-up',
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
  '/api/auth/register',
  '/api/auth/join',
  '/api/auth/callback',
  '/api/auth/keycloak/callback',
  '/api/auth/keycloak/logout',
  '/api/auth/keycloak/refresh',
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

// Role-based portal access
const PORTAL_ROLE_MAP: Record<string, string[]> = {
  '/admin': ['admin'],
  '/hr': ['admin', 'hr'],
  '/manager': ['admin', 'hr', 'director', 'manager', 'team_lead'],
  '/employee': ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
};

// Rate limit config per route pattern (requests per minute)
const RATE_LIMITS: Record<string, number> = {
  '/api/leaves/submit': 5,
  '/api/security/otp': 5,
  '/api/auth': 10,
  '/api/': 30,  // default for all API
};

// ─── In-Memory Rate Limiter ─────────────────────────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(identifier: string, route: string): { allowed: boolean; remaining: number } {
  // Find matching rate limit
  let limit = 30; // default
  for (const [pattern, max] of Object.entries(RATE_LIMITS)) {
    if (route.startsWith(pattern)) {
      limit = max;
      break;
    }
  }
  
  const key = `${identifier}:${route}`;
  const now = Date.now();
  const windowMs = 60_000; // 1 minute
  
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1 };
  }
  
  entry.count++;
  if (entry.count > limit) {
    return { allowed: false, remaining: 0 };
  }
  
  return { allowed: true, remaining: limit - entry.count };
}

// Periodically clean up expired rate limit entries
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
      if (now > value.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, 60_000);
}

// ─── Security Headers ───────────────────────────────────────────────────────

function addSecurityHeaders(response: NextResponse): void {
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=63072000; includeSubDomains; preload'
  );
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com https://*.firebaseapp.com https://*.supabase.co wss://*.pusher.com https://*.pusher.com" +
        (process.env.NEXT_PUBLIC_KEYCLOAK_URL ? ` ${process.env.NEXT_PUBLIC_KEYCLOAK_URL}` : ''),
      "frame-src 'self'" +
        (process.env.NEXT_PUBLIC_KEYCLOAK_URL ? ` ${process.env.NEXT_PUBLIC_KEYCLOAK_URL}` : ''),
    ].join('; ')
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
}

// ─── Request ID Generator ───────────────────────────────────────────────────

let requestCounter = 0;

function generateRequestId(): string {
  requestCounter = (requestCounter + 1) % 1_000_000;
  const ts = Date.now().toString(36);
  const seq = requestCounter.toString(36).padStart(4, '0');
  return `req_${ts}_${seq}`;
}

// ─── CORS Handler ───────────────────────────────────────────────────────────

function handleCORS(request: NextRequest, response: NextResponse): NextResponse | null {
  const origin = request.headers.get('origin');

  // Pre-flight OPTIONS
  if (request.method === 'OPTIONS') {
    const preflight = new NextResponse(null, { status: 204 });
    if (origin && ALLOWED_ORIGINS.has(origin)) {
      preflight.headers.set('Access-Control-Allow-Origin', origin);
      preflight.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      preflight.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Request-Id, X-Cron-Secret');
      preflight.headers.set('Access-Control-Allow-Credentials', 'true');
      preflight.headers.set('Access-Control-Max-Age', '86400');
    }
    return preflight;
  }

  // Actual request — set CORS headers if origin is allowed
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Vary', 'Origin');
  }

  return null;
}

// ─── Path Traversal Protection ──────────────────────────────────────────────

function hasPathTraversal(pathname: string): boolean {
  const decoded = decodeURIComponent(pathname);
  return decoded.includes('..') || decoded.includes('%2e') || decoded.includes('%2E');
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

  // 1. Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
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
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  addSecurityHeaders(response);

  // 4. Request tracing header
  response.headers.set('X-Request-Id', requestId);

  // 5. CORS handling for API routes
  if (isApiRoute(pathname)) {
    const corsResponse = handleCORS(request, response);
    if (corsResponse) return corsResponse; // OPTIONS pre-flight handled
  }

  // 6. Rate limiting for API routes
  if (isApiRoute(pathname)) {
    const clientIP = getClientIP(request);
    const { allowed, remaining } = checkRateLimit(clientIP, pathname);

    response.headers.set('X-RateLimit-Remaining', String(remaining));

    if (!allowed) {
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
  if (isPublicRoute(pathname) || isPublicApiRoute(pathname)) {
    return response;
  }

  // 8. Cron routes — verify CRON_SECRET
  if (isCronRoute(pathname)) {
    const cronSecret = request.headers.get('x-cron-secret') ||
                       request.nextUrl.searchParams.get('cron_secret');
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret || cronSecret !== expectedSecret) {
      if (isApiRoute(pathname)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }
    return response;
  }

  // 9. Portal role enforcement — read continuum-roles cookie, check PORTAL_ROLE_MAP
  //    Only applies to portal page routes, NOT API routes (those use requireRole server-side)
  if (!isApiRoute(pathname)) {
    const portalPrefix = Object.keys(PORTAL_ROLE_MAP).find((prefix) => pathname.startsWith(prefix + '/') || pathname === prefix);

    if (portalPrefix) {
      const rolesCookie = request.cookies.get('continuum-roles')?.value;

      if (!rolesCookie) {
        // No role cookie → not authenticated, redirect to sign-in
        const signInUrl = request.nextUrl.clone();
        signInUrl.pathname = '/sign-in';
        signInUrl.searchParams.set('redirect', pathname);
        signInUrl.searchParams.set('error', 'auth_required');
        return NextResponse.redirect(signInUrl);
      }

      const userRoles = rolesCookie.split(',').map((r) => r.trim().toLowerCase());
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
        const primaryRole = request.cookies.get('continuum-role')?.value?.toLowerCase() || userRoles[0];
        let correctPortal = '/employee/dashboard';
        if (primaryRole === 'admin') correctPortal = '/admin/dashboard';
        else if (primaryRole === 'hr') correctPortal = '/hr/dashboard';
        else if (['manager', 'director', 'team_lead'].includes(primaryRole)) correctPortal = '/manager/dashboard';

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
