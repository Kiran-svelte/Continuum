/**
 * Interviews API
 *
 * POST /api/interviews — Schedule an interview
 * GET  /api/interviews — List interviews (by application or interviewer)
 *
 * @module api/interviews
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { randomUUID } from 'crypto';
import type { InterviewStatus, InterviewRecommendation } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const applicationId = url.searchParams.get('applicationId');
    const interviewerId = url.searchParams.get('interviewerId');
    const status = url.searchParams.get('status');

    const where: Record<string, unknown> = { company_id: employee.org_id };
    if (applicationId) where.application_id = applicationId;
    if (interviewerId) where.interviewer_id = interviewerId;
    if (status) where.status = status;

    const interviews = await prisma.interview.findMany({
      where,
      include: {
        Interviewer: { select: { first_name: true, last_name: true, email: true } },
        JobApplication: { select: { candidate_name: true, candidate_email: true, job_id: true } },
      },
      orderBy: { scheduled_at: 'asc' },
    });

    return NextResponse.json({ interviews });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.manage_pipeline');

    const body = await request.json() as {
      applicationId?: string;
      interviewerId?: string;
      stageOrder?: number;
      scheduledAt?: string;
      rating?: number;
      feedback?: string;
      recommendation?: InterviewRecommendation;
      action?: 'schedule' | 'submit_feedback' | 'cancel';
      interviewId?: string;
      status?: InterviewStatus;
    };

    // Submit feedback on existing interview
    if (body.action === 'submit_feedback' && body.interviewId) {
      const updated = await prisma.interview.update({
        where: { id: body.interviewId },
        data: {
          rating: body.rating,
          feedback: body.feedback,
          recommendation: body.recommendation,
          status: 'completed',
          completed_at: new Date(),
        },
      });
      return NextResponse.json({ interview: updated });
    }

    // Cancel interview
    if (body.action === 'cancel' && body.interviewId) {
      const updated = await prisma.interview.update({
        where: { id: body.interviewId },
        data: { status: 'cancelled' },
      });
      return NextResponse.json({ interview: updated });
    }

    // Schedule new interview
    if (!body.applicationId || !body.interviewerId || body.stageOrder === undefined) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'applicationId, interviewerId, and stageOrder are required' } },
        { status: 400 }
      );
    }

    const interview = await prisma.interview.create({
      data: {
        id: randomUUID(),
        application_id: body.applicationId,
        company_id: employee.org_id,
        interviewer_id: body.interviewerId,
        stage_order: body.stageOrder,
        scheduled_at: body.scheduledAt ? new Date(body.scheduledAt) : null,
        status: 'scheduled',
      },
    });

    return NextResponse.json({ interview }, { status: 201 });
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
