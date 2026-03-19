import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sendNotification } from '@/lib/notification-service';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/attendance/regularize/[id]
 *
 * Approve or reject an attendance regularization request.
 * Requires manager, hr, or admin role.
 * Body: { action: 'approve' | 'reject' }
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'manager', 'hr', 'admin', 'director');

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { action } = body as { action?: string };

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: "Invalid action. Use 'approve' or 'reject'." },
        { status: 400 }
      );
    }

    // Fetch the regularization request
    const regularization = await prisma.attendanceRegularization.findUnique({
      where: { id },
      include: {
        attendance: true,
      },
    });

    if (!regularization) {
      return NextResponse.json(
        { error: 'Regularization request not found.' },
        { status: 404 }
      );
    }

    // Must belong to the same company
    if (regularization.company_id !== employee.org_id!) {
      return NextResponse.json(
        { error: 'Access denied.' },
        { status: 403 }
      );
    }

    // Cannot approve/reject own request
    if (regularization.emp_id === employee.id) {
      return NextResponse.json(
        { error: 'You cannot approve or reject your own regularization request.' },
        { status: 403 }
      );
    }

    // Must be pending
    if (regularization.status !== 'pending') {
      return NextResponse.json(
        { error: `Cannot ${action} a request with status '${regularization.status}'.` },
        { status: 400 }
      );
    }

    // For managers, verify the request is from their direct report
    const isHrOrAdmin =
      employee.primary_role === 'hr' ||
      employee.primary_role === 'admin' ||
      employee.primary_role === 'director';

    if (!isHrOrAdmin) {
      const requester = await prisma.employee.findUnique({
        where: { id: regularization.emp_id },
        select: { manager_id: true },
      });

      if (requester?.manager_id !== employee.id) {
        return NextResponse.json(
          { error: 'You are not authorized to act on this request.' },
          { status: 403 }
        );
      }
    }

    const previousState = {
      status: regularization.status,
      approved_by: regularization.approved_by,
    };

    const newStatus = action === 'approve' ? 'approved' : 'rejected';

    let updated;

    if (action === 'approve') {
      // Wrap approval in a transaction to keep regularization + attendance consistent
      updated = await prisma.$transaction(async (tx) => {
        const updatedReg = await tx.attendanceRegularization.update({
          where: { id },
          data: {
            status: 'approved',
            approved_by: employee.id,
          },
        });

        // If there's a linked attendance record, update its status to 'present'
        if (regularization.attendance_id) {
          await tx.attendance.update({
            where: { id: regularization.attendance_id },
            data: {
              status: 'present',
            },
          });
        }

        // If no attendance record exists, create one marked present and link it
        if (!regularization.attendance_id) {
          const newAttendance = await tx.attendance.create({
            data: {
              emp_id: regularization.emp_id,
              company_id: regularization.company_id,
              date: regularization.date,
              status: 'present',
              is_wfh: false,
            },
          });

          await tx.attendanceRegularization.update({
            where: { id },
            data: { attendance_id: newAttendance.id },
          });
        }

        return updatedReg;
      });
    } else {
      // Reject path is a single write — no transaction needed
      updated = await prisma.attendanceRegularization.update({
        where: { id },
        data: {
          status: 'rejected',
          approved_by: employee.id,
        },
      });
    }

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: action === 'approve'
        ? AUDIT_ACTIONS.ATTENDANCE_REGULARIZE_APPROVE
        : AUDIT_ACTIONS.ATTENDANCE_REGULARIZE_REJECT,
      entityType: 'AttendanceRegularization',
      entityId: id,
      previousState,
      newState: {
        status: newStatus,
        approved_by: employee.id,
      },
    });

    // Notify the requesting employee about the decision
    void sendNotification(
      regularization.emp_id,
      employee.org_id!,
      'attendance',
      `Regularization ${action === 'approve' ? 'Approved' : 'Rejected'}`,
      `Your attendance regularization request for ${regularization.date.toISOString().split('T')[0]} has been ${newStatus} by ${employee.first_name} ${employee.last_name}.`
    ).catch(() => {});

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
