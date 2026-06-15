/**
 * GET /api/reports/reimbursement-spend
 *
 * Returns approved reimbursement spend grouped by employee, category, and month.
 *
 * Query params:
 *   year  - 4-digit year (defaults to current year)
 *   month - 1-12 optional filter
 *
 * Auth: reimbursements module + reimbursements.manage permission
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

    const moduleGuard = await assertModule(employee.org_id!, 'reimbursements');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'reimbursement.approve_any');

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

    const approved = await prisma.reimbursement.findMany({
      where: {
        company_id: employee.org_id,
        status: { in: ['approved', 'processed'] },
        created_at: { gte: periodStart, lt: periodEnd },
      },
      select: {
        id: true,
        emp_id: true,
        category: true,
        amount: true,
        status: true,
        created_at: true,
        employee: {
          select: { first_name: true, last_name: true, department: true },
        },
      },
      orderBy: { created_at: 'asc' },
      take: 5000,
    });

    const totalSpend = approved.reduce((acc, r) => acc + Number(r.amount), 0);
    const byCategory = new Map<string, number>();
    const byEmployee = new Map<string, { name: string; department: string | null; total: number }>();

    for (const r of approved) {
      byCategory.set(r.category, (byCategory.get(r.category) ?? 0) + Number(r.amount));
      if (!byEmployee.has(r.emp_id)) {
        const emp = r.employee as { first_name: string; last_name: string; department: string | null };
        byEmployee.set(r.emp_id, {
          name: `${emp.first_name} ${emp.last_name}`,
          department: emp.department,
          total: 0,
        });
      }
      byEmployee.get(r.emp_id)!.total += Number(r.amount);
    }

    return NextResponse.json({
      generatedAt: now.toISOString(),
      period: { year, month: month ?? 'all' },
      totalSpend,
      byCategory: Array.from(byCategory.entries()).map(([category, total]) => ({ category, total })),
      byEmployee: Array.from(byEmployee.entries()).map(([empId, data]) => ({ empId, ...data })),
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
