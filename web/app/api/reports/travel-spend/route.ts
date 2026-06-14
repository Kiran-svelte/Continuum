/**
 * GET /api/reports/travel-spend
 *
 * Returns travel request spend grouped by employee/month/status.
 *
 * Query params:
 *   year  - 4-digit year (defaults to current year)
 *   month - 1-12 optional filter
 *
 * Auth: expenses module + expenses.manage permission
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

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'expenses');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'expenses.manage_policy');

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
    const monthParam = searchParams.get('month');
    const month = monthParam ? parseInt(monthParam, 10) : null;

    if (year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Invalid year parameter.' }, { status: 400 });
    }

    const periodStart = month
      ? new Date(Date.UTC(year, month - 1, 1))
      : new Date(Date.UTC(year, 0, 1));
    const periodEnd = month
      ? new Date(Date.UTC(year, month, 1))
      : new Date(Date.UTC(year + 1, 0, 1));

    const requests = await prisma.travelRequest.findMany({
      where: {
        company_id: employee.org_id,
        deleted_at: null,
        created_at: { gte: periodStart, lt: periodEnd },
      },
      select: {
        id: true,
        emp_id: true,
        destination: true,
        status: true,
        estimated_cost: true,
        currency: true,
        created_at: true,
        Employee: { select: { first_name: true, last_name: true, department: true } },
      },
      orderBy: { created_at: 'asc' },
      take: 5000,
    });

    const byStatus = new Map<string, { count: number; totalEstimated: number }>();
    const byEmployee = new Map<string, { name: string; department: string | null; count: number; totalEstimated: number }>();

    for (const req of requests) {
      const cost = Number(req.estimated_cost ?? 0);

      if (!byStatus.has(req.status)) byStatus.set(req.status, { count: 0, totalEstimated: 0 });
      const statusEntry = byStatus.get(req.status)!;
      statusEntry.count++;
      statusEntry.totalEstimated += cost;

      if (!byEmployee.has(req.emp_id)) {
        byEmployee.set(req.emp_id, {
          name: `${req.Employee.first_name} ${req.Employee.last_name}`,
          department: req.Employee.department,
          count: 0,
          totalEstimated: 0,
        });
      }
      const empEntry = byEmployee.get(req.emp_id)!;
      empEntry.count++;
      empEntry.totalEstimated += cost;
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      period: { year, month: month ?? 'all' },
      totalRequests: requests.length,
      byStatus: Array.from(byStatus.entries()).map(([status, data]) => ({ status, ...data })),
      byEmployee: Array.from(byEmployee.entries()).map(([empId, data]) => ({ empId, ...data })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
