import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidCronRequest } from '@/lib/cron-auth';
import { createAuditLog, AUDIT_ACTIONS, verifyAuditChain } from '@/lib/audit';
import { sendNotification } from '@/lib/notification-service';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

async function notifyAuditFailure(companyId: string, details: string): Promise<number> {
  const recipients = await prisma.employee.findMany({
    where: {
      org_id: companyId,
      primary_role: { in: ['admin', 'hr'] },
      status: 'active',
      deleted_at: null,
    },
    select: { id: true },
    take: 25,
  });

  await Promise.all(
    recipients.map((recipient) =>
      sendNotification(
        recipient.id,
        companyId,
        'audit_verification_failed',
        'Audit Trail Verification Failed',
        `Continuum detected a broken audit hash chain. ${details}`
      ).catch((error: unknown) =>
        logger.error('[cron/audit-verification] notification failed', {
          companyId,
          recipientId: recipient.id,
          error: error instanceof Error ? error.message : String(error),
        })
      )
    )
  );

  return recipients.length;
}

export async function POST(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const companies = await prisma.company.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true },
    take: 1000,
  });

  const results: Array<{
    companyId: string;
    companyName: string;
    valid: boolean;
    totalLogs: number;
    verifiedLogs: number;
    details?: string;
    notified: number;
  }> = [];

  for (const company of companies) {
    try {
      const verification = await verifyAuditChain(company.id);
      const details = verification.details ?? '';
      const notified = verification.valid ? 0 : await notifyAuditFailure(company.id, details);

      await createAuditLog({
        companyId: company.id,
        actorId: null,
        action: AUDIT_ACTIONS.AUDIT_VERIFY,
        entityType: 'AuditLog',
        entityId: company.id,
        newState: {
          valid: verification.valid,
          total_logs: verification.totalLogs,
          verified_logs: verification.verifiedLogs,
          broken_at: verification.brokenAt ?? null,
          details,
        },
      });

      results.push({
        companyId: company.id,
        companyName: company.name,
        valid: verification.valid,
        totalLogs: verification.totalLogs,
        verifiedLogs: verification.verifiedLogs,
        details: verification.details,
        notified,
      });
    } catch (error) {
      const details = error instanceof Error ? error.message : String(error);
      logger.error('[cron/audit-verification] company verification failed', {
        companyId: company.id,
        error: details,
      });
      results.push({
        companyId: company.id,
        companyName: company.name,
        valid: false,
        totalLogs: 0,
        verifiedLogs: 0,
        details,
        notified: 0,
      });
    }
  }

  const failed = results.filter((result) => !result.valid);
  return NextResponse.json({
    processed: results.length,
    valid: results.length - failed.length,
    invalid: failed.length,
    failed,
  }, { status: failed.length > 0 ? 207 : 200 });
}
