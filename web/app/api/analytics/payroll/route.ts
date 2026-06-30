/**
 * Payroll Analytics API — RALPH-20260630-010-WFA
 *
 * GET /api/analytics/payroll — payroll cost breakdown by dept, month
 *
 * Propagated to: app/hr/(main)/reports/page
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');
    requirePermissionGuard(employee, 'payroll.view_all');

    const companyId = employee.org_id!;
    const url = new URL(req.url);
    const months = Number(url.searchParams.get('months') ?? '6');
    const since = new Date();
    since.setMonth(since.getMonth() - months);

    const [payrollRuns, salaryStructures] = await Promise.all([
      prisma.payrollRun.findMany({
        where: { company_id: companyId, created_at: { gte: since } },
        select: { id: true, month: true, year: true, status: true, total_gross: true, total_net: true, total_deductions: true },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      }),
      prisma.salaryStructure.findMany({
        where: { company_id: companyId },
        select: { ctc: true, employee: { select: { department: true } } },
      }),
    ]);

    const monthlyCost = payrollRuns.map((r) => ({
      period: `${r.year}-${String(r.month).padStart(2, '0')}`,
      grossPay: r.total_gross ?? 0,
      netPay: r.total_net ?? 0,
      deductions: r.total_deductions ?? 0,
      status: r.status,
    }));

    // Aggregate CTC by department in application layer
    const deptMap: Record<string, { total: number; count: number }> = {};
    for (const ss of salaryStructures) {
      const dept = ss.employee?.department ?? 'Unassigned';
      if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 };
      deptMap[dept].total += ss.ctc;
      deptMap[dept].count += 1;
    }

    const deptSalary = Object.entries(deptMap)
      .map(([department, { total, count }]) => ({
        department,
        headcount: count,
        totalCTC: total,
        avgCTC: count > 0 ? Math.round(total / count) : 0,
      }))
      .sort((a, b) => b.totalCTC - a.totalCTC);

    return NextResponse.json({ monthlyCost, deptSalary });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
