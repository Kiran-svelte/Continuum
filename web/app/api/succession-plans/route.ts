/**
 * Succession Plans API — RALPH-20260630-013
 * GET  /api/succession-plans — list plans (performance.view_all)
 * POST /api/succession-plans — create plan (performance.manage_reviews)
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'performance');
    requirePermissionGuard(employee, 'performance.view_all');

    const plans = await prisma.successionPlan.findMany({
      where: { company_id: employee.org_id!, status: { not: 'deleted' } },
      orderBy: [{ priority: 'asc' }, { created_at: 'desc' }],
    });

    const allEmpIds = new Set<string>();
    for (const p of plans) {
      const cands = p.candidates as Array<{ emp_id: string }>;
      cands.forEach((c) => allEmpIds.add(c.emp_id));
    }
    const employees = await prisma.employee.findMany({
      where: { id: { in: [...allEmpIds] } },
      select: { id: true, first_name: true, last_name: true, designation: true },
    });
    const empMap = Object.fromEntries(employees.map((e) => [e.id, e]));

    const enriched = plans.map((p) => ({
      ...p,
      candidates: (p.candidates as Array<{ emp_id: string }>).map((c) => ({ ...c, employee: empMap[c.emp_id] })),
    }));

    return NextResponse.json({ plans: enriched });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'performance');
    requirePermissionGuard(employee, 'performance.manage_reviews');

    const body = await req.json();
    const { role_title, current_emp_id, candidates, priority, notes } = body;
    if (!role_title) return NextResponse.json({ error: 'role_title required' }, { status: 400 });

    const plan = await prisma.successionPlan.create({
      data: {
        company_id: employee.org_id!,
        role_title,
        current_emp_id,
        candidates: candidates ?? [],
        priority: priority ?? 2,
        notes,
        created_by: employee.id,
      },
    });
    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
