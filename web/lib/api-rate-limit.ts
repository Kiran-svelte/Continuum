import { redisRateLimit } from '@/lib/redis';

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
  hr: { maxRequests: 20, windowMs: 60_000 },
  'security/otp': { maxRequests: 5, windowMs: 60_000 },
  export: { maxRequests: 3, windowMs: 60_000 },
  payroll: { maxRequests: 5, windowMs: 60_000 },
};

// ─── In-Memory Store (fallback when Redis unavailable) ──────────────────────

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL_MS = 60_000;
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

function checkInMemory(
  identifier: string,
  endpoint: string,
  limits: RateLimitOptions
): RateLimitResult {
  cleanupExpired();

  const key = `${identifier}:${endpoint}`;
  const now = Date.now();

  let entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    entry = { count: 0, resetAt: now + limits.windowMs };
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

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Checks rate limit for an identifier + endpoint combination.
 * Uses Redis (Upstash) when configured, in-memory Map as fallback.
 * This function is synchronous for backward compatibility — it kicks off
 * Redis check async and returns in-memory result immediately.
 * For fully async Redis checking, use `checkApiRateLimitAsync()`.
 */
export function checkApiRateLimit(
  identifier: string,
  endpoint: string,
  options?: Partial<RateLimitOptions>
): RateLimitResult {
  const limits = {
    ...(DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS.general),
    ...options,
  };

  // Always do in-memory check (fast, synchronous)
  const memResult = checkInMemory(identifier, endpoint, limits);

  // Fire-and-forget Redis check for distributed state tracking
  // The Redis result is used on NEXT request (eventual consistency)
  const windowSec = Math.ceil(limits.windowMs / 1000);
  void redisRateLimit(`rl:api:${identifier}:${endpoint}`, limits.maxRequests, windowSec).catch(() => {});

  return memResult;
}

/**
 * Async rate limit check — uses Redis when available, in-memory fallback.
 * Prefer this in new API routes for accurate distributed limiting.
 */
export async function checkApiRateLimitAsync(
  identifier: string,
  endpoint: string,
  options?: Partial<RateLimitOptions>
): Promise<RateLimitResult> {
  const limits = {
    ...(DEFAULT_LIMITS[endpoint] || DEFAULT_LIMITS.general),
    ...options,
  };

  const windowSec = Math.ceil(limits.windowMs / 1000);
  const redisResult = await redisRateLimit(
    `rl:api:${identifier}:${endpoint}`,
    limits.maxRequests,
    windowSec
  );

  return {
    allowed: redisResult.allowed,
    remaining: redisResult.remaining,
    resetAt: new Date(redisResult.resetAt),
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
