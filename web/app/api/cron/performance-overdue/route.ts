/**
 * POST /api/cron/performance-overdue
 *
 * Finds review instances that are past their cycle end date but not in a
 * terminal status (submitted or acknowledged), then notifies the reviewer.
 *
 * Protected by CRON_SECRET bearer token. Idempotent.
 *
 * ReviewInstanceStatus values: pending | in_progress | submitted | acknowledged | disputed
 * Terminal (counts as done): submitted, acknowledged
 *
 * @throws Never — always returns 200.
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isValidCronRequest } from '@/lib/cron-auth';
import { sendNotification } from '@/lib/notification-service';
import { logger } from '@/lib/logger';
import { getCompanyIdsWithModuleEnabled } from '@/lib/cron-module-filter';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  logger.info('[cron/performance-overdue] Running', { now: now.toISOString() });

  try {
    // Find review instances that are not yet submitted/acknowledged and whose
    // cycle has passed its end_date.
    const enabledCompanyIds = await getCompanyIdsWithModuleEnabled('performance');
    const overdueInstances = await prisma.reviewInstance.findMany({
      where: {
        status: { in: ['pending', 'in_progress', 'disputed'] },
        company_id: { in: enabledCompanyIds },
        ReviewCycle: {
          status: 'active',
          end_date: { lt: now },
        },
      },
      select: {
        id: true,
        reviewer_id: true,
        reviewee_id: true,
        company_id: true,
        ReviewCycle: {
          select: {
            name: true,
            end_date: true,
          },
        },
        Reviewee: {
          select: { first_name: true, last_name: true },
        },
      },
      take: 1000,
    });

    if (overdueInstances.length === 0) {
      logger.info('[cron/performance-overdue] No overdue instances found');
      return NextResponse.json({ processed: 0 });
    }

    let notified = 0;

    for (const instance of overdueInstances) {
      if (!instance.reviewer_id) continue;

      const endDateStr = new Date(instance.ReviewCycle.end_date).toISOString().split('T')[0];

      void sendNotification(
        instance.reviewer_id,
        instance.company_id,
        'performance_review_overdue',
        'Performance Review Overdue',
        `Your review for ${instance.Reviewee.first_name} ${instance.Reviewee.last_name} in "${instance.ReviewCycle.name}" was due ${endDateStr}. Please complete it now.`
      ).catch((err: unknown) =>
        logger.error('[cron/performance-overdue] notify failed', {
          instanceId: instance.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      notified++;
    }

    logger.info('[cron/performance-overdue] Complete', {
      processed: overdueInstances.length,
      notified,
    });
    return NextResponse.json({ processed: overdueInstances.length, notified });
  } catch (error) {
    logger.error('[cron/performance-overdue] Failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Internal error', processed: 0 }, { status: 500 });
  }
}
