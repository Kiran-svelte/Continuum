import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

type ReadinessStatus = 'healthy' | 'degraded' | 'unhealthy' | 'missing';

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'security.view_logs');
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const companyId = employee.org_id;

    const recentLogs = await prisma.auditLog.findMany({
      where: {
        company_id: companyId,
        action: 'DATA_EXPORT',
        entity_type: 'Company',
      },
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        created_at: true,
        new_state: true,
        actor: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        },
      },
    });

    const backupLogs = recentLogs.filter(
      (log) => (log.new_state as { type?: string } | null)?.type === 'full_backup'
    );

    const latestBackup = backupLogs[0] ?? null;
    const latestBackupAt = latestBackup?.created_at ?? null;
    const latestAgeDays = latestBackupAt
      ? Math.floor((Date.now() - latestBackupAt.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    let status: ReadinessStatus = 'missing';
    let message = 'No backup export evidence found yet.';

    if (latestBackupAt) {
      if (latestAgeDays != null && latestAgeDays <= 7) {
        status = 'healthy';
        message = 'Recent full-backup export evidence is available.';
      } else if (latestAgeDays != null && latestAgeDays <= 30) {
        status = 'degraded';
        message = 'Backup evidence exists, but the most recent export is getting stale.';
      } else {
        status = 'unhealthy';
        message = 'Backup export evidence is present, but it is older than the recommended window.';
      }
    }

    return NextResponse.json(
      {
        status,
        message,
        backupExportRoute: '/api/admin/backup',
        latestBackup: latestBackupAt
          ? {
              exportedAt: latestBackupAt.toISOString(),
              ageDays: latestAgeDays,
              exportedBy: latestBackup.actor
                ? {
                    name:
                      [latestBackup.actor.first_name, latestBackup.actor.last_name]
                        .filter(Boolean)
                        .join(' ') || latestBackup.actor.email,
                    email: latestBackup.actor.email,
                  }
                : null,
            }
          : null,
        recentBackupExports: backupLogs.length,
        drillRecommendation: latestBackupAt
          ? latestAgeDays != null && latestAgeDays <= 30
            ? 'Record a restore drill and attach the result to the operations log.'
            : 'Run a restore drill and verify the backup window before the next release.'
          : 'Create an initial backup export and document the restore drill result.',
        updatedAt: new Date().toISOString(),
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (error instanceof Error && 'status' in error) {
      const authErr = error as { status: number; message: string };
      return NextResponse.json({ error: authErr.message }, { status: authErr.status });
    }
    console.error('[RecoveryReadiness] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
