/**
 * Job Postings API — CRUD operations for recruitment.
 *
 * GET /api/job-postings — List job postings
 * POST /api/job-postings — Create a new job posting
 *
 * @module api/job-postings
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { Prisma } from '@prisma/client';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { randomUUID } from 'crypto';
import { hasPermission, type PermissionCode } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/**
 * Lists job postings for the company.
 * Published postings visible to all; draft/closed requires recruitment permissions.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'recruitment');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const department = url.searchParams.get('department');

    const canViewAll = hasPermission(employee.permissions, 'recruitment.view_all');
    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    if (!canViewAll) {
      where.status = 'published';
    } else if (status) {
      where.status = status;
    }

    if (department) {
      where.department = department;
    }

    const postings = await prisma.jobPosting.findMany({
      where,
      include: {
        Creator: { select: { first_name: true, last_name: true } },
        _count: {
          select: { applications: true, stages: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ postings });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Creates a new job posting.
 * Requires recruitment.create_posting permission.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'recruitment.create_posting');

    const moduleGuard = await assertModule(employee.org_id!, 'recruitment');
    if (moduleGuard) return moduleGuard;

    const body = await request.json();
    const {
      title,
      description,
      department,
      location,
      employmentType,
      experienceMin,
      experienceMax,
      salaryMin,
      salaryMax,
      currency,
      skills,
      closesAt,
    } = body as {
      title?: string;
      description?: string;
      department?: string;
      location?: string;
      employmentType?: string;
      experienceMin?: number;
      experienceMax?: number;
      salaryMin?: number;
      salaryMax?: number;
      currency?: string;
      skills?: string[];
      closesAt?: string;
    };

    if (!title || !description) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'title and description are required' } },
        { status: 400 }
      );
    }

    const posting = await prisma.jobPosting.create({
      data: {
        id: randomUUID(),
        company_id: employee.org_id,
        title,
        description,
        department: department ?? null,
        location: location ?? null,
        employment_type: (employmentType as 'full_time' | 'part_time' | 'contract' | 'intern' | 'freelance') ?? 'full_time',
        experience_min: experienceMin ?? null,
        experience_max: experienceMax ?? null,
        salary_min: salaryMin ?? null,
        salary_max: salaryMax ?? null,
        currency: currency ?? 'INR',
        skills: skills ? (skills as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        closes_at: closesAt ? new Date(closesAt) : null,
        created_by: employee.id,
      },
    });

    return NextResponse.json({ posting }, { status: 201 });
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
