/**
 * Job Applications API — Manage applications for job postings.
 *
 * GET /api/job-applications — List applications (filtered by job, status)
 * POST /api/job-applications — Submit a new application
 *
 * @module api/job-applications
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { emitEvent } from '@/lib/event-bus';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Lists job applications. Requires recruitment.manage_applications permission.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.manage_applications');

    const url = new URL(request.url);
    const jobId = url.searchParams.get('jobId');
    const status = url.searchParams.get('status');

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    if (jobId) {
      where.job_id = jobId;
    }

    if (status) {
      where.status = status;
    }

    const applications = await prisma.jobApplication.findMany({
      where,
      include: {
        JobPosting: { select: { title: true, department: true } },
        Referrer: { select: { first_name: true, last_name: true } },
        _count: { select: { interviews: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ applications });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Submits a new job application.
 * This can be called by HR or through a public application form.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.manage_applications');

    const body = await request.json();
    const {
      jobId,
      candidateName,
      candidateEmail,
      candidatePhone,
      resumeUrl,
      coverLetter,
      source,
      referrerId,
    } = body as {
      jobId?: string;
      candidateName?: string;
      candidateEmail?: string;
      candidatePhone?: string;
      resumeUrl?: string;
      coverLetter?: string;
      source?: string;
      referrerId?: string;
    };

    if (!jobId || !candidateName || !candidateEmail) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'jobId, candidateName, and candidateEmail are required' } },
        { status: 400 }
      );
    }

    const application = await prisma.jobApplication.create({
      data: {
        id: randomUUID(),
        job_id: jobId,
        company_id: employee.org_id,
        candidate_name: candidateName,
        candidate_email: candidateEmail,
        candidate_phone: candidatePhone ?? null,
        resume_url: resumeUrl ?? null,
        cover_letter: coverLetter ?? null,
        source: (source as 'direct' | 'referral' | 'job_board' | 'social_media' | 'agency' | 'campus') ?? 'direct',
        referrer_id: referrerId ?? null,
      },
    });

    await emitEvent({
      companyId: employee.org_id,
      eventType: 'application.received',
      entityType: 'job_application',
      entityId: application.id,
      payload: {
        candidateName,
        candidateEmail,
        jobId,
      },
    });

    return NextResponse.json({ application }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Standard API error handler.
 */
function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json(
      { error: { code: 'AUTH_ERROR', message: error.message } },
      { status: error.status }
    );
  }

  const message =
    process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json(
    { error: { code: 'INTERNAL_ERROR', message } },
    { status: 500 }
  );
}
