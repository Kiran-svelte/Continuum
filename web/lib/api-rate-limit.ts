// ─── Types ───────────────────────────────────────────────────────────────────

export interface RateLimitOptions {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  limit: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// ─── Default Limits ──────────────────────────────────────────────────────────

const DEFAULT_LIMITS: Record<string, RateLimitOptions> = {
  general: { maxRequests: 30, windowMs: 60_000 },
  'leaves/submit': { maxRequests: 5, windowMs: 60_000 },
  'leaves/approve': { maxRequests: 10, windowMs: 60_000 },
  'leaves/reject': { maxRequests: 10, windowMs: 60_000 },
  auth: { maxRequests: 10, windowMs: 60_000 },
  'security/otp': { maxRequests: 5, windowMs: 60_000 },
  export: { maxRequests: 3, windowMs: 60_000 },
  payroll: { maxRequests: 5, windowMs: 60_000 },
};

// ─── In-Memory Store ─────────────────────────────────────────────────────────

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000; // 1 minute
let lastCleanup = Date.now();

function cleanupExpired(): void {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
  lastCleanup = now;

  for (const [key, entry] of store) {
    if (entry.resetAt <= now) {
      store.delete(key);
    }
  }
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Checks rate limit for an identifier + endpoint combination.
 * Uses in-memory Map with TTL-based cleanup.
 */
export function checkApiRateLimit(
  identifier: string,
  endpoint: string,
  options?: Partial<RateLimitOptions>
): RateLimitResult {
  cleanupExpired();

  const limits = {
    ...(DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS.general),
    ...options,
  };

  const key = `${identifier}:${endpoint}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = {
      count: 0,
      resetAt: now + limits.windowMs,
    };
    store.set(key, entry);
  }

  entry.count++;

  const allowed = entry.count <= limits.maxRequests;
  const remaining = Math.max(0, limits.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: new Date(entry.resetAt),
    limit: limits.maxRequests,
  };
}

/** Returns X-RateLimit-* headers from a rate limit result */
export function getRateLimitHeaders(
  result: RateLimitResult
): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': result.resetAt.toISOString(),
  };
}

/** Resets the rate limit store (for testing) */
export function resetRateLimitStore(): void {
  store.clear();
}
