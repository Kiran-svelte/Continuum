/**
 * Review Cycle [id] API
 *
 * GET    /api/review-cycles/[id]        — Single cycle with instances
 * PATCH  /api/review-cycles/[id]        — Update cycle status
 * POST   /api/review-cycles/[id]/launch — Auto-create ReviewInstance for all employees
 *
 * @module api/review-cycles/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { randomUUID } from 'crypto';
import type { ReviewCycleStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

/** GET /api/review-cycles/[id] */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'performance.manage_reviews');
    const { id } = await params;

    const cycle = await prisma.reviewCycle.findFirst({
      where: { id, company_id: employee.org_id },
      include: {
        instances: {
          include: {
            Reviewee: { select: { id: true, first_name: true, last_name: true, department: true } },
            Reviewer: { select: { id: true, first_name: true, last_name: true } },
          },
        },
        _count: { select: { instances: true } },
      },
    });

    if (!cycle) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review cycle not found' } }, { status: 404 });
    }

    return NextResponse.json({ cycle });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/review-cycles/[id] — Update status or dates */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'performance.manage_reviews');
    const { id } = await params;

    const existing = await prisma.reviewCycle.findFirst({ where: { id, company_id: employee.org_id } });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review cycle not found' } }, { status: 404 });
    }

    const body = await request.json() as {
      status?: ReviewCycleStatus;
      selfReviewDeadline?: string;
      managerReviewDeadline?: string;
      isCalibrationEnabled?: boolean;
    };

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.selfReviewDeadline !== undefined) data.self_review_deadline = new Date(body.selfReviewDeadline);
    if (body.managerReviewDeadline !== undefined) data.manager_review_deadline = new Date(body.managerReviewDeadline);
    if (body.isCalibrationEnabled !== undefined) data.is_calibration_enabled = body.isCalibrationEnabled;

    const cycle = await prisma.reviewCycle.update({ where: { id }, data });
    return NextResponse.json({ cycle });
  } catch (error) {
    return handleApiError(error);
  }
}

/** POST /api/review-cycles/[id]/launch — Creates manager ReviewInstances for all active employees */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'performance.manage_reviews');
    const { id } = await params;

    const cycle = await prisma.reviewCycle.findFirst({ where: { id, company_id: employee.org_id } });
    if (!cycle) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review cycle not found' } }, { status: 404 });
    }

    if (cycle.status !== 'draft') {
      return NextResponse.json({ error: { code: 'CONFLICT', message: 'Only draft cycles can be launched' } }, { status: 409 });
    }

    const employees = await prisma.employee.findMany({
      where: { org_id: employee.org_id, status: 'active', deleted_at: null, manager_id: { not: null } },
      select: { id: true, manager_id: true },
    });

    const existingPairs = await prisma.reviewInstance.findMany({
      where: { cycle_id: id },
      select: { reviewee_id: true, reviewer_id: true },
    });

    const existingSet = new Set(existingPairs.map((p) => `${p.reviewee_id}:${p.reviewer_id}`));

    const newInstances = employees
      .filter((e) => !existingSet.has(`${e.id}:${e.manager_id}`))
      .map((e) => ({
        id: randomUUID(),
        cycle_id: id,
        company_id: employee.org_id,
        reviewee_id: e.id,
        reviewer_id: e.manager_id!,
        review_type: 'manager' as const,
      }));

    await prisma.reviewInstance.createMany({ data: newInstances, skipDuplicates: true });
    await prisma.reviewCycle.update({ where: { id }, data: { status: 'active' } });

    return NextResponse.json({ launched: true, instancesCreated: newInstances.length }, { status: 201 });
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
