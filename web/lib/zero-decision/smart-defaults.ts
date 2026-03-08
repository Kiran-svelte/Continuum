import prisma from '@/lib/prisma';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface LeaveRequestDefaults {
  managerId: string | null;
  managerName: string | null;
  availableLeaveTypes: Array<{
    code: string;
    name: string;
    remaining: number;
  }>;
  suggestedLeaveType: string | null;
  upcomingHolidays: Array<{
    name: string;
    date: string;
  }>;
}

export interface LeaveDurationResult {
  totalDays: number;
  workingDays: number;
  holidays: number;
  weekends: number;
}

// ─── Smart Defaults ──────────────────────────────────────────────────────────

/**
 * Returns smart defaults for a leave request form:
 * - Auto-fills manager from approval hierarchy
 * - Shows available leave types with remaining balance
 * - Suggests the most commonly used leave type
 * - Lists upcoming holidays
 */
export async function getLeaveRequestDefaults(
  empId: string
): Promise<LeaveRequestDefaults> {
  const currentYear = new Date().getFullYear();

  const [employee, balances, holidays, recentRequests] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: empId },
      select: {
        org_id: true,
        manager_id: true,
        manager: {
          select: { first_name: true, last_name: true },
        },
        approval_hierarchy: {
          select: {
            level1_approver: true,
            level1: { select: { first_name: true, last_name: true } },
          },
        },
      },
    }),
    prisma.leaveBalance.findMany({
      where: { emp_id: empId, year: currentYear },
      select: { leave_type: true, remaining: true },
    }),
    prisma.publicHoliday.findMany({
      where: {
        date: { gte: new Date() },
      },
      orderBy: { date: 'asc' },
      take: 10,
      select: { name: true, date: true },
    }),
    prisma.leaveRequest.findMany({
      where: {
        emp_id: empId,
        status: { in: ['approved', 'pending'] },
      },
      orderBy: { created_at: 'desc' },
      take: 10,
      select: { leave_type: true },
    }),
  ]);

  if (!employee) {
    return {
      managerId: null,
      managerName: null,
      availableLeaveTypes: [],
      suggestedLeaveType: null,
      upcomingHolidays: [],
    };
  }

  // Determine manager: prefer approval hierarchy level1, fall back to direct manager
  const managerId =
    employee.approval_hierarchy?.level1_approver ?? employee.manager_id ?? null;
  const managerData =
    employee.approval_hierarchy?.level1 ?? employee.manager ?? null;
  const managerName = managerData
    ? `${managerData.first_name} ${managerData.last_name}`
    : null;

  // Get leave types from company
  const companyLeaveTypes = await prisma.leaveType.findMany({
    where: { company_id: employee.org_id, is_active: true, deleted_at: null },
    select: { code: true, name: true },
  });

  const availableLeaveTypes = companyLeaveTypes.map((lt: { code: string; name: string }) => {
    const balance = balances.find((b: { leave_type: string; remaining: number }) => b.leave_type === lt.code);
    return {
      code: lt.code,
      name: lt.name,
      remaining: balance?.remaining ?? 0,
    };
  });

  // Suggest most frequently used leave type, or first available if no history
  const typeCounts: Record<string, number> = {};
  for (const req of recentRequests) {
    typeCounts[req.leave_type] = (typeCounts[req.leave_type] || 0) + 1;
  }
  const suggestedLeaveType =
    Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0]
    ?? (availableLeaveTypes.length > 0 ? availableLeaveTypes[0].code : null);

  return {
    managerId,
    managerName,
    availableLeaveTypes,
    suggestedLeaveType,
    upcomingHolidays: holidays.map((h: { name: string; date: Date }) => ({
      name: h.name,
      date: h.date.toISOString().split('T')[0],
    })),
  };
}

/**
 * Predicts total leave duration considering holidays and weekends.
 * Calculates working days by excluding weekends and holidays.
 */
export function predictLeaveDuration(
  startDate: Date,
  endDate: Date,
  holidays: Date[],
  workDays: number[] = [1, 2, 3, 4, 5] // Mon-Fri
): LeaveDurationResult {
  let totalDays = 0;
  let workingDays = 0;
  let holidayCount = 0;
  let weekendCount = 0;

  const holidaySet = new Set(
    holidays.map((h) => h.toISOString().split('T')[0])
  );

  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    totalDays++;
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const dateStr = current.toISOString().split('T')[0];

    const isWorkDay = workDays.includes(dayOfWeek);
    const isHoliday = holidaySet.has(dateStr);

    if (!isWorkDay) {
      weekendCount++;
    } else if (isHoliday) {
      holidayCount++;
    } else {
      workingDays++;
    }

    current.setDate(current.getDate() + 1);
  }

  return {
    totalDays,
    workingDays,
    holidays: holidayCount,
    weekends: weekendCount,
  };
}
