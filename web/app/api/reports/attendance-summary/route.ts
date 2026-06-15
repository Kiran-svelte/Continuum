/**
 * GET /api/reports/attendance-summary
 *
 * Returns an attendance summary for a given month/year:
 *   - per-employee present/absent/late/half-day counts
 *   - company-level aggregates
 *
 * Query params:
 *   month - 1-12 (defaults to current month)
 *   year  - 4-digit year (defaults to current year)
 *
 * Auth: attendance module + attendance.view_all permission
 * @throws {AuthError} 401/403 on auth failures
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/** Maximum number of employees to include in one report response. */
const MAX_REPORT_ROWS = 1000;

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'attendance');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'attendance.view_all');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const now = new Date();
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') ?? String(now.getUTCMonth() + 1), 10);
    const year = parseInt(searchParams.get('year') ?? String(now.getUTCFullYear()), 10);

    if (month < 1 || month > 12 || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid month or year parameter.' }, { status: 400 });
    }

    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 1));

    const records = await prisma.attendance.findMany({
      where: {
        company_id: employee.org_id,
        date: { gte: periodStart, lt: periodEnd },
        employee: { deleted_at: null },
      },
      select: {
        emp_id: true,
        status: true,
        employee: { select: { first_name: true, last_name: true, department: true } },
      },
      take: MAX_REPORT_ROWS,
    });

    // Aggregate by employee
    const byEmployee = new Map<string, {
      empId: string;
      name: string;
      department: string | null;
      present: number;
      absent: number;
      late: number;
      halfDay: number;
    }>();

    for (const record of records) {
      if (!byEmployee.has(record.emp_id)) {
        byEmployee.set(record.emp_id, {
          empId: record.emp_id,
          name: `${record.employee.first_name} ${record.employee.last_name}`,
          department: record.employee.department,
          present: 0,
          absent: 0,
          late: 0,
          halfDay: 0,
        });
      }
      const entry = byEmployee.get(record.emp_id)!;
      if (record.status === 'present') entry.present++;
      else if (record.status === 'absent') entry.absent++;
      else if (record.status === 'late') entry.late++;
      else if (record.status === 'half_day') entry.halfDay++;
    }

    const rows = Array.from(byEmployee.values());
    const totals = rows.reduce(
      (acc, r) => {
        acc.present += r.present;
        acc.absent += r.absent;
        acc.late += r.late;
        acc.halfDay += r.halfDay;
        return acc;
      },
      { present: 0, absent: 0, late: 0, halfDay: 0 }
    );

    return NextResponse.json({
      generatedAt: now.toISOString(),
      period: { month, year },
      totals,
      employees: rows,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
