import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

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
      include: { employee: { select: { id: true, manager_id: true, org_id: true } } },
    });

    if (!leaveRequest) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (leaveRequest.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // F-13: Approver must not be the same person as the requester
    if (leaveRequest.emp_id === employee.id) {
      return NextResponse.json(
        { error: 'Cannot approve your own leave request' },
        { status: 403 }
      );
    }

    if (leaveRequest.status !== 'pending' && leaveRequest.status !== 'escalated') {
      return NextResponse.json(
        { error: `Cannot approve a request with status '${leaveRequest.status}'` },
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
        { error: 'You are not authorized to approve this request' },
        { status: 403 }
      );
    }

    const previousState = {
      status: leaveRequest.status,
      approved_by: leaveRequest.approved_by,
    };

    const updatedRequest = await prisma.leaveRequest.update({
      where: { id: requestId },
      data: {
        status: 'approved',
        approved_by: employee.id,
        approved_at: new Date(),
        approver_comments: comments,
      },
    });

    // Update leave balance: used_days += total_days, pending_days -= total_days
    const currentYear = new Date().getFullYear();
    await prisma.leaveBalance.updateMany({
      where: {
        emp_id: leaveRequest.emp_id,
        leave_type: leaveRequest.leave_type,
        year: currentYear,
      },
      data: {
        used_days: { increment: leaveRequest.total_days },
        pending_days: { decrement: leaveRequest.total_days },
      },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_APPROVE,
      entityType: 'LeaveRequest',
      entityId: requestId,
      previousState,
      newState: {
        status: 'approved',
        approved_by: employee.id,
        approved_at: updatedRequest.approved_at,
      },
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
