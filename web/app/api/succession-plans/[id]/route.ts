/**
 * Succession Plan Detail API — RALPH-20260630-013
 * GET    /api/succession-plans/[id] — fetch plan
 * PATCH  /api/succession-plans/[id] — update (performance.manage_reviews)
 * DELETE /api/succession-plans/[id] — archive (performance.manage_reviews)
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
    await assertModule(employee.org_id!, 'performance');
    requirePermissionGuard(employee, 'performance.view_all');

    const plan = await prisma.successionPlan.findFirst({
      where: { id, company_id: employee.org_id! },
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
    await assertModule(employee.org_id!, 'performance');
    requirePermissionGuard(employee, 'performance.manage_reviews');

    const body = await req.json();
    const plan = await prisma.successionPlan.update({
      where: { id },
      data: {
        role_title: body.role_title,
        current_emp_id: body.current_emp_id,
        candidates: body.candidates,
        priority: body.priority,
        status: body.status,
        notes: body.notes,
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
    await assertModule(employee.org_id!, 'performance');
    requirePermissionGuard(employee, 'performance.manage_reviews');

    await prisma.successionPlan.update({ where: { id }, data: { status: 'deleted' } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
