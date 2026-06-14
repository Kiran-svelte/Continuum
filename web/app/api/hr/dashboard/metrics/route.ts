import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

/**
 * GET /api/hr/dashboard/metrics
 * Lightweight metrics endpoint for HR dashboard cards.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'reports.view_all');
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const companyId = employee.org_id;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const [totalEmployees, pendingApprovals, todayAbsent, slaBreaches] = await Promise.all([
      prisma.employee.count({
        where: {
          org_id: companyId,
          deleted_at: null,
          status: { not: 'exited' },
        },
      }),
      prisma.leaveRequest.count({
        where: {
          company_id: companyId,
          status: { in: ['pending', 'escalated'] },
        },
      }),
      prisma.attendance.count({
        where: {
          company_id: companyId,
          date: { gte: startOfDay, lt: endOfDay },
          status: 'absent',
        },
      }),
      prisma.leaveRequest.count({
        where: {
          company_id: companyId,
          status: { in: ['pending', 'escalated'] },
          sla_breached: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        totalEmployees,
        pendingApprovals,
        todayAbsent,
        slaBreaches,
        generatedAt: new Date().toISOString(),
      },
      { headers: getRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
