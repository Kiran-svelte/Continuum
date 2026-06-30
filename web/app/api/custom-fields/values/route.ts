/**
 * Custom Field Values API — RALPH-20260630-017
 *
 * POST /api/custom-fields/values — upsert field values for an entity
 */
export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const employee = await getAuthEmployee(req);
    await assertModule(employee.org_id!, 'employees');

    const body = await req.json();
    const { entity_id, entity_type, values } = body;
    if (!entity_id || !entity_type || !Array.isArray(values))
      return NextResponse.json({ error: 'entity_id, entity_type, values[] required' }, { status: 400 });

    const results = await Promise.all(
      values.map(({ field_id, value, value_json }: { field_id: string; value?: string; value_json?: unknown }) =>
        prisma.customFieldValue.upsert({
          where: { field_id_entity_id: { field_id, entity_id } },
          create: {
            company_id: employee.org_id!,
            field_id,
            entity_id,
            entity_type,
            value,
            value_json: value_json ?? undefined,
          },
          update: { value, value_json: value_json ?? undefined },
        })
      )
    );
    return NextResponse.json({ values: results });
  } catch (e) {
    if (e instanceof AuthError) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
