/**
 * Reimbursement Detail API — RALPH-20260630-014
 * GET    /api/reimbursements/[id] — fetch (own or expenses.view_all)
 * PATCH  /api/reimbursements/[id] — approve/reject (expenses.approve) or edit own pending
 * DELETE /api/reimbursements/[id] — withdraw own pending
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';
import type { ReimbursementStatus } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'reimbursements');

    const r = await prisma.reimbursement.findFirst({
      where: { id, company_id: employee.org_id! },
      include: {
        employee: { select: { id: true, first_name: true, last_name: true, designation: true } },
        approver: { select: { id: true, first_name: true, last_name: true } },
      },
    });
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = hasPermission(employee.permissions, 'expenses.view_all');
    if (r.emp_id !== employee.id && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ reimbursement: r });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'reimbursements');

    const r = await prisma.reimbursement.findFirst({ where: { id, company_id: employee.org_id! } });
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();

    if (body.status && ['approved', 'rejected', 'processed'].includes(body.status)) {
      if (!hasPermission(employee.permissions, 'expenses.approve'))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const updated = await prisma.reimbursement.update({
        where: { id },
        data: { status: body.status as ReimbursementStatus, approved_by: employee.id },
      });
      return NextResponse.json({ reimbursement: updated });
    }

    if (r.emp_id !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (r.status !== 'pending') return NextResponse.json({ error: 'Cannot edit non-pending claim' }, { status: 400 });

    const updated = await prisma.reimbursement.update({
      where: { id },
      data: {
        category: body.category,
        amount: body.amount ? Number(body.amount) : undefined,
        description: body.description,
        receipt_url: body.receipt_url,
      },
    });
    return NextResponse.json({ reimbursement: updated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'reimbursements');

    const r = await prisma.reimbursement.findFirst({ where: { id, company_id: employee.org_id! } });
    if (!r) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (r.emp_id !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (r.status !== 'pending') return NextResponse.json({ error: 'Can only withdraw pending claim' }, { status: 400 });

    await prisma.reimbursement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
