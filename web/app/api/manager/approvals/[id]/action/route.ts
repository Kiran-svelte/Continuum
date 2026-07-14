import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { LeaveRequestStatus } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { LeaveWorkflowError, updateLeaveBalanceWithConcurrencyCheck } from '@/lib/leave-workflow';

export const dynamic = 'force-dynamic';

const actionSchema = z.object({
  action: z.enum(['approve', 'reject', 'escalate']),
  reason: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const manager = await getAuthEmployee();
    requireCompanyContext(manager);
    requirePermissionGuard(manager, 'leave.approve_team');

    const body = await request.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    const { action, reason } = parsed.data;

    const leaveReq = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { employee: { select: { manager_id: true, org_id: true } } },
    });

    if (!leaveReq) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Ensure the leave request belongs to this manager's company
    if (leaveReq.company_id !== manager.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // No one — including HR/admin — may act on their own leave request
    if (leaveReq.emp_id === manager.id) {
      return NextResponse.json({ error: 'Cannot approve or reject your own leave request' }, { status: 403 });
    }

    // Ensure the manager is actually responsible for this employee
    // HR/admin roles can approve any request in their company
    const isHrOrAdmin = manager.primary_role === 'hr' || manager.primary_role === 'admin';
    if (!isHrOrAdmin && leaveReq.employee?.manager_id !== manager.id) {
      return NextResponse.json({ error: 'This request is not assigned to you' }, { status: 403 });
    }

    if (leaveReq.status !== 'pending' && leaveReq.status !== 'escalated') {
      return NextResponse.json({ error: 'Leave request is not in a pending state' }, { status: 400 });
    }

    const comments = (leaveReq.approver_comments ? `${leaveReq.approver_comments}\n\n` : '');

    let newStatus: LeaveRequestStatus = leaveReq.status;
    let finalComments = comments;

    if (action === 'approve') {
      newStatus = 'approved';
      finalComments += `Approved: ${reason || 'No comment'}`;
    } else if (action === 'reject') {
      newStatus = 'rejected';
      finalComments += `Rejected: ${reason || 'No comment'}`;
    } else if (action === 'escalate') {
      newStatus = 'escalated';
      finalComments += `Escalated to HR: ${reason || 'No comment'}`;
    }

    // Perform status update and balance adjustment atomically. The status
    // update is gated on the status we just read (updateMany + count check)
    // so a second concurrent request against the same leave request aborts
    // instead of silently overwriting this one's outcome.
    const updated = await prisma.$transaction(async (tx) => {
      const statusUpdate = await tx.leaveRequest.updateMany({
        where: { id, status: leaveReq.status },
        data: {
          status: newStatus,
          approver_comments: finalComments,
          approved_at: action === 'approve' ? new Date() : undefined,
        },
      });

      if (statusUpdate.count === 0) {
        throw new LeaveWorkflowError(409, 'Leave request was modified concurrently; please retry');
      }

      if (action === 'approve' || action === 'reject') {
        const leaveYear = new Date(leaveReq.start_date).getFullYear();
        await updateLeaveBalanceWithConcurrencyCheck(tx, {
          empId: leaveReq.emp_id,
          leaveType: leaveReq.leave_type,
          year: leaveYear,
          data:
            action === 'approve'
              ? {
                  pending_days: { decrement: leaveReq.total_days },
                  used_days: { increment: leaveReq.total_days },
                }
              : {
                  pending_days: { decrement: leaveReq.total_days },
                  remaining: { increment: leaveReq.total_days },
                },
          notFoundMessage: 'Leave balance not found for this request; nothing to adjust',
        }).catch((err) => {
          // No balance row for this employee/leave_type/year is not fatal —
          // the status transition above still stands. A genuine concurrent
          // modification (409) should still abort the whole transaction.
          if (err instanceof LeaveWorkflowError && err.status === 409 && err.message.includes('not found')) {
            return;
          }
          throw err;
        });
      }

      return tx.leaveRequest.findUniqueOrThrow({ where: { id } });
    });

    await createAuditLog({
      companyId: manager.org_id,
      actorId: manager.id,
      action: action === 'approve' ? AUDIT_ACTIONS.LEAVE_APPROVE : AUDIT_ACTIONS.LEAVE_REJECT,
      entityType: 'LeaveRequest',
      entityId: updated.id,
      newState: { status: newStatus, reason: finalComments },
    });

    return NextResponse.json({ success: true, updated });

  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof LeaveWorkflowError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Manager Approval] Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

