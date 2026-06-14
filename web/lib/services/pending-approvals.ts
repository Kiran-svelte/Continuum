/**
 * Headless pending approvals service.
 * Lists leave requests pending the current employee's approval.
 * Callable from web routes and WhatsApp.
 * Implements L5-03-PART-C (listPendingApprovalsService).
 */
import prisma from '@/lib/prisma';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import type { LeaveRequestStatus, Prisma } from '@prisma/client';
import logger from '@/lib/logger';

/** Pagination defaults. */
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** Individual pending approval row. */
export interface PendingApprovalRow {
  id: string;
  employeeName: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string | null;
  submittedAt: string;
}

/** Payload returned on success. */
export interface PendingApprovalsPayload {
  approvals: PendingApprovalRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Input options for pagination. */
export interface PendingApprovalsOptions {
  page?: number;
  pageSize?: number;
}

/**
 * Lists leave requests pending the context employee's approval.
 * Queries ApprovalHierarchy to find requests where the employee is level1-4 approver.
 *
 * @param ctx - Execution context (employeeId, orgId).
 * @param opts - Optional pagination.
 * @returns ServiceResult with pending approval rows.
 */
export async function listPendingApprovalsService(
  ctx: Pick<AssistantExecutionContext, 'employeeId' | 'orgId'>,
  opts?: PendingApprovalsOptions
): Promise<ServiceResult<PendingApprovalsPayload>> {
  try {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, opts?.pageSize ?? DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    // Find employee IDs whose approval hierarchy includes this employee
    const hierarchyRows = await prisma.approvalHierarchy.findMany({
      where: {
        company_id: ctx.orgId,
        OR: [
          { level1_approver: ctx.employeeId },
          { level2_approver: ctx.employeeId },
          { level3_approver: ctx.employeeId },
          { level4_approver: ctx.employeeId },
        ],
      },
      select: { emp_id: true },
    });

    const subordinateIds = hierarchyRows.map((row) => row.emp_id);

    if (subordinateIds.length === 0) {
      return serviceOk({ approvals: [], total: 0, page, pageSize });
    }

    const pendingStatuses: LeaveRequestStatus[] = ['pending', 'escalated'];
    const where: Prisma.LeaveRequestWhereInput = {
      company_id: ctx.orgId,
      emp_id: { in: subordinateIds },
      status: { in: pendingStatuses },
    };

    const [requests, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        select: {
          id: true,
          leave_type: true,
          start_date: true,
          end_date: true,
          total_days: true,
          reason: true,
          created_at: true,
          employee: {
            select: { first_name: true, last_name: true },
          },
        },
        orderBy: { created_at: 'asc' },
        skip,
        take: pageSize,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const approvals: PendingApprovalRow[] = requests.map((r) => ({
      id: r.id,
      employeeName: `${r.employee.first_name} ${r.employee.last_name}`.trim(),
      leaveType: r.leave_type,
      startDate: r.start_date.toISOString().split('T')[0]!,
      endDate: r.end_date.toISOString().split('T')[0]!,
      totalDays: r.total_days,
      reason: r.reason,
      submittedAt: r.created_at.toISOString(),
    }));

    return serviceOk({ approvals, total, page, pageSize });
  } catch (error) {
    logger.error('list_pending_approvals_service_error', {
      employeeId: ctx.employeeId,
      orgId: ctx.orgId,
      error: error instanceof Error ? error.message : 'unknown',
    });

    return serviceError('INTERNAL_ERROR', 'Failed to fetch pending approvals.', 500);
  }
}
