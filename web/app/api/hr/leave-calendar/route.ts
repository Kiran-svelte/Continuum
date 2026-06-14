import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

/** Shape of a single leave entry returned to the calendar UI. */
interface CalendarLeaveEntry {
  id: string;
  emp_id: string;
  employee_name: string;
  department: string | null;
  leave_type: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
}

/** Shape of a single holiday entry returned to the calendar UI. */
interface CalendarHolidayEntry {
  id: string;
  name: string;
  date: string;
}

/**
 * GET /api/hr/leave-calendar
 *
 * Returns all non-cancelled leave requests that overlap a given month,
 * plus company holidays for that month. Designed for the HR leave calendar view.
 *
 * Query params:
 *   - month: 1-12 (defaults to current month)
 *   - year: YYYY (defaults to current year)
 *
 * Response:
 *   {
 *     leaves: CalendarLeaveEntry[],
 *     holidays: CalendarHolidayEntry[],
 *     meta: { month, year, totalLeaves, totalHolidays }
 *   }
 *
 * @throws {AuthError} when the caller is not authenticated or lacks permission
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const caller = await getAuthEmployee();
    requirePermissionGuard(caller, 'reports.view_all');

    if (!caller.org_id) {
      return NextResponse.json(
        { error: { code: 'NO_COMPANY', message: 'HR calendar requires a company context.' } },
        { status: 400 }
      );
    }

    const moduleGuard = await assertModule(caller.org_id, 'leave');
    if (moduleGuard) return moduleGuard;

    const { searchParams } = new URL(request.url);
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');

    const month = monthParam ? parseInt(monthParam, 10) : new Date().getMonth() + 1;
    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json(
        { error: { code: 'INVALID_PARAMS', message: 'month must be 1–12 and year must be 2000–2100.' } },
        { status: 400 }
      );
    }

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const leaveSelect = {
      id: true,
      emp_id: true,
      leave_type: true,
      start_date: true,
      end_date: true,
      total_days: true,
      status: true,
      employee: {
        select: {
          first_name: true,
          last_name: true,
          department: true,
        },
      },
    } satisfies Prisma.LeaveRequestSelect;

    const [leaveRows, holidayRows] = await Promise.all([
      prisma.leaveRequest.findMany({
        where: {
          company_id: caller.org_id,
          status: { notIn: ['cancelled', 'draft'] },
          start_date: { lte: monthEnd },
          end_date: { gte: monthStart },
        },
        select: leaveSelect,
        orderBy: { start_date: 'asc' },
        take: 500,
      }),
      prisma.publicHoliday.findMany({
        where: {
          OR: [
            { company_id: caller.org_id },
            { company_id: null, country_code: 'IN' },
          ],
          date: { gte: monthStart, lte: monthEnd },
        },
        select: { id: true, name: true, date: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const leaves: CalendarLeaveEntry[] = leaveRows.map((row) => ({
      id: row.id,
      emp_id: row.emp_id,
      employee_name: `${row.employee.first_name} ${row.employee.last_name}`.trim(),
      department: row.employee.department ?? null,
      leave_type: row.leave_type,
      start_date: row.start_date.toISOString(),
      end_date: row.end_date.toISOString(),
      total_days: row.total_days,
      status: row.status,
    }));

    const holidays: CalendarHolidayEntry[] = holidayRows.map((h) => ({
      id: h.id,
      name: h.name,
      date: h.date.toISOString(),
    }));

    return NextResponse.json({
      leaves,
      holidays,
      meta: {
        month,
        year,
        totalLeaves: leaves.length,
        totalHolidays: holidays.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message } },
        { status: error.status }
      );
    }
    const message =
      process.env.NODE_ENV === 'production'
        ? 'Internal server error'
        : String(error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
