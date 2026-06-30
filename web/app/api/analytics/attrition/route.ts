/**
 * Analytics — Attrition — RALPH-20260630-024
 * GET /api/analytics/attrition
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'analytics');

    const { searchParams } = new URL(req.url);
    const yearParam = parseInt(searchParams.get('year') ?? String(new Date().getFullYear()), 10);
    const from = new Date(yearParam, 0, 1);
    const to = new Date(yearParam + 1, 0, 1);

    // Use EmployeeStatusHistory to track exits (to_status = 'terminated' | 'resigned')
    const [exits, totalStart, deptCounts] = await Promise.all([
      prisma.employeeStatusHistory.findMany({
        where: {
          company_id: employee.org_id!,
          to_status: { in: ['terminated', 'resigned', 'inactive'] },
          created_at: { gte: from, lt: to },
        },
        select: {
          to_status: true,
          created_at: true,
          employee: { select: { department: true } },
        },
      }),
      prisma.employee.count({ where: { org_id: employee.org_id!, date_of_joining: { lt: from } } }),
      prisma.employee.groupBy({
        by: ['department'],
        where: { org_id: employee.org_id! },
        _count: { _all: true },
      }),
    ]);

    const byReason: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    const byDeptAttrition: Record<string, number> = {};

    for (const ex of exits) {
      const reason = ex.to_status;
      byReason[reason] = (byReason[reason] ?? 0) + 1;
      const key = `${ex.created_at.getFullYear()}-${String(ex.created_at.getMonth() + 1).padStart(2, '0')}`;
      byMonth[key] = (byMonth[key] ?? 0) + 1;
      const dept = ex.employee?.department ?? 'Unknown';
      byDeptAttrition[dept] = (byDeptAttrition[dept] ?? 0) + 1;
    }

    const attritionRate = totalStart > 0 ? Math.round((exits.length / totalStart) * 1000) / 10 : 0;

    return NextResponse.json({
      year: yearParam,
      total_exits: exits.length,
      attrition_rate: attritionRate,
      by_reason: Object.entries(byReason).map(([reason, count]) => ({ reason, count })),
      by_month: Object.entries(byMonth)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([month, count]) => ({ month, count })),
      by_department: Object.entries(byDeptAttrition)
        .map(([department, exits_count]) => ({
          department,
          exits: exits_count,
          total: deptCounts.find((d) => d.department === department)?._count._all ?? 0,
        }))
        .sort((a, b) => b.exits - a.exits),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
