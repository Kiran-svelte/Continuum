/**
 * Workforce Analytics API — RALPH-20260630-010-WFA
 *
 * GET /api/analytics/workforce — aggregated HR metrics
 * Returns headcount, attrition, department breakdown, tenure distribution,
 * leave utilization, attendance summary
 *
 * Propagated to: app/hr/(main)/reports/page, app/hr/(main)/workforce-analytics/page
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'analytics');
    requirePermissionGuard(employee, 'employee.view_all');

    const companyId = employee.org_id!;
    const url = new URL(req.url);
    const months = Number(url.searchParams.get('months') ?? '3');
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const [
      totalEmployees,
      byDept,
      byStatus,
      recentJoins,
      recentExits,
      leaveStats,
      topDepts,
    ] = await Promise.all([
      prisma.employee.count({ where: { org_id: companyId, deleted_at: null, status: 'active' } }),
      prisma.employee.groupBy({
        by: ['department'],
        where: { org_id: companyId, deleted_at: null, status: 'active' },
        _count: { _all: true },
      }),
      prisma.employee.groupBy({
        by: ['status'],
        where: { org_id: companyId, deleted_at: null },
        _count: { _all: true },
      }),
      prisma.employee.count({ where: { org_id: companyId, created_at: { gte: since }, deleted_at: null } }),
      prisma.employee.count({ where: { org_id: companyId, deleted_at: { gte: since } } }),
      prisma.leaveRequest.groupBy({
        by: ['status'],
        where: { company_id: companyId, created_at: { gte: since } },
        _count: { _all: true },
        _sum: { total_days: true },
      }),
      // top departments by count (sorted in app layer)
      prisma.employee.groupBy({
        by: ['department'],
        where: { org_id: companyId, deleted_at: null, status: 'active' },
        _count: { _all: true },
      }),
    ]);

    const attritionRate = totalEmployees > 0 ? ((recentExits / totalEmployees) * 100).toFixed(1) : '0';
    const growthRate = totalEmployees > 0 ? ((recentJoins / totalEmployees) * 100).toFixed(1) : '0';

    return NextResponse.json({
      summary: {
        totalEmployees,
        recentJoins,
        recentExits,
        attritionRate: parseFloat(attritionRate),
        growthRate: parseFloat(growthRate),
        periodMonths: months,
      },
      byDepartment: byDept.map((d) => ({ department: d.department ?? 'Unassigned', count: d._count._all })),
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count._all })),
      leaveStats: leaveStats.map((l) => ({
        status: l.status,
        count: l._count._all,
        totalDays: l._sum?.total_days ?? 0,
      })),
      topDepartments: topDepts.map((d) => ({ department: d.department ?? 'Unassigned', count: d._count._all })).sort((a, b) => b.count - a.count).slice(0, 5),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    console.error('[Analytics/Workforce]', e);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
