/**
 * POST /api/cron/leave-sla-breach
 *
 * Finds pending leave requests older than the SLA threshold (24 hours)
 * and sends notifications to:
 *   - the current approver (reminder to act)
 *   - the requester (SLA breach disclosure)
 *
 * Protected by CRON_SECRET bearer token.
 * Idempotent: designed to be safe if triggered multiple times per day.
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

/** Hours before a pending leave request is considered SLA-breached. */
const SLA_THRESHOLD_HOURS = 24;

export async function POST(request: NextRequest) {
  if (!isValidCronRequest(request.headers)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const slaThreshold = new Date(now.getTime() - SLA_THRESHOLD_HOURS * 60 * 60 * 1000);

  logger.info('[cron/leave-sla-breach] Running', { slaThreshold: slaThreshold.toISOString() });

  try {
    const enabledCompanyIds = await getCompanyIdsWithModuleEnabled('leave');
    const stalePendingLeaves = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        company_id: { in: enabledCompanyIds },
        created_at: { lt: slaThreshold },
      },
      select: {
        id: true,
        emp_id: true,
        company_id: true,
        leave_type: true,
        start_date: true,
        end_date: true,
        created_at: true,
        current_approver_id: true,
        Employee_LeaveRequest_emp_idToEmployee: {
          select: { first_name: true, last_name: true },
        },
      },
      take: 1000,
    });

    if (stalePendingLeaves.length === 0) {
      logger.info('[cron/leave-sla-breach] No SLA breaches found');
      return NextResponse.json({ processed: 0 });
    }

    let notified = 0;

    for (const leave of stalePendingLeaves) {
      const requester = leave.Employee_LeaveRequest_emp_idToEmployee as { first_name: string; last_name: string };
      const hoursWaiting = Math.floor((now.getTime() - leave.created_at.getTime()) / (1000 * 60 * 60));

      // Notify approver
      if (leave.current_approver_id) {
        void sendNotification(
          leave.current_approver_id,
          leave.company_id,
          'leave_sla_breach_approver',
          'Leave Request Awaiting Action',
          `${requester.first_name} ${requester.last_name}'s ${leave.leave_type} leave request has been waiting ${hoursWaiting}h for your decision.`
        ).catch((err: unknown) =>
          logger.error('[cron/leave-sla-breach] approver notify failed', {
            leaveId: leave.id,
            error: err instanceof Error ? err.message : String(err),
          })
        );
        notified++;
      }

      // Notify requester
      void sendNotification(
        leave.emp_id,
        leave.company_id,
        'leave_sla_breach_requester',
        'Your Leave Request Is Still Pending',
        `Your ${leave.leave_type} leave request submitted ${hoursWaiting}h ago is still pending approval. We've reminded your approver.`
      ).catch((err: unknown) =>
        logger.error('[cron/leave-sla-breach] requester notify failed', {
          leaveId: leave.id,
          error: err instanceof Error ? err.message : String(err),
        })
      );
      notified++;
    }

    logger.info('[cron/leave-sla-breach] Complete', { processed: stalePendingLeaves.length, notified });
    return NextResponse.json({ processed: stalePendingLeaves.length, notified });
  } catch (error) {
    logger.error('[cron/leave-sla-breach] Failed', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: 'Internal error', processed: 0 }, { status: 500 });
  }
}
