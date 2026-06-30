/**
 * Course Detail API — RALPH-20260630-001
 *
 * GET    /api/courses/[id] — Get course with enrollment info
 * PATCH  /api/courses/[id] — Update course (admin/hr only)
 * DELETE /api/courses/[id] — Soft-delete course (admin/hr only)
 *
 * Propagated to: app/hr/(main)/learning/courses/[id]/page.tsx
 *
 * @module api/courses/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { hasPermission } from '@/lib/rbac';
import type { CourseStatus, CourseContentType } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'learning');
    if (moduleGuard) return moduleGuard;

    const { id } = await params;

    const course = await prisma.course.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
      include: {
        _count: { select: { enrollments: true } },
        enrollments: {
          where: { emp_id: employee.id },
          select: { id: true, status: true, progress_percent: true, completed_at: true, due_date: true },
          take: 1,
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, { status: 404 });
    }

    const canManage = hasPermission(employee.permissions, 'lms.manage_courses');
    if (course.status !== 'published' && !canManage) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, { status: 404 });
    }

    return NextResponse.json({
      course: {
        ...course,
        myEnrollment: course.enrollments[0] ?? null,
        enrollments: undefined,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'lms.manage_courses');

    const moduleGuard = await assertModule(employee.org_id!, 'learning');
    if (moduleGuard) return moduleGuard;

    const { id } = await params;

    const existing = await prisma.course.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      title?: string;
      description?: string;
      category?: string;
      contentType?: CourseContentType;
      contentUrl?: string;
      durationMinutes?: number;
      isMandatory?: boolean;
      departmentScope?: string[];
      status?: CourseStatus;
    };

    const updated = await prisma.course.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.category !== undefined && { category: body.category }),
        ...(body.contentType && { content_type: body.contentType }),
        ...(body.contentUrl !== undefined && { content_url: body.contentUrl }),
        ...(body.durationMinutes !== undefined && { duration_minutes: body.durationMinutes }),
        ...(body.isMandatory !== undefined && { is_mandatory: body.isMandatory }),
        ...(body.departmentScope !== undefined && { department_scope: body.departmentScope ? body.departmentScope.join(',') : null }),
        ...(body.status && { status: body.status }),
      },
    });

    return NextResponse.json({ course: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'lms.manage_courses');

    const { id } = await params;

    const existing = await prisma.course.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, { status: 404 });
    }

    await prisma.course.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true });
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
