import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const cronSecret = request.headers.get('x-cron-secret');
    if (!cronSecret || cronSecret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // Find pending leave requests where SLA deadline has passed
    const breachedRequests = await prisma.leaveRequest.findMany({
      where: {
        status: 'pending',
        sla_breached: false,
        sla_deadline: { lt: now },
      },
      include: {
        employee: {
          select: { id: true, manager_id: true, org_id: true, manager: { select: { manager_id: true } } },
        },
      },
    });

    let escalatedCount = 0;

    for (const req of breachedRequests) {
      // Find next approver in hierarchy
      const nextApprover = req.employee.manager?.manager_id ?? null;

      await prisma.leaveRequest.update({
        where: { id: req.id },
        data: {
          sla_breached: true,
          escalation_count: { increment: 1 },
          status: 'escalated',
        },
      });

      await createAuditLog({
        companyId: req.company_id,
        actorId: null,
        action: AUDIT_ACTIONS.LEAVE_SLA_BREACH,
        entityType: 'LeaveRequest',
        entityId: req.id,
        previousState: {
          status: 'pending',
          sla_deadline: req.sla_deadline,
          escalation_count: req.escalation_count,
        },
        newState: {
          status: 'escalated',
          sla_breached: true,
          escalation_count: req.escalation_count + 1,
          next_approver: nextApprover,
        },
      });

      escalatedCount++;
    }

    return NextResponse.json({
      checked_at: now.toISOString(),
      breached_count: breachedRequests.length,
      escalated_count: escalatedCount,
    });
  } catch {
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : 'SLA check failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
