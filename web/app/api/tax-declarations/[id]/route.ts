/**
 * Tax Declaration Detail API — RALPH-20260630-015
 * GET    /api/tax-declarations/[id] — fetch
 * PATCH  /api/tax-declarations/[id] — submit (own) or approve/reject (payroll.approve)
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const decl = await prisma.taxDeclaration.findFirst({
      where: { id, company_id: employee.org_id! },
      include: { Employee: { select: { id: true, first_name: true, last_name: true } } },
    });
    if (!decl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const isAdmin = hasPermission(employee.permissions, 'payroll.view_all');
    if (decl.emp_id !== employee.id && !isAdmin)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ declaration: decl });
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

    const decl = await prisma.taxDeclaration.findFirst({ where: { id, company_id: employee.org_id! } });
    if (!decl) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const body = await req.json();

    // Admin approve/reject
    if (body.status && ['approved', 'rejected'].includes(body.status)) {
      if (!hasPermission(employee.permissions, 'payroll.approve'))
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      const updated = await prisma.taxDeclaration.update({
        where: { id },
        data: { status: body.status, approved_by: employee.id, notes: body.notes },
      });
      return NextResponse.json({ declaration: updated });
    }

    // Employee submit
    if (decl.emp_id !== employee.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    if (decl.status === 'approved') return NextResponse.json({ error: 'Already approved' }, { status: 400 });

    const submitAction = body.action === 'submit';
    const updated = await prisma.taxDeclaration.update({
      where: { id },
      data: {
        sections: body.sections ?? undefined,
        total_declared: body.total_declared !== undefined ? Number(body.total_declared) : undefined,
        regime: body.regime,
        status: submitAction ? 'submitted' : 'draft',
        submitted_at: submitAction ? new Date() : undefined,
      },
    });
    return NextResponse.json({ declaration: updated });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
