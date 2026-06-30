/**
 * Analytics — Headcount — RALPH-20260630-023
 * GET /api/analytics/headcount
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

    const employees = await prisma.employee.findMany({
      where: { org_id: employee.org_id! },
      select: { status: true, department: true, designation: true, date_of_joining: true },
    });

    const byStatus: Record<string, number> = {};
    const byDept: Record<string, number> = {};
    const now = new Date();
    const trend: Record<string, number> = {};
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trend[`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`] = 0;
    }

    for (const emp of employees) {
      byStatus[emp.status] = (byStatus[emp.status] ?? 0) + 1;
      if (emp.department) byDept[emp.department] = (byDept[emp.department] ?? 0) + 1;
      if (emp.date_of_joining) {
        const key = `${emp.date_of_joining.getFullYear()}-${String(emp.date_of_joining.getMonth() + 1).padStart(2, '0')}`;
        if (key in trend) trend[key]++;
      }
    }

    const active = byStatus['active'] ?? 0;

    return NextResponse.json({
      total: employees.length,
      active,
      by_status: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      by_department: Object.entries(byDept)
        .map(([department, count]) => ({ department, count }))
        .sort((a, b) => b.count - a.count),
      joining_trend: Object.entries(trend).map(([month, count]) => ({ month, count })),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
