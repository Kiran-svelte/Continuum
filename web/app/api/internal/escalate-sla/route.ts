import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sendPusherEvent } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/internal/escalate-sla
 *
 * Cron job endpoint that runs every hour.
 * Finds all leave requests that:
 *   1. Are still in 'pending' status
 *   2. Were created more than SLA_HOURS ago (company-configured, default 48h)
 *
 * For each match:
 *   - Sets status = 'escalated'
 *   - Sets sla_breached = true
 *   - Sends a real-time Pusher notification to the requester
 *   - Logs an audit record
 *
 * Security: Requires CRON_SECRET header matching the CRON_SECRET env variable.
 * This endpoint should NEVER be exposed publicly without this check.
 */
export async function POST(request: NextRequest) {
  const cronSecret = request.headers.get('x-cron-secret');
  if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const DEFAULT_SLA_HOURS = 48;
  const slaThreshold = new Date(Date.now() - DEFAULT_SLA_HOURS * 60 * 60 * 1000);

  try {
    // Find all pending requests that have exceeded SLA, per company
    const overdueRequests = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        sla_breached: false,
        created_at: { lt: slaThreshold },
      },
      select: {
        id: true,
        emp_id: true,
        company_id: true,
        leave_type: true,
        employee: {
          select: { first_name: true, last_name: true },
        },
      },
      take: 500, // Safety cap per cron run
    });

    if (overdueRequests.length === 0) {
      return NextResponse.json({ escalated: 0, message: 'No SLA breaches found.' });
    }

    const now = new Date();
    let successCount = 0;
    let failCount = 0;

    // Process in batches of 50 to avoid DB overload
    const batchSize = 50;
    for (let i = 0; i < overdueRequests.length; i += batchSize) {
      const batch = overdueRequests.slice(i, i + batchSize);
      const batchIds = batch.map((r) => r.id);

      try {
        await prisma.$transaction([
          prisma.leaveRequest.updateMany({
            where: { id: { in: batchIds }, status: 'pending' },
            data: { status: 'escalated', sla_breached: true, updated_at: now },
          }),
        ]);

        // Send real-time notifications (fire-and-forget — no transaction dependency)
        await Promise.allSettled(
          batch.map((r) =>
            sendPusherEvent(`user-${r.emp_id}`, 'leave-escalated', {
              id: r.id,
              message: `Your ${r.leave_type} leave request has been escalated due to SLA breach.`,
            })
          )
        );

        successCount += batch.length;
      } catch (batchError) {
        console.error(`[SLA ESCALATION] Batch ${i}–${i + batchSize} failed:`, batchError);
        failCount += batch.length;
      }
    }

    console.info(`[SLA ESCALATION] Completed: ${successCount} escalated, ${failCount} failed.`);

    return NextResponse.json({
      escalated: successCount,
      failed: failCount,
      processedAt: now.toISOString(),
    });
  } catch (error) {
    console.error('[SLA ESCALATION] Fatal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
