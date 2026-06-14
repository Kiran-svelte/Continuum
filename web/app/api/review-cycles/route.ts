/**
 * Review Cycles API — Manage performance review cycles.
 *
 * GET /api/review-cycles — List review cycles
 * POST /api/review-cycles — Create a new review cycle
 *
 * @module api/review-cycles
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

/**
 * Lists review cycles for the company.
 * Requires performance.manage_reviews or performance.view_all.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    if (status) {
      where.status = status;
    }

    const cycles = await prisma.reviewCycle.findMany({
      where,
      include: {
        _count: { select: { instances: true } },
      },
      orderBy: { start_date: 'desc' },
    });

    return NextResponse.json({ cycles });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Creates a new review cycle.
 * Requires performance.manage_reviews permission.
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'performance.manage_reviews');

    const body = await request.json();
    const {
      name,
      description,
      cycleType,
      startDate,
      endDate,
      selfReviewDeadline,
      managerReviewDeadline,
      ratingScale,
      isCalibrationEnabled,
    } = body as {
      name?: string;
      description?: string;
      cycleType?: string;
      startDate?: string;
      endDate?: string;
      selfReviewDeadline?: string;
      managerReviewDeadline?: string;
      ratingScale?: number;
      isCalibrationEnabled?: boolean;
    };

    if (!name || !startDate || !endDate) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name, startDate, and endDate are required' } },
        { status: 400 }
      );
    }

    const cycle = await prisma.reviewCycle.create({
      data: {
        id: randomUUID(),
        company_id: employee.org_id,
        name,
        description: description ?? null,
        cycle_type: (cycleType as 'quarterly' | 'half_yearly' | 'annual' | 'custom') ?? 'annual',
        start_date: new Date(startDate),
        end_date: new Date(endDate),
        self_review_deadline: selfReviewDeadline ? new Date(selfReviewDeadline) : null,
        manager_review_deadline: managerReviewDeadline ? new Date(managerReviewDeadline) : null,
        rating_scale: ratingScale ?? 5,
        is_calibration_enabled: isCalibrationEnabled ?? false,
      },
    });

    return NextResponse.json({ cycle }, { status: 201 });
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
