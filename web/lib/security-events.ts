/**
 * Structured security events for Better Stack alerts and audit correlation.
 */
import { logger } from '@/lib/logger';

export type SecurityEventType =
  | 'auth.login_failed'
  | 'auth.login_failed_threshold'
  | 'auth.rate_limited'
  | 'request.blocked_ip'
  | 'request.threat_detected'
  | 'request.rate_limited'
  | 'password.breached_rejected';

export interface SecurityEventPayload {
  type: SecurityEventType;
  message: string;
  ip?: string;
  path?: string;
  method?: string;
  requestId?: string;
  identifier?: string;
  companyId?: string;
  userId?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  metadata?: Record<string, unknown>;
}

export function logSecurityEvent(payload: SecurityEventPayload): void {
  const level =
    payload.severity === 'critical' || payload.severity === 'high' ? 'error' : 'warn';

  const context = {
    event: payload.type,
    security: true,
    severity: payload.severity || 'medium',
    ip: payload.ip,
    path: payload.path,
    method: payload.method,
    requestId: payload.requestId,
    identifier: payload.identifier,
    companyId: payload.companyId,
    userId: payload.userId,
    ...payload.metadata,
  };

  if (level === 'error') {
    logger.error(payload.message, context);
  } else {
    logger.warn(payload.message, context);
  }
}
