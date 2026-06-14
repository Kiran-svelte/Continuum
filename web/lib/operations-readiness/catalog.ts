/**
 * Production operations categories (20) — single source of truth for ops readiness UI and API.
 */

export type OpsTier = 'critical' | 'highly' | 'scaling';

export type OpsStatus = 'complete' | 'partial' | 'missing' | 'platform';

export interface OpsCategoryDefinition {
  id: number;
  category: string;
  tier: OpsTier;
  why: string;
  /** What "complete" means for this category */
  completeCriteria: string;
}

export const OPERATIONS_CATEGORIES: OpsCategoryDefinition[] = [
  { id: 1, category: 'Monitoring', tier: 'critical', why: 'Know when things break', completeCriteria: 'Uptime monitors on production URL + /api/health' },
  { id: 2, category: 'Database Backups', tier: 'critical', why: 'Recover from data loss', completeCriteria: 'Neon PITR/backups enabled + restore procedure documented' },
  { id: 3, category: 'Error Tracking', tier: 'critical', why: 'Debug issues users face', completeCriteria: 'Sentry DSN on production + global error capture' },
  { id: 4, category: 'Logging', tier: 'critical', why: 'Investigate incidents', completeCriteria: 'Structured logs shipped to Better Stack / drain' },
  { id: 5, category: 'Alerting', tier: 'critical', why: 'Get notified before users', completeCriteria: 'Log/uptime alerts for 5xx and health failures' },
  { id: 6, category: 'Security', tier: 'critical', why: 'Protect user data', completeCriteria: 'Headers, rate limits, HIBP, audit, module gates' },
  { id: 7, category: 'SSL Certificate', tier: 'critical', why: 'HTTPS encryption', completeCriteria: 'Custom domain HTTPS (continuum.support)' },
  { id: 8, category: 'Authentication', tier: 'critical', why: 'User identity', completeCriteria: 'JWT secrets, refresh rotation, RBAC' },
  { id: 9, category: 'Rate Limiting', tier: 'critical', why: 'Prevent abuse', completeCriteria: 'Middleware + API rate limits + Redis when configured' },
  { id: 10, category: 'Environment Management', tier: 'critical', why: 'Dev/Staging/Prod separation', completeCriteria: 'Separate env vars per Vercel environment' },
  { id: 11, category: 'CI/CD Pipeline', tier: 'highly', why: 'Deploy without breaking', completeCriteria: 'GitHub Actions: test, typecheck, build on PR' },
  { id: 12, category: 'Disaster Recovery Plan', tier: 'highly', why: 'Survive major failures', completeCriteria: 'Written DR runbook + RTO/RPO' },
  { id: 13, category: 'Performance Monitoring', tier: 'highly', why: 'Find slow parts', completeCriteria: 'Sentry traces or APM on key routes' },
  { id: 14, category: 'Cost Monitoring', tier: 'highly', why: 'Avoid surprise bills', completeCriteria: 'Billing alerts on Vercel/Neon/Better Stack' },
  { id: 15, category: 'Compliance (GDPR/SOC2)', tier: 'highly', why: 'Legal requirements', completeCriteria: 'Privacy policy, audit, data retention docs' },
  { id: 16, category: 'Load Balancing', tier: 'scaling', why: 'Handle traffic spikes', completeCriteria: 'Platform edge load balancing (Vercel)' },
  { id: 17, category: 'Auto-scaling', tier: 'scaling', why: 'Handle growth', completeCriteria: 'Serverless auto-scale (Vercel functions)' },
  { id: 18, category: 'Database Replication', tier: 'scaling', why: 'High availability', completeCriteria: 'Neon pooled + direct URLs, HA tier' },
  { id: 19, category: 'CDN', tier: 'scaling', why: 'Fast global loading', completeCriteria: 'Vercel Edge CDN for static assets' },
  { id: 20, category: 'Status Page', tier: 'scaling', why: 'Inform users during outages', completeCriteria: 'Public /status with live health checks' },
];
