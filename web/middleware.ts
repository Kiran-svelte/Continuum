import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

// ─── Configuration ──────────────────────────────────────────────────────────

// Public routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/hr/sign-in',
  '/hr/sign-up',
  '/employee/sign-in',
  '/employee/sign-up',
  '/status',
  '/api/health',
  '/api/enterprise/metrics',
];

// API routes that are public
const PUBLIC_API_PATTERNS = [
  '/api/health',
  '/api/enterprise/metrics',
  '/api/security/env-check',
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
  '/hr': ['admin', 'hr'],
  '/admin': ['admin'],
  '/manager': ['admin', 'hr', 'director', 'manager'],
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
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.pusher.com https://*.pusher.com;"
  );
  response.headers.set('X-DNS-Prefetch-Control', 'on');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
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
  
  // 1. Skip static files and Next.js internals
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // 2. Security headers on all responses
  const response = NextResponse.next({
    request: { headers: request.headers },
  });
  addSecurityHeaders(response);

  // 3. Rate limiting for API routes
  if (isApiRoute(pathname)) {
    const clientIP = getClientIP(request);
    const { allowed, remaining } = checkRateLimit(clientIP, pathname);
    
    response.headers.set('X-RateLimit-Remaining', String(remaining));
    
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-Frame-Options': 'DENY',
            'X-Content-Type-Options': 'nosniff',
            'Retry-After': '60',
          }
        }
      );
    }
  }

  // 4. Public routes — allow through
  if (isPublicRoute(pathname) || isPublicApiRoute(pathname)) {
    return response;
  }

  // 5. Cron routes — verify CRON_SECRET
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

  // 6. Supabase session refresh
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[]) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // 7. Auth check
    if (!user) {
      if (isApiRoute(pathname)) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401, headers: { 'X-Frame-Options': 'DENY' } }
        );
      }
      // Redirect to appropriate sign-in page
      const signInUrl = new URL('/sign-in', request.url);
      signInUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(signInUrl);
    }

    // 8. Sensitive route logging
    if (isSensitiveRoute(pathname)) {
      const clientIP = getClientIP(request);
      console.log(
        `[SECURITY] Sensitive route access: ${request.method} ${pathname} by ${user.email} from ${clientIP} at ${new Date().toISOString()}`
      );
    }

  } catch (error) {
    // If Supabase is not configured, allow in development
    if (process.env.NODE_ENV === 'development') {
      console.warn('[MIDDLEWARE] Supabase not configured, allowing in development');
      return response;
    }
    
    if (isApiRoute(pathname)) {
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }
    
    return NextResponse.redirect(new URL('/sign-in', request.url));
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
