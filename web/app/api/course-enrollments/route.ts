/**
 * Course Enrollments API
 *
 * POST  /api/course-enrollments          — Self-enroll or HR-enroll an employee
 * PATCH /api/course-enrollments?id=      — Update progress
 * GET   /api/course-enrollments          — List enrollments (own or all)
 *
 * @module api/course-enrollments
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { randomUUID } from 'crypto';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const courseId = url.searchParams.get('courseId');
    const empId = url.searchParams.get('empId');
    const status = url.searchParams.get('status');

    const isViewAll = empId && empId !== employee.id;
    if (isViewAll) {
      requirePermissionGuard(employee, 'lms.view_all_enrollments');
    }

    const where: Record<string, unknown> = { company_id: employee.org_id };
    if (courseId) where.course_id = courseId;
    where.emp_id = isViewAll ? empId : (empId ?? employee.id);
    if (status) where.status = status;

    const enrollments = await prisma.courseEnrollment.findMany({
      where,
      include: {
        Course: { select: { title: true, category: true, content_type: true, duration_minutes: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ enrollments });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const body = await request.json() as {
      courseId?: string;
      empId?: string;
      dueDate?: string;
    };

    if (!body.courseId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'courseId is required' } }, { status: 400 });
    }

    const targetEmpId = body.empId ?? employee.id;
    if (targetEmpId !== employee.id) {
      requirePermissionGuard(employee, 'lms.manage_enrollments');
    }

    const course = await prisma.course.findFirst({
      where: { id: body.courseId, company_id: employee.org_id, deleted_at: null },
    });

    if (!course) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Course not found' } }, { status: 404 });
    }

    const enrollment = await prisma.courseEnrollment.upsert({
      where: { course_id_emp_id: { course_id: body.courseId, emp_id: targetEmpId } },
      create: {
        id: randomUUID(),
        course_id: body.courseId,
        emp_id: targetEmpId,
        company_id: employee.org_id,
        status: 'not_started',
        due_date: body.dueDate ? new Date(body.dueDate) : null,
      },
      update: {
        due_date: body.dueDate ? new Date(body.dueDate) : undefined,
      },
    });

    return NextResponse.json({ enrollment }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const enrollmentId = url.searchParams.get('id');

    if (!enrollmentId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id is required' } }, { status: 400 });
    }

    const existing = await prisma.courseEnrollment.findFirst({ where: { id: enrollmentId, company_id: employee.org_id } });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Enrollment not found' } }, { status: 404 });
    }

    if (existing.emp_id !== employee.id) {
      requirePermissionGuard(employee, 'lms.manage_enrollments');
    }

    const body = await request.json() as {
      progressPercent?: number;
      score?: number;
      status?: string;
    };

    const data: Record<string, unknown> = {};
    if (body.progressPercent !== undefined) {
      data.progress_percent = Math.min(100, Math.max(0, body.progressPercent));
    }
    if (body.score !== undefined) data.score = body.score;
    if (body.status !== undefined) {
      data.status = body.status;
      if (body.status === 'in_progress' && !existing.started_at) data.started_at = new Date();
      if (body.status === 'completed') data.completed_at = new Date();
    }
    if (body.progressPercent === 100 && !body.status) {
      data.status = 'completed';
      data.completed_at = new Date();
    }

    const enrollment = await prisma.courseEnrollment.update({ where: { id: enrollmentId }, data });
    return NextResponse.json({ enrollment });
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
