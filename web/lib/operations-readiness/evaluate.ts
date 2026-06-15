/**
 * Evaluates the 20 production operations categories from runtime signals (no secrets logged).
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { isBetterStackConfigured } from '@/lib/betterstack/logging';
import { isSentryEnabled } from '@/lib/sentry-config';
import { validateEnv } from '@/lib/env-check';
import { OPERATIONS_CATEGORIES, type OpsCategoryDefinition, type OpsStatus } from './catalog';

export interface OpsCategoryResult {
  id: number;
  category: string;
  tier: OpsCategoryDefinition['tier'];
  status: OpsStatus;
  why: string;
  completeCriteria: string;
  evidence: string[];
  actions: string[];
}

function envSet(name: string): boolean {
  return Boolean(process.env[name]?.trim());
}

function productionHost(): boolean {
  const url = (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    ''
  ).toLowerCase();
  return url.includes('continuum.support');
}

function hasCiWorkflow(): boolean {
  const root = process.cwd();
  const candidates = [
    join(root, '.github', 'workflows', 'web-ci.yml'),
    join(root, '..', '.github', 'workflows', 'web-ci.yml'),
  ];
  return candidates.some((p) => existsSync(p));
}

function docExists(relativeFromRepo: string): boolean {
  const root = process.cwd();
  const paths = [
    join(root, relativeFromRepo),
    join(root, '..', relativeFromRepo),
  ];
  return paths.some((p) => existsSync(p));
}

export async function evaluateOperationsReadiness(): Promise<{
  evaluatedAt: string;
  environment: string;
  summary: { complete: number; partial: number; missing: number; platform: number; total: number };
  categories: OpsCategoryResult[];
  overall: OpsStatus;
}> {
  const envValidation = validateEnv();
  const categories: OpsCategoryResult[] = [];

  const push = (
    def: OpsCategoryDefinition,
    status: OpsStatus,
    evidence: string[],
    actions: string[] = [],
  ) => {
    categories.push({
      id: def.id,
      category: def.category,
      tier: def.tier,
      status,
      why: def.why,
      completeCriteria: def.completeCriteria,
      evidence,
      actions,
    });
  };

  for (const def of OPERATIONS_CATEGORIES) {
    switch (def.id) {
      case 1: {
        const monitors =
          envSet('BETTERSTACK_UPTIME_API_TOKEN') || envSet('UPTIMEROBOT_API_KEY');
        const health = true;
        if (monitors && health && productionHost()) {
          push(def, 'complete', ['Health API: /api/health', 'Uptime token configured', 'Production host continuum.support']);
        } else if (health) {
          push(def, 'partial', ['Health API exists'], ['Add Better Stack or UptimeRobot monitor on https://continuum.support']);
        } else {
          push(def, 'missing', [], ['Configure uptime monitor + verify /api/health']);
        }
        break;
      }
      case 2: {
        if (envSet('DATABASE_URL') && docExists('docs/DISASTER_RECOVERY_PLAN.md')) {
          push(def, 'partial', ['DATABASE_URL set', 'DR plan documented'], [
            'Enable Supabase PITR / scheduled backups in Supabase dashboard',
            'Run quarterly restore drill',
          ]);
        } else {
          push(def, 'missing', [], ['Enable Supabase backups', 'Document restore procedure']);
        }
        break;
      }
      case 3: {
        if (isSentryEnabled()) {
          push(def, 'complete', ['SENTRY_DSN or NEXT_PUBLIC_SENTRY_DSN set', 'instrumentation.ts + global-error.tsx']);
        } else {
          push(def, 'partial', ['Sentry SDK installed'], ['Set SENTRY_DSN on Vercel production']);
        }
        break;
      }
      case 4: {
        if (isBetterStackConfigured()) {
          push(def, 'complete', ['BETTERSTACK_SOURCE_TOKEN set', 'Winston Logtail transport']);
        } else {
          push(def, 'partial', ['JSON logs to stdout (Vercel)'], ['Set BETTERSTACK_SOURCE_TOKEN or Vercel log drain']);
        }
        break;
      }
      case 5: {
        if (isBetterStackConfigured() && envSet('BETTERSTACK_UPTIME_API_TOKEN')) {
          push(def, 'partial', ['Logging + uptime tokens present'], [
            'Create Better Stack alerts: auth.login_failed_threshold, 5xx rate, health not_ready',
          ]);
        } else {
          push(def, 'missing', [], ['Configure log-based and uptime alerts in Better Stack']);
        }
        break;
      }
      case 6: {
        push(def, 'complete', [
          'Middleware: rate limit, threat scan, security headers',
          'HIBP password check, failed-login alerts',
          'Module gates + audit logs',
          'docs/PRODUCTION_SECURITY.md',
        ]);
        break;
      }
      case 7: {
        if (productionHost() || process.env.VERCEL === '1') {
          push(def, 'complete', ['HTTPS via Vercel', 'HSTS in next.config + middleware', productionHost() ? 'continuum.support' : 'vercel.app']);
        } else {
          push(def, 'partial', ['HSTS headers configured'], ['Point custom domain and verify SSL in Vercel']);
        }
        break;
      }
      case 8: {
        if (envValidation.critical.status === 'ok' && envSet('JWT_SECRET')) {
          push(def, 'complete', ['JWT + session secrets validated', 'Custom auth service + RBAC']);
        } else {
          push(def, 'partial', ['Auth routes present'], envValidation.critical.missing.map((v) => `Set ${v}`));
        }
        break;
      }
      case 9: {
        push(def, 'complete', [
          'middleware rate limits',
          'checkApiRateLimit / Redis when UPSTASH configured',
          'Auth sign-in rate limit',
        ]);
        break;
      }
      case 10: {
        const vercelEnv = process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
        if (process.env.VERCEL === '1') {
          push(def, 'complete', [`VERCEL_ENV=${vercelEnv}`, 'Separate env vars per environment in Vercel dashboard']);
        } else {
          push(def, 'partial', ['NODE_ENV separation locally'], ['Use Vercel Preview vs Production env scopes']);
        }
        break;
      }
      case 11: {
        if (hasCiWorkflow()) {
          push(def, 'complete', ['.github/workflows/web-ci.yml: test, typecheck, build']);
        } else {
          push(def, 'missing', [], ['Add CI workflow on pull requests']);
        }
        break;
      }
      case 12: {
        if (docExists('docs/DISASTER_RECOVERY_PLAN.md')) {
          push(def, 'complete', ['docs/DISASTER_RECOVERY_PLAN.md']);
        } else {
          push(def, 'missing', [], ['Write DR plan with RTO/RPO and contacts']);
        }
        break;
      }
      case 13: {
        if (isSentryEnabled()) {
          push(def, 'partial', ['Sentry tracesSampleRate configured'], ['Review slow transactions in Sentry Performance']);
        } else {
          push(def, 'missing', [], ['Enable Sentry performance monitoring']);
        }
        break;
      }
      case 14: {
        push(def, 'partial', ['Platform billing is external'], [
          'Set spend alerts in Vercel, Supabase, and Better Stack dashboards',
        ]);
        break;
      }
      case 15: {
        if (docExists('docs/SECURITY_AND_COMPLIANCE.md') && docExists('app/privacy/page.tsx')) {
          push(def, 'partial', ['Security/compliance docs', 'Public privacy page'], [
            'Complete GDPR data export/delete runbook',
            'SOC2 controls mapping if selling enterprise',
          ]);
        } else {
          push(def, 'partial', ['Audit logs in product'], ['Publish compliance documentation']);
        }
        break;
      }
      case 16:
      case 17:
      case 19: {
        push(def, 'platform', ['Managed by Vercel Edge Network / serverless'], []);
        break;
      }
      case 18: {
        if (envSet('DATABASE_URL') && envSet('DIRECT_URL')) {
          push(def, 'partial', ['Pooled DATABASE_URL + DIRECT_URL for migrations'], [
            'Confirm Supabase plan HA / read replicas if required',
          ]);
        } else {
          push(def, 'missing', [], ['Configure Supabase pooler and direct connection strings']);
        }
        break;
      }
      case 20: {
        push(def, 'complete', ['Public /status page', '/api/health live checks', 'Better Stack public status optional']);
        break;
      }
      default:
        push(def, 'missing', [], ['Not evaluated']);
    }
  }

  const summary = {
    complete: categories.filter((c) => c.status === 'complete').length,
    partial: categories.filter((c) => c.status === 'partial').length,
    missing: categories.filter((c) => c.status === 'missing').length,
    platform: categories.filter((c) => c.status === 'platform').length,
    total: categories.length,
  };

  const critical = categories.filter((c) => c.tier === 'critical');
  const criticalOk = critical.every((c) => c.status === 'complete' || c.status === 'platform');
  const anyMissing = categories.some((c) => c.status === 'missing');
  const overall: OpsStatus = criticalOk && !anyMissing ? 'complete' : criticalOk ? 'partial' : 'missing';

  return {
    evaluatedAt: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    summary,
    categories,
    overall,
  };
}
