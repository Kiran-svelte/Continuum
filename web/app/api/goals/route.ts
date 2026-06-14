/**
 * Goals API — CRUD operations for performance goals.
 *
 * GET /api/goals — List goals for authenticated user (or team/company based on permissions)
 * POST /api/goals — Create a new goal
 *
 * @module api/goals
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
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
 * Lists goals based on user's permissions.
 * - Employees see own goals
 * - Managers see team goals
 * - HR/Admin see all company goals
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'performance');
    if (moduleGuard) return moduleGuard;

    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const status = url.searchParams.get('status');
    const category = url.searchParams.get('category');

    const whereClause = buildGoalWhereClause(employee, employeeId, status, category);

    const goals = await prisma.goal.findMany({
      where: whereClause,
      include: {
        Employee: {
          select: { first_name: true, last_name: true, department: true },
        },
        ParentGoal: {
          select: { id: true, title: true },
        },
        _count: { select: { ChildGoals: true } },
      },
      orderBy: [{ status: 'asc' }, { due_date: 'asc' }],
    });

    return NextResponse.json({ goals });
  } catch (error) {
    return handleApiError(error);
  }
}

/**
 * Creates a new performance goal.
 * Requires performance.set_own_goals (own) or performance.manage_goals (any).
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'performance');
    if (moduleGuard) return moduleGuard;

    const body = await request.json();
    const {
      title,
      description,
      category,
      metricType,
      targetValue,
      weight,
      dueDate,
      parentGoalId,
      assigneeId,
    } = body as {
      title?: string;
      description?: string;
      category?: string;
      metricType?: string;
      targetValue?: number;
      weight?: number;
      dueDate?: string;
      parentGoalId?: string;
      assigneeId?: string;
    };

    if (!title) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'Title is required' } },
        { status: 400 }
      );
    }

    const targetEmployeeId = assigneeId ?? employee.id;
    const isOwnGoal = targetEmployeeId === employee.id;

    if (isOwnGoal) {
      requirePermissionGuard(employee, 'performance.set_own_goals');
    } else {
      requirePermissionGuard(employee, 'performance.manage_goals');
    }

    const goal = await prisma.goal.create({
      data: {
        id: randomUUID(),
        company_id: employee.org_id,
        emp_id: targetEmployeeId,
        title,
        description: description ?? null,
        category: (category as 'company' | 'department' | 'team' | 'individual') ?? 'individual',
        metric_type: (metricType as 'percentage' | 'number' | 'currency' | 'boolean') ?? 'percentage',
        target_value: targetValue ?? 100,
        weight: weight ?? 1,
        due_date: dueDate ? new Date(dueDate) : null,
        parent_goal_id: parentGoalId ?? null,
      },
    });

    return NextResponse.json({ goal }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Builds the Prisma where clause based on user permissions.
 */
function buildGoalWhereClause(
  employee: { id: string; org_id: string; permissions: PermissionCode[] },
  employeeId: string | null,
  status: string | null,
  category: string | null
) {
  const canViewAll = hasPermission(employee.permissions, 'performance.view_all');
  const canViewTeam = hasPermission(employee.permissions, 'performance.view_team_goals');

  const where: Record<string, unknown> = {
    company_id: employee.org_id,
  };

  if (employeeId && (canViewAll || canViewTeam)) {
    where.emp_id = employeeId;
  } else if (!canViewAll) {
    where.emp_id = employee.id;
  }

  if (status) {
    where.status = status;
  }

  if (category) {
    where.category = category;
  }

  return where;
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
