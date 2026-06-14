/**
 * Failed login tracking + Better Stack alert events (P0).
 */
import { getRedisClient } from '@/lib/redis';
import { logSecurityEvent } from '@/lib/security-events';
import { blockIpTemporarily } from '@/lib/production-security/blocked-ips';

const WINDOW_SEC = Number.parseInt(process.env.AUTH_FAILED_LOGIN_WINDOW_SEC || '900', 10);
const THRESHOLD = Number.parseInt(process.env.AUTH_FAILED_LOGIN_ALERT_THRESHOLD || '5', 10);
const AUTO_BLOCK_THRESHOLD = Number.parseInt(
  process.env.AUTH_FAILED_LOGIN_AUTO_BLOCK_THRESHOLD || '15',
  10,
);

const memoryFailures = new Map<string, { count: number; resetAt: number }>();

async function incrementFailureCounter(ip: string): Promise<number> {
  const redis = getRedisClient();
  const key = `auth:fail:${ip}`;

  if (redis) {
    try {
      const count = await redis.incr(key);
      if (count === 1) {
        await redis.expire(key, WINDOW_SEC);
      }
      return count;
    } catch {
      // fall through to memory
    }
  }

  const now = Date.now();
  const entry = memoryFailures.get(ip);
  if (!entry || now > entry.resetAt) {
    memoryFailures.set(ip, { count: 1, resetAt: now + WINDOW_SEC * 1000 });
    return 1;
  }
  entry.count++;
  return entry.count;
}

export interface FailedLoginContext {
  ip: string;
  identifier?: string;
  requestId?: string;
  path?: string;
  reason?: string;
}

/**
 * Records a failed login and emits a security event when thresholds are exceeded.
 */
export async function recordFailedLoginAttempt(ctx: FailedLoginContext): Promise<void> {
  const count = await incrementFailureCounter(ctx.ip);

  logSecurityEvent({
    type: 'auth.login_failed',
    message: 'Failed login attempt',
    severity: 'medium',
    ip: ctx.ip,
    identifier: ctx.identifier,
    requestId: ctx.requestId,
    path: ctx.path || '/api/auth/signin',
    metadata: {
      failureCount: count,
      reason: ctx.reason,
    },
  });

  if (count >= THRESHOLD) {
    logSecurityEvent({
      type: 'auth.login_failed_threshold',
      message: `Failed login threshold exceeded (${count} in ${WINDOW_SEC}s)`,
      severity: 'high',
      ip: ctx.ip,
      identifier: ctx.identifier,
      requestId: ctx.requestId,
      path: ctx.path,
      metadata: { failureCount: count, windowSec: WINDOW_SEC },
    });
  }

  if (count >= AUTO_BLOCK_THRESHOLD) {
    blockIpTemporarily(ctx.ip);
    logSecurityEvent({
      type: 'request.blocked_ip',
      message: 'IP temporarily blocked after repeated failed logins',
      severity: 'critical',
      ip: ctx.ip,
      metadata: { failureCount: count, autoBlock: true },
    });
  }
}

export function resetFailedLoginStateForTests(): void {
  memoryFailures.clear();
}
