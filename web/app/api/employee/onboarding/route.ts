import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';
import {
  isEmployeeOnboardingComplete,
} from '@/lib/employee-onboarding';
import { hydrateAuthResponseCookies } from '@/lib/auth-state-cookies';

export const dynamic = 'force-dynamic';

const cookieOptions = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24,
  httpOnly: true,
};

function normalizeOptional(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'employee.view_own');

    const profile = await prisma.employee.findUnique({
      where: { id: employee.id },
      select: {
        first_name: true,
        last_name: true,
        email: true,
        phone: true,
        gender: true,
        current_address: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        tutorial_completed: true,
      },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Employee record not found.' }, { status: 404 });
    }

    const completed = isEmployeeOnboardingComplete(profile);

    return NextResponse.json({
      success: true,
      profile,
      completed,
      welcome_pending: completed && !profile.tutorial_completed,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Failed to fetch onboarding data.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'employee.view_own');

    const payload = await request.json();
    const firstName = normalizeOptional(payload.firstName);
    const lastName = normalizeOptional(payload.lastName);
    const phone = normalizeOptional(payload.phone);
    const currentAddress = normalizeOptional(payload.currentAddress);
    const emergencyContactName = normalizeOptional(payload.emergencyContactName);
    const emergencyContactPhone = normalizeOptional(payload.emergencyContactPhone);
    const emergencyContactRelationship = normalizeOptional(payload.emergencyContactRelationship);
    const gender = normalizeOptional(payload.gender);

    const missingFields: string[] = [];
    if (!phone) missingFields.push('phone');
    if (!currentAddress) missingFields.push('currentAddress');

    if (missingFields.length > 0) {
      return NextResponse.json(
        {
          error: 'Required employee onboarding fields are missing.',
          missing_fields: missingFields,
        },
        { status: 400 }
      );
    }

    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: {
        first_name: firstName ?? undefined,
        last_name: lastName ?? undefined,
        phone,
        current_address: currentAddress,
        emergency_contact_name: emergencyContactName,
        emergency_contact_phone: emergencyContactPhone,
        emergency_contact_relationship: emergencyContactRelationship,
        gender: (gender as 'male' | 'female' | 'other') ?? undefined,
        status: 'active',
        updated_at: new Date(),
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        current_address: true,
        emergency_contact_name: true,
        emergency_contact_phone: true,
        emergency_contact_relationship: true,
        primary_role: true,
        tutorial_completed: true,
      },
    });

    const completed = isEmployeeOnboardingComplete(updated);
    const response = NextResponse.json({ success: true, completed });

    await hydrateAuthResponseCookies(response, {
      employeeId: updated.id,
      primaryRole: updated.primary_role,
      secondaryRoles: employee.secondary_roles,
      orgId: employee.org_id,
    });

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    return NextResponse.json({ error: 'Failed to save onboarding data.' }, { status: 500 });
  }
}
