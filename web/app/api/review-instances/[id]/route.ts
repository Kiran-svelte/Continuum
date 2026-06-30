/**
 * Review Instance Detail API — RALPH-20260630-006
 *
 * GET    /api/review-instances/[id] — Get single review instance with responses
 * PATCH  /api/review-instances/[id] — Submit or update review (reviewer only)
 *
 * Propagated to: app/hr/(main)/reviews/, app/hr/(main)/performance/
 *
 * @module api/review-instances/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;

    const instance = await prisma.reviewInstance.findFirst({
      where: {
        id,
        ReviewCycle: { company_id: employee.org_id! },
      },
      include: {
        ReviewCycle: { select: { id: true, name: true, cycle_type: true, status: true } },
        Reviewee: { select: { id: true, first_name: true, last_name: true, department: true, designation: true } },
        Reviewer: { select: { id: true, first_name: true, last_name: true } },
        responses: {
          select: { id: true, question_index: true, section_index: true, rating: true, text_response: true, created_at: true },
        },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review instance not found' } }, { status: 404 });
    }

    const isReviewer = instance.reviewer_id === employee.id;
    const isReviewee = instance.reviewee_id === employee.id;
    const canViewAll = hasPermission(employee.permissions, 'performance.view_all');

    if (!isReviewer && !isReviewee && !canViewAll) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    return NextResponse.json({ reviewInstance: instance });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;

    const instance = await prisma.reviewInstance.findFirst({
      where: {
        id,
        ReviewCycle: { company_id: employee.org_id! },
      },
    });

    if (!instance) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review instance not found' } }, { status: 404 });
    }

    const isReviewer = instance.reviewer_id === employee.id;
    const canManage = hasPermission(employee.permissions, 'performance.manage_reviews');

    if (!isReviewer && !canManage) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Only the assigned reviewer can submit this review' } }, { status: 403 });
    }

    const body = await request.json() as {
      action?: 'submit' | 'save_draft';
      responses?: Array<{ questionIndex: number; sectionIndex: number; rating?: number; textResponse?: string }>;
      overallRating?: number;
      strengths?: string;
      improvements?: string;
      managerComments?: string;
    };

    const isSubmit = body.action === 'submit';

    if (body.responses) {
      for (const r of body.responses) {
        const existing = await prisma.reviewResponse.findFirst({
          where: { instance_id: id, question_index: r.questionIndex, section_index: r.sectionIndex },
        });

        if (existing) {
          await prisma.reviewResponse.update({
            where: { id: existing.id },
            data: {
              rating: r.rating ?? null,
              text_response: r.textResponse ?? null,
            },
          });
        } else {
          await prisma.reviewResponse.create({
            data: {
              id: crypto.randomUUID(),
              instance_id: id,
              question_index: r.questionIndex,
              section_index: r.sectionIndex,
              rating: r.rating ?? null,
              text_response: r.textResponse ?? null,
            },
          });
        }
      }
    }

    const updated = await prisma.reviewInstance.update({
      where: { id },
      data: {
        ...(body.overallRating !== undefined && { overall_rating: body.overallRating }),
        ...(body.strengths !== undefined && { strengths: body.strengths }),
        ...(body.improvements !== undefined && { improvements: body.improvements }),
        ...(body.managerComments !== undefined && { manager_comments: body.managerComments }),
        ...(isSubmit && { status: 'submitted', submitted_at: new Date() }),
      },
    });

    return NextResponse.json({ reviewInstance: updated });
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
