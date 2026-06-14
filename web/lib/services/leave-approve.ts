/**
 * Headless leave approve/reject service.
 * Implements L5-03-005 approveLeaveService.
 */
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { hasPermission, type PermissionCode } from '@/lib/rbac';
import { checkApiRateLimit } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import { sendLeaveApprovalEmail, sendLeaveRejectionEmail } from '@/lib/email-service';
import { resolveCompanyEmailNotificationSettings, shouldSendCompanyEmail } from '@/lib/company-email-notifications';
import { sendPusherEvent } from '@/lib/notification-service';
import { canActOnLeaveRequest } from '@/lib/leave-approval-routing';
import {
  checkSequentialApproval,
  recordApprovalStep,
  buildTrailEntry,
} from '@/lib/sequential-approval';
import {
  canProcessLeaveApproval,
  getLeaveBalanceYear,
  updateLeaveBalanceWithConcurrencyCheck,
} from '@/lib/leave-workflow';
import { emitEvent } from '@/lib/event-bus';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { withIdempotency } from './idempotency';
import { guardCompanySetup, guardModule } from './_shared/guards';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import logger from '@/lib/logger';

const approvalSchema = z.object({
  requestId: z.string().uuid(),
  action: z.enum(['approve', 'reject']),
  reason: z.string().min(1).max(500).optional(),
});

export type LeaveApproveInput = z.infer<typeof approvalSchema>;

export interface LeaveApproveOutput {
  requestId: string;
  status: string;
  is_final?: boolean;
}

async function executeApproveLeave(
  ctx: AssistantExecutionContext,
  input: LeaveApproveInput
): Promise<ServiceResult<LeaveApproveOutput>> {
  if (!ctx.orgId) {
    return serviceError('FORBIDDEN', 'Company context required', 403);
  }

  const setupGuard = await guardCompanySetup(ctx.orgId);
  if (setupGuard) return setupGuard;

  const moduleGuard = await guardModule(ctx.orgId, 'leave');
  if (moduleGuard) return moduleGuard;

  const canApproveAny = hasPermission(ctx.permissions as PermissionCode[], 'leave.approve_any');
  const canApproveTeam = hasPermission(ctx.permissions as PermissionCode[], 'leave.approve_team');
  if (!canApproveAny && !canApproveTeam) {
    return serviceError('FORBIDDEN', 'You are not authorized to approve leave requests', 403);
  }

  const rateLimit = checkApiRateLimit(ctx.employeeId, 'leaves/approve');
  if (!rateLimit.allowed) {
    return serviceError('RATE_LIMIT', 'Rate limit exceeded', 429);
  }

  const parsed = approvalSchema.safeParse(input);
  if (!parsed.success) {
    return serviceError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

  const { requestId, action, reason } = parsed.data;
  const sanitizedReason = reason ? sanitizeInput(reason) : undefined;

  const leaveRequest = await prisma.leaveRequest.findUnique({
    where: { id: requestId },
    include: {
      employee: true,
    },
  });

  if (!leaveRequest) {
    return serviceError('NOT_FOUND', 'Leave request not found', 404);
  }

  if (leaveRequest.company_id !== ctx.orgId) {
    return serviceError('FORBIDDEN', 'Access denied', 403);
  }

  if (leaveRequest.emp_id === ctx.employeeId) {
    return serviceError('FORBIDDEN', 'Cannot approve your own leave request', 403);
  }

  const isAuthorizedApprover = await canActOnLeaveRequest({
    requesterId: leaveRequest.emp_id,
    approverId: ctx.employeeId,
    companyId: ctx.orgId,
    approverRole: ctx.primaryRole,
  });

  if (!isAuthorizedApprover) {
    return serviceError('FORBIDDEN', 'You are not authorized to approve this request', 403);
  }

  const sequentialCheck = await checkSequentialApproval(
    requestId,
    ctx.employeeId,
    ctx.primaryRole
  );

  if (action === 'approve' && !sequentialCheck.isAllowed) {
    return serviceError(
      'FORBIDDEN',
      `You cannot approve yet. ${sequentialCheck.reason.replace(/_/g, ' ')}`,
      403
    );
  }

  if (!canProcessLeaveApproval(leaveRequest.status)) {
    return serviceError(
      'NOT_FOUND',
      `Cannot ${action} a request with status '${leaveRequest.status}'`,
      409
    );
  }

  const now = new Date();
  const balanceYear = getLeaveBalanceYear(leaveRequest.start_date);
  const isFinalApproval = action === 'approve' && sequentialCheck.isFinalApproval;
  const newStatus =
    action === 'reject' ? 'rejected' : isFinalApproval ? 'approved' : 'pending';

  try {
    await prisma.$transaction(async (tx) => {
      const currentRequest = await tx.leaveRequest.findUnique({
        where: { id: requestId },
        select: {
          id: true,
          company_id: true,
          emp_id: true,
          leave_type: true,
          total_days: true,
          status: true,
        },
      });

      if (!currentRequest) {
        throw new Error('Leave request not found');
      }

      if (!canProcessLeaveApproval(currentRequest.status)) {
        throw new Error(`Cannot ${action} a request with status '${currentRequest.status}'`);
      }

      const requestUpdate = await tx.leaveRequest.updateMany({
        where: { id: requestId, status: currentRequest.status },
        data: {
          status: newStatus,
          approved_by: ctx.employeeId,
          approved_at: now,
          approver_comments: sanitizedReason,
          updated_at: now,
        },
      });

      if (requestUpdate.count === 0) {
        throw new Error('Leave request was modified concurrently; please retry');
      }

      if (isFinalApproval || action === 'reject') {
        await updateLeaveBalanceWithConcurrencyCheck(tx, {
          empId: currentRequest.emp_id,
          leaveType: currentRequest.leave_type,
          year: balanceYear,
          data:
            isFinalApproval
              ? {
                  used_days: { increment: currentRequest.total_days },
                  pending_days: { decrement: currentRequest.total_days },
                }
              : {
                  pending_days: { decrement: currentRequest.total_days },
                  remaining: { increment: currentRequest.total_days },
                },
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Approval failed';
    if (message.includes('concurrently')) {
      return serviceError('NOT_FOUND', message, 409);
    }
    if (message.includes('status')) {
      return serviceError('NOT_FOUND', message, 409);
    }
    if (message.includes('not found')) {
      return serviceError('NOT_FOUND', message, 404);
    }
    logger.error('approve_leave_service_error', { requestId, error: message });
    return serviceError('INTERNAL_ERROR', 'Internal server error', 500);
  }

  const approverName = `${ctx.firstName} ${ctx.lastName}`.trim();
  if (action === 'approve' && sequentialCheck.approverLevel !== null) {
    await recordApprovalStep(
      requestId,
      buildTrailEntry(
        sequentialCheck.approverLevel,
        ctx.employeeId,
        approverName,
        'approve',
        sanitizedReason ?? null
      ),
      sequentialCheck.isFinalApproval,
      sequentialCheck.nextApproverId
    );
  } else if (action === 'reject') {
    await recordApprovalStep(
      requestId,
      buildTrailEntry(
        sequentialCheck.approverLevel ?? 0,
        ctx.employeeId,
        approverName,
        'reject',
        sanitizedReason ?? null
      ),
      true,
      null
    );
  }

  const emp = leaveRequest.employee;
  const employeeName = `${emp.first_name} ${emp.last_name}`;
  const startDate = leaveRequest.start_date.toISOString().split('T')[0]!;
  const endDate = leaveRequest.end_date.toISOString().split('T')[0]!;

  const companySettings = await prisma.companySettings.findUnique({
    where: { company_id: ctx.orgId },
    select: { email_notifications: true },
  });
  const emailNotificationSettings = resolveCompanyEmailNotificationSettings(
    companySettings?.email_notifications
  );

  if (action === 'approve') {
    if (emp.email && shouldSendCompanyEmail(emailNotificationSettings, 'general')) {
      await sendLeaveApprovalEmail(
        emp.email,
        employeeName,
        leaveRequest.leave_type,
        startDate,
        endDate,
        approverName
      );
    }
    await sendPusherEvent(`user-${leaveRequest.emp_id}`, 'leave-approved', {
      id: leaveRequest.id,
      message: `Your ${leaveRequest.leave_type} leave has been approved`,
    });
  } else {
    if (emp.email && shouldSendCompanyEmail(emailNotificationSettings, 'general')) {
      await sendLeaveRejectionEmail(
        emp.email,
        employeeName,
        leaveRequest.leave_type,
        startDate,
        endDate,
        approverName,
        sanitizedReason || 'No reason provided'
      );
    }
    await sendPusherEvent(`user-${leaveRequest.emp_id}`, 'leave-rejected', {
      id: leaveRequest.id,
      message: `Your ${leaveRequest.leave_type} leave has been rejected`,
      reason: sanitizedReason,
    });
  }

  await createAuditLog({
    companyId: ctx.orgId,
    actorId: ctx.employeeId,
    action: action === 'approve' ? AUDIT_ACTIONS.LEAVE_APPROVE : AUDIT_ACTIONS.LEAVE_REJECT,
    entityType: 'LeaveRequest',
    entityId: requestId,
    previousState: { status: leaveRequest.status },
    newState: { status: newStatus, reason: sanitizedReason, channel: ctx.channel },
  });

  emitEvent({
    companyId: ctx.orgId,
    eventType: action === 'approve' ? 'leave.approved' : 'leave.rejected',
    entityType: 'leave_request',
    entityId: requestId,
    payload: {
      employeeId: leaveRequest.emp_id,
      employeeName,
      leaveType: leaveRequest.leave_type,
      totalDays: leaveRequest.total_days,
      startDate,
      endDate,
      approverId: ctx.employeeId,
      approverName,
      year: balanceYear,
      reason: sanitizedReason,
    },
  }).catch((eventError) => logger.error('leave_approve_event_failed', { eventError }));

  await dispatchNotification({
    event: action === 'approve' ? 'leave_approved' : 'leave_rejected',
    companyId: ctx.orgId,
    recipientEmployeeId: leaveRequest.emp_id,
    actorEmployeeId: ctx.employeeId,
    channels: ['email', 'in_app'],
    payload: {
      leaveRequestId: requestId,
      dates: `${startDate} → ${endDate}`,
      reason: sanitizedReason,
    },
  });

  return serviceOk({
    requestId,
    status: newStatus,
    is_final: isFinalApproval || action === 'reject',
  });
}

/**
 * Approves or rejects a leave request without HTTP session cookies.
 */
export async function approveLeaveService(
  ctx: AssistantExecutionContext,
  input: LeaveApproveInput
): Promise<ServiceResult<LeaveApproveOutput>> {
  if (ctx.idempotencyKey) {
    return withIdempotency(ctx, ctx.idempotencyKey, () => executeApproveLeave(ctx, input));
  }
  return executeApproveLeave(ctx, input);
}
