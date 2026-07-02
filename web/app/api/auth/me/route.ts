import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import {
  deriveEmployeeOnboardingFlags,
  hydrateAuthResponseCookies,
} from '@/lib/auth-state-cookies';
import { getAuthModulePayload } from '@/lib/core-functions/resolve';
import {
  extractEmailVerificationState,
  getEmailVerificationState,
} from '@/lib/product-readiness';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

function buildRolesList(primaryRole?: string | null, secondaryRoles?: unknown): string[] {
  const roles = new Set<string>();
  if (typeof primaryRole === 'string' && primaryRole.trim()) {
    roles.add(primaryRole.trim());
  }
  if (Array.isArray(secondaryRoles)) {
    for (const role of secondaryRoles) {
      if (typeof role === 'string' && role.trim()) {
        roles.add(role.trim());
      }
    }
  }
  return Array.from(roles);
}

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's basic profile, role, and company info.
 * Supports both regular employees and super admins.
 * Used by the client to perform role-based dashboard redirect after sign-in.
 * Includes onboarding_completed flag to gate access.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    if (employee.primary_role === 'super_admin') {
      const modulePayload = await getAuthModulePayload(null);
      const response = NextResponse.json({
        id: employee.id,
        email: employee.email,
        first_name: employee.first_name,
        last_name: employee.last_name,
        primary_role: employee.primary_role,
        secondary_roles: null,
        department: null,
        designation: 'Platform Administrator',
        org_id: null,
        status: 'active',
        timezone: 'Asia/Kolkata',
        company: null,
        is_super_admin: true,
        roles: buildRolesList(employee.primary_role, null),
        email_verification: { verified: true, verifiedAt: null },
        employee_onboarding_completed: true,
        employee_welcome_pending: false,
        enabledModules: modulePayload.enabledModules,
        moduleCap: modulePayload.moduleCap,
        moduleFeatures: modulePayload.moduleFeatures,
      });

      await hydrateAuthResponseCookies(response, {
        employeeId: employee.id,
        primaryRole: employee.primary_role,
        secondaryRoles: null,
        orgId: null,
      });

      return response;
    }

    const [employeeDetails, company, profile, modulePayload, emailVerificationFromToken] = await Promise.all([
      prisma.employee.findUnique({
        where: { id: employee.id },
        select: { designation: true },
      }),
      employee.org_id
        ? prisma.company.findUnique({
            where: { id: employee.org_id },
            select: {
              id: true,
              name: true,
              onboarding_completed: true,
              join_code: true,
              timezone: true,
            },
          })
        : Promise.resolve(null),
      prisma.employee.findUnique({
        where: { id: employee.id },
        select: {
          phone: true,
          current_address: true,
          tutorial_completed: true,
          notification_preferences: true,
        },
      }),
      getAuthModulePayload(employee.org_id),
      getEmailVerificationState(employee.id),
    ]);

    const allRoles = buildRolesList(employee.primary_role, employee.secondary_roles);
    const emailVerificationFromPrefs = extractEmailVerificationState(
      profile?.notification_preferences
    );
    const emailVerification = emailVerificationFromToken.verified
      ? emailVerificationFromToken
      : emailVerificationFromPrefs;

    const onboardingFlags = deriveEmployeeOnboardingFlags(employee.primary_role, profile);

    const response = NextResponse.json({
      id: employee.id,
      email: employee.email,
      first_name: employee.first_name,
      last_name: employee.last_name,
      primary_role: employee.primary_role,
      secondary_roles: employee.secondary_roles,
      roles: allRoles,
      department: employee.department,
      designation: employeeDetails?.designation || null,
      org_id: employee.org_id,
      status: employee.status,
      timezone: company?.timezone || 'Asia/Kolkata',
      company: company
        ? {
            id: company.id,
            name: company.name,
            onboarding_completed: company.onboarding_completed,
            join_code: company.join_code,
            timezone: company.timezone,
          }
        : null,
      employee_onboarding_completed: onboardingFlags.employee_onboarding_completed,
      employee_welcome_pending: onboardingFlags.employee_welcome_pending,
      email_verification: emailVerification,
      enabledModules: modulePayload.enabledModules,
      moduleCap: modulePayload.moduleCap,
      moduleFeatures: modulePayload.moduleFeatures,
    });

    await hydrateAuthResponseCookies(response, {
      employeeId: employee.id,
      primaryRole: employee.primary_role,
      secondaryRoles: employee.secondary_roles,
      orgId: employee.org_id,
    });

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;
    const referrer = request.headers.get('referer') || undefined;

    if (
      referrer &&
      (referrer.includes('/sign-in') || referrer.includes('/sign-up')) &&
      employee.org_id
    ) {
      void createAuditLog({
        companyId: employee.org_id,
        actorId: employee.id,
        action: AUDIT_ACTIONS.LOGIN,
        entityType: 'Employee',
        entityId: employee.id,
        ipAddress: ip,
        userAgent,
        newState: {
          email: employee.email,
          primary_role: employee.primary_role,
          signed_in_at: new Date().toISOString(),
        },
      }).catch(() => {});
    }

    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[AUTH ME] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
