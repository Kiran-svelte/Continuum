/**
 * Review Instances API
 *
 * GET   /api/review-instances — List review instances for the user (as reviewer or reviewee)
 * PATCH /api/review-instances/[id] — Submit review ratings and comments
 *
 * @module api/review-instances
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

/**
 * Lists review instances for the authenticated user.
 * HR/admin see all; managers/employees see their own.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const cycleId = url.searchParams.get('cycleId');
    const role = url.searchParams.get('role'); // 'reviewer' | 'reviewee'

    const canViewAll = hasPermission(employee.permissions, 'performance.view_all');

    const where: Record<string, unknown> = { company_id: employee.org_id };

    if (cycleId) where.cycle_id = cycleId;

    if (!canViewAll) {
      if (role === 'reviewee') {
        where.reviewee_id = employee.id;
      } else {
        where.reviewer_id = employee.id;
      }
    }

    const instances = await prisma.reviewInstance.findMany({
      where,
      include: {
        Reviewee: { select: { id: true, first_name: true, last_name: true, department: true } },
        Reviewer: { select: { id: true, first_name: true, last_name: true } },
        ReviewCycle: { select: { id: true, name: true, status: true, manager_review_deadline: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ instances });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Submits a review. Only the assigned reviewer can submit.
 * Body: { overallRating, selfRating?, strengths?, improvements?, managerComments?, responses? }
 */
export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const instanceId = url.searchParams.get('id');
    if (!instanceId) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id query param is required' } }, { status: 400 });
    }

    const instance = await prisma.reviewInstance.findFirst({
      where: { id: instanceId, company_id: employee.org_id },
    });

    if (!instance) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Review instance not found' } }, { status: 404 });
    }

    const isReviewer = instance.reviewer_id === employee.id;
    const isReviewee = instance.reviewee_id === employee.id;
    const canManage = hasPermission(employee.permissions, 'performance.manage_reviews');

    if (!isReviewer && !isReviewee && !canManage) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    const body = await request.json() as {
      overallRating?: number;
      selfRating?: number;
      strengths?: string;
      improvements?: string;
      managerComments?: string;
      employeeComments?: string;
      action?: 'submit' | 'acknowledge';
    };

    const data: Record<string, unknown> = {};
    if (body.overallRating !== undefined) data.overall_rating = body.overallRating;
    if (body.selfRating !== undefined) data.self_rating = body.selfRating;
    if (body.strengths !== undefined) data.strengths = body.strengths;
    if (body.improvements !== undefined) data.improvements = body.improvements;
    if (body.managerComments !== undefined) data.manager_comments = body.managerComments;
    if (body.employeeComments !== undefined) data.employee_comments = body.employeeComments;

    if (body.action === 'submit') {
      data.status = 'submitted';
      data.submitted_at = new Date();
    } else if (body.action === 'acknowledge') {
      data.status = 'acknowledged';
      data.acknowledged_at = new Date();
    } else {
      data.status = 'in_progress';
    }

    const updated = await prisma.reviewInstance.update({ where: { id: instanceId }, data });
    return NextResponse.json({ instance: updated });
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
