/**
 * Policies API — RALPH-20260630-016
 * GET  /api/policies — list active policies
 * POST /api/policies — create policy (employee.edit_any)
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'compliance');

    const url = new URL(req.url);
    const category = url.searchParams.get('category') ?? undefined;

    const policies = await prisma.policy.findMany({
      where: { company_id: employee.org_id!, is_active: true, ...(category ? { category } : {}) },
      include: {
        acknowledgements: { where: { emp_id: employee.id }, select: { acked_at: true } },
        _count: { select: { acknowledgements: true } },
      },
      orderBy: [{ requires_ack: 'desc' }, { published_at: 'desc' }],
    });
    return NextResponse.json({ policies });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'compliance');
    requirePermissionGuard(employee, 'employee.edit_any');

    const body = await req.json();
    const { title, category, content, description, requires_ack, version } = body;
    if (!title || !category || !content) return NextResponse.json({ error: 'title, category, content required' }, { status: 400 });

    const policy = await prisma.policy.create({
      data: {
        company_id: employee.org_id!,
        title,
        category,
        content,
        description,
        requires_ack: requires_ack ?? false,
        version: version ?? '1.0',
        published_at: new Date(),
        created_by: employee.id,
      },
    });
    return NextResponse.json({ policy }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
