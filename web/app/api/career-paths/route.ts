/**
 * Career Paths API — RALPH-20260630-010
 *
 * GET  /api/career-paths — List career paths (own or all for HR)
 * POST /api/career-paths — Create a career path plan
 *
 * Propagated to: app/hr/(main)/career-paths/, employee profile career tab
 *
 * @module api/career-paths
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const url = new URL(request.url);
    const empId = url.searchParams.get('empId');
    const canViewAll = hasPermission(employee.permissions, 'employee.view_all');

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    if (empId) {
      if (empId !== employee.id && !canViewAll) {
        return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
      }
      where.emp_id = empId;
    } else if (!canViewAll) {
      where.emp_id = employee.id;
    }

    const careerPaths = await prisma.careerPath.findMany({
      where,
      include: {
        Employee: { select: { first_name: true, last_name: true, department: true, designation: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ careerPaths });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const body = await request.json() as {
      empId?: string;
      title: string;
      currentRole: string;
      targetRole: string;
      targetDate?: string;
      milestones?: Array<{ title: string; dueDate?: string; completed?: boolean }>;
      notes?: string;
    };

    const targetEmpId = body.empId ?? employee.id;
    const canManage = hasPermission(employee.permissions, 'employee.edit_any');
    if (targetEmpId !== employee.id && !canManage) {
      return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Access denied' } }, { status: 403 });
    }

    if (!body.title?.trim() || !body.currentRole?.trim() || !body.targetRole?.trim()) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'title, currentRole, and targetRole are required' } }, { status: 400 });
    }

    const careerPath = await prisma.careerPath.create({
      data: {
        id: crypto.randomUUID(),
        company_id: employee.org_id!,
        emp_id: targetEmpId,
        title: body.title.trim(),
        current_role: body.currentRole.trim(),
        target_role: body.targetRole.trim(),
        target_date: body.targetDate ? new Date(body.targetDate) : null,
        milestones: body.milestones ?? [],
        notes: body.notes ?? null,
        created_by: employee.id,
      },
    });

    return NextResponse.json({ careerPath }, { status: 201 });
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
