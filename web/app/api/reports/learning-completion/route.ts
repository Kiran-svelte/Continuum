/**
 * GET /api/reports/learning-completion
 *
 * Returns course completion metrics per employee and per course.
 *
 * Auth: learning module + lms.view_all_enrollments permission
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

    const moduleGuard = await assertModule(employee.org_id!, 'learning');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'lms.view_all_enrollments');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const enrollments = await prisma.courseEnrollment.findMany({
      where: { company_id: employee.org_id },
      select: {
        id: true,
        emp_id: true,
        course_id: true,
        status: true,
        completed_at: true,
        due_date: true,
        Employee: { select: { first_name: true, last_name: true, department: true } },
        Course: { select: { title: true, is_mandatory: true } },
      },
      orderBy: { created_at: 'desc' },
      take: 5000,
    });

    const now = new Date();

    const byCourse = new Map<string, {
      title: string;
      isMandatory: boolean;
      total: number;
      completed: number;
      overdue: number;
    }>();

    for (const e of enrollments) {
      if (!byCourse.has(e.course_id)) {
        byCourse.set(e.course_id, {
          title: e.Course.title,
          isMandatory: e.Course.is_mandatory ?? false,
          total: 0,
          completed: 0,
          overdue: 0,
        });
      }
      const entry = byCourse.get(e.course_id)!;
      entry.total++;
      if (e.status === 'completed') entry.completed++;
      if (e.status !== 'completed' && e.due_date && new Date(e.due_date) < now) entry.overdue++;
    }

    const totalEnrollments = enrollments.length;
    const totalCompleted = enrollments.filter((e) => e.status === 'completed').length;
    const totalOverdue = enrollments.filter(
      (e) => e.status !== 'completed' && e.due_date && new Date(e.due_date) < now
    ).length;

    return NextResponse.json({
      generatedAt: now.toISOString(),
      totals: {
        enrollments: totalEnrollments,
        completed: totalCompleted,
        overdue: totalOverdue,
        completionRate: totalEnrollments === 0 ? 0 : Math.round((totalCompleted / totalEnrollments) * 100),
      },
      byCourse: Array.from(byCourse.entries()).map(([courseId, data]) => ({ courseId, ...data })),
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
