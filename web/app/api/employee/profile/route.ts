/**
 * GET/PUT /api/employee/profile
 * Employee self-service profile management.
 * Allows employees to view and update their personal details
 * (emergency contact, address, phone) without HR intervention.
 *
 * @module api/employee/profile
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { revokeChannelLinksForEmployee } from '@/lib/channel/revoke-links';
import { normalizePhone } from '@/lib/phone/normalize';
import { sanitizeInput } from '@/lib/security';

export const dynamic = 'force-dynamic';

const profileUpdateSchema = z.object({
  phone: z.string().max(20).optional(),
  personal_email: z.string().email().max(255).optional(),
  emergency_contact_name: z.string().max(100).optional(),
  emergency_contact_phone: z.string().max(20).optional(),
  emergency_contact_relationship: z.string().max(50).optional(),
  current_address: z.string().max(500).optional(),
  blood_group: z.string().max(5).optional(),
  date_of_birth: z.string().optional(),
  bank_account_number: z.string().max(30).optional(),
  bank_name: z.string().max(100).optional(),
  ifsc_code: z.string().max(15).optional(),
  pan_number: z.string().max(15).optional(),
});

/**
 * GET handler: Fetch current employee's profile.
 *
 * @param request - Incoming request
 * @returns JSON with employee profile data
 */
export async function GET(request: NextRequest) {
  try {
    void request;
    const employee = await getAuthEmployee();

    const profile = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        department: true,
        designation: true,
        primary_role: true,
        status: true,
        date_of_joining: true,
        employee_id: true,
        personal_email: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        current_address: true,
        blood_group: true,
        date_of_birth: true,
        bank_account_number: true,
        bank_name: true,
        ifsc_code: true,
        pan_number: true,
        created_at: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    return NextResponse.json({ profile });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[EMPLOYEE PROFILE GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT handler: Update current employee's personal profile.
 * Employees can only update personal fields — not role, department, or designation.
 *
 * @param request - Incoming request with profile updates
 * @returns JSON with updated profile
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const body = await request.json();
    const parsed = profileUpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;
    if (typeof updates.phone === 'string' && updates.phone.trim().length > 0) {
      const normalized = normalizePhone(updates.phone);
      if (!normalized.ok) {
        return NextResponse.json({ error: normalized.message }, { status: 400 });
      }
      updates.phone = normalized.e164;
    }

    // Sanitize all string fields
    const sanitizedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && typeof value === 'string') {
        sanitizedUpdates[key] = sanitizeInput(value);
      }
    }

    // Fetch current state for audit
    const currentProfile = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: Object.fromEntries(
        Object.keys(sanitizedUpdates).map((key) => [key, true])
      ),
    });

    const updatedProfile = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        ...sanitizedUpdates,
        updated_at: new Date(),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        personal_email: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        current_address: true,
      },
    });

    await createAuditLog({
      companyId: employee.org_id!,
      actorId: employee.id,
      action: AUDIT_ACTIONS.EMPLOYEE_UPDATE,
      entityType: 'Employee',
      entityId: employee.id,
      previousState: currentProfile,
      newState: sanitizedUpdates,
    });

    const previousPhone =
      currentProfile && 'phone' in currentProfile ? String(currentProfile.phone ?? '') : '';
    const nextPhone =
      typeof sanitizedUpdates.phone === 'string' ? sanitizedUpdates.phone : previousPhone;
    if (previousPhone && previousPhone !== nextPhone) {
      await revokeChannelLinksForEmployee(employee.id, 'phone_changed', 'whatsapp');
    }

    return NextResponse.json({
      success: true,
      profile: updatedProfile,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[EMPLOYEE PROFILE PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
