/**
 * GET /api/reports/headcount
 *
 * Returns a headcount summary for the authenticated company:
 *   - total active employees
 *   - joiners this month
 *   - exits (terminated/resigned/exited) this month
 *   - breakdown by department
 *   - breakdown by status
 *
 * Auth: employees module + employee.view_all permission
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

/** Statuses that count as an active headcount. */
const ACTIVE_STATUSES = ['active', 'probation', 'on_notice'] as const;

/** Statuses that count as an exit event. */
const EXIT_STATUSES = ['terminated', 'resigned', 'exited'] as const;

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'employees');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'employee.view_all');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const now = new Date();
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));

    const [active, joiners, exits, byDepartment, byStatus] = await Promise.all([
      prisma.employee.count({
        where: {
          org_id: employee.org_id,
          deleted_at: null,
          status: { in: [...ACTIVE_STATUSES] },
        },
      }),
      prisma.employee.count({
        where: {
          org_id: employee.org_id,
          deleted_at: null,
          date_of_joining: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.employee.count({
        where: {
          org_id: employee.org_id,
          status: { in: [...EXIT_STATUSES] },
          updated_at: { gte: monthStart, lt: monthEnd },
        },
      }),
      prisma.employee.groupBy({
        by: ['department'],
        where: {
          org_id: employee.org_id,
          deleted_at: null,
          status: { in: [...ACTIVE_STATUSES] },
        },
        _count: { id: true },
        orderBy: { _count: { id: 'desc' } },
      }),
      prisma.employee.groupBy({
        by: ['status'],
        where: { org_id: employee.org_id, deleted_at: null },
        _count: { id: true },
      }),
    ]);

    return NextResponse.json({
      generatedAt: now.toISOString(),
      activeHeadcount: active,
      joinersThisMonth: joiners,
      exitsThisMonth: exits,
      byDepartment: byDepartment.map((d) => ({
        department: d.department ?? 'Unassigned',
        count: d._count.id,
      })),
      byStatus: byStatus.map((s) => ({
        status: s.status,
        count: s._count.id,
      })),
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
