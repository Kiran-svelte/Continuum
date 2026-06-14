/**
 * Headless leave list service.
 * Lists own leave requests for an employee, callable from web and WhatsApp.
 * Implements L5-03-PART-C (listOwnLeavesService).
 */
import prisma from '@/lib/prisma';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import logger from '@/lib/logger';

/** Pagination defaults for leave list. */
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;

/** Individual leave row in the list. */
export interface LeaveListRow {
  id: string;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: string;
  reason: string | null;
  createdAt: string;
}

/** Payload returned on success. */
export interface LeaveListPayload {
  leaves: LeaveListRow[];
  total: number;
  page: number;
  pageSize: number;
}

/** Input options for list filtering and pagination. */
export interface LeaveListOptions {
  status?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Lists own leave requests for the employee in the context.
 *
 * @param ctx - Execution context (employeeId, orgId).
 * @param opts - Optional status filter and pagination.
 * @returns ServiceResult with paginated leave rows.
 */
export async function listOwnLeavesService(
  ctx: Pick<AssistantExecutionContext, 'employeeId' | 'orgId'>,
  opts?: LeaveListOptions
): Promise<ServiceResult<LeaveListPayload>> {
  try {
    const page = Math.max(1, opts?.page ?? 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, opts?.pageSize ?? DEFAULT_PAGE_SIZE));
    const skip = (page - 1) * pageSize;

    const where = buildWhereClause(ctx.employeeId, ctx.orgId, opts?.status);

    const [leaves, total] = await Promise.all([
      prisma.leaveRequest.findMany({
        where,
        select: {
          id: true,
          leave_type: true,
          start_date: true,
          end_date: true,
          total_days: true,
          status: true,
          reason: true,
          created_at: true,
        },
        orderBy: { created_at: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.leaveRequest.count({ where }),
    ]);

    const rows: LeaveListRow[] = leaves.map((l) => ({
      id: l.id,
      leaveType: l.leave_type,
      startDate: l.start_date.toISOString().split('T')[0]!,
      endDate: l.end_date.toISOString().split('T')[0]!,
      totalDays: l.total_days,
      status: l.status,
      reason: l.reason,
      createdAt: l.created_at.toISOString(),
    }));

    return serviceOk({ leaves: rows, total, page, pageSize });
  } catch (error) {
    logger.error('list_own_leaves_service_error', {
      employeeId: ctx.employeeId,
      orgId: ctx.orgId,
      error: error instanceof Error ? error.message : 'unknown',
    });

    return serviceError('INTERNAL_ERROR', 'Failed to fetch leave requests.', 500);
  }
}

/** Builds the Prisma where clause for leave list queries. */
function buildWhereClause(
  employeeId: string,
  orgId: string,
  status?: string
): Record<string, unknown> {
  const base: Record<string, unknown> = {
    emp_id: employeeId,
    company_id: orgId,
  };

  if (status) {
    base['status'] = status;
  }

  return base;
}
