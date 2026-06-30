/**
 * Survey Detail API — RALPH-20260630-007
 *
 * GET    /api/surveys/[id] — Get survey with questions
 * PATCH  /api/surveys/[id] — Update/publish/close survey
 * DELETE /api/surveys/[id] — Archive survey
 * POST   /api/surveys/[id]/respond — Submit survey responses (body: { responses: [...] })
 *
 * @module api/surveys/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import type { SurveyStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;
    const canManage = hasPermission(employee.permissions, 'performance.manage_reviews');

    const survey = await prisma.survey.findFirst({
      where: {
        id,
        company_id: employee.org_id!,
        deleted_at: null,
        ...(!canManage ? { status: 'active' } : {}),
      },
      include: {
        questions: { orderBy: { order: 'asc' } },
        _count: { select: { responses: true } },
      },
    });

    if (!survey) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Survey not found' } }, { status: 404 });
    }

    let myResponses: { question_id: string; answer: string | null; rating: number | null }[] = [];
    if (!survey.anonymous) {
      myResponses = await prisma.surveyResponse.findMany({
        where: { survey_id: id, emp_id: employee.id },
        select: { question_id: true, answer: true, rating: true },
      });
    }

    return NextResponse.json({ survey, myResponses });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'performance.manage_reviews');

    const { id } = await params;

    const existing = await prisma.survey.findFirst({
      where: { id, company_id: employee.org_id!, deleted_at: null },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Survey not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      title?: string;
      description?: string;
      status?: SurveyStatus;
      startDate?: string;
      endDate?: string;
      targetDept?: string;
    };

    const updated = await prisma.survey.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.status && { status: body.status }),
        ...(body.startDate !== undefined && { start_date: body.startDate ? new Date(body.startDate) : null }),
        ...(body.endDate !== undefined && { end_date: body.endDate ? new Date(body.endDate) : null }),
        ...(body.targetDept !== undefined && { target_dept: body.targetDept }),
      },
    });

    return NextResponse.json({ survey: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'performance.manage_reviews');

    const { id } = await params;

    await prisma.survey.update({
      where: { id },
      data: { deleted_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;
    const url = new URL(request.url);

    if (!url.pathname.endsWith('/respond')) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Route not found' } }, { status: 404 });
    }

    const survey = await prisma.survey.findFirst({
      where: { id, company_id: employee.org_id!, status: 'active', deleted_at: null },
      include: { questions: { select: { id: true, required: true } } },
    });

    if (!survey) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Survey not found or not active' } }, { status: 404 });
    }

    const body = await request.json() as {
      responses: Array<{ questionId: string; answer?: string; rating?: number }>;
    };

    const empId = survey.anonymous ? null : employee.id;

    await prisma.$transaction(
      body.responses.map((r) =>
        prisma.surveyResponse.upsert({
          where: {
            survey_id_question_id_emp_id: {
              survey_id: id,
              question_id: r.questionId,
              emp_id: empId ?? '',
            },
          },
          create: {
            id: crypto.randomUUID(),
            survey_id: id,
            question_id: r.questionId,
            emp_id: empId,
            answer: r.answer ?? null,
            rating: r.rating ?? null,
          },
          update: {
            answer: r.answer ?? null,
            rating: r.rating ?? null,
          },
        })
      )
    );

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
