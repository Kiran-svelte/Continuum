/**
 * POST /api/cron/learning-overdue
 *
 * Finds course enrollments where the due_date has passed and status is not completed.
 * Notifies enrolled employees to complete their overdue courses.
 *
 * Protected by CRON_SECRET bearer token. Idempotent.
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
  logger.info('[cron/learning-overdue] Running', { now: now.toISOString() });

  try {
    const enabledCompanyIds = await getCompanyIdsWithModuleEnabled('learning');
    const overdueEnrollments = await prisma.courseEnrollment.findMany({
      where: {
        status: { not: 'completed' },
        company_id: { in: enabledCompanyIds },
        due_date: { lt: now },
      },
      select: {
        id: true,
        emp_id: true,
        company_id: true,
        due_date: true,
        Course: { select: { title: true, is_mandatory: true } },
      },
      take: 5000,
    });

    if (overdueEnrollments.length === 0) {
      logger.info('[cron/learning-overdue] No overdue enrollments found');
      return NextResponse.json({ processed: 0 });
    }

    let notified = 0;

    for (const enrollment of overdueEnrollments) {
      const dueDateStr = new Date(enrollment.due_date!).toISOString().split('T')[0];
      const mandatoryLabel = enrollment.Course.is_mandatory ? ' (mandatory)' : '';

      void sendNotification(
        enrollment.emp_id,
        enrollment.company_id,
        'learning_overdue',
        `Course Overdue${mandatoryLabel}`,
        `Your course "${enrollment.Course.title}" was due on ${dueDateStr}. Please complete it as soon as possible.`
      ).catch((err: unknown) =>
        logger.error('[cron/learning-overdue] notify failed', {
          enrollmentId: enrollment.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      notified++;
    }

    logger.info('[cron/learning-overdue] Complete', { processed: overdueEnrollments.length, notified });
    return NextResponse.json({ processed: overdueEnrollments.length, notified });
  } catch (error) {
    logger.error('[cron/learning-overdue] Failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal error', processed: 0 }, { status: 500 });
  }
}
