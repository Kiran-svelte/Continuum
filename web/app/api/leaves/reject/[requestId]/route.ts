import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendLeaveRejectionEmail } from '@/lib/email-service';
import { sendNotification, sendPusherEvent } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ requestId: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'manager', 'hr', 'admin', 'director');

    const { requestId } = await params;
    const body = await request.json().catch(() => ({}));
    const comments = typeof body.comments === 'string' ? body.comments : null;

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id: requestId },
      include: { employee: { select: { id: true, email: true, first_name: true, last_name: true, manager_id: true, org_id: true } } },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveRequest.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    if (leaveRequest.status !== 'pending' && leaveRequest.status !== 'escalated') {
      return NextResponse.json(
        { error: `Cannot reject a request with status '${leaveRequest.status}'` },
        { status: 400 }
      );
    }

    // Verify approver is in hierarchy or is HR/admin
    const isHrOrAdmin =
      employee.primary_role === 'hr' ||
      employee.primary_role === 'admin' ||
      employee.primary_role === 'director';
    const isDirectManager = leaveRequest.employee.manager_id === employee.id;

    if (!isHrOrAdmin && !isDirectManager) {
      return NextResponse.json(
        { error: 'You are not authorized to reject this request' },
        { status: 403 }
      );
    }

    const previousState = { status: leaveRequest.status };

    // Atomically update status and balance in a transaction
    const balanceYear = leaveRequest.start_date.getFullYear();
    const updatedRequest = await prisma.$transaction(async (tx) => {
      const updated = await tx.leaveRequest.update({
        where: { id: requestId },
        data: {
          status: 'rejected',
          approved_by: employee.id,
          approved_at: new Date(),
          approver_comments: comments,
        },
      });

      // Restore balance: pending_days -= total_days, remaining += total_days
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

      return updated;
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_REJECT,
      entityType: 'LeaveRequest',
      entityId: requestId,
      previousState,
      newState: {
        status: 'rejected',
        approved_by: employee.id,
        comments,
      },
    });

    // Send rejection email to employee (non-blocking)
    try {
      if (leaveRequest.employee.email) {
        const startDate = leaveRequest.start_date.toISOString().split('T')[0];
        const endDate = leaveRequest.end_date.toISOString().split('T')[0];
        const employeeName = `${leaveRequest.employee.first_name} ${leaveRequest.employee.last_name}`;
        const rejectorName = `${employee.first_name} ${employee.last_name}`;
        await sendLeaveRejectionEmail(
          leaveRequest.employee.email,
          employeeName,
          leaveRequest.leave_type,
          startDate,
          endDate,
          rejectorName,
          comments || 'No reason provided'
        );
      }
    } catch (emailError) {
      console.error('[LeaveReject] Email notification failed:', emailError);
    }

    // Real-time: notify the employee their leave was rejected
    sendPusherEvent(`user-${leaveRequest.emp_id}`, 'leave-request-rejected', {
      id: leaveRequest.id,
      leave_type: leaveRequest.leave_type,
      status: 'rejected',
    }).catch(() => {});

    // DB notification for the employee
    sendNotification(
      leaveRequest.emp_id,
      employee.org_id,
      'leave_rejected',
      'Leave Request Rejected',
      `Your ${leaveRequest.leave_type} leave from ${leaveRequest.start_date.toISOString().split('T')[0]} to ${leaveRequest.end_date.toISOString().split('T')[0]} has been rejected`,
      'in_app',
    ).catch(() => {});

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
