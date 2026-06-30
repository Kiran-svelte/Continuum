/**
 * Custom Fields API — RALPH-20260630-017
 *
 * GET  /api/custom-fields?entity_type=employee — list fields for entity
 * POST /api/custom-fields — create field definition (employee.edit_any)
 *
 * Propagated to: employee profile, leave, expense, recruitment forms
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');

    const url = new URL(req.url);
    const entity_type = url.searchParams.get('entity_type') ?? 'employee';
    const entity_id = url.searchParams.get('entity_id');

    const fields = await prisma.customField.findMany({
      where: { company_id: employee.org_id!, entity_type, is_active: true },
      include: entity_id ? {
        values: { where: { entity_id }, select: { id: true, value: true, value_json: true } },
      } : undefined,
      orderBy: { sort_order: 'asc' },
    });
    return NextResponse.json({ fields });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');
    requirePermissionGuard(employee, 'employee.edit_any');

    const body = await req.json();
    const { entity_type, field_name, field_label, field_type, options, is_required, sort_order } = body;
    if (!entity_type || !field_name || !field_label || !field_type)
      return NextResponse.json({ error: 'entity_type, field_name, field_label, field_type required' }, { status: 400 });

    const field = await prisma.customField.create({
      data: {
        company_id: employee.org_id!,
        entity_type,
        field_name,
        field_label,
        field_type,
        options,
        is_required: is_required ?? false,
        sort_order: sort_order ?? 0,
        created_by: employee.id,
      },
    });
    return NextResponse.json({ field }, { status: 201 });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
