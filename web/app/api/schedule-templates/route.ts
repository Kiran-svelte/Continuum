/**
 * Schedule Templates API — RALPH-20260630-020
 *
 * GET  /api/schedule-templates — list templates
 * POST /api/schedule-templates — create template (employee.edit_any)
 *
 * Propagated to: app/hr/(main)/scheduling/page
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'attendance');

    const templates = await prisma.scheduleTemplate.findMany({
      where: { company_id: employee.org_id!, is_active: true },
      orderBy: { created_at: 'desc' },
    });
    return NextResponse.json({ templates });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'attendance');
    requirePermissionGuard(employee, 'employee.edit_any');

    const body = await req.json();
    const { name, description, type, rules } = body;
    if (!name) return NextResponse.json({ error: 'name required' }, { status: 400 });

    const template = await prisma.scheduleTemplate.create({
      data: {
        company_id: employee.org_id!,
        name,
        description,
        type: type ?? 'weekly',
        rules: rules ?? [],
        created_by: employee.id,
      },
    });
    return NextResponse.json({ template }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
