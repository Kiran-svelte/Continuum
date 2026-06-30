/**
 * Surveys API — RALPH-20260630-007
 *
 * GET  /api/surveys — List surveys (active/all by role)
 * POST /api/surveys — Create a new survey (HR/Admin)
 *
 * Propagated to: app/hr/(main)/surveys/, employee portal
 *
 * @module api/surveys
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import type { SurveyStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'performance');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const status = url.searchParams.get('status') as SurveyStatus | null;
    const canManage = hasPermission(employee.permissions, 'performance.manage_reviews');

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
      deleted_at: null,
    };

    if (!canManage) {
      where.status = 'active';
    } else if (status) {
      where.status = status;
    }

    const surveys = await prisma.survey.findMany({
      where,
      include: {
        _count: { select: { questions: true, responses: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ surveys });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'performance.manage_reviews');

    const moduleGuard = await assertModule(employee.org_id!, 'performance');
    if (moduleGuard) return moduleGuard;

    const body = await request.json() as {
      title: string;
      description?: string;
      anonymous?: boolean;
      startDate?: string;
      endDate?: string;
      targetDept?: string;
      questions?: Array<{
        question: string;
        type: string;
        options?: string[];
        required?: boolean;
        order?: number;
      }>;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Title is required' } }, { status: 400 });
    }

    const survey = await prisma.survey.create({
      data: {
        id: crypto.randomUUID(),
        company_id: employee.org_id!,
        title: body.title.trim(),
        description: body.description ?? null,
        anonymous: body.anonymous ?? false,
        start_date: body.startDate ? new Date(body.startDate) : null,
        end_date: body.endDate ? new Date(body.endDate) : null,
        target_dept: body.targetDept ?? null,
        created_by: employee.id,
        questions: body.questions
          ? {
              create: body.questions.map((q, i) => ({
                id: crypto.randomUUID(),
                question: q.question,
                type: q.type,
                options: q.options ? JSON.parse(JSON.stringify({ values: q.options })) : undefined,
                required: q.required ?? true,
                order: q.order ?? i,
              })),
            }
          : undefined,
      },
      include: { questions: true },
    });

    return NextResponse.json({ survey }, { status: 201 });
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
