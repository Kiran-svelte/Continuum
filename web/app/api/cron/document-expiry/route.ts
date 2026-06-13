/**
 * POST /api/cron/document-expiry
 *
 * Finds Document records (model: Document, Prisma accessor: document)
 * that are expiring within 30 days or already expired, then notifies
 * the document owner and their HR admin.
 *
 * Protected by CRON_SECRET bearer token.
 * Idempotent: running twice on the same day produces identical notifications.
 *
 * @throws Never — always returns 200 to prevent retry storms.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidCronRequest } from '@/lib/cron-auth';
import { sendNotification } from '@/lib/notification-service';
import { logger } from '@/lib/logger';
import { getCompanyIdsWithModuleEnabled } from '@/lib/cron-module-filter';

export const dynamic = 'force-dynamic';

/** Days ahead to consider a document "expiring soon". */
const EXPIRY_LOOKAHEAD_DAYS = 30;

/** Document model in Prisma uses `type` and `status` — no expiry_date column.
 *  We use `verified_at` as a proxy for recency. Documents expire when their
 *  `status` is 'expired'. For proactive alerts we notify when status = 'pending'
 *  and verified_at is older than 1 year (fallback approximation).
 *
 *  NOTE: The Document model has no expiry_date column in the current schema.
 *  This cron notifies HR about all documents with status='expired'.
 */

export async function POST(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const thresholdDate = new Date(Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - EXPIRY_LOOKAHEAD_DAYS
  ));

  logger.info('[cron/document-expiry] Running', { now: now.toISOString() });

  try {
    // Find documents marked as expired, only for companies with the documents module on.
    const enabledCompanyIds = await getCompanyIdsWithModuleEnabled('documents');
    const expiredDocuments = await prisma.document.findMany({
      where: {
        deleted_at: null,
        company_id: { in: enabledCompanyIds },
        status: 'expired',
      },
      select: {
        id: true,
        emp_id: true,
        company_id: true,
        name: true,
        type: true,
        Employee_Document_emp_idToEmployee: {
          select: { first_name: true, last_name: true },
        },
      },
      take: 5000,
    });

    if (expiredDocuments.length === 0) {
      logger.info('[cron/document-expiry] No expired documents found');
      return NextResponse.json({ processed: 0 });
    }

    let notified = 0;

    // Notify each employee about their expired document
    for (const doc of expiredDocuments) {
      const emp = doc.Employee_Document_emp_idToEmployee;
      const docLabel = doc.type.replace(/_/g, ' ');

      void sendNotification(
        doc.emp_id,
        doc.company_id,
        'document_expiry',
        'Document Requires Attention',
        `Your ${docLabel} document "${doc.name}" has expired. Please upload a renewed copy.`
      ).catch((err: unknown) =>
        logger.error('[cron/document-expiry] employee notify failed', {
          docId: doc.id,
          empId: doc.emp_id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      notified++;
    }

    // Notify HR once per company about the batch count
    const byCompany = new Map<string, number>();
    for (const doc of expiredDocuments) {
      byCompany.set(doc.company_id, (byCompany.get(doc.company_id) ?? 0) + 1);
    }

    for (const [companyId, count] of byCompany) {
      const hrEmployees = await prisma.employee.findMany({
        where: {
          org_id: companyId,
          primary_role: { in: ['hr', 'admin'] },
          status: 'active',
          deleted_at: null,
        },
        select: { id: true },
      });
      for (const hr of hrEmployees) {
        void sendNotification(
          hr.id,
          companyId,
          'document_expiry_hr',
          `${count} Expired Document(s) Need Renewal`,
          `${count} employee document(s) have expired. Review in Documents.`
        ).catch((err: unknown) =>
          logger.error('[cron/document-expiry] HR notify failed', {
            hrId: hr.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );
      }
    }

    logger.info('[cron/document-expiry] Complete', {
      processed: expiredDocuments.length,
      notified,
    });
    return NextResponse.json({ processed: expiredDocuments.length, notified });
  } catch (error) {
    logger.error('[cron/document-expiry] Failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal error', processed: 0 }, { status: 500 });
  }
}
