import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

/**
 * GET /api/attendance/regularize/summary
 *
 * Summary counts for attendance regularization requests by status.
 * Scope matches /api/attendance/regularize:
 * - HR/Admin: all company requests
 * - Manager/Director: direct reports + self
 * - Employee: self only
 */
export async function GET(request: Request) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await requireModuleForOrg(employee.org_id, 'attendance');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const isManager = employee.primary_role === 'manager' || employee.primary_role === 'director';
    const isHrOrAdmin = employee.primary_role === 'hr' || employee.primary_role === 'admin';

    const whereBase: Prisma.AttendanceRegularizationWhereInput = {
      company_id: employee.org_id,
    };

    if (isHrOrAdmin) {
      // HR/Admin see all for their company.
    } else if (isManager) {
      const directReports = await prisma.employee.findMany({
        where: {
          manager_id: employee.id,
          org_id: employee.org_id,
          deleted_at: null,
        },
        select: { id: true },
      });

      const reportIds = directReports.map((report) => report.id);
      whereBase.emp_id = { in: [...reportIds, employee.id] };
    } else {
      whereBase.emp_id = employee.id;
    }

    const [pending, approved, rejected, total] = await Promise.all([
      prisma.attendanceRegularization.count({
        where: { ...whereBase, status: 'pending' },
      }),
      prisma.attendanceRegularization.count({
        where: { ...whereBase, status: 'approved' },
      }),
      prisma.attendanceRegularization.count({
        where: { ...whereBase, status: 'rejected' },
      }),
      prisma.attendanceRegularization.count({ where: whereBase }),
    ]);

    return NextResponse.json({
      pending,
      approved,
      rejected,
      total,
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
