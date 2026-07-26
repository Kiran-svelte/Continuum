/**
 * Headless attendance clock-in/out service.
 * Implements L5-03-PART-C clockAttendanceService.
 */
import { randomUUID } from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  dateKeyToUtcRange,
  getDateKeyInTimeZone,
  getMinutesOfDayInTimeZone,
  parseClockTimeToMinutes,
  resolveOperationalTimezone,
} from '@/lib/api-guards';
import { checkApiRateLimit } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { dispatchNotification } from '@/lib/notifications/dispatch';
import { withIdempotency } from './idempotency';
import { guardCompanySetup, guardModule, guardPermission } from './_shared/guards';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import logger from '@/lib/logger';

export interface AttendanceClockInput {
  action: 'check_in' | 'check_out';
  is_wfh?: boolean;
}

export interface AttendanceClockOutput {
  id: string;
  status: string;
  check_in: string | null;
  check_out: string | null;
  is_wfh: boolean;
  total_hours: number | null;
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

async function executeClockAttendance(
  ctx: AssistantExecutionContext,
  input: AttendanceClockInput
): Promise<ServiceResult<AttendanceClockOutput>> {
  if (!ctx.orgId) {
    return serviceError('FORBIDDEN', 'Company context required', 403);
  }

  const setupGuard = await guardCompanySetup(ctx.orgId);
  if (setupGuard) return setupGuard;

  const moduleGuard = await guardModule(ctx.orgId, 'attendance');
  if (moduleGuard) return moduleGuard;

  const permGuard = guardPermission(ctx, 'attendance.mark_own');
  if (permGuard) return permGuard;

  const rateLimit = checkApiRateLimit(ctx.employeeId, 'attendance/clock');
  if (!rateLimit.allowed) {
    return serviceError('RATE_LIMIT', 'Rate limit exceeded', 429);
  }

  const { action, is_wfh } = input;
  if (!action || !['check_in', 'check_out'].includes(action)) {
    return serviceError('VALIDATION_ERROR', 'Invalid action. Use check_in or check_out.', 400);
  }

  const now = new Date();

  const company = await prisma.company.findUnique({
    where: { id: ctx.orgId },
    select: {
      work_start: true,
      work_end: true,
      grace_period_minutes: true,
      half_day_hours: true,
      timezone: true,
      settings: {
        select: {
          check_in_reminders: true,
          check_out_reminders: true,
        },
      },
    },
  });

  if (!company) {
    return serviceError('VALIDATION_ERROR', 'Company configuration not found.', 400);
  }

  const checkInConfig = asRecord(company.settings?.check_in_reminders);
  const checkOutConfig = asRecord(company.settings?.check_out_reminders);
  const configuredGraceMinutes =
    typeof checkInConfig.grace_period_minutes === 'number'
      ? checkInConfig.grace_period_minutes
      : company.grace_period_minutes ?? 15;
  const configuredWorkStart =
    typeof checkInConfig.check_in_window_start === 'string' &&
    checkInConfig.check_in_window_start.length > 0
      ? checkInConfig.check_in_window_start
      : company.work_start || '09:00';
  const configuredHalfDayHours =
    typeof checkInConfig.work_hours_per_day === 'number' && checkInConfig.work_hours_per_day > 0
      ? Math.max(1, checkInConfig.work_hours_per_day / 2)
      : company.half_day_hours ?? 4;
  const wfhAllowed = checkInConfig.wfh_allowed !== false;

  const timezoneResolution = resolveOperationalTimezone(company.timezone);
  const companyTimezone = timezoneResolution.timezone;
  const todayKey = getDateKeyInTimeZone(now, companyTimezone);
  const { start: todayStartUtc, endExclusive: tomorrowStartUtc } = dateKeyToUtcRange(todayKey);

  let attendance = await prisma.attendance.findFirst({
    where: {
      emp_id: ctx.employeeId,
      company_id: ctx.orgId,
      date: { gte: todayStartUtc, lt: tomorrowStartUtc },
    },
  });

  if (action === 'check_in') {
    if (attendance?.check_in) {
      return serviceError('ALREADY_CLOCKED_IN', 'Already checked in today.', 400);
    }

    if (is_wfh && !wfhAllowed) {
      return serviceError('WFH_DISABLED', 'WFH check-in is disabled by company policy.', 400);
    }

    // Compare against the company's wall clock, not the server's. With
    // setHours() on a UTC host, an Asia/Kolkata company's 09:30 start was
    // evaluated as 09:30 UTC (15:00 IST), so genuinely late arrivals were
    // recorded as "present" and late-arrival reporting stayed empty.
    const workStartMinutes = parseClockTimeToMinutes(configuredWorkStart) ?? 9 * 60;
    const nowMinutes = getMinutesOfDayInTimeZone(now, companyTimezone);
    const status = nowMinutes > workStartMinutes + configuredGraceMinutes ? 'late' : 'present';

    try {
      if (attendance) {
        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: { check_in: now, status, is_wfh: is_wfh ?? false },
        });
      } else {
        attendance = await prisma.attendance.create({
          data: {
            id: randomUUID(),
            emp_id: ctx.employeeId,
            company_id: ctx.orgId,
            date: todayStartUtc,
            check_in: now,
            status,
            is_wfh: is_wfh ?? false,
          },
        });
      }
    } catch (createError) {
      if (
        createError instanceof Prisma.PrismaClientKnownRequestError &&
        createError.code === 'P2002'
      ) {
        return serviceError('ALREADY_CLOCKED_IN', 'Already checked in today.', 400);
      }
      throw createError;
    }
  } else {
    if (!attendance?.check_in) {
      return serviceError('VALIDATION_ERROR', 'Must check in first.', 400);
    }
    if (attendance.check_out) {
      return serviceError('ALREADY_CLOCKED_OUT', 'Already checked out today.', 400);
    }

    const checkIn = new Date(attendance.check_in);
    const checkInDayKey = getDateKeyInTimeZone(checkIn, companyTimezone);
    const nowDayKey = getDateKeyInTimeZone(now, companyTimezone);

    if (nowDayKey !== checkInDayKey) {
      return serviceError(
        'VALIDATION_ERROR',
        'Check-out must happen on the same attendance day as check-in.',
        400
      );
    }

    if (now.getTime() <= checkIn.getTime()) {
      return serviceError('VALIDATION_ERROR', 'Check-out time must be after check-in time.', 400);
    }

    const totalHours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
    let checkoutStatus = attendance.status;

    if (
      typeof checkOutConfig.check_out_window_end === 'string' &&
      checkOutConfig.check_out_window_end.length > 0
    ) {
      // Same wall-clock rule as check-in — the window is a company-local time.
      const cutoffMinutes = parseClockTimeToMinutes(checkOutConfig.check_out_window_end);
      const nowMinutes = getMinutesOfDayInTimeZone(now, companyTimezone);
      if (cutoffMinutes !== null && nowMinutes > cutoffMinutes) {
        return serviceError(
          'VALIDATION_ERROR',
          'Check-out is outside the configured checkout window.',
          400
        );
      }
    }

    if (totalHours < configuredHalfDayHours) {
      checkoutStatus = 'half_day';
    }

    attendance = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        check_out: now,
        total_hours: parseFloat(totalHours.toFixed(2)),
        status: checkoutStatus,
      },
    });
  }

  await createAuditLog({
    companyId: ctx.orgId,
    actorId: ctx.employeeId,
    action:
      action === 'check_in'
        ? AUDIT_ACTIONS.ATTENDANCE_CHECK_IN
        : AUDIT_ACTIONS.ATTENDANCE_CHECK_OUT,
    entityType: 'Attendance',
    entityId: attendance.id,
    newState: { action, channel: ctx.channel, status: attendance.status },
  });

  if (attendance.status === 'late') {
    await dispatchNotification({
      event: 'attendance_late',
      companyId: ctx.orgId,
      recipientEmployeeId: ctx.employeeId,
      channels: ['in_app'],
      payload: {},
    });
  }

  return serviceOk({
    id: attendance.id,
    status: attendance.status,
    check_in: attendance.check_in?.toISOString() ?? null,
    check_out: attendance.check_out?.toISOString() ?? null,
    is_wfh: attendance.is_wfh,
    total_hours: attendance.total_hours,
  });
}

/**
 * Clocks an employee in or out for today.
 */
export async function clockAttendanceService(
  ctx: AssistantExecutionContext,
  input: AttendanceClockInput
): Promise<ServiceResult<AttendanceClockOutput>> {
  try {
    if (ctx.idempotencyKey) {
      return withIdempotency(ctx, ctx.idempotencyKey, () =>
        executeClockAttendance(ctx, input)
      );
    }
    return await executeClockAttendance(ctx, input);
  } catch (error) {
    logger.error('clock_attendance_service_error', {
      employeeId: ctx.employeeId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return serviceError('INTERNAL_ERROR', 'Internal server error', 500);
  }
}
