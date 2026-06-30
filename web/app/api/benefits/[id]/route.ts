/**
 * Benefit Plan Detail API — RALPH-20260630-012
 * GET    /api/benefits/[id]  — fetch plan
 * PATCH  /api/benefits/[id]  — update plan / enroll (employee.edit_any)
 * DELETE /api/benefits/[id]  — deactivate plan (employee.edit_any)
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');

    const plan = await prisma.benefitPlan.findFirst({
      where: { id, company_id: employee.org_id! },
      include: {
        enrollments: { include: { Employee: { select: { id: true, first_name: true, last_name: true } } } },
        _count: { select: { enrollments: true } },
      },
    });
    if (!plan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ plan });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');
    requirePermissionGuard(employee, 'employee.edit_any');

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    if (action === 'enroll') {
      const body = await req.json();
      const enrollment = await prisma.benefitEnrollment.upsert({
        where: { emp_id_plan_id: { emp_id: body.emp_id ?? employee.id, plan_id: id } },
        create: {
          company_id: employee.org_id!,
          emp_id: body.emp_id ?? employee.id,
          plan_id: id,
          start_date: new Date(body.start_date ?? new Date()),
          status: 'active',
          notes: body.notes,
        },
        update: { status: 'active', start_date: new Date(body.start_date ?? new Date()), notes: body.notes },
      });
      return NextResponse.json({ enrollment });
    }

    const body = await req.json();
    const plan = await prisma.benefitPlan.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        provider: body.provider,
        coverage: body.coverage,
        is_active: body.is_active,
      },
    });
    return NextResponse.json({ plan });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');
    requirePermissionGuard(employee, 'employee.edit_any');

    await prisma.benefitPlan.update({ where: { id }, data: { is_active: false } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
