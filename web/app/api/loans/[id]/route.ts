/**
 * Loan Detail API — RALPH-20260630-011
 * GET    /api/loans/[id] — fetch loan
 * PATCH  /api/loans/[id] — approve/reject (payroll.view_all) or cancel own pending
 * DELETE /api/loans/[id] — withdraw own pending
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';
import type { LoanStatus } from '@prisma/client';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const loan = await prisma.loan.findFirst({
      where: { id, company_id: employee.org_id! },
      include: { Employee: { select: { id: true, first_name: true, last_name: true, designation: true } } },
    });
    if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = hasPermission(employee.permissions, 'payroll.view_all');
    if (loan.emp_id !== employee.id && !isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ loan });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const loan = await prisma.loan.findFirst({ where: { id, company_id: employee.org_id! } });
    if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = hasPermission(employee.permissions, 'payroll.view_all');
    const body = await req.json();

    if (body.status && ['approved', 'rejected', 'disbursed', 'closed'].includes(body.status)) {
      if (!isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const updated = await prisma.loan.update({
        where: { id },
        data: {
          status: body.status as LoanStatus,
          approved_by: body.status === 'approved' ? employee.id : undefined,
          disbursed_at: body.status === 'disbursed' ? new Date() : undefined,
          notes: body.notes ?? loan.notes,
        },
      });
      return NextResponse.json({ loan: updated });
    }

    if (loan.emp_id !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (loan.status !== 'pending') return NextResponse.json({ error: 'Cannot edit non-pending loan' }, { status: 400 });

    const updated = await prisma.loan.update({
      where: { id },
      data: { amount: body.amount ? Number(body.amount) : undefined, purpose: body.purpose, notes: body.notes },
    });
    return NextResponse.json({ loan: updated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const loan = await prisma.loan.findFirst({ where: { id, company_id: employee.org_id! } });
    if (!loan) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (loan.emp_id !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (loan.status !== 'pending') return NextResponse.json({ error: 'Can only withdraw pending loan' }, { status: 400 });

    await prisma.loan.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
