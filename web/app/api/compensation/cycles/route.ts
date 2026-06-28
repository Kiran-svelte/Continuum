/**
 * Compensation Cycles API
 *
 * GET  /api/compensation/cycles       — List cycles
 * POST /api/compensation/cycles       — Create cycle
 * GET  /api/compensation/cycles/[id]  — Single cycle with recommendations
 * POST /api/compensation/cycles/[id]/recommendations — Add/update recommendations
 *
 * @module api/compensation/cycles
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

    const cycles = await prisma.compensationCycle.findMany({
      where: { company_id: employee.org_id },
      include: {
        _count: { select: { recommendations: true } },
        Creator: { select: { first_name: true, last_name: true } },
      },
      orderBy: { effective_date: 'desc' },
    });

    return NextResponse.json({ cycles });
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
      name?: string;
      budgetTotal?: number;
      currency?: string;
      effectiveDate?: string;
    };

    if (!body.name || !body.effectiveDate) {
      return NextResponse.json(
        { error: { code: 'VALIDATION_ERROR', message: 'name and effectiveDate are required' } },
        { status: 400 }
      );
    }

    const cycle = await prisma.compensationCycle.create({
      data: {
        id: randomUUID(),
        company_id: employee.org_id,
        name: body.name.trim(),
        budget_total: body.budgetTotal ?? null,
        currency: body.currency ?? 'INR',
        effective_date: new Date(body.effectiveDate),
        status: 'planning',
        created_by: employee.id,
      },
    });

    return NextResponse.json({ cycle }, { status: 201 });
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
