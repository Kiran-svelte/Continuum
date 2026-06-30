/**
 * Overtime Requests API — RALPH-20260630-019
 *
 * GET  /api/overtime — list (own or all with employee.view_all)
 * POST /api/overtime — submit overtime request
 *
 * Propagated to: app/hr/(main)/attendance/page, app/employee/(main)/attendance/page
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
    await assertModule(employee.org_id!, 'attendance');

    const isAdmin = hasPermission(employee.permissions, 'employee.view_all');
    const url = new URL(req.url);
    const status = url.searchParams.get('status') ?? undefined;

    const requests = await prisma.overtimeRequest.findMany({
      where: {
        company_id: employee.org_id!,
        ...(isAdmin ? {} : { emp_id: employee.id }),
        ...(status ? { status } : {}),
      },
      include: {
        Employee: { select: { id: true, first_name: true, last_name: true, designation: true, department: true } },
      },
      orderBy: { date: 'desc' },
    });
    return NextResponse.json({ requests });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'attendance');

    const body = await req.json();
    const { date, hours, reason, payout_type } = body;
    if (!date || !hours) return NextResponse.json({ error: 'date and hours required' }, { status: 400 });

    const request = await prisma.overtimeRequest.create({
      data: {
        company_id: employee.org_id!,
        emp_id: employee.id,
        date: new Date(date),
        hours: Number(hours),
        reason,
        payout_type: payout_type ?? 'compensatory',
      },
    });
    return NextResponse.json({ request }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
