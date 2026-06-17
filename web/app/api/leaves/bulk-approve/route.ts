import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

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
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'leave');
    if (moduleGuard) return moduleGuard;

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
        const now = new Date();
        const validIds = validRequests.map((r) => r.id);

        // 1. Bulk update all leave requests
        await tx.leaveRequest.updateMany({
          where: { id: { in: validIds } },
          data: {
            status: action === 'approve' ? 'approved' : 'rejected',
            approved_by: employee.id,
            approved_at: now,
            approver_comments: resolvedComments,
          },
        });

        // 2. Aggregate balance updates by emp_id, leave_type, and year to minimize database calls
        const balanceUpdates = new Map<
          string,
          { emp_id: string; leave_type: string; year: number; total_days: number }
        >();

        for (const req of validRequests) {
          const year = req.start_date.getFullYear();
          const key = `${req.emp_id}-${req.leave_type}-${year}`;
          const existing = balanceUpdates.get(key);
          if (existing) {
            existing.total_days += req.total_days;
          } else {
            balanceUpdates.set(key, {
              emp_id: req.emp_id,
              leave_type: req.leave_type,
              year,
              total_days: req.total_days,
            });
          }
        }

        // 3. Batch update leave balances
        // NOTE: Prisma's updateMany doesn't support atomic increments/decrements.
        // We use update with a composite unique key (emp_id, leave_type, year) for each aggregated update.
        // This is still much better than updating for every single request.
        for (const update of balanceUpdates.values()) {
          const data =
            action === 'approve'
              ? {
                  used_days: { increment: update.total_days },
                  pending_days: { decrement: update.total_days },
                }
              : {
                  pending_days: { decrement: update.total_days },
                  remaining: { increment: update.total_days },
                };

          await tx.leaveBalance.update({
            where: {
              emp_id_leave_type_year: {
                emp_id: update.emp_id,
                leave_type: update.leave_type,
                year: update.year,
              },
            },
            data,
          });
        }

        // Fill results for return
        for (const leaveRequest of validRequests) {
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
