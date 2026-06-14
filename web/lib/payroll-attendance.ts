export interface PayrollAttendanceRecord {
  emp_id: string;
  date: Date;
  status: string;
  is_wfh: boolean;
}

export interface PayrollLeaveRecord {
  emp_id: string;
  start_date: Date;
  end_date: Date;
  is_half_day: boolean;
}

export interface PayrollAttendanceSummary {
  workingDays: number;
  presentDays: number;
  leaveDays: number;
  absentDays: number;
}

const DEFAULT_WORK_DAYS = [1, 2, 3, 4, 5];

function toDateKey(date: Date): string {
  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function normalizeWorkDays(workDays: unknown): number[] {
  if (!Array.isArray(workDays)) {
    return DEFAULT_WORK_DAYS;
  }

  const normalized = workDays.filter((day): day is number => Number.isInteger(day) && day >= 0 && day <= 6);

  return normalized.length > 0 ? normalized : DEFAULT_WORK_DAYS;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getMonthBounds(year: number, month: number): { start: Date; end: Date } {
  return {
    start: new Date(Date.UTC(year, month - 1, 1)),
    end: new Date(Date.UTC(year, month, 0)),
  };
}

export function buildPayrollWorkingDayKeys(
  year: number,
  month: number,
  workDays: unknown,
  holidayDates: Date[] = []
): string[] {
  const { start, end } = getMonthBounds(year, month);
  const workDaySet = new Set(normalizeWorkDays(workDays));
  const holidaySet = new Set(holidayDates.map(toDateKey));
  const dayKeys: string[] = [];

  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    if (!workDaySet.has(cursor.getUTCDay())) continue;
    const key = toDateKey(cursor);
    if (holidaySet.has(key)) continue;
    dayKeys.push(key);
  }

  return dayKeys;
}

export function summarizePayrollAttendance(params: {
  year: number;
  month: number;
  workDays: unknown;
  attendance: PayrollAttendanceRecord[];
  leaveRequests: PayrollLeaveRecord[];
  holidayDates?: Date[];
}): PayrollAttendanceSummary {
  const workingDayKeys = buildPayrollWorkingDayKeys(
    params.year,
    params.month,
    params.workDays,
    params.holidayDates ?? []
  );

  const attendanceByDate = new Map<string, PayrollAttendanceRecord>();
  for (const record of params.attendance) {
    attendanceByDate.set(toDateKey(record.date), record);
  }

  const approvedLeaveByDate = new Map<string, number>();
  const monthStart = new Date(Date.UTC(params.year, params.month - 1, 1));
  const monthEnd = new Date(Date.UTC(params.year, params.month, 0));

  for (const leave of params.leaveRequests) {
    const leaveStart = leave.start_date > monthStart ? leave.start_date : monthStart;
    const leaveEnd = leave.end_date < monthEnd ? leave.end_date : monthEnd;

    for (let cursor = new Date(leaveStart); cursor <= leaveEnd; cursor = addDays(cursor, 1)) {
      const key = toDateKey(cursor);
      if (!workingDayKeys.includes(key)) continue;
      approvedLeaveByDate.set(key, leave.is_half_day ? 0.5 : 1);
    }
  }

  let presentDays = 0;
  let leaveDays = 0;
  let absentDays = 0;

  for (const dayKey of workingDayKeys) {
    const attendance = attendanceByDate.get(dayKey);
    const approvedLeave = approvedLeaveByDate.get(dayKey);

    if (attendance?.status === 'holiday' || attendance?.status === 'weekend') {
      continue;
    }

    if (attendance?.status === 'on_leave') {
      if (approvedLeave) {
        leaveDays += approvedLeave;

        // Keep day accounting coherent for partial approved leave on on_leave.
        const remainingPortion = Math.max(0, 1 - approvedLeave);
        if (remainingPortion > 0) {
          if (attendance.is_wfh) {
            presentDays += remainingPortion;
          } else {
            absentDays += remainingPortion;
          }
        }
      } else {
        absentDays += 1;
      }
      continue;
    }

    if (attendance?.status === 'half_day') {
      presentDays += 0.5;
      absentDays += 0.5;
      continue;
    }

    if (attendance?.status === 'present' || attendance?.status === 'late' || attendance?.is_wfh) {
      presentDays += 1;
      continue;
    }

    if (approvedLeave) {
      leaveDays += approvedLeave;
      continue;
    }

    absentDays += 1;
  }

  return {
    workingDays: workingDayKeys.length,
    presentDays,
    leaveDays,
    absentDays,
  };
}