/**
 * Analytics — Performance — RALPH-20260630-021
 * GET /api/analytics/performance
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'performance');

    const [reviews, totalEmployees] = await Promise.all([
      prisma.reviewInstance.findMany({
        where: { company_id: employee.org_id! },
        select: { status: true, overall_rating: true, created_at: true },
      }),
      prisma.employee.count({ where: { org_id: employee.org_id!, status: 'active' } }),
    ]);

    const byStatus: Record<string, number> = {};
    for (const r of reviews) {
      const s = r.status as string;
      byStatus[s] = (byStatus[s] ?? 0) + 1;
    }

    const scoreBuckets = { excellent: 0, good: 0, average: 0, poor: 0 };
    let totalScore = 0;
    let scoredCount = 0;
    for (const r of reviews) {
      if (r.overall_rating != null) {
        totalScore += r.overall_rating;
        scoredCount++;
        if (r.overall_rating >= 4.5) scoreBuckets.excellent++;
        else if (r.overall_rating >= 3.5) scoreBuckets.good++;
        else if (r.overall_rating >= 2.5) scoreBuckets.average++;
        else scoreBuckets.poor++;
      }
    }

    return NextResponse.json({
      total_employees: totalEmployees,
      total_reviews: reviews.length,
      completion_rate: totalEmployees > 0 ? Math.round((reviews.length / totalEmployees) * 100) : 0,
      avg_score: scoredCount > 0 ? Math.round((totalScore / scoredCount) * 10) / 10 : null,
      by_status: Object.entries(byStatus).map(([status, count]) => ({ status, count })),
      score_distribution: scoreBuckets,
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
