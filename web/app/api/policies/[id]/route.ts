/**
 * Policy Detail API — RALPH-20260630-016
 * GET    /api/policies/[id]        — fetch policy
 * PATCH  /api/policies/[id]        — update (employee.edit_any)
 * DELETE /api/policies/[id]        — deactivate (employee.edit_any)
 * POST   /api/policies/[id]/ack    — acknowledge policy (via action=ack)
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
    await assertModule(employee.org_id!, 'compliance');

    const policy = await prisma.policy.findFirst({
      where: { id, company_id: employee.org_id! },
      include: {
        acknowledgements: { where: { emp_id: employee.id }, select: { acked_at: true } },
        _count: { select: { acknowledgements: true } },
      },
    });
    if (!policy) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ policy });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'compliance');

    const body = await req.json();

    // Acknowledge action — any employee
    if (body.action === 'ack') {
      const ack = await prisma.policyAck.upsert({
        where: { policy_id_emp_id: { policy_id: id, emp_id: employee.id } },
        create: { company_id: employee.org_id!, policy_id: id, emp_id: employee.id },
        update: { acked_at: new Date() },
      });
      return NextResponse.json({ ack });
    }

    // Update — admin only
    requirePermissionGuard(employee, 'employee.edit_any');
    const policy = await prisma.policy.update({
      where: { id },
      data: {
        title: body.title,
        content: body.content,
        description: body.description,
        category: body.category,
        requires_ack: body.requires_ack,
        is_active: body.is_active,
        version: body.version,
      },
    });
    return NextResponse.json({ policy });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'compliance');
    requirePermissionGuard(employee, 'employee.edit_any');

    await prisma.policy.update({ where: { id }, data: { is_active: false } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
