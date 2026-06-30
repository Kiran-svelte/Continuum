/**
 * Job Posting Detail API — RALPH-20260630-002
 *
 * GET    /api/job-postings/[id] — Get posting with application stats
 * PATCH  /api/job-postings/[id] — Update posting details or status
 * DELETE /api/job-postings/[id] — Archive posting
 *
 * Propagated to: app/hr/(main)/recruitment/postings/[id]/page.tsx
 *
 * @module api/job-postings/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import type { EmploymentType, JobPostingStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'recruitment');
    if (moduleGuard) return moduleGuard;

    const { id } = await params;

    const posting = await prisma.jobPosting.findFirst({
      where: { id, company_id: employee.org_id! },
      include: {
        _count: { select: { applications: true } },
        applications: {
          select: { id: true, candidate_name: true, candidate_email: true, status: true, current_stage: true, created_at: true },
          orderBy: { created_at: 'desc' },
          take: 20,
        },
      },
    });

    if (!posting) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Job posting not found' } }, { status: 404 });
    }

    return NextResponse.json({ posting });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.create_posting');

    const moduleGuard = await assertModule(employee.org_id!, 'recruitment');
    if (moduleGuard) return moduleGuard;

    const { id } = await params;

    const existing = await prisma.jobPosting.findFirst({
      where: { id, company_id: employee.org_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Job posting not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      title?: string;
      description?: string;
      department?: string;
      location?: string;
      employmentType?: EmploymentType;
      salaryMin?: number;
      salaryMax?: number;
      salaryCurrency?: string;
      status?: JobPostingStatus;
      closingDate?: string;
      requirements?: string;
    };

    const updated = await prisma.jobPosting.update({
      where: { id },
      data: {
        ...(body.title && { title: body.title }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.department !== undefined && { department: body.department }),
        ...(body.location !== undefined && { location: body.location }),
        ...(body.employmentType && { employment_type: body.employmentType }),
        ...(body.salaryMin !== undefined && { salary_min: body.salaryMin }),
        ...(body.salaryMax !== undefined && { salary_max: body.salaryMax }),
        ...(body.salaryCurrency && { salary_currency: body.salaryCurrency }),
        ...(body.status && { status: body.status }),
        ...(body.closingDate !== undefined && { closing_date: body.closingDate ? new Date(body.closingDate) : null }),
        ...(body.requirements !== undefined && { requirements: body.requirements }),
      },
    });

    return NextResponse.json({ posting: updated });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.create_posting');

    const { id } = await params;

    const existing = await prisma.jobPosting.findFirst({
      where: { id, company_id: employee.org_id! },
    });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Job posting not found' } }, { status: 404 });
    }

    await prisma.jobPosting.update({
      where: { id },
      data: { status: 'closed' },
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
