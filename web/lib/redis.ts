import { Redis } from '@upstash/redis';

/**
 * Singleton Upstash Redis client.
 * Returns null if UPSTASH_REDIS_REST_URL is not configured — all callers
 * must handle the null case gracefully (fall back to in-memory).
 */

let client: Redis | null = null;
let initAttempted = false;

export function getRedisClient(): Redis | null {
  if (initAttempted) return client;
  initAttempted = true;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();

  if (!url || !token) {
    console.warn('[Redis] UPSTASH_REDIS_REST_URL/TOKEN not set — using in-memory fallback');
    return null;
  }

  try {
    client = new Redis({ url, token });
    console.log('[Redis] Upstash client initialized');
    return client;
  } catch (error) {
    console.error('[Redis] Failed to initialize:', error);
    return null;
  }
}

/**
 * Redis-backed sliding window rate limiter.
 * Falls back to returning `allowed: true` if Redis is unavailable.
 *
 * @param key - Unique rate limit key (e.g., `rl:api:192.168.1.1:/api/auth`)
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowSeconds - Time window in seconds (default: 60)
 */
export async function redisRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number = 60
): Promise<{ allowed: boolean; remaining: number; resetAt: number }> {
  const redis = getRedisClient();
  if (!redis) {
    // No Redis — allow (in-memory limiter is the fallback)
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
  }

  try {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = now - windowMs;

    // Use a sorted set with timestamps as scores
    // Pipeline: remove old entries, add current, count, set expiry
    const pipeline = redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zadd(key, { score: now, member: `${now}:${Math.random().toString(36).slice(2, 8)}` });
    pipeline.zcard(key);
    pipeline.expire(key, windowSeconds + 1);

    const results = await pipeline.exec();
    const count = (results[2] as number) || 0;

    const allowed = count <= maxRequests;
    const remaining = Math.max(0, maxRequests - count);
    const resetAt = now + windowMs;

    return { allowed, remaining, resetAt };
  } catch (error) {
    console.error('[Redis] Rate limit check failed:', error);
    // On Redis error, allow the request (fail open)
    return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
  }
}

/**
 * Redis-backed email rate limiter.
 * Uses a simple counter with TTL.
 */
export async function redisEmailRateLimit(maxPerMinute: number = 20): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return true; // No Redis — allow (in-memory fallback handles it)

  try {
    const key = 'rl:email:global';
    const count = await redis.incr(key);

    // Set expiry only on the first increment (when count is 1)
    if (count === 1) {
      await redis.expire(key, 60);
    }

    return count <= maxPerMinute;
  } catch {
    return true; // Fail open
  }
}
