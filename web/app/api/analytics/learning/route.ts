/**
 * Analytics — Learning — RALPH-20260630-022
 * GET /api/analytics/learning
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'learning');

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { company_id: employee.org_id! },
      select: {
        status: true,
        completed_at: true,
        score: true,
        Course: { select: { title: true, category: true } },
      },
    });

    const byStatus: Record<string, number> = {};
    for (const e of enrollments) {
      const s = e.status as string;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    const byCategory: Record<string, { enrolled: number; completed: number }> = {};
    for (const e of enrollments) {
      const cat = e.Course.category ?? 'Uncategorized';
      if (!byCategory[cat]) byCategory[cat] = { enrolled: 0, completed: 0 };
      byCategory[cat].enrolled++;
      if (e.status === 'completed') byCategory[cat].completed++;
    }

    const completed = enrollments.filter((e) => e.status === 'completed');
    const avgScore =
      completed.length > 0
        ? Math.round(completed.reduce((s, e) => s + (e.score ?? 0), 0) / completed.length)
        : null;

    return NextResponse.json({
      total_enrollments: enrollments.length,
      by_status: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      by_category: Object.entries(byCategory).map(([category, d]) => ({
        category,
        enrolled: d.enrolled,
        completed: d.completed,
        completion_rate: d.enrolled > 0 ? Math.round((d.completed / d.enrolled) * 100) : 0,
      })),
      avg_score: avgScore,
      completion_rate:
        enrollments.length > 0 ? Math.round((completed.length / enrollments.length) * 100) : 0,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
