import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

/**
 * POST /api/leaves/cancel/[requestId]
 *
 * Allows an employee to cancel their own pending/escalated leave request.
 * Managers, HR, and admins can also cancel on behalf.
 *
 * Body: { reason?: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    const { requestId } = await params;

    const body = await request.json().catch(() => ({}));
    const cancelReason =
      typeof body.reason === 'string' ? sanitizeInput(body.reason).slice(0, 500) : null;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      select: {
        id: true,
        emp_id: true,
        company_id: true,
        status: true,
        total_days: true,
        leave_type: true,
        start_date: true,
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    // Company isolation
    if (leaveRequest.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Only the employee themselves, or HR/admin/director can cancel
    const isHrOrAdmin =
      employee.primary_role === 'hr' ||
      employee.primary_role === 'admin' ||
      employee.primary_role === 'director';

    const isOwner = leaveRequest.emp_id === employee.id;

    if (!isOwner && !isHrOrAdmin) {
      return NextResponse.json(
        { error: 'You can only cancel your own leave requests' },
        { status: 403 }
      );
    }

    // Can only cancel pending, escalated, or approved (future leaves)
    const cancellableStatuses = ['pending', 'escalated', 'approved'];
    if (!cancellableStatuses.includes(leaveRequest.status)) {
      return NextResponse.json(
        { error: `Cannot cancel a request with status '${leaveRequest.status}'` },
        { status: 400 }
      );
    }

    const previousStatus = leaveRequest.status;

    // Atomically update status and balance in a transaction
    const balanceYear = leaveRequest.start_date.getFullYear();
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'cancelled',
          cancel_reason: cancelReason,
        },
      });

      // Restore leave balance based on previous status
      if (previousStatus === 'pending' || previousStatus === 'escalated') {
        await tx.leaveBalance.updateMany({
          where: {
            emp_id: leaveRequest.emp_id,
            leave_type: leaveRequest.leave_type,
            year: balanceYear,
          },
          data: {
            pending_days: { decrement: leaveRequest.total_days },
            remaining: { increment: leaveRequest.total_days },
          },
        });
      } else if (previousStatus === 'approved') {
        await tx.leaveBalance.updateMany({
          where: {
            emp_id: leaveRequest.emp_id,
            leave_type: leaveRequest.leave_type,
            year: balanceYear,
          },
          data: {
            used_days: { decrement: leaveRequest.total_days },
            remaining: { increment: leaveRequest.total_days },
          },
        });
      }

      return updated;
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_CANCEL,
      entityType: 'LeaveRequest',
      entityId: requestId,
      previousState: { status: previousStatus },
      newState: { status: 'cancelled', cancel_reason: cancelReason },
    });

    return NextResponse.json(updatedRequest);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
