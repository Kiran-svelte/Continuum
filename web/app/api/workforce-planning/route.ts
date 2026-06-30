/**
 * Workforce Planning — RALPH-20260630-027
 * GET /api/workforce-planning  — list plans
 * POST /api/workforce-planning — create plan
 */
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'analytics');

    const [plans, deptCounts] = await Promise.all([
      prisma.successionPlan.findMany({
        where: { company_id: employee.org_id! },
        orderBy: { created_at: 'desc' },
      }),
      prisma.employee.groupBy({
        by: ['department'],
        where: { org_id: employee.org_id!, status: 'active' },
        _count: { _all: true },
      }),
    ]);

    return NextResponse.json({
      plans: plans.map((p) => ({
        id: p.id,
        role: p.role_title,
        priority: p.priority,
        status: p.status,
        candidates: p.candidates,
        notes: p.notes,
        created_at: p.created_at,
      })),
      headcount_by_department: deptCounts
        .map((d) => ({ department: d.department ?? 'Unknown', count: d._count._all }))
        .sort((a, b) => b.count - a.count),
    });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'analytics');
    requirePermissionGuard(employee, 'employee.edit_any');

    const body = await req.json();
    const { role_title, notes, priority } = body as {
      role_title: string; notes?: string; priority?: number;
    };

    if (!role_title) return NextResponse.json({ error: 'role_title is required' }, { status: 400 });

    const plan = await prisma.successionPlan.create({
      data: {
        company_id: employee.org_id!,
        role_title,
        notes: notes ?? null,
        priority: priority ?? 2,
        status: 'active',
        created_by: employee.id,
      },
    });

    return NextResponse.json({ plan }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
