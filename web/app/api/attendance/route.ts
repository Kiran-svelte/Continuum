import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { buildContextFromSession } from '@/lib/channel/context-from-session';
import { clockAttendanceService } from '@/lib/services/attendance-clock';
import { getTodayAttendanceService } from '@/lib/services/attendance-today';
import { serviceResultToLegacyResponse } from '@/lib/services/service-response';
import { parseBoundedInt } from '@/lib/api-guards';

export const dynamic = 'force-dynamic';

/**
 * GET /api/attendance
 *
 * Returns attendance records for the authenticated employee.
 * Query params:
 *   month  - month number (1-12, default: current month)
 *   year   - year (default: current year)
 *   limit  - max records (default: 31)
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'attendance');
    if (moduleGuard) return moduleGuard;

    const { searchParams } = new URL(request.url);
    if (searchParams.get('today') === '1') {
      const ctx = buildContextFromSession(employee, { channel: 'web' });
      const result = await getTodayAttendanceService(ctx);
      return serviceResultToLegacyResponse(result);
    }

    const now = new Date();
    const month = parseBoundedInt(searchParams.get('month'), {
      defaultValue: now.getMonth() + 1,
      min: 1,
      max: 12,
    });
    const year = parseBoundedInt(searchParams.get('year'), {
      defaultValue: now.getFullYear(),
      min: 2000,
      max: 2100,
    });
    const limit = parseBoundedInt(searchParams.get('limit'), {
      defaultValue: 31,
      min: 1,
      max: 100,
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const records = await prisma.attendance.findMany({
      where: {
        emp_id: employee.id,
        company_id: employee.org_id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'desc' },
      take: limit,
      select: {
        id: true,
        date: true,
        check_in: true,
        check_out: true,
        status: true,
        is_wfh: true,
        total_hours: true,
      },
    });

    // Calculate summary stats
    const presentDays = records.filter(r => r.status === 'present' || r.status === 'late').length;
    const halfDayDays = records.filter(r => r.status === 'half_day').length;
    const wfhDays = records.filter(r => r.is_wfh).length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const onLeaveDays = records.filter(r => r.status === 'on_leave').length;
    const lateDays = records.filter(r => r.status === 'late').length;
    const totalHours = records.reduce((sum, r) => sum + (r.total_hours ?? 0), 0);
    const workingDays = records.filter(r => r.status !== 'weekend' && r.status !== 'holiday').length;
    const attendancePercent = workingDays > 0
      ? (((presentDays + wfhDays + halfDayDays) / workingDays) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      records,
      summary: {
        presentDays,
        halfDayDays,
        wfhDays,
        absentDays,
        onLeaveDays,
        lateDays,
        totalHours: totalHours.toFixed(1),
        attendancePercent,
        workingDays,
      },
      month,
      year,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/attendance
 *
 * Clock in/out for the day.
 * Body: { action: 'check_in' | 'check_out', is_wfh?: boolean }
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const body = await request.json().catch(() => ({}));

    const ctx = buildContextFromSession(employee, {
      channel: 'web',
      idempotencyKey: request.headers.get('Idempotency-Key') ?? undefined,
    });

    const result = await clockAttendanceService(ctx, {
      action: body.action,
      is_wfh: body.is_wfh,
    });

    if (result.ok) {
      return NextResponse.json({ attendance: result.data });
    }

    return serviceResultToLegacyResponse(result);
  } catch (error) {
    console.error('[Attendance POST] Error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
