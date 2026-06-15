/**
 * GET /api/reports/performance-summary
 *
 * Returns a summary of review cycle completion and rating distribution.
 * Uses correct ReviewInstanceStatus enum values from schema.
 *
 * ReviewInstanceStatus: pending | in_progress | submitted | acknowledged | disputed
 * "Completed" = submitted OR acknowledged
 *
 * Query params:
 *   cycle_id - ReviewCycle ID (optional; returns latest cycle if omitted)
 *
 * Auth: performance module + performance.manage_reviews permission
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

/** Statuses that count as a completed review. */
const COMPLETED_STATUSES = ['submitted', 'acknowledged'] as const;

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'performance');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'performance.manage_reviews');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const cycleId = searchParams.get('cycle_id');

    const cycle = await prisma.reviewCycle.findFirst({
      where: cycleId
        ? { id: cycleId, company_id: employee.org_id }
        : { company_id: employee.org_id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        name: true,
        start_date: true,
        end_date: true,
        status: true,
      },
    });

    if (!cycle) {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        cycle: null,
        summary: null,
      });
    }

    const instances = await prisma.reviewInstance.findMany({
      where: { cycle_id: cycle.id },
      select: { status: true, overall_rating: true },
    });

    // submitted and acknowledged both count as "completed" for reporting purposes
    const completedCount = instances.filter(
      (i) => (COMPLETED_STATUSES as readonly string[]).includes(i.status)
    ).length;
    const total = instances.length;
    const completionRate = total === 0 ? 0 : Math.round((completedCount / total) * 100);

    const ratingDistribution = new Map<number, number>();
    for (const i of instances) {
      if (i.overall_rating !== null && i.overall_rating !== undefined) {
        const rating = Math.round(Number(i.overall_rating));
        ratingDistribution.set(rating, (ratingDistribution.get(rating) ?? 0) + 1);
      }
    }

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      cycle,
      summary: {
        total,
        completed: completedCount,
        pending: total - completedCount,
        completionRate,
        ratingDistribution: Array.from(ratingDistribution.entries())
          .map(([rating, count]) => ({ rating, count }))
          .sort((a, b) => a.rating - b.rating),
      },
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
