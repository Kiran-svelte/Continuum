/**
 * Job Application [id] API
 *
 * GET   /api/job-applications/[id] — Single application with interview history
 * PATCH /api/job-applications/[id] — Advance, reject, or update rating
 *
 * @module api/job-applications/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { advanceCandidate, rejectCandidate } from '@/lib/recruitment/pipeline-engine';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.view_all');
    const { id } = await params;

    const application = await prisma.jobApplication.findFirst({
      where: { id, company_id: employee.org_id },
      include: {
        JobPosting: { select: { id: true, title: true, department: true, stages: { orderBy: { stage_order: 'asc' } } } },
        interviews: {
          include: { Interviewer: { select: { first_name: true, last_name: true } } },
          orderBy: { stage_order: 'asc' },
        },
      },
    });

    if (!application) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Application not found' } }, { status: 404 });
    }

    return NextResponse.json({ application });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.manage_pipeline');
    const { id } = await params;

    const body = await request.json() as {
      action?: 'advance' | 'reject';
      rejectionReason?: string;
      overallRating?: number;
    };

    if (body.action === 'advance') {
      const result = await advanceCandidate(id, employee.org_id);
      return NextResponse.json({ result });
    }

    if (body.action === 'reject') {
      await rejectCandidate(id, employee.org_id, body.rejectionReason);
      return NextResponse.json({ success: true });
    }

    if (body.overallRating !== undefined) {
      const updated = await prisma.jobApplication.update({
        where: { id },
        data: { overall_rating: body.overallRating },
      });
      return NextResponse.json({ application: updated });
    }

    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'No valid action or field provided' } }, { status: 400 });
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
