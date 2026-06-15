/**
 * Headless leave submit service.
 * Implements L5-03-004 submitLeaveService.
 */
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { emitEvent } from '@/lib/event-bus';
import { checkApiRateLimit } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { sanitizeInput } from '@/lib/security';
import { sendLeaveSubmissionEmail, sendLeaveAutoApprovedEmail } from '@/lib/email-service';
import { sendNotification, sendPusherEvent } from '@/lib/notification-service';
import { resolveCompanyEmailNotificationSettings, shouldSendCompanyEmail } from '@/lib/company-email-notifications';
import { constraintEngineBreaker } from '@/lib/circuit-breaker';
import { resolveLeaveApprovers } from '@/lib/leave-approval-routing';
import {
  calculateLeaveDays,
  createConstraintEngineFallback,
  getLeaveBalanceYear,
  resolveConstraintEngineUrl,
  validateLeaveDateRange,
} from '@/lib/leave-workflow';
import { readRoleQuotaMap, sanitizeLeaveTypeCode, sanitizeRoleSlug } from '@/lib/onboarding-runtime-config';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { withIdempotency } from './idempotency';
import {
  guardCompanySetup,
  guardModule,
  guardNotInNoticePeriod,
  guardPermission,
} from './_shared/guards';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import logger from '@/lib/logger';

const leaveSubmitSchema = z.object({
  leave_type: z.string().min(1).max(20),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(1000),
  is_half_day: z.boolean().optional().default(false),
  attachment_url: z.string().url().optional(),
});

export type LeaveSubmitInput = z.infer<typeof leaveSubmitSchema>;

export interface LeaveSubmitOutput {
  id: string;
  status: string;
  total_days: number;
  leave_type: string;
  start_date: string;
  end_date: string;
  pendingApprover?: {
    id: string;
    name: string;
    role: string;
    department: string | null;
  } | null;
  approverChainLength?: number;
  approverRoutingReason?: string;
}

async function executeSubmitLeave(
  ctx: AssistantExecutionContext,
  input: LeaveSubmitInput
): Promise<ServiceResult<LeaveSubmitOutput>> {
  if (!ctx.orgId) {
    return serviceError('FORBIDDEN', 'Company context required', 403);
  }

  const setupGuard = await guardCompanySetup(ctx.orgId);
  if (setupGuard) return setupGuard;

  const permGuard = guardPermission(ctx, 'leave.apply_own');
  if (permGuard) return permGuard;

  const moduleGuard = await guardModule(ctx.orgId, 'leave');
  if (moduleGuard) return moduleGuard;

  const rateLimit = checkApiRateLimit(ctx.employeeId, 'leaves/submit');
  if (!rateLimit.allowed) {
    return serviceError('RATE_LIMIT', 'Rate limit exceeded. Try again later.', 429);
  }

  const employee = await prisma.employee.findUnique({
    where: { id: ctx.employeeId },
    select: {
      id: true,
      org_id: true,
      email: true,
      first_name: true,
      last_name: true,
      status: true,
    },
  });

  if (!employee || !employee.org_id) {
    return serviceError('FORBIDDEN', 'Employee not found', 403);
  }

  const noticeGuard = guardNotInNoticePeriod(employee.status);
  if (noticeGuard) return noticeGuard;

  const parsed = leaveSubmitSchema.safeParse(input);
  if (!parsed.success) {
    return serviceError('VALIDATION_ERROR', 'Validation failed', 400, parsed.error.flatten());
  }

    const data = parsed.data;
    const leaveType = sanitizeInput(data.leave_type).toUpperCase();
    const reason = sanitizeInput(data.reason);
    const { startDate, endDate } = validateLeaveDateRange(data.start_date, data.end_date);
    const totalDays = calculateLeaveDays(data.start_date, data.end_date, data.is_half_day);
    const balanceYear = getLeaveBalanceYear(startDate);

    // Check leave balance — ensure a record exists so pending/used tracking is always accurate.
    // `balance` starts as the existing record; if missing, we upsert a fresh one.
    const balance = await prisma.leaveBalance.findUnique({
      where: {
        emp_id_leave_type_year: {
          emp_id: employee.id,
          leave_type: leaveType,
          year: balanceYear,
        },
      },
    });

    let balanceSnapshot = balance
      ? {
          annual_entitlement: balance.annual_entitlement,
          carried_forward: balance.carried_forward,
          used_days: balance.used_days,
          pending_days: balance.pending_days,
          encashed_days: balance.encashed_days,
          remaining:
            balance.annual_entitlement +
            balance.carried_forward -
            balance.used_days -
            balance.pending_days -
            balance.encashed_days,
        }
      : null;

    if (!balance) {
      // Seed this leave type's balance from the company's configured quota.
      // No catalog fallback — the system is fully config-driven.
      const companyLeaveType = await prisma.leaveType.findUnique({
        where: {
          company_id_code: { company_id: employee.org_id, code: leaveType },
        },
        select: { default_quota: true, is_active: true },
      });

      if (!companyLeaveType || !companyLeaveType.is_active) {
        return serviceError(
          'VALIDATION_ERROR',
          'This leave type is not configured for your company',
          400,
          { leave_type: leaveType }
        );
      }

      const [settings, employeeRole] = await Promise.all([
        prisma.companySettings.findUnique({
          where: { company_id: employee.org_id },
          select: { hr_alerts: true },
        }),
        prisma.employee.findUnique({
          where: { id: employee.id },
          select: {
            primary_role: true,
            CompanyRole: {
              select: { slug: true },
            },
          },
        }),
      ]);

      const roleQuotaMap = readRoleQuotaMap(settings?.hr_alerts);
      const roleSlug = sanitizeRoleSlug(
        employeeRole?.CompanyRole?.slug || employeeRole?.primary_role || ''
      );
      const roleQuota = roleSlug ? roleQuotaMap[roleSlug]?.[sanitizeLeaveTypeCode(leaveType)] : undefined;
      const entitlement =
        typeof roleQuota === 'number' && Number.isFinite(roleQuota)
          ? roleQuota
          : companyLeaveType.default_quota;
      balanceSnapshot = {
        annual_entitlement: entitlement,
        carried_forward: 0,
        used_days: 0,
        pending_days: 0,
        encashed_days: 0,
        remaining: entitlement,
      };
    }

    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: {
        negative_balance: true,
        sla_hours: true,
        settings: { select: { hr_alerts: true } },
      },
    });

    const hrAlerts = company?.settings?.hr_alerts as Record<string, unknown> | null;
    const aiConfig =
      hrAlerts?.ai && typeof hrAlerts.ai === 'object'
        ? (hrAlerts.ai as Record<string, unknown>)
        : null;

    const autoApproveEnabled =
      aiConfig?.enabled === true ||
      hrAlerts?.auto_approve === true;

    const autoApproveThreshold =
      typeof aiConfig?.confidence_threshold === 'number'
        ? aiConfig.confidence_threshold
        : typeof hrAlerts?.auto_approve_threshold === 'number'
          ? hrAlerts.auto_approve_threshold
          : 0.9;

    const aiAutoApproveMaxDays =
      typeof aiConfig?.auto_approve_max_days === 'number'
        ? aiConfig.auto_approve_max_days
        : null;

    // `balance` is guaranteed non-null here (upserted above).
    // Scoping `remaining` to avoid leaking into the wider function body.
    const remaining =
      balanceSnapshot!.annual_entitlement +
      balanceSnapshot!.carried_forward -
      balanceSnapshot!.used_days -
      balanceSnapshot!.pending_days -
      balanceSnapshot!.encashed_days;

    if (remaining < totalDays && !company?.negative_balance) {
      return serviceError(
        'INSUFFICIENT_BALANCE',
        'Insufficient leave balance',
        400,
        { remaining, requested: totalDays, leave_type: leaveType }
      );
    }

    // Check for overlapping leave requests (duplicate detection)
    const overlapping = await prisma.leaveRequest.findFirst({
      where: {
        emp_id: employee.id,
        status: { in: ['pending', 'approved', 'escalated'] },
        start_date: { lte: endDate },
        end_date: { gte: startDate },
      },
      select: { id: true, leave_type: true, start_date: true, end_date: true, status: true },
    });

    if (overlapping) {
      const oStart = overlapping.start_date.toISOString().split('T')[0];
      const oEnd = overlapping.end_date.toISOString().split('T')[0];
      return serviceError(
        'OVERLAP_CONFLICT',
        `You already have a ${overlapping.status} ${overlapping.leave_type} request from ${oStart} to ${oEnd} that overlaps with these dates`,
        409,
        { overlapping_request_id: overlapping.id }
      );
    }

    const constraintEngineUrl = resolveConstraintEngineUrl();
    // Call Python constraint engine with timeout and circuit breaker fallback
    let constraintResult: Record<string, unknown> = {
      passed: true,
      violations: [],
      warnings: [],
      recommendation: 'PENDING',
      confidence_score: 0,
    };
    let constraintStatus: 'pass' | 'warnings' | 'fail' = 'pass';

    if (constraintEngineUrl) {
      constraintResult = await constraintEngineBreaker.execute(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5_000);
          try {
            const constraintResp = await fetch(`${constraintEngineUrl}/api/evaluate`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-API-Key': process.env.CRON_SECRET || '',
              },
              body: JSON.stringify({
                employee_id: employee.id,
                company_id: employee.org_id,
                leave_type: leaveType,
                start_date: data.start_date,
                end_date: data.end_date,
                total_days: totalDays,
                // Pass balance data so constraint engine doesn't need to query DB
                balance: {
                  annual_entitlement: balanceSnapshot!.annual_entitlement,
                  carried_forward: balanceSnapshot!.carried_forward,
                  used_days: balanceSnapshot!.used_days,
                  pending_days: balanceSnapshot!.pending_days,
                  encashed_days: balanceSnapshot!.encashed_days,
                  remaining: remaining,
                },
              }),
              signal: controller.signal,
            });

            if (!constraintResp.ok) {
              throw new Error(`Constraint engine returned ${constraintResp.status}`);
            }

            return (await constraintResp.json()) as Record<string, unknown>;
          } finally {
            clearTimeout(timeoutId);
          }
        },
        () => createConstraintEngineFallback()
      );

      const violations = constraintResult.violations as unknown[] | undefined;
      const warnings = constraintResult.warnings as unknown[] | undefined;

      if (violations && violations.length > 0) {
        constraintStatus = 'fail';
      } else if (warnings && warnings.length > 0) {
        constraintStatus = 'warnings';
      }
    }

    // Determine request status:
    // - auto-approve if engine recommends APPROVE and company has it enabled
    // - escalate if there are warnings or hard constraint violations
    // - otherwise pending
    let requestStatus: 'pending' | 'approved' | 'escalated' = 'pending';
    if (constraintStatus === 'warnings' || constraintStatus === 'fail') {
      requestStatus = 'escalated';
    } else if (
      autoApproveEnabled &&
      (aiAutoApproveMaxDays === null || totalDays <= aiAutoApproveMaxDays) &&
      constraintResult?.recommendation === 'APPROVE' &&
      typeof constraintResult?.confidence_score === 'number' &&
      constraintResult.confidence_score >= autoApproveThreshold
    ) {
      requestStatus = 'approved';
    }

    const slaDeadline = company?.sla_hours
      ? new Date(Date.now() + company.sla_hours * 60 * 60 * 1000)
      : null;

    let leaveRequest;
    try {
      leaveRequest = await prisma.$transaction(async (tx) => {
      const transactionalBalance = await tx.leaveBalance.upsert({
        where: {
          emp_id_leave_type_year: {
            emp_id: employee.id,
            leave_type: leaveType,
            year: balanceYear,
          },
        },
        create: {
          id: uuidv4(),
          emp_id: employee.id,
          company_id: employee.org_id!,
          leave_type: leaveType,
          year: balanceYear,
          annual_entitlement: balanceSnapshot!.annual_entitlement,
          carried_forward: balanceSnapshot!.carried_forward,
          used_days: balanceSnapshot!.used_days,
          pending_days: balanceSnapshot!.pending_days,
          encashed_days: balanceSnapshot!.encashed_days,
          remaining: balanceSnapshot!.remaining,
          updated_at: new Date(),
        },
        update: {},
      });

      const overlappingInTransaction = await tx.leaveRequest.findFirst({
        where: {
          emp_id: employee.id,
          status: { in: ['pending', 'approved', 'escalated'] },
          start_date: { lte: endDate },
          end_date: { gte: startDate },
        },
        select: { id: true, leave_type: true, start_date: true, end_date: true, status: true },
      });

      if (overlappingInTransaction) {
        const oStart = overlappingInTransaction.start_date.toISOString().split('T')[0];
        const oEnd = overlappingInTransaction.end_date.toISOString().split('T')[0];
        throw new Error(
          `You already have a ${overlappingInTransaction.status} ${overlappingInTransaction.leave_type} request from ${oStart} to ${oEnd} that overlaps with these dates`
        );
      }

      if (!company?.negative_balance && transactionalBalance.remaining < totalDays) {
        throw new Error('Insufficient leave balance');
      }

      const createdRequest = await tx.leaveRequest.create({
        data: {
          id: uuidv4(),
          emp_id: employee.id,
          company_id: employee.org_id!,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          total_days: totalDays,
          is_half_day: data.is_half_day,
          reason,
          status: requestStatus,
          current_approver_id:
            requestStatus === 'pending' || requestStatus === 'escalated'
              ? approverRouting.approverId
              : null,
          attachment_url: data.attachment_url ?? null,
          sla_deadline: requestStatus === 'pending' || requestStatus === 'escalated' ? slaDeadline : null,
          approved_at: requestStatus === 'approved' ? new Date() : undefined,
          approver_comments: requestStatus === 'approved'
            ? `Auto-approved by constraint engine (confidence: ${((constraintResult?.confidence_score as number ?? 0) * 100).toFixed(0)}%)`
            : undefined,
          constraint_result: constraintResult
            ? (constraintResult as Prisma.InputJsonValue)
            : undefined,
          updated_at: new Date(),
        },
      });

      const updateResult = await tx.leaveBalance.updateMany({
        where: {
          emp_id: employee.id,
          leave_type: leaveType,
          year: balanceYear,
          ...(company?.negative_balance ? {} : { remaining: { gte: totalDays } }),
        },
        data:
          requestStatus === 'approved'
            ? {
                used_days: { increment: totalDays },
                remaining: { decrement: totalDays },
                updated_at: new Date(),
              }
            : {
                pending_days: { increment: totalDays },
                remaining: { decrement: totalDays },
                updated_at: new Date(),
              },
      });

      if (updateResult.count === 0) {
        throw new Error('Insufficient leave balance');
      }

      return createdRequest;
    });
    } catch (txError) {
      const message = txError instanceof Error ? txError.message : 'Transaction failed';
      if (message.includes('overlaps')) {
        return serviceError('OVERLAP_CONFLICT', message, 409);
      }
      if (message.includes('Insufficient')) {
        return serviceError('INSUFFICIENT_BALANCE', message, 400);
      }
      logger.error('leave_submit_transaction_error', { error: message });
      return serviceError('INTERNAL_ERROR', 'Internal server error', 500);
    }

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.LEAVE_SUBMIT,
      entityType: 'LeaveRequest',
      entityId: leaveRequest.id,
      newState: {
        leave_type: leaveType,
        start_date: data.start_date,
        end_date: data.end_date,
        total_days: totalDays,
        status: requestStatus,
        channel: ctx.channel,
      },
    });

    // Resolve approver chain BEFORE emitting events so the approverId is available.
    const approverRouting = await resolveLeaveApprovers(employee.org_id, employee.id);

    // Emit domain event for decoupled side-effects (webhooks, integrations, etc.)
    emitEvent({
      companyId: employee.org_id,
      eventType: 'leave.submitted',
      entityType: 'leave_request',
      entityId: leaveRequest.id,
      payload: {
        employeeId: employee.id,
        employeeName: `${employee.first_name} ${employee.last_name}`,
        leaveType,
        startDate: data.start_date,
        endDate: data.end_date,
        totalDays,
        status: requestStatus,
        approverId: approverRouting.approverId,
      },
    }).catch((eventError) => logger.error('leave_submit_event_failed', { eventError }));

    // Notify the employee (real-time confirmation)
    sendPusherEvent(`user-${employee.id}`, 'leave-request-submitted', {
      id: leaveRequest.id,
      leave_type: data.leave_type,
      start_date: data.start_date,
      end_date: data.end_date,
      status: requestStatus,
    }).catch((err) => console.error('[FireAndForget]', err instanceof Error ? err.message : err));

    // Notify first approver in creator chain (approval hierarchy -> manager -> role fallback)
    if (approverRouting.approverId) {
      sendNotification(
        approverRouting.approverId,
        employee.org_id,
        'leave_request',
        'New Leave Request',
        `${employee.first_name} ${employee.last_name} has requested ${data.leave_type} leave from ${data.start_date} to ${data.end_date}`,
        'in_app',
      ).catch((err) => console.error('[FireAndForget]', err instanceof Error ? err.message : err));
    }

    const companySettings = await prisma.companySettings.findUnique({
      where: { company_id: employee.org_id },
      select: { email_notifications: true },
    });
    const emailNotificationSettings = resolveCompanyEmailNotificationSettings(
      companySettings?.email_notifications
    );

    // Send email notifications (non-blocking)
    try {
      const employeeName = `${employee.first_name} ${employee.last_name}`;
      if (requestStatus === 'approved') {
        // Auto-approved - notify employee
        if (shouldSendCompanyEmail(emailNotificationSettings, 'general')) {
          await sendLeaveAutoApprovedEmail(
            employee.email,
            employeeName,
            leaveType,
            data.start_date,
            data.end_date,
            (constraintResult?.confidence_score as number) || 0.9
          );
        }
      } else {
        // Pending/escalated - notify primary approver in creator chain
        if (shouldSendCompanyEmail(emailNotificationSettings, 'manager_alert')) {
          if (approverRouting.approverId) {
            const approver = await prisma.employee.findUnique({
              where: { id: approverRouting.approverId },
              select: { email: true, first_name: true, last_name: true },
            });
            if (approver?.email) {
              const approverName = `${approver.first_name} ${approver.last_name}`;
              await sendLeaveSubmissionEmail(
                approver.email,
                approverName,
                employeeName,
                leaveType,
                data.start_date,
                data.end_date,
                totalDays,
                reason
              );
            }
          }
        }
      }
    } catch (emailError) {
      console.error('[LeaveSubmit] Email notification failed:', emailError);
      // Don't fail the request if email fails
    }

    // Fetch approver's profile to include in the response (powers "Sent to [Name]" UI).
    let pendingApprover: { id: string; name: string; role: string; department: string | null } | null = null;
    if (approverRouting.approverId) {
      const approverProfile = await prisma.employee.findUnique({
        where: { id: approverRouting.approverId },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          primary_role: true,
          department: true,
          designation: true,
        },
      });
      if (approverProfile) {
        pendingApprover = {
          id: approverProfile.id,
          name: `${approverProfile.first_name} ${approverProfile.last_name}`.trim(),
          role: approverProfile.designation || approverProfile.primary_role,
          department: approverProfile.department,
        };
      }
    }

    await dispatchNotification({
      event: 'leave_submitted',
      companyId: employee.org_id,
      recipientEmployeeId: employee.id,
      actorEmployeeId: employee.id,
      channels: ['email', 'in_app'],
      payload: {
        leaveRequestId: leaveRequest.id,
        dates: `${data.start_date} → ${data.end_date}`,
        reason,
      },
    });

    return serviceOk({
      id: leaveRequest.id,
      status: requestStatus,
      total_days: totalDays,
      leave_type: leaveType,
      start_date: data.start_date,
      end_date: data.end_date,
      pendingApprover,
      approverChainLength: approverRouting.allApproverIds.length,
      approverRoutingReason: approverRouting.reason,
    });
}

/**
 * Submits a leave request without HTTP session cookies.
 */
export async function submitLeaveService(
  ctx: AssistantExecutionContext,
  input: LeaveSubmitInput
): Promise<ServiceResult<LeaveSubmitOutput>> {
  try {
    if (ctx.idempotencyKey) {
      return withIdempotency(ctx, ctx.idempotencyKey, () => executeSubmitLeave(ctx, input));
    }
    return await executeSubmitLeave(ctx, input);
  } catch (error) {
    logger.error('submit_leave_service_error', {
      employeeId: ctx.employeeId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return serviceError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
