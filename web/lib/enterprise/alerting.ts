/**
 * Alert Manager for Continuum
 *
 * Triggers alerts based on metrics thresholds.
 * Dispatches via email/notifications.
 */

import { logger } from './logger';

// ─── Types ───────────────────────────────────────────────────────────────────

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertState = 'firing' | 'acknowledged' | 'resolved';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  condition: () => Promise<boolean>;
  cooldownMs: number;
}

export interface Alert {
  id: string;
  ruleId: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  state: AlertState;
  firedAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  metadata?: Record<string, unknown>;
}

// ─── State ───────────────────────────────────────────────────────────────────

const activeAlerts = new Map<string, Alert>();
const lastFired = new Map<string, number>();
let alertIdCounter = 0;

// ─── Metric Accessors ────────────────────────────────────────────────────────

async function getMetricValue(
  getter: () => Promise<number>,
  fallback: number = 0
): Promise<number> {
  try {
    return await getter();
  } catch {
    return fallback;
  }
}

// ─── Alert Rules ─────────────────────────────────────────────────────────────

export const defaultAlertRules: AlertRule[] = [
  {
    id: 'high_error_rate',
    name: 'High Error Rate',
    description: 'HTTP error rate exceeds 5%',
    severity: 'critical',
    cooldownMs: 5 * 60 * 1000,
    condition: async () => {
      const { getMetricsJSON } = await import('./metrics');
      const metrics = await getMetricsJSON();
      const httpTotal = metrics.find(
        (m) => (m as { name?: string }).name === 'http_requests_total'
      );
      if (!httpTotal) return false;

      const values = ((httpTotal as { values?: Array<{ labels?: { status?: string }; value?: number }> }).values) || [];
      const total = values.reduce((sum: number, v: { value?: number }) => sum + (v.value || 0), 0);
      const errors = values
        .filter((v: { labels?: { status?: string } }) => {
          const status = Number(v.labels?.status || 0);
          return status >= 500;
        })
        .reduce((sum: number, v: { value?: number }) => sum + (v.value || 0), 0);

      return total > 100 && errors / total > 0.05;
    },
  },
  {
    id: 'high_response_time',
    name: 'High Response Time',
    description: 'P95 response time exceeds 5 seconds',
    severity: 'warning',
    cooldownMs: 10 * 60 * 1000,
    condition: async () => {
      const { getMetricsJSON } = await import('./metrics');
      const metrics = await getMetricsJSON();
      const duration = metrics.find(
        (m) => (m as { name?: string }).name === 'http_request_duration_seconds'
      );
      if (!duration) return false;

      const values = ((duration as { values?: Array<{ labels?: { quantile?: string }; value?: number }> }).values) || [];
      const p95 = values.find(
        (v: { labels?: { quantile?: string } }) => v.labels?.quantile === '0.95'
      );
      return (p95?.value || 0) > 5;
    },
  },
  {
    id: 'sla_breach_spike',
    name: 'SLA Breach Spike',
    description: 'More than 10 SLA breaches in the evaluation window',
    severity: 'critical',
    cooldownMs: 30 * 60 * 1000,
    condition: async () => {
      const value = await getMetricValue(async () => {
        const { getMetricsJSON } = await import('./metrics');
        const metrics = await getMetricsJSON();
        const sla = metrics.find(
          (m) => (m as { name?: string }).name === 'sla_breaches_total'
        );
        const values = ((sla as { values?: Array<{ value?: number }> })?.values) || [];
        return values.reduce((sum: number, v: { value?: number }) => sum + (v.value || 0), 0);
      });
      return value > 10;
    },
  },
  {
    id: 'auth_failure_spike',
    name: 'Authentication Failure Spike',
    description: 'More than 20 auth failures detected — possible attack',
    severity: 'critical',
    cooldownMs: 15 * 60 * 1000,
    condition: async () => {
      const value = await getMetricValue(async () => {
        const { getMetricsJSON } = await import('./metrics');
        const metrics = await getMetricsJSON();
        const auth = metrics.find(
          (m) => (m as { name?: string }).name === 'auth_failures_total'
        );
        const values = ((auth as { values?: Array<{ value?: number }> })?.values) || [];
        return values.reduce((sum: number, v: { value?: number }) => sum + (v.value || 0), 0);
      });
      return value > 20;
    },
  },
  {
    id: 'high_db_latency',
    name: 'High Database Latency',
    description: 'Database query p99 exceeds 2 seconds',
    severity: 'warning',
    cooldownMs: 10 * 60 * 1000,
    condition: async () => {
      const { getMetricsJSON } = await import('./metrics');
      const metrics = await getMetricsJSON();
      const dbDuration = metrics.find(
        (m) => (m as { name?: string }).name === 'db_query_duration_seconds'
      );
      if (!dbDuration) return false;

      const values = ((dbDuration as { values?: Array<{ labels?: { quantile?: string }; value?: number }> }).values) || [];
      const p99 = values.find(
        (v: { labels?: { quantile?: string } }) => v.labels?.quantile === '0.99'
      );
      return (p99?.value || 0) > 2;
    },
  },
  {
    id: 'high_memory_usage',
    name: 'High Memory Usage',
    description: 'Heap memory usage exceeds 85%',
    severity: 'warning',
    cooldownMs: 10 * 60 * 1000,
    condition: async () => {
      const usage = process.memoryUsage();
      const percent = (usage.heapUsed / usage.heapTotal) * 100;
      return percent > 85;
    },
  },
];

// ─── Alert Evaluation ────────────────────────────────────────────────────────

export async function evaluateAlerts(
  rules: AlertRule[] = defaultAlertRules
): Promise<Alert[]> {
  const newAlerts: Alert[] = [];

  for (const rule of rules) {
    try {
      const lastFiredAt = lastFired.get(rule.id) || 0;
      if (Date.now() - lastFiredAt < rule.cooldownMs) continue;

      const triggered = await rule.condition();
      if (triggered) {
        const existing = Array.from(activeAlerts.values()).find(
          (a) => a.ruleId === rule.id && a.state === 'firing'
        );

        if (!existing) {
          const alert: Alert = {
            id: `alert_${++alertIdCounter}_${Date.now()}`,
            ruleId: rule.id,
            name: rule.name,
            description: rule.description,
            severity: rule.severity,
            state: 'firing',
            firedAt: new Date(),
          };

          activeAlerts.set(alert.id, alert);
          lastFired.set(rule.id, Date.now());
          newAlerts.push(alert);

          logger.security(`Alert fired: ${rule.name}`, {
            alertId: alert.id,
            severity: rule.severity,
            description: rule.description,
          });
        }
      } else {
        // Auto-resolve firing alerts for this rule
        const entries = Array.from(activeAlerts.entries());
        for (const [id, alert] of entries) {
          if (alert.ruleId === rule.id && alert.state === 'firing') {
            alert.state = 'resolved';
            alert.resolvedAt = new Date();
            activeAlerts.set(id, alert);

            logger.info(`Alert resolved: ${rule.name}`, { alertId: id });
          }
        }
      }
    } catch (err) {
      logger.error(`Error evaluating alert rule: ${rule.id}`, err instanceof Error ? err : null);
    }
  }

  return newAlerts;
}

// ─── Alert Dispatch ──────────────────────────────────────────────────────────

export async function sendAlert(alert: Alert): Promise<void> {
  logger.warn(`[ALERT] ${alert.severity.toUpperCase()}: ${alert.name}`, {
    alertId: alert.id,
    description: alert.description,
    firedAt: alert.firedAt.toISOString(),
  });

  // Attempt email notification for critical alerts
  if (alert.severity === 'critical') {
    try {
      const adminEmail = process.env.ADMIN_ALERT_EMAIL;
      if (adminEmail) {
        const { sendEmail } = await import('../email-service');
        await sendEmail(
          adminEmail,
          `[Continuum Alert] ${alert.severity.toUpperCase()}: ${alert.name}`,
          `
            <h2>Alert: ${alert.name}</h2>
            <p><strong>Severity:</strong> ${alert.severity}</p>
            <p><strong>Description:</strong> ${alert.description}</p>
            <p><strong>Time:</strong> ${alert.firedAt.toISOString()}</p>
            <p><strong>Alert ID:</strong> ${alert.id}</p>
          `
        );
      }
    } catch (err) {
      logger.error('Failed to send alert email', err instanceof Error ? err : null);
    }
  }
}

// ─── Alert Management ────────────────────────────────────────────────────────

export function getActiveAlerts(): Alert[] {
  return Array.from(activeAlerts.values()).filter(
    (a) => a.state === 'firing' || a.state === 'acknowledged'
  );
}

export function getAllAlerts(): Alert[] {
  return Array.from(activeAlerts.values());
}

export function acknowledgeAlert(alertId: string, acknowledgedBy?: string): boolean {
  const alert = activeAlerts.get(alertId);
  if (!alert || alert.state !== 'firing') return false;

  alert.state = 'acknowledged';
  alert.acknowledgedAt = new Date();
  alert.acknowledgedBy = acknowledgedBy;
  activeAlerts.set(alertId, alert);

  logger.info(`Alert acknowledged: ${alert.name}`, {
    alertId,
    acknowledgedBy: acknowledgedBy || 'unknown',
  });

  return true;
}

export function resolveAlert(alertId: string): boolean {
  const alert = activeAlerts.get(alertId);
  if (!alert || alert.state === 'resolved') return false;

  alert.state = 'resolved';
  alert.resolvedAt = new Date();
  activeAlerts.set(alertId, alert);

  logger.info(`Alert manually resolved: ${alert.name}`, { alertId });
  return true;
}

export function clearResolvedAlerts(): void {
  const entries = Array.from(activeAlerts.entries());
  for (const [id, alert] of entries) {
    if (alert.state === 'resolved') {
      activeAlerts.delete(id);
    }
  }
}
