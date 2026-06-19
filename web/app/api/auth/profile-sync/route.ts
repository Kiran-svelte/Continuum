import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth-service';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

async function resolveAuthenticatedEmployee(user: {
  id: string;
  email: string;
  firstName: string;
}) {
  let employee = await prisma.employee.findUnique({
    where: { id: user.id },
    include: { company: true },
  });

  if (!employee && user.email) {
    employee = await prisma.employee.findUnique({
      where: { email: user.email },
      include: { company: true },
    });

    if (employee && !employee.auth_id) {
      employee = await prisma.employee.update({
        where: { id: employee.id },
        data: { auth_id: user.id },
        include: { company: true },
      });
    }
  }

  return employee;
}

/**
 * GET /api/auth/profile-sync
 *
 * Cookie-backed profile sync for onboarding flows.
 * Mirrors syncUser server action semantics without Server Action cookie edge cases.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated. Please sign in.', needsSetup: false, employee: null, company: null },
        { status: 401 }
      );
    }

    if (user.role === 'super_admin') {
      return NextResponse.json({ success: true, needsSetup: false, isSuperAdmin: true, employee: null, company: null });
    }

    const email = user.email;
    if (!email) {
      return NextResponse.json(
        { success: false, error: 'No email address found on your account.', needsSetup: false, employee: null, company: null },
        { status: 400 }
      );
    }

    const employee = await resolveAuthenticatedEmployee({ id: user.id, email, firstName: user.firstName });

    if (!employee) {
      return NextResponse.json({
        success: true,
        needsSetup: true,
        employee: null,
        company: null,
        userEmail: email,
        userName: user.firstName || email.split('@')[0],
      });
    }

    return NextResponse.json({
      success: true,
      needsSetup: false,
      employee: {
        id: employee.id,
        email: employee.email,
        firstName: employee.first_name,
        lastName: employee.last_name,
        primaryRole: employee.primary_role,
        department: employee.department,
        status: employee.status,
      },
      company: employee.company
        ? {
            id: employee.company.id,
            name: employee.company.name,
            onboardingCompleted: employee.company.onboarding_completed,
            joinCode: employee.company.join_code,
          }
        : null,
    });
  } catch (error) {
    console.error('[GET /api/auth/profile-sync] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json(
      { success: false, error: 'Internal server error', needsSetup: false, employee: null, company: null },
      { status: 500 }
    );
  }
}
