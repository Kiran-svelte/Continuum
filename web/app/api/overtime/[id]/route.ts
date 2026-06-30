/**
 * Overtime Request Detail API — RALPH-20260630-019
 * PATCH /api/overtime/[id] — approve/reject (employee.view_all) or edit own pending
 * DELETE /api/overtime/[id] — withdraw own pending
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'attendance');

    const req_ = await prisma.overtimeRequest.findFirst({ where: { id, company_id: employee.org_id! } });
    if (!req_) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();
    const isAdmin = hasPermission(employee.permissions, 'employee.view_all');

    if (body.status && ['approved', 'rejected'].includes(body.status)) {
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const updated = await prisma.overtimeRequest.update({
        where: { id },
        data: { status: body.status, approved_by: employee.id, approved_at: new Date() },
      });
      return NextResponse.json({ request: updated });
    }

    if (req_.emp_id !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (req_.status !== 'pending') return NextResponse.json({ error: 'Cannot edit non-pending request' }, { status: 400 });

    const updated = await prisma.overtimeRequest.update({
      where: { id },
      data: { hours: body.hours ? Number(body.hours) : undefined, reason: body.reason, payout_type: body.payout_type },
    });
    return NextResponse.json({ request: updated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'attendance');

    const req_ = await prisma.overtimeRequest.findFirst({ where: { id, company_id: employee.org_id! } });
    if (!req_) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (req_.emp_id !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (req_.status !== 'pending') return NextResponse.json({ error: 'Can only withdraw pending request' }, { status: 400 });

    await prisma.overtimeRequest.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
