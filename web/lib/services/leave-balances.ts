/**
 * Headless leave balances service.
 * Returns leave balances for a given employee, callable from web routes and WhatsApp.
 * Implements L5-03-PART-C (getLeaveBalancesService).
 */
import prisma from '@/lib/prisma';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import { getLeaveBalanceYear } from '@/lib/leave-workflow';
import logger from '@/lib/logger';

/** Individual leave balance row returned by the service. */
export interface LeaveBalanceRow {
  leaveType: string;
  year: number;
  annualEntitlement: number;
  carriedForward: number;
  usedDays: number;
  pendingDays: number;
  encashedDays: number;
  remaining: number;
}

/** Payload returned on success. */
export interface LeaveBalancesPayload {
  employeeId: string;
  year: number;
  balances: LeaveBalanceRow[];
}

/**
 * Returns leave balances for the employee in the context.
 * Always scoped to the current leave balance year by default.
 *
 * @param ctx - Execution context (employeeId, orgId).
 * @param year - Optional override year. Defaults to current leave year.
 * @returns ServiceResult with balance rows or an error code.
 */
export async function getLeaveBalancesService(
  ctx: Pick<AssistantExecutionContext, 'employeeId' | 'orgId'>,
  year?: number
): Promise<ServiceResult<LeaveBalancesPayload>> {
  try {
    const targetYear = year ?? getLeaveBalanceYear(new Date());

    const rows = await prisma.leaveBalance.findMany({
      where: {
        emp_id: ctx.employeeId,
        company_id: ctx.orgId,
        year: targetYear,
      },
      select: {
        leave_type: true,
        year: true,
        annual_entitlement: true,
        carried_forward: true,
        used_days: true,
        pending_days: true,
        encashed_days: true,
        remaining: true,
      },
      orderBy: { leave_type: 'asc' },
    });

    const balances: LeaveBalanceRow[] = rows.map((row) => ({
      leaveType: row.leave_type,
      year: row.year,
      annualEntitlement: row.annual_entitlement,
      carriedForward: row.carried_forward,
      usedDays: row.used_days,
      pendingDays: row.pending_days,
      encashedDays: row.encashed_days,
      remaining: row.remaining,
    }));

    return serviceOk({
      employeeId: ctx.employeeId,
      year: targetYear,
      balances,
    });
  } catch (error) {
    logger.error('leave_balances_service_error', {
      employeeId: ctx.employeeId,
      orgId: ctx.orgId,
      error: error instanceof Error ? error.message : 'unknown',
    });

    return serviceError('INTERNAL_ERROR', 'Failed to fetch leave balances.', 500);
  }
}
