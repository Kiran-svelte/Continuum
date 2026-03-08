import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/attendance
 * Returns company-wide attendance for a given date.
 * Only accessible by admin, hr, director roles.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }
    requireRole(employee, 'admin', 'hr', 'director');

    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const search = searchParams.get('search')?.trim() ?? '';
    const statusFilter = searchParams.get('status') ?? '';

    // Default to today
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    const nextDay = new Date(targetDate);
    nextDay.setDate(nextDay.getDate() + 1);

    const companyId = employee.org_id;

    // Get all active employees in the company
    const employeeWhere: Record<string, unknown> = {
      org_id: companyId,
      deleted_at: null,
      status: { in: ['active', 'probation'] },
    };
    if (search) {
      employeeWhere.OR = [
        { first_name: { contains: search, mode: 'insensitive' } },
        { last_name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    const allEmployees = await prisma.employee.findMany({
      where: employeeWhere,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        department: true,
        email: true,
      },
      orderBy: { first_name: 'asc' },
    });

    // Get attendance records for this date
    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        company_id: companyId,
        date: { gte: targetDate, lt: nextDay },
      },
      select: {
        id: true,
        emp_id: true,
        date: true,
        check_in: true,
        check_out: true,
        status: true,
        is_wfh: true,
        total_hours: true,
      },
    });

    const attendanceMap = new Map(attendanceRecords.map(r => [r.emp_id, r]));

    // Build combined records
    let records = allEmployees.map(emp => {
      const att = attendanceMap.get(emp.id);
      return {
        employee_id: emp.id,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        initials: `${emp.first_name.charAt(0)}${emp.last_name.charAt(0)}`.toUpperCase(),
        department: emp.department ?? 'Unassigned',
        email: emp.email,
        date: targetDate.toISOString().split('T')[0],
        check_in: att?.check_in ?? null,
        check_out: att?.check_out ?? null,
        status: att?.status ?? 'absent',
        is_wfh: att?.is_wfh ?? false,
        total_hours: att?.total_hours ?? null,
      };
    });

    // Apply status filter
    if (statusFilter && statusFilter !== 'all') {
      records = records.filter(r => r.status === statusFilter);
    }

    // Summary
    const presentCount = records.filter(r => r.status === 'present').length;
    const lateCount = records.filter(r => r.status === 'late').length;
    const absentCount = records.filter(r => r.status === 'absent').length;
    const onLeaveCount = records.filter(r => r.status === 'on_leave').length;
    const wfhCount = records.filter(r => r.is_wfh).length;
    const halfDayCount = records.filter(r => r.status === 'half_day').length;

    return NextResponse.json({
      records,
      summary: {
        total: allEmployees.length,
        present: presentCount,
        late: lateCount,
        absent: absentCount,
        onLeave: onLeaveCount,
        wfh: wfhCount,
        halfDay: halfDayCount,
      },
      date: targetDate.toISOString().split('T')[0],
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
