/**
 * GET /api/reports/recruitment-pipeline
 *
 * Returns recruitment pipeline metrics:
 *   - published/open roles count (JobPosting.status = 'published')
 *   - applications by ApplicationStatus
 *   - average days-to-hire for hired applications
 *
 * NOTE: JobPosting has no 'open' status. Published = active posting.
 *       JobApplication has no 'stage' field — it uses ApplicationStatus enum.
 *
 * Auth: recruitment module + recruitment.view_all permission
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

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'recruitment');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'recruitment.view_all');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    // JobPostingStatus values: draft | published | paused | closed | filled
    // "Active" postings = published
    const [publishedRoles, applicationsByStatus, hiredApplications] = await Promise.all([
      prisma.jobPosting.count({
        where: { company_id: employee.org_id, status: 'published' },
      }),
      // ApplicationStatus: applied | screening | shortlisted | interviewing | offered | hired | rejected | withdrawn
      prisma.jobApplication.groupBy({
        by: ['status'],
        where: { company_id: employee.org_id },
        _count: { id: true },
      }),
      prisma.jobApplication.findMany({
        where: { company_id: employee.org_id, status: 'hired', hired_at: { not: null } },
        select: { created_at: true, hired_at: true },
        take: 500,
      }),
    ]);

    const avgDaysToHire =
      hiredApplications.length === 0
        ? null
        : Math.round(
            hiredApplications.reduce((acc, a) => {
              const hiredAt = a.hired_at ?? a.created_at;
              const diffMs = hiredAt.getTime() - a.created_at.getTime();
              return acc + diffMs / (1000 * 60 * 60 * 24);
            }, 0) / hiredApplications.length
          );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      publishedRoles,
      avgDaysToHire,
      byStatus: applicationsByStatus.map((s) => ({
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
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
