import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole } from '@/lib/auth-guard';
import { verifyAuditChain } from '@/lib/audit';
import { getRedisClient } from '@/lib/redis';
import { getUploadStorageReadiness } from '@/lib/storage/readiness';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/health
 *
 * System health check for admin dashboard.
 * Checks: database, audit chain integrity, Redis connectivity, email config.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin');

    const companyId = employee.org_id!;
    const checks: Record<string, { status: 'ok' | 'warn' | 'error'; message: string }> = {};

    // 1. Database connectivity
    try {
      const result = await prisma.$queryRaw<Array<{ now: Date }>>`SELECT NOW() as now`;
      checks.database = {
        status: 'ok',
        message: `Connected. Server time: ${result[0]?.now?.toISOString() || 'unknown'}`,
      };
    } catch (err) {
      checks.database = {
        status: 'error',
        message: `Connection failed: ${err instanceof Error ? err.message : 'unknown'}`,
      };
    }

    // 2. Audit chain integrity
    try {
      const chainResult = await verifyAuditChain(companyId);
      if (chainResult.valid) {
        checks.audit_chain = {
          status: 'ok',
          message: `Chain intact. ${chainResult.totalLogs} logs verified.`,
        };
      } else {
        checks.audit_chain = {
          status: 'error',
          message: `Chain broken at index ${chainResult.brokenAt}. ${chainResult.details || ''}`,
        };
      }
    } catch {
      checks.audit_chain = {
        status: 'warn',
        message: 'Could not verify audit chain',
      };
    }

    // 3. Redis connectivity
    const redis = getRedisClient();
    if (redis) {
      try {
        await redis.ping();
        checks.redis = { status: 'ok', message: 'Connected (distributed rate limiting active)' };
      } catch {
        checks.redis = { status: 'warn', message: 'Configured but unreachable — using in-memory fallback' };
      }
    } else {
      checks.redis = {
        status: 'warn',
        message: 'Not configured — using in-memory rate limiting (single instance only)',
      };
    }

    // 4. Email configuration
    const provider = process.env.EMAIL_PROVIDER?.trim().toLowerCase();
    const resendKey = process.env.RESEND_API_KEY?.trim();
    const sendgridKey = process.env.SENDGRID_API_KEY?.trim();
    const smtpHost = process.env.SMTP_HOST?.trim();
    if (provider === 'resend' && resendKey) {
      checks.email = { status: 'ok', message: 'Resend configured' };
    } else if (resendKey) {
      checks.email = { status: 'warn', message: 'Resend key present but EMAIL_PROVIDER is not resend' };
    } else if (sendgridKey) {
      checks.email = { status: 'ok', message: 'SendGrid Web API configured' };
    } else if (smtpHost) {
      checks.email = { status: 'ok', message: `SMTP configured (${smtpHost})` };
    } else {
      checks.email = { status: 'error', message: 'No email provider configured' };
    }

    // 5. Private upload storage configuration
    const storage = getUploadStorageReadiness();
    checks.storage = storage.configured
      ? {
          status: 'ok',
          message: `${storage.provider} configured (${storage.region})`,
        }
      : {
          status: 'error',
          message: `Upload storage missing required env: ${storage.missingRequired.join(', ')}`,
        };

    // 6. Migration status
    try {
      const migrations = await prisma.$queryRaw<Array<{ migration_name: string }>>`
        SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1
      `;
      checks.migrations = {
        status: 'ok',
        message: `Latest: ${migrations[0]?.migration_name || 'none'}`,
      };
    } catch {
      checks.migrations = {
        status: 'warn',
        message: 'Could not read migration status',
      };
    }

    // 7. Company stats
    try {
      const [empCount, activeCount] = await Promise.all([
        prisma.employee.count({ where: { org_id: companyId, deleted_at: null } }),
        prisma.employee.count({ where: { org_id: companyId, deleted_at: null, status: 'active' } }),
      ]);
      checks.company = {
        status: 'ok',
        message: `${activeCount} active / ${empCount} total employees`,
      };
    } catch {
      checks.company = { status: 'warn', message: 'Could not fetch company stats' };
    }

    const overall = Object.values(checks).some((c) => c.status === 'error')
      ? 'unhealthy'
      : Object.values(checks).some((c) => c.status === 'warn')
        ? 'degraded'
        : 'healthy';

    return NextResponse.json({
      status: overall,
      timestamp: new Date().toISOString(),
      checks,
    });
  } catch (error) {
    console.error('[Health] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
