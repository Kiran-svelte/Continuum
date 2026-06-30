/**
 * Loans API — RALPH-20260630-011
 * GET /api/loans  — list loans (own or all with payroll.view_all)
 * POST /api/loans — apply for a loan
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { hasPermission } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const isAdmin = hasPermission(employee.permissions, 'payroll.view_all');
    const loans = await prisma.loan.findMany({
      where: isAdmin ? { company_id: employee.org_id! } : { company_id: employee.org_id!, emp_id: employee.id },
      include: { Employee: { select: { id: true, first_name: true, last_name: true, designation: true } } },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ loans });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'payroll');

    const body = await req.json();
    const { amount, purpose, installments } = body;
    if (!amount || !purpose) return NextResponse.json({ error: 'amount and purpose required' }, { status: 400 });

    const loan = await prisma.loan.create({
      data: {
        company_id: employee.org_id!,
        emp_id: employee.id,
        amount: Number(amount),
        purpose,
        installments: Number(installments ?? 1),
        emi_amount: installments && amount ? Number(amount) / Number(installments) : undefined,
      },
    });
    return NextResponse.json({ loan }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
