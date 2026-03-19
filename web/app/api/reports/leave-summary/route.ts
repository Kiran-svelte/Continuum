import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reports/leave-summary
 *
 * Returns leave analytics for the company:
 * - Total requests by status
 * - Requests by leave type
 * - Monthly breakdown for the current year
 * - Top leave takers
 * - SLA breach count
 *
 * Only accessible by admin, hr, director.
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
    const year = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);

    const yearStart = new Date(`${year}-01-01`);
    const yearEnd = new Date(`${year + 1}-01-01`);

    const companyId = employee.org_id!;

    // Run all aggregations in parallel
    const [statusCounts, leaveTypeCounts, monthlyRaw, topTakersRaw, slaBreachCount, totalEmployees] =
      await Promise.all([
        // Count by status
        prisma.leaveRequest.groupBy({
          by: ['status'],
          where: { company_id: companyId, start_date: { gte: yearStart, lt: yearEnd } },
          _count: { id: true },
        }),

        // Count by leave type
        prisma.leaveRequest.groupBy({
          by: ['leave_type'],
          where: { company_id: companyId, start_date: { gte: yearStart, lt: yearEnd } },
          _count: { id: true },
          _sum: { total_days: true },
          orderBy: { _count: { id: 'desc' } },
        }),

        // Raw requests for monthly breakdown
        prisma.leaveRequest.findMany({
          where: { company_id: companyId, start_date: { gte: yearStart, lt: yearEnd } },
          select: { start_date: true, total_days: true, status: true },
        }),

        // Top leave takers (most days used)
        prisma.leaveBalance.groupBy({
          by: ['emp_id'],
          where: { company_id: companyId, year },
          _sum: { used_days: true },
          orderBy: { _sum: { used_days: 'desc' } },
          take: 5,
        }),

        // SLA breach count
        prisma.leaveRequest.count({
          where: { company_id: companyId, sla_breached: true, start_date: { gte: yearStart, lt: yearEnd } },
        }),

        // Total active employees
        prisma.employee.count({
          where: { org_id: companyId, deleted_at: null, status: { not: 'exited' } },
        }),
      ]);

    // Build monthly breakdown
    const monthlyMap: Record<number, { requests: number; days: number }> = {};
    for (let m = 1; m <= 12; m++) {
      monthlyMap[m] = { requests: 0, days: 0 };
    }
    for (const req of monthlyRaw) {
      const month = req.start_date.getMonth() + 1;
      monthlyMap[month].requests++;
      monthlyMap[month].days += req.total_days;
    }
    const monthly = Object.entries(monthlyMap).map(([month, data]) => ({
      month: parseInt(month, 10),
      ...data,
    }));

    // Enrich top takers with names
    const topTakerIds = topTakersRaw.map((r) => r.emp_id);
    const topTakerEmployees = await prisma.employee.findMany({
      where: { id: { in: topTakerIds } },
      select: { id: true, first_name: true, last_name: true, department: true },
    });
    const empMap = Object.fromEntries(topTakerEmployees.map((e) => [e.id, e]));
    const topTakers = topTakersRaw.map((r) => ({
      emp_id: r.emp_id,
      name: empMap[r.emp_id]
        ? `${empMap[r.emp_id].first_name} ${empMap[r.emp_id].last_name}`
        : 'Unknown',
      department: empMap[r.emp_id]?.department ?? null,
      days_used: r._sum.used_days ?? 0,
    }));

    return NextResponse.json({
      year,
      total_employees: totalEmployees,
      sla_breaches: slaBreachCount,
      by_status: statusCounts.map((s) => ({ status: s.status, count: s._count.id })),
      by_leave_type: leaveTypeCounts.map((lt) => ({
        leave_type: lt.leave_type,
        count: lt._count.id,
        total_days: lt._sum.total_days ?? 0,
      })),
      monthly,
      top_takers: topTakers,
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
