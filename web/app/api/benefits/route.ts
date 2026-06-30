/**
 * Benefits API — RALPH-20260630-012
 * GET /api/benefits  — list plans (with employee enrollment status)
 * POST /api/benefits — create a benefit plan (employee.edit_any)
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');

    const plans = await prisma.benefitPlan.findMany({
      where: { company_id: employee.org_id!, is_active: true },
      include: {
        enrollments: {
          where: { emp_id: employee.id },
          select: { id: true, status: true, start_date: true },
        },
        _count: { select: { enrollments: true } },
      },
      orderBy: { name: 'asc' },
    });
    return NextResponse.json({ plans });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');
    requirePermissionGuard(employee, 'employee.edit_any');

    const body = await req.json();
    const { name, type, description, provider, coverage } = body;
    if (!name || !type) return NextResponse.json({ error: 'name and type required' }, { status: 400 });

    const plan = await prisma.benefitPlan.create({
      data: {
        company_id: employee.org_id!,
        name,
        type,
        description,
        provider,
        coverage: coverage ?? {},
      },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
