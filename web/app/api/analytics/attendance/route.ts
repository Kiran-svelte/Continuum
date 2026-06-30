/**
 * Attendance Analytics API — RALPH-20260630-010-WFA
 *
 * GET /api/analytics/attendance — attendance rates, late arrivals, absent days
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
    await assertModule(employee.org_id!, 'attendance');
    requirePermissionGuard(employee, 'employee.view_all');

    const companyId = employee.org_id!;
    const url = new URL(req.url);
    const days = Number(url.searchParams.get('days') ?? '30');
    const since = new Date();
    since.setDate(since.getDate() - days);

    const [byStatus, byDept, dailyTrend] = await Promise.all([
      prisma.attendance.groupBy({
        by: ['status'],
        where: { company_id: companyId, date: { gte: since } },
        _count: { id: true },
      }),
      prisma.attendance.groupBy({
        by: ['company_id'],
        where: { company_id: companyId, date: { gte: since } },
        _count: { id: true },
        _avg: { total_hours: true },
      }),
      prisma.attendance.groupBy({
        by: ['date'],
        where: { company_id: companyId, date: { gte: since } },
        _count: { id: true },
        orderBy: { date: 'asc' },
      }),
    ]);

    const total = byStatus.reduce((sum, s) => sum + s._count.id, 0);
    const present = byStatus.find((s) => s.status === 'present')?._count.id ?? 0;
    const late = byStatus.find((s) => s.status === 'late')?._count.id ?? 0;
    const absent = byStatus.find((s) => s.status === 'absent')?._count.id ?? 0;

    return NextResponse.json({
      summary: {
        total,
        present,
        late,
        absent,
        presentRate: total > 0 ? ((present / total) * 100).toFixed(1) : '0',
        lateRate: total > 0 ? (((late) / total) * 100).toFixed(1) : '0',
        periodDays: days,
      },
      byStatus: byStatus.map((s) => ({ status: s.status, count: s._count.id })),
      dailyTrend: dailyTrend.map((d) => ({
        date: d.date,
        count: d._count.id,
      })),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
