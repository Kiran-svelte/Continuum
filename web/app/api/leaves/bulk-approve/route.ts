import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

interface BulkResult {
  requestId: string;
  success: boolean;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'manager', 'hr', 'admin', 'director');

    const rateLimit = checkApiRateLimit(employee.id, 'leaves/approve');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { requestIds, action, comments } = body as {
      requestIds?: string[];
      action?: string;
      comments?: string;
    };

    // Validate inputs
    if (!Array.isArray(requestIds) || requestIds.length === 0) {
      return NextResponse.json(
        { error: 'requestIds must be a non-empty array' },
        { status: 400 }
      );
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json(
        { error: "action must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    if (requestIds.length > 50) {
      return NextResponse.json(
        { error: 'Cannot process more than 50 requests at once' },
        { status: 400 }
      );
    }

    const resolvedComments = typeof comments === 'string' ? comments : null;

    // Fetch all leave requests in one query
    const leaveRequests = await prisma.leaveRequest.findMany({
      where: { id: { in: requestIds } },
      include: {
        employee: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            manager_id: true,
            org_id: true,
          },
        },
      },
    });

    // Build a map for quick lookup
    const requestMap = new Map(leaveRequests.map((r) => [r.id, r]));

    const isHrOrAdmin =
      employee.primary_role === 'hr' ||
      employee.primary_role === 'admin' ||
      employee.primary_role === 'director';

    // Pre-validate all requests and collect valid ones
    const validRequests: typeof leaveRequests = [];
    const results: BulkResult[] = [];

    for (const reqId of requestIds) {
      const leaveRequest = requestMap.get(reqId);

      if (!leaveRequest) {
        results.push({ requestId: reqId, success: false, error: 'Leave request not found' });
        continue;
      }

      if (leaveRequest.company_id !== employee.org_id!) {
        results.push({ requestId: reqId, success: false, error: 'Access denied' });
        continue;
      }

      if (leaveRequest.emp_id === employee.id) {
        results.push({ requestId: reqId, success: false, error: 'Cannot approve your own leave request' });
        continue;
      }

      if (leaveRequest.status !== 'pending' && leaveRequest.status !== 'escalated') {
        results.push({
          requestId: reqId,
          success: false,
          error: `Cannot ${action} a request with status '${leaveRequest.status}'`,
        });
        continue;
      }

      const isDirectManager = leaveRequest.employee.manager_id === employee.id;
      if (!isHrOrAdmin && !isDirectManager) {
        results.push({
          requestId: reqId,
          success: false,
          error: `You are not authorized to ${action} this request`,
        });
        continue;
      }

      validRequests.push(leaveRequest);
    }

    // Process all valid requests atomically in a single transaction
    if (validRequests.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const leaveRequest of validRequests) {
          const now = new Date();
          const balanceYear = leaveRequest.start_date.getFullYear();

          if (action === 'approve') {
            await tx.leaveRequest.update({
              where: { id: leaveRequest.id },
              data: {
                status: 'approved',
                approved_by: employee.id,
                approved_at: now,
                approver_comments: resolvedComments,
              },
            });

            // Update leave balance: used_days += total_days, pending_days -= total_days
            await tx.leaveBalance.updateMany({
              where: {
                emp_id: leaveRequest.emp_id,
                leave_type: leaveRequest.leave_type,
                year: balanceYear,
              },
              data: {
                used_days: { increment: leaveRequest.total_days },
                pending_days: { decrement: leaveRequest.total_days },
              },
            });
          } else {
            // reject
            await tx.leaveRequest.update({
              where: { id: leaveRequest.id },
              data: {
                status: 'rejected',
                approved_by: employee.id,
                approved_at: now,
                approver_comments: resolvedComments,
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
          }

          results.push({ requestId: leaveRequest.id, success: true });
        }
      });

      // Create audit logs outside the transaction (non-blocking, best effort)
      for (const leaveRequest of validRequests) {
        try {
          await createAuditLog({
            companyId: employee.org_id!,
            actorId: employee.id,
            action: action === 'approve' ? AUDIT_ACTIONS.LEAVE_APPROVE : AUDIT_ACTIONS.LEAVE_REJECT,
            entityType: 'LeaveRequest',
            entityId: leaveRequest.id,
            previousState: {
              status: leaveRequest.status,
              approved_by: leaveRequest.approved_by,
            },
            newState: {
              status: action === 'approve' ? 'approved' : 'rejected',
              approved_by: employee.id,
              comments: resolvedComments,
              bulk_action: true,
            },
          });
        } catch (auditError) {
          console.error(`[BulkApprove] Audit log failed for ${leaveRequest.id}:`, auditError);
        }
      }
    }

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    return NextResponse.json({
      results,
      successCount,
      failCount,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
