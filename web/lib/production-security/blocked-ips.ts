/**
 * Static and dynamic IP blocklist.
 * Static: SECURITY_BLOCKED_IPS env (all runtimes).
 * Dynamic: in-memory per instance + Redis when available (distributed auto-block).
 */

import { getRedisClient } from '@/lib/redis';

const STATIC_BLOCKED = new Set<string>();
let staticLoaded = false;

const DYNAMIC_BLOCK_PREFIX = 'security:blocked:';
const DEFAULT_BLOCK_TTL_SEC = 60 * 60;

function loadStaticBlockedIps(): void {
  if (staticLoaded) return;
  staticLoaded = true;
  const raw =
    process.env.SECURITY_BLOCKED_IPS?.trim() ||
    process.env.BLOCKED_IPS?.trim() ||
    '';
  if (!raw) return;
  for (const ip of raw.split(',')) {
    const trimmed = ip.trim();
    if (trimmed) STATIC_BLOCKED.add(trimmed);
  }
}

/** In-memory dynamic blocks (per serverless instance). */
const dynamicBlocked = new Map<string, number>();

export function isBlockedIp(ip: string): boolean {
  if (!ip || ip === 'unknown') return false;
  loadStaticBlockedIps();
  if (STATIC_BLOCKED.has(ip)) return true;

  const until = dynamicBlocked.get(ip);
  if (!until) return false;
  if (Date.now() > until) {
    dynamicBlocked.delete(ip);
    return false;
  }
  return true;
}

/**
 * Async check including Redis-backed blocks (use in middleware).
 */
export async function isBlockedIpAsync(ip: string): Promise<boolean> {
  if (isBlockedIp(ip)) return true;

  const redis = getRedisClient();
  if (!redis || !ip || ip === 'unknown') return false;

  try {
    const key = `${DYNAMIC_BLOCK_PREFIX}${ip}`;
    const value = await redis.get(key);
    return value === '1' || value === 1;
  } catch {
    return false;
  }
}

export function blockIpTemporarily(
  ip: string,
  ttlMs: number = DEFAULT_BLOCK_TTL_SEC * 1000,
): void {
  if (!ip || ip === 'unknown') return;
  dynamicBlocked.set(ip, Date.now() + ttlMs);

  const redis = getRedisClient();
  if (!redis) return;

  const ttlSec = Math.max(1, Math.ceil(ttlMs / 1000));
  void redis.set(`${DYNAMIC_BLOCK_PREFIX}${ip}`, '1', { ex: ttlSec }).catch(() => {});
}

export function clearBlockedIpsForTests(): void {
  dynamicBlocked.clear();
  STATIC_BLOCKED.clear();
  staticLoaded = false;
}
