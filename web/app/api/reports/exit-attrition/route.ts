/**
 * GET /api/reports/exit-attrition
 *
 * Returns exits by month, department, and status within a year.
 *
 * Query params:
 *   year - 4-digit year (defaults to current year)
 *
 * Auth: exit module + employee.terminate permission
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

/** Exit status values that count as attrition. */
const ATTRITION_STATUSES = ['terminated', 'resigned', 'exited'] as const;

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'exit');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'employee.terminate');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const now = new Date();
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') ?? String(now.getUTCFullYear()), 10);

    if (year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year parameter.' }, { status: 400 });
    }

    const yearStart = new Date(Date.UTC(year, 0, 1));
    const yearEnd = new Date(Date.UTC(year + 1, 0, 1));

    const exitHistory = await prisma.employeeStatusHistory.findMany({
      where: {
        company_id: employee.org_id,
        to_status: { in: [...ATTRITION_STATUSES] },
        created_at: { gte: yearStart, lt: yearEnd },
      },
      select: {
        to_status: true,
        created_at: true,
        employee: {
          select: { department: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 5000,
    });

    const byMonth = new Map<number, number>();
    const byDepartment = new Map<string, number>();
    const byStatus = new Map<string, number>();

    for (const record of exitHistory) {
      const monthKey = record.created_at.getUTCMonth() + 1;
      byMonth.set(monthKey, (byMonth.get(monthKey) ?? 0) + 1);

      const dept = (record.employee as { department: string | null } | null)?.department ?? 'Unassigned';
      byDepartment.set(dept, (byDepartment.get(dept) ?? 0) + 1);

      byStatus.set(record.to_status, (byStatus.get(record.to_status) ?? 0) + 1);
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      year,
      totalExits: exitHistory.length,
      byMonth: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        count: byMonth.get(i + 1) ?? 0,
      })),
      byDepartment: Array.from(byDepartment.entries()).map(([department, count]) => ({
        department,
        count,
      })),
      byStatus: Array.from(byStatus.entries()).map(([status, count]) => ({ status, count })),
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
