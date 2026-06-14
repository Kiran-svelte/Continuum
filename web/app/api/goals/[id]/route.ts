/**
 * Goal [id] API — Single goal operations.
 *
 * GET    /api/goals/[id] — Get goal with children
 * PATCH  /api/goals/[id] — Update progress, reassign, change status
 * DELETE /api/goals/[id] — Cancel goal (soft-delete via status)
 *
 * @module api/goals/[id]
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import type { GoalStatus, MetricType, GoalCategory } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ id: string }> }

/** GET /api/goals/[id] */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const { id } = await params;

    const goal = await prisma.goal.findFirst({
      where: { id, company_id: employee.org_id },
      include: {
        Employee: { select: { first_name: true, last_name: true, department: true } },
        ParentGoal: { select: { id: true, title: true } },
        ChildGoals: { select: { id: true, title: true, status: true, current_value: true, target_value: true } },
      },
    });

    if (!goal) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, { status: 404 });
    }

    const isOwnGoal = goal.emp_id === employee.id;
    const canViewAll = hasPermission(employee.permissions, 'performance.view_all');
    const canViewTeam = hasPermission(employee.permissions, 'performance.view_team_goals');

    if (!isOwnGoal && !canViewAll && !canViewTeam) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    return NextResponse.json({ goal });
  } catch (error) {
    return handleApiError(error);
  }
}

/** PATCH /api/goals/[id] */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const { id } = await params;

    const existing = await prisma.goal.findFirst({ where: { id, company_id: employee.org_id } });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, { status: 404 });
    }

    const isOwnGoal = existing.emp_id === employee.id;
    if (!isOwnGoal) {
      requirePermissionGuard(employee, 'performance.manage_goals');
    }

    const body = await request.json() as {
      currentValue?: number;
      status?: GoalStatus;
      title?: string;
      description?: string;
      dueDate?: string;
      weight?: number;
      targetValue?: number;
      metricType?: MetricType;
      category?: GoalCategory;
    };

    const data: Record<string, unknown> = {};
    if (body.currentValue !== undefined) data.current_value = body.currentValue;
    if (body.status !== undefined) data.status = body.status;
    if (body.title !== undefined) data.title = body.title;
    if (body.description !== undefined) data.description = body.description;
    if (body.dueDate !== undefined) data.due_date = new Date(body.dueDate);
    if (body.weight !== undefined) data.weight = body.weight;
    if (body.targetValue !== undefined) data.target_value = body.targetValue;
    if (body.metricType !== undefined) data.metric_type = body.metricType;
    if (body.category !== undefined) data.category = body.category;
    if (body.status === 'completed') data.completed_at = new Date();

    const goal = await prisma.goal.update({ where: { id }, data });
    return NextResponse.json({ goal });
  } catch (error) {
    return handleApiError(error);
  }
}

/** DELETE /api/goals/[id] — Soft cancel */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const { id } = await params;

    const existing = await prisma.goal.findFirst({ where: { id, company_id: employee.org_id } });
    if (!existing) {
      return NextResponse.json({ error: { code: 'NOT_FOUND', message: 'Goal not found' } }, { status: 404 });
    }

    if (existing.emp_id !== employee.id) {
      requirePermissionGuard(employee, 'performance.manage_goals');
    }

    await prisma.goal.update({ where: { id }, data: { status: 'cancelled' } });
    return new NextResponse(null, { status: 204 });
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
