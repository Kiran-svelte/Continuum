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
  // Emergency contact fields
  emergency_contact_name: z.string().max(100).optional().nullable(),
  emergency_contact_phone: z.string().max(20).optional().nullable(),
  emergency_contact_relationship: z.string().max(50).optional().nullable(),
  // Bank details
  bank_name: z.string().max(100).optional().nullable(),
  bank_account_number: z.string().max(30).optional().nullable(),
  ifsc_code: z.string().max(20).optional().nullable(),
  // Address
  current_address: z.string().max(500).optional().nullable(),
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
        // Emergency contact
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        // Bank details
        bank_name: true,
        bank_account_number: true,
        ifsc_code: true,
        // Address
        current_address: true,
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
 * Employees can edit: phone, department, designation, emergency contact,
 * bank details, and current address.
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

    // Core profile fields
    if (parsed.data.phone !== undefined)
      updateData.phone = parsed.data.phone ? sanitizeInput(parsed.data.phone) : null;
    if (parsed.data.department !== undefined)
      updateData.department = parsed.data.department ? sanitizeInput(parsed.data.department) : null;
    if (parsed.data.designation !== undefined)
      updateData.designation = parsed.data.designation ? sanitizeInput(parsed.data.designation) : null;

    // Emergency contact fields
    if (parsed.data.emergency_contact_name !== undefined)
      updateData.emergency_contact_name = parsed.data.emergency_contact_name ? sanitizeInput(parsed.data.emergency_contact_name) : null;
    if (parsed.data.emergency_contact_phone !== undefined)
      updateData.emergency_contact_phone = parsed.data.emergency_contact_phone ? sanitizeInput(parsed.data.emergency_contact_phone) : null;
    if (parsed.data.emergency_contact_relationship !== undefined)
      updateData.emergency_contact_relationship = parsed.data.emergency_contact_relationship ? sanitizeInput(parsed.data.emergency_contact_relationship) : null;

    // Bank details
    if (parsed.data.bank_name !== undefined)
      updateData.bank_name = parsed.data.bank_name ? sanitizeInput(parsed.data.bank_name) : null;
    if (parsed.data.bank_account_number !== undefined)
      updateData.bank_account_number = parsed.data.bank_account_number ? sanitizeInput(parsed.data.bank_account_number) : null;
    if (parsed.data.ifsc_code !== undefined)
      updateData.ifsc_code = parsed.data.ifsc_code ? sanitizeInput(parsed.data.ifsc_code) : null;

    // Address
    if (parsed.data.current_address !== undefined)
      updateData.current_address = parsed.data.current_address ? sanitizeInput(parsed.data.current_address) : null;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const previous = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: {
        phone: true,
        department: true,
        designation: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        bank_name: true,
        bank_account_number: true,
        ifsc_code: true,
        current_address: true,
      },
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
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        bank_name: true,
        bank_account_number: true,
        ifsc_code: true,
        current_address: true,
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
