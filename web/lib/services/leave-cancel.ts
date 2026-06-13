/**
 * Headless leave cancel service.
 * Implements L5-03-PART-C cancelLeaveService.
 */
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import {
  getLeaveBalanceYear,
  getLeaveDateKey,
  getTodayDateKey,
  isPastDateKey,
  updateLeaveBalanceWithConcurrencyCheck,
} from '@/lib/leave-workflow';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { withIdempotency } from './idempotency';
import { guardCompanySetup, guardModule } from './_shared/guards';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import logger from '@/lib/logger';

const cancelSchema = z.object({
  requestId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export type LeaveCancelInput = z.infer<typeof cancelSchema>;

export interface LeaveCancelOutput {
  requestId: string;
  status: string;
}

async function executeCancelLeave(
  ctx: AssistantExecutionContext,
  input: LeaveCancelInput
): Promise<ServiceResult<LeaveCancelOutput>> {
  if (!ctx.orgId) {
    return serviceError('FORBIDDEN', 'Company context required', 403);
  }

  const setupGuard = await guardCompanySetup(ctx.orgId);
  if (setupGuard) return setupGuard;

  const moduleGuard = await guardModule(ctx.orgId, 'leave');
  if (moduleGuard) return moduleGuard;

  const parsed = cancelSchema.safeParse(input);
  if (!parsed.success) {
    return serviceError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

  const { requestId } = parsed.data;
  const cancelReason =
    typeof parsed.data.reason === 'string'
      ? sanitizeInput(parsed.data.reason).slice(0, 500)
      : null;

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
      end_date: true,
    },
  });

  if (!leaveRequest) {
    return serviceError('NOT_FOUND', 'Leave request not found', 404);
  }

  if (leaveRequest.company_id !== ctx.orgId) {
    return serviceError('FORBIDDEN', 'Access denied', 403);
  }

  const isPrivileged = ['hr', 'admin', 'manager', 'director'].includes(ctx.primaryRole);
  const isOwner = leaveRequest.emp_id === ctx.employeeId;

  if (!isOwner && !isPrivileged) {
    return serviceError('FORBIDDEN', 'You can only cancel your own leave requests', 403);
  }

  const cancellableStatuses = ['pending', 'escalated', 'approved'];
  if (!cancellableStatuses.includes(leaveRequest.status)) {
    return serviceError(
      'VALIDATION_ERROR',
      `Cannot cancel a request with status '${leaveRequest.status}'`,
      400
    );
  }

  if (leaveRequest.status === 'approved') {
    const todayKey = getTodayDateKey();
    const startDateKey = getLeaveDateKey(leaveRequest.start_date);
    if (isPastDateKey(startDateKey, todayKey) || startDateKey === todayKey) {
      return serviceError(
        'VALIDATION_ERROR',
        'Approved leave can only be cancelled before it starts',
        400
      );
    }
  }

  const previousStatus = leaveRequest.status;
  const balanceYear = getLeaveBalanceYear(leaveRequest.start_date);

  try {
    await prisma.$transaction(async (tx) => {
      const currentRequest = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          emp_id: true,
          company_id: true,
          status: true,
          total_days: true,
          leave_type: true,
        },
      });

      if (!currentRequest) {
        throw new Error('Leave request not found');
      }

      const updated = await tx.leaveRequest.updateMany({
        where: { id: requestId, status: currentRequest.status },
        data: { status: 'cancelled', cancel_reason: cancelReason },
      });

      if (updated.count === 0) {
        throw new Error('Leave request was modified concurrently; please retry');
      }

      if (currentRequest.status === 'pending' || currentRequest.status === 'escalated') {
        await updateLeaveBalanceWithConcurrencyCheck(tx, {
          empId: currentRequest.emp_id,
          leaveType: currentRequest.leave_type,
          year: balanceYear,
          data: {
            pending_days: { decrement: currentRequest.total_days },
            remaining: { increment: currentRequest.total_days },
          },
        });
      } else if (currentRequest.status === 'approved') {
        await updateLeaveBalanceWithConcurrencyCheck(tx, {
          empId: currentRequest.emp_id,
          leaveType: currentRequest.leave_type,
          year: balanceYear,
          data: {
            used_days: { decrement: currentRequest.total_days },
            remaining: { increment: currentRequest.total_days },
          },
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Cancel failed';
    if (message.includes('concurrently')) {
      return serviceError('NOT_FOUND', message, 409);
    }
    if (message.includes('not found')) {
      return serviceError('NOT_FOUND', message, 404);
    }
    logger.error('cancel_leave_service_error', { requestId, error: message });
    return serviceError('INTERNAL_ERROR', 'Internal server error', 500);
  }

  await createAuditLog({
    companyId: ctx.orgId,
    actorId: ctx.employeeId,
    action: AUDIT_ACTIONS.LEAVE_CANCEL,
    entityType: 'LeaveRequest',
    entityId: requestId,
    previousState: { status: previousStatus },
    newState: { status: 'cancelled', cancel_reason: cancelReason, channel: ctx.channel },
  });

  await dispatchNotification({
    event: 'leave_submitted',
    companyId: ctx.orgId,
    recipientEmployeeId: leaveRequest.emp_id,
    actorEmployeeId: ctx.employeeId,
    channels: ['in_app'],
    payload: { leaveRequestId: requestId },
  });

  return serviceOk({ requestId, status: 'cancelled' });
}

/**
 * Cancels a leave request for the authenticated employee or privileged role.
 */
export async function cancelLeaveService(
  ctx: AssistantExecutionContext,
  input: LeaveCancelInput
): Promise<ServiceResult<LeaveCancelOutput>> {
  if (ctx.idempotencyKey) {
    return withIdempotency(ctx, ctx.idempotencyKey, () => executeCancelLeave(ctx, input));
  }
  return executeCancelLeave(ctx, input);
}
