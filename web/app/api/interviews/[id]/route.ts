/**
 * Interview Detail API — RALPH-20260630-003
 *
 * GET    /api/interviews/[id] — Get interview details
 * PATCH  /api/interviews/[id] — Update interview (reschedule, add feedback, change status)
 * DELETE /api/interviews/[id] — Cancel interview
 *
 * Propagated to: recruitment module interview scheduling
 *
 * @module api/interviews/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import type { InterviewStatus, InterviewRecommendation } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;

    const interview = await prisma.interview.findFirst({
      where: { id, company_id: employee.org_id! },
      include: {
        JobApplication: {
          select: { id: true, candidate_name: true, candidate_email: true, status: true },
        },
        Interviewer: {
          select: { id: true, first_name: true, last_name: true, email: true },
        },
      },
    });

    if (!interview) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Interview not found' } }, { status: 404 });
    }

    const isInterviewer = interview.interviewer_id === employee.id;
    const canManage = hasPermission(employee.permissions, 'recruitment.manage_applications');

    if (!isInterviewer && !canManage) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    return NextResponse.json({ interview });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const { id } = await params;

    const existing = await prisma.interview.findFirst({
      where: { id, company_id: employee.org_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Interview not found' } }, { status: 404 });
    }

    const isInterviewer = existing.interviewer_id === employee.id;
    const canManage = hasPermission(employee.permissions, 'recruitment.manage_applications');

    if (!isInterviewer && !canManage) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    const body = await request.json() as {
      scheduledAt?: string;
      durationMinutes?: number;
      location?: string;
      meetingUrl?: string;
      status?: InterviewStatus;
      feedbackNotes?: string;
      recommendation?: InterviewRecommendation;
      interviewerId?: string;
    };

    const updated = await prisma.interview.update({
      where: { id },
      data: {
        ...(body.scheduledAt && { scheduled_at: new Date(body.scheduledAt) }),
        ...(body.durationMinutes !== undefined && { duration_minutes: body.durationMinutes }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.meetingUrl !== undefined && { meeting_url: body.meetingUrl }),
        ...(body.status && { status: body.status }),
        ...(body.feedbackNotes !== undefined && { feedback_notes: body.feedbackNotes }),
        ...(body.recommendation && { recommendation: body.recommendation }),
        ...(body.interviewerId && canManage && { interviewer_id: body.interviewerId }),
      },
    });

    return NextResponse.json({ interview: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.manage_applications');

    const { id } = await params;

    const existing = await prisma.interview.findFirst({
      where: { id, company_id: employee.org_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Interview not found' } }, { status: 404 });
    }

    await prisma.interview.update({
      where: { id },
      data: { status: 'cancelled' },
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
