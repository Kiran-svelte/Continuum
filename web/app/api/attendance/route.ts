import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';

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
    const employee = await getAuthEmployee();

    const { searchParams } = new URL(request.url);
    const now = new Date();
    const month = parseInt(searchParams.get('month') ?? String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') ?? String(now.getFullYear()), 10);
    const limit = Math.min(100, parseInt(searchParams.get('limit') ?? '31', 10));

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
    const wfhDays = records.filter(r => r.is_wfh).length;
    const absentDays = records.filter(r => r.status === 'absent').length;
    const onLeaveDays = records.filter(r => r.status === 'on_leave').length;
    const totalHours = records.reduce((sum, r) => sum + (r.total_hours ?? 0), 0);
    const workingDays = records.filter(r => r.status !== 'weekend' && r.status !== 'holiday').length;
    const attendancePercent = workingDays > 0
      ? (((presentDays + wfhDays) / workingDays) * 100).toFixed(1)
      : '0.0';

    return NextResponse.json({
      records,
      summary: {
        presentDays,
        wfhDays,
        absentDays,
        onLeaveDays,
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
    const employee = await getAuthEmployee();
    const body = await request.json();
    const { action, is_wfh } = body;

    if (!action || !['check_in', 'check_out'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use check_in or check_out.' }, { status: 400 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Find today's attendance record
    let attendance = await prisma.attendance.findFirst({
      where: {
        emp_id: employee.id,
        company_id: employee.org_id,
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    const now = new Date();

    // Fetch company settings for grace period and half-day detection
    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: {
        work_start: true,
        work_end: true,
        grace_period_minutes: true,
        half_day_hours: true,
      },
    });

    if (action === 'check_in') {
      if (attendance?.check_in) {
        return NextResponse.json({ error: 'Already checked in today.' }, { status: 400 });
      }

      // Determine if the employee is late based on work_start + grace period
      const [startH, startM] = (company?.work_start || '09:00').split(':').map(Number);
      const workStartTime = new Date(now);
      workStartTime.setHours(startH, startM, 0, 0);

      const graceMs = (company?.grace_period_minutes ?? 15) * 60 * 1000;
      const graceCutoff = new Date(workStartTime.getTime() + graceMs);

      const status = now > graceCutoff ? 'late' : 'present';

      if (attendance) {
        attendance = await prisma.attendance.update({
          where: { id: attendance.id },
          data: {
            check_in: now,
            status,
            is_wfh: is_wfh ?? false,
          },
        });
      } else {
        attendance = await prisma.attendance.create({
          data: {
            emp_id: employee.id,
            company_id: employee.org_id,
            date: today,
            check_in: now,
            status,
            is_wfh: is_wfh ?? false,
          },
        });
      }
    } else if (action === 'check_out') {
      if (!attendance?.check_in) {
        return NextResponse.json({ error: 'Must check in first.' }, { status: 400 });
      }
      if (attendance.check_out) {
        return NextResponse.json({ error: 'Already checked out today.' }, { status: 400 });
      }

      const checkIn = new Date(attendance.check_in);
      const totalHours = (now.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

      // Auto-detect half-day if total hours worked is below the threshold
      const halfDayThreshold = company?.half_day_hours ?? 4;
      let checkoutStatus = attendance.status; // preserve 'late' if they were late
      if (totalHours < halfDayThreshold) {
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

    return NextResponse.json({ attendance });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
