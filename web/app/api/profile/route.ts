import { NextRequest, NextResponse } from 'next/server';
import { AuthError, getAuthEmployee } from '@/lib/auth-guard';
import { revokeChannelLinksForEmployee } from '@/lib/channel/revoke-links';
import { normalizePhone } from '@/lib/phone/normalize';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeGender(value: unknown): 'male' | 'female' | 'other' | null {
  const normalized = normalizeOptional(value)?.toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized === 'male' || normalized === 'female' || normalized === 'other') {
    return normalized;
  }
  return null;
}

export async function GET() {
  try {
    const user = await getAuthEmployee();

    if (user.primary_role === 'super_admin') {
      const superAdmin = await prisma.superAdmin.findUnique({
        where: { id: user.id },
        select: {
          id: true,
          email: true,
          name: true,
          updated_at: true,
        },
      });

      if (!superAdmin) {
        return NextResponse.json({ error: 'Super admin profile not found.' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        profile: {
          id: superAdmin.id,
          email: superAdmin.email,
          first_name: superAdmin.name,
          last_name: '',
          phone: null,
          current_address: null,
          gender: null,
          department: null,
          designation: 'Platform Administrator',
          emergency_contact_name: null,
          emergency_contact_phone: null,
          emergency_contact_relationship: null,
          updated_at: superAdmin.updated_at,
        },
      });
    }

    const employeeProfile = await prisma.employee.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        current_address: true,
        gender: true,
        department: true,
        designation: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        updated_at: true,
      },
    });

    if (!employeeProfile) {
      return NextResponse.json({ error: 'Employee profile not found.' }, { status: 404 });
    }

    return NextResponse.json({ success: true, profile: employeeProfile });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Failed to load profile.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthEmployee();
    const payload = await request.json();

    const firstName = normalizeOptional(payload.firstName);
    const lastName = normalizeOptional(payload.lastName);

    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: 'First name and last name are required.' },
        { status: 400 }
      );
    }

    if (user.primary_role === 'super_admin') {
      const updated = await prisma.superAdmin.update({
        where: { id: user.id },
        data: {
          name: `${firstName} ${lastName}`.trim(),
          updated_at: new Date(),
        },
        select: {
          id: true,
          email: true,
          name: true,
          updated_at: true,
        },
      });

      return NextResponse.json({
        success: true,
        profile: {
          id: updated.id,
          email: updated.email,
          first_name: updated.name,
          last_name: '',
          phone: null,
          current_address: null,
          gender: null,
          department: null,
          designation: 'Platform Administrator',
          emergency_contact_name: null,
          emergency_contact_phone: null,
          emergency_contact_relationship: null,
          updated_at: updated.updated_at,
        },
      });
    }

    const requestedPhone = normalizeOptional(payload.phone);
    const normalizedPhone = requestedPhone ? normalizePhone(requestedPhone) : null;
    if (normalizedPhone && !normalizedPhone.ok) {
      return NextResponse.json(
        { error: normalizedPhone.message },
        { status: 400 }
      );
    }

    const current = await prisma.employee.findUnique({
      where: { id: user.id },
      select: { phone: true },
    });

    const nextPhone = normalizedPhone?.ok ? normalizedPhone.e164 : null;
    const updated = await prisma.employee.update({
      where: { id: user.id },
      data: {
        first_name: firstName,
        last_name: lastName,
        phone: nextPhone,
        current_address: normalizeOptional(payload.currentAddress),
        department: normalizeOptional(payload.department),
        gender: normalizeGender(payload.gender),
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        current_address: true,
        gender: true,
        department: true,
        designation: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        updated_at: true,
      },
    });

    if (current?.phone && current.phone !== nextPhone) {
      await revokeChannelLinksForEmployee(user.id, 'phone_changed', 'whatsapp');
    }

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Failed to update profile.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthEmployee();

    if (user.primary_role === 'super_admin') {
      return NextResponse.json(
        { error: 'Emergency contacts are not available for super admin accounts.' },
        { status: 400 }
      );
    }

    const payload = await request.json();
    const emergencyContactName = normalizeOptional(payload.emergencyContactName);
    const emergencyContactPhone = normalizeOptional(payload.emergencyContactPhone);
    const emergencyContactRelationship = normalizeOptional(payload.emergencyContactRelationship);

    if (!emergencyContactName || !emergencyContactPhone || !emergencyContactRelationship) {
      return NextResponse.json(
        { error: 'All emergency contact fields are required for add/update.' },
        { status: 400 }
      );
    }

    const updated = await prisma.employee.update({
      where: { id: user.id },
      data: {
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        emergency_contact_relationship: emergencyContactRelationship,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        current_address: true,
        gender: true,
        department: true,
        designation: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Failed to save emergency contact.' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const user = await getAuthEmployee();

    if (user.primary_role === 'super_admin') {
      return NextResponse.json(
        { error: 'Emergency contacts are not available for super admin accounts.' },
        { status: 400 }
      );
    }

    const updated = await prisma.employee.update({
      where: { id: user.id },
      data: {
        emergency_contact_name: null,
        emergency_contact_phone: null,
        emergency_contact_relationship: null,
        updated_at: new Date(),
      },
      select: {
        id: true,
        email: true,
        first_name: true,
        last_name: true,
        phone: true,
        current_address: true,
        gender: true,
        department: true,
        designation: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        updated_at: true,
      },
    });

    return NextResponse.json({ success: true, profile: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Failed to delete emergency contact.' }, { status: 500 });
  }
}
