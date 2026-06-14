/**
 * Courses (LMS) API
 *
 * GET  /api/courses — List courses with enrollment status
 * POST /api/courses — Create a new course (HR/Admin only)
 *
 * @module api/courses
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { randomUUID } from 'crypto';
import type { CourseStatus, CourseContentType } from '@prisma/client';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'learning');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as CourseStatus | null;
    const mandatory = url.searchParams.get('mandatory');
    const category = url.searchParams.get('category');

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
      deleted_at: null,
    };

    if (status) where.status = status;
    else where.status = 'published'; // default: only show published to employees
    if (mandatory === 'true') where.is_mandatory = true;
    if (category) where.category = category;

    const courses = await prisma.course.findMany({
      where,
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { emp_id: employee.id },
          select: { status: true, progress_percent: true, completed_at: true },
          take: 1,
        },
      },
      orderBy: { created_at: 'desc' },
    });

    const coursesWithStatus = courses.map((c: typeof courses[number]) => ({
      ...c,
      myEnrollment: c.enrollments[0] ?? null,
      enrollments: undefined,
    }));

    return NextResponse.json({ courses: coursesWithStatus });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'lms.manage_courses');

    const moduleGuard = await assertModule(employee.org_id!, 'learning');
    if (moduleGuard) return moduleGuard;

    const body = await request.json() as {
      title?: string;
      description?: string;
      category?: string;
      contentType?: CourseContentType;
      contentUrl?: string;
      durationMinutes?: number;
      isMandatory?: boolean;
      departmentScope?: string;
    };

    if (!body.title || body.title.trim().length === 0) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'title is required' } }, { status: 400 });
    }

    const course = await prisma.course.create({
      data: {
        id: randomUUID(),
        company_id: employee.org_id,
        title: body.title.trim(),
        description: body.description ?? null,
        category: body.category ?? null,
        content_type: body.contentType ?? 'document' as CourseContentType,
        content_url: body.contentUrl ?? null,
        duration_minutes: body.durationMinutes ?? null,
        is_mandatory: body.isMandatory ?? false,
        department_scope: body.departmentScope ?? null,
        status: 'draft',
        created_by: employee.id,
      },
    });

    return NextResponse.json({ course }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
