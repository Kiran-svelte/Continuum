import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { sanitizeInput } from '@/lib/security';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

const updateProfileSchema = z.object({
  phone: z.string().max(20).optional().nullable(),
  department: z.string().max(100).optional().nullable(),
  designation: z.string().max(100).optional().nullable(),
});

/**
 * GET /api/employees/me
 * Returns the authenticated employee's full profile.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    const profile = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        primary_role: true,
        department: true,
        designation: true,
        status: true,
        date_of_joining: true,
        gender: true,
        manager: { select: { first_name: true, last_name: true, designation: true } },
        created_at: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json(profile);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/employees/me
 * Updates the authenticated employee's own editable profile fields.
 * Employees can only edit: phone, department, designation.
 */
export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const body = await request.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updateData: Record<string, string | null> = {};
    if (parsed.data.phone !== undefined)
      updateData.phone = parsed.data.phone ? sanitizeInput(parsed.data.phone) : null;
    if (parsed.data.department !== undefined)
      updateData.department = parsed.data.department ? sanitizeInput(parsed.data.department) : null;
    if (parsed.data.designation !== undefined)
      updateData.designation = parsed.data.designation ? sanitizeInput(parsed.data.designation) : null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const previous = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: { phone: true, department: true, designation: true },
    });

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: updateData,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        status: true,
      },
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      entityType: 'Employee',
      entityId: employee.id,
      previousState: previous ?? undefined,
      newState: updateData,
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
