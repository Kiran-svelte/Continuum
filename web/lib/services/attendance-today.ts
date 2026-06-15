/**
 * Headless today's attendance service.
 * Returns today's attendance record for the employee.
 * Callable from web routes and WhatsApp.
 * Implements L5-03-PART-C (getTodayAttendanceService).
 */
import prisma from '@/lib/prisma';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import logger from '@/lib/logger';

/** Attendance status values matching the AttendanceStatus enum. */
export type AttendanceStatusValue =
  | 'present'
  | 'absent'
  | 'half_day'
  | 'late'
  | 'on_leave'
  | 'holiday'
  | 'weekend';

/** Payload returned on success. */
export interface TodayAttendancePayload {
  employeeId: string;
  date: string;
  hasRecord: boolean;
  isClockedIn: boolean;
  isClockedOut: boolean;
  checkIn: string | null;
  checkOut: string | null;
  totalHours: number | null;
  status: AttendanceStatusValue | null;
  isWfh: boolean;
}

/**
 * Returns the attendance record for today UTC date.
 * Returns hasRecord=false when no record exists (employee hasn't clocked in yet).
 *
 * @param ctx - Execution context (employeeId, orgId).
 * @returns ServiceResult with today's attendance payload.
 */
export async function getTodayAttendanceService(
  ctx: Pick<AssistantExecutionContext, 'employeeId' | 'orgId'>
): Promise<ServiceResult<TodayAttendancePayload>> {
  try {
    const today = buildTodayStart();

    const record = await prisma.attendance.findFirst({
      where: {
        emp_id: ctx.employeeId,
        company_id: ctx.orgId,
        date: today,
      },
      select: {
        date: true,
        check_in: true,
        check_out: true,
        status: true,
        is_wfh: true,
        total_hours: true,
      },
    });

    if (!record) {
      return serviceOk({
        employeeId: ctx.employeeId,
        date: today.toISOString().split('T')[0]!,
        hasRecord: false,
        isClockedIn: false,
        isClockedOut: false,
        checkIn: null,
        checkOut: null,
        totalHours: null,
        status: null,
        isWfh: false,
      });
    }

    return serviceOk({
      employeeId: ctx.employeeId,
      date: record.date.toISOString().split('T')[0]!,
      hasRecord: true,
      isClockedIn: record.check_in !== null,
      isClockedOut: record.check_out !== null,
      checkIn: record.check_in?.toISOString() ?? null,
      checkOut: record.check_out?.toISOString() ?? null,
      totalHours: record.total_hours,
      status: record.status as AttendanceStatusValue,
      isWfh: record.is_wfh,
    });
  } catch (error) {
    logger.error('get_today_attendance_service_error', {
      employeeId: ctx.employeeId,
      orgId: ctx.orgId,
      error: error instanceof Error ? error.message : 'unknown',
    });

    return serviceError('INTERNAL_ERROR', 'Failed to fetch today\'s attendance.', 500);
  }
}

/** Returns the start of today in UTC (midnight). */
function buildTodayStart(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
