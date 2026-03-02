/**
 * Prometheus Metrics Service for Continuum
 *
 * Collects:
 * - HTTP request metrics (duration, count, status codes)
 * - Business metrics (leaves, approvals, rejections, payroll runs)
 * - System metrics (DB connections, memory, CPU)
 * - Security metrics (auth failures, rate limits, OTP attempts)
 * - Tenant metrics (per-company usage)
 */

// ─── Imports ─────────────────────────────────────────────────────────────────

let promClient: typeof import('prom-client') | null = null;

try {
  promClient = require('prom-client');
} catch {
  console.warn('[metrics] prom-client not available — metrics collection disabled');
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface HttpRequestRecord {
  method: string;
  path: string;
  status: number;
  duration: number;
}

export interface LeaveRequestRecord {
  type: string;
  status: string;
  companyId: string;
}

export interface ConstraintEvalRecord {
  result: 'pass' | 'warn' | 'fail';
  companyId?: string;
}

// ─── Registry Setup ──────────────────────────────────────────────────────────

const registry = promClient ? new promClient.Registry() : null;

if (registry && promClient) {
  registry.setDefaultLabels({
    service: 'continuum-web',
    environment: process.env.NODE_ENV || 'development',
  });

  promClient.collectDefaultMetrics({ register: registry });
}

// ─── Helper: create metric or stub ──────────────────────────────────────────

type CounterLike = {
  inc(labels: Record<string, string | number>, value?: number): void;
  inc(value?: number): void;
};
type HistogramLike = {
  observe(labels: Record<string, string | number>, value: number): void;
  observe(value: number): void;
};
type GaugeLike = {
  set(labels: Record<string, string | number>, value: number): void;
  set(value: number): void;
  inc(labels: Record<string, string | number>, value?: number): void;
  inc(value?: number): void;
  dec(labels: Record<string, string | number>, value?: number): void;
  dec(value?: number): void;
};

function noopCounter(): CounterLike {
  return { inc: () => {} } as CounterLike;
}
function noopHistogram(): HistogramLike {
  return { observe: () => {} } as HistogramLike;
}
function noopGauge(): GaugeLike {
  return { set: () => {}, inc: () => {}, dec: () => {} } as GaugeLike;
}

// ─── HTTP Metrics ────────────────────────────────────────────────────────────

export const httpRequestsTotal: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'http_requests_total',
      help: 'Total HTTP requests',
      labelNames: ['method', 'path', 'status'],
      registers: [registry],
    })
  : noopCounter();

export const httpRequestDuration: HistogramLike = promClient && registry
  ? new promClient.Histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labelNames: ['method', 'path', 'status'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [registry],
    })
  : noopHistogram();

export const httpActiveRequests: GaugeLike = promClient && registry
  ? new promClient.Gauge({
      name: 'http_active_requests',
      help: 'Currently active HTTP requests',
      registers: [registry],
    })
  : noopGauge();

export function recordHttpRequest(method: string, path: string, status: number, duration: number): void {
  const labels = { method, path: normalizePath(path), status: String(status) };
  httpRequestsTotal.inc(labels);
  httpRequestDuration.observe(labels, duration);
}

// ─── Business Metrics ────────────────────────────────────────────────────────

export const leaveRequestsTotal: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'leave_requests_total',
      help: 'Total leave requests',
      labelNames: ['type', 'status', 'company_id'],
      registers: [registry],
    })
  : noopCounter();

export const leaveApprovalDuration: HistogramLike = promClient && registry
  ? new promClient.Histogram({
      name: 'leave_approval_duration_seconds',
      help: 'Time from leave submission to approval in seconds',
      labelNames: ['type', 'company_id'],
      buckets: [60, 300, 900, 3600, 14400, 43200, 86400, 259200],
      registers: [registry],
    })
  : noopHistogram();

export const activeEmployees: GaugeLike = promClient && registry
  ? new promClient.Gauge({
      name: 'active_employees',
      help: 'Active employees per company',
      labelNames: ['company_id'],
      registers: [registry],
    })
  : noopGauge();

export const payrollRunsTotal: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'payroll_runs_total',
      help: 'Total payroll runs',
      labelNames: ['status'],
      registers: [registry],
    })
  : noopCounter();

export const constraintEvaluations: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'constraint_evaluations_total',
      help: 'Constraint engine evaluations',
      labelNames: ['result'],
      registers: [registry],
    })
  : noopCounter();

export const slaBreaches: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'sla_breaches_total',
      help: 'SLA breaches per company',
      labelNames: ['company_id'],
      registers: [registry],
    })
  : noopCounter();

export const onboardingCompletions: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'onboarding_completions_total',
      help: 'New company onboarding completions',
      registers: [registry],
    })
  : noopCounter();

export function recordLeaveRequest(type: string, status: string, companyId: string): void {
  leaveRequestsTotal.inc({ type, status, company_id: companyId });
}

export function recordApproval(type: string, companyId: string, durationSeconds: number): void {
  leaveApprovalDuration.observe({ type, company_id: companyId }, durationSeconds);
}

export function recordPayrollRun(status: string): void {
  payrollRunsTotal.inc({ status });
}

export function recordConstraintEval(result: 'pass' | 'warn' | 'fail'): void {
  constraintEvaluations.inc({ result });
}

export function recordSLABreach(companyId: string): void {
  slaBreaches.inc({ company_id: companyId });
}

// ─── Security Metrics ────────────────────────────────────────────────────────

export const authFailures: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'auth_failures_total',
      help: 'Authentication failures',
      labelNames: ['reason'],
      registers: [registry],
    })
  : noopCounter();

export const rateLimitHits: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'rate_limit_hits_total',
      help: 'Rate limit hits',
      labelNames: ['endpoint'],
      registers: [registry],
    })
  : noopCounter();

export const otpAttempts: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'otp_attempts_total',
      help: 'OTP verification attempts',
      labelNames: ['action', 'result'],
      registers: [registry],
    })
  : noopCounter();

export const suspiciousRequests: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'suspicious_requests_total',
      help: 'Suspicious requests detected',
      labelNames: ['type'],
      registers: [registry],
    })
  : noopCounter();

export function recordAuthFailure(reason: string): void {
  authFailures.inc({ reason });
}

export function recordRateLimit(endpoint: string): void {
  rateLimitHits.inc({ endpoint });
}

export function recordOTPAttempt(action: string, result: 'success' | 'failure'): void {
  otpAttempts.inc({ action, result });
}

export function recordSuspiciousRequest(type: string): void {
  suspiciousRequests.inc({ type });
}

// ─── System Metrics ──────────────────────────────────────────────────────────

export const dbQueryDuration: HistogramLike = promClient && registry
  ? new promClient.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Database query duration in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [registry],
    })
  : noopHistogram();

export const dbConnectionPool: GaugeLike = promClient && registry
  ? new promClient.Gauge({
      name: 'db_connection_pool',
      help: 'Database connection pool status',
      labelNames: ['state'],
      registers: [registry],
    })
  : noopGauge();

export const cacheHitRate: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'cache_operations_total',
      help: 'Cache hit/miss counts',
      labelNames: ['result'],
      registers: [registry],
    })
  : noopCounter();

export const emailSendDuration: HistogramLike = promClient && registry
  ? new promClient.Histogram({
      name: 'email_send_duration_seconds',
      help: 'Email send duration in seconds',
      labelNames: ['template'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30],
      registers: [registry],
    })
  : noopHistogram();

export const constraintEngineLatency: HistogramLike = promClient && registry
  ? new promClient.Histogram({
      name: 'constraint_engine_latency_seconds',
      help: 'Constraint engine (Python) response time in seconds',
      labelNames: ['endpoint'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
      registers: [registry],
    })
  : noopHistogram();

// ─── Tenant Metrics ──────────────────────────────────────────────────────────

export const tenantApiCalls: CounterLike = promClient && registry
  ? new promClient.Counter({
      name: 'tenant_api_calls_total',
      help: 'API calls per tenant',
      labelNames: ['company_id', 'endpoint'],
      registers: [registry],
    })
  : noopCounter();

export const tenantStorageUsage: GaugeLike = promClient && registry
  ? new promClient.Gauge({
      name: 'tenant_storage_usage_bytes',
      help: 'Storage usage per tenant in bytes',
      labelNames: ['company_id'],
      registers: [registry],
    })
  : noopGauge();

// ─── Export Functions ────────────────────────────────────────────────────────

export async function getMetrics(): Promise<string> {
  if (!registry) {
    return '# prom-client not available\n';
  }
  return registry.metrics();
}

export async function getMetricsJSON(): Promise<Record<string, unknown>[]> {
  if (!registry) {
    return [];
  }
  return registry.getMetricsAsJSON() as unknown as Record<string, unknown>[];
}

export function resetMetrics(): void {
  if (registry) {
    registry.resetMetrics();
  }
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/** Normalize URL paths to avoid high-cardinality labels (replace IDs with :id) */
function normalizePath(path: string): string {
  return path
    .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '/:id')
    .replace(/\/\d+/g, '/:id')
    .replace(/\?.*$/, '');
}

export { registry };
