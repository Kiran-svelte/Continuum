/**
 * Compensation Recommendations API
 *
 * GET  /api/compensation/recommendations?cycleId= — List recs for cycle
 * POST /api/compensation/recommendations           — Create/upsert recommendation
 * PATCH /api/compensation/recommendations?id=      — Update status or finalize CTC
 *
 * @module api/compensation/recommendations
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';
import { randomUUID } from 'crypto';


export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;
    requirePermissionGuard(employee, 'compensation.view_cycles');

    const url = new URL(request.url);
    const cycleId = url.searchParams.get('cycleId');

    const where: Record<string, unknown> = { company_id: employee.org_id };
    if (cycleId) where.cycle_id = cycleId;

    const recommendations = await prisma.compensationRecommendation.findMany({
      where,
      include: {
        Employee: { select: { first_name: true, last_name: true, department: true, primary_role: true } },
      },
      orderBy: { created_at: 'desc' },
    });

    return NextResponse.json({ recommendations });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;
    requirePermissionGuard(employee, 'compensation.manage_cycles');

    const body = await request.json() as {
      cycleId?: string;
      empId?: string;
      currentCtc?: number;
      recommendedCtc?: number;
      managerComments?: string;
    };

    if (!body.cycleId || !body.empId || body.currentCtc === undefined || body.recommendedCtc === undefined) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'cycleId, empId, currentCtc, and recommendedCtc are required' } },
        { status: 400 }
      );
    }

    if (body.recommendedCtc < body.currentCtc) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'recommendedCtc cannot be less than currentCtc' } },
        { status: 400 }
      );
    }

    const incrementPercent = body.currentCtc > 0
      ? ((body.recommendedCtc - body.currentCtc) / body.currentCtc) * 100
      : 0;

    const recommendation = await prisma.compensationRecommendation.upsert({
      where: { cycle_id_emp_id: { cycle_id: body.cycleId, emp_id: body.empId } },
      create: {
        id: randomUUID(),
        cycle_id: body.cycleId,
        emp_id: body.empId,
        company_id: employee.org_id,
        current_ctc: body.currentCtc,
        recommended_ctc: body.recommendedCtc,
        increment_percent: incrementPercent,
        manager_comments: body.managerComments ?? null,
        status: 'pending',
      },
      update: {
        recommended_ctc: body.recommendedCtc,
        increment_percent: incrementPercent,
        manager_comments: body.managerComments ?? undefined,
      },
    });

    return NextResponse.json({ recommendation }, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;
    requirePermissionGuard(employee, 'compensation.approve');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'id is required' } }, { status: 400 });
    }

    const body = await request.json() as {
      status?: string;
      finalCtc?: number;
      hrComments?: string;
    };

    const data: Record<string, unknown> = {};
    if (body.status !== undefined) data.status = body.status;
    if (body.finalCtc !== undefined) data.final_ctc = body.finalCtc;
    if (body.hrComments !== undefined) data.hr_comments = body.hrComments;

    const recommendation = await prisma.compensationRecommendation.update({
      where: { id },
      data,
    });

    return NextResponse.json({ recommendation });
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
