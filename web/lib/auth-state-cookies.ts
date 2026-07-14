import type { NextResponse } from 'next/server';
import {
  COOKIE_EMAIL_VERIFIED,
  COOKIE_EMP_ONBOARDING,
  COOKIE_EMP_WELCOME,
  COOKIE_ONBOARDING,
  COOKIE_ROLE,
  COOKIE_ROLES,
} from '@/lib/brand';
import { setModuleHintCookies } from '@/lib/auth-module-cookies';
import { getAuthModulePayload } from '@/lib/core-functions/resolve';
import type { AuthModulePayload } from '@/lib/core-functions/types';
import {
  isEmployeeOnboardingComplete,
  requiresCompanyOnboarding,
  requiresEmployeeOnboarding,
} from '@/lib/employee-onboarding';
import { isEmailVerified } from '@/lib/product-readiness';
import prisma from '@/lib/prisma';

const cookieOpts = {
  path: '/',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24,
  httpOnly: true,
};

export type EmployeeOnboardingProfile = {
  phone?: string | null;
  current_address?: string | null;
  tutorial_completed?: boolean | null;
};

export function setAuthRoleCookies(
  response: NextResponse,
  primaryRole: string,
  allRoles: string[]
): void {
  response.cookies.set(COOKIE_ROLE, primaryRole, cookieOpts);
  response.cookies.set(COOKIE_ROLES, allRoles.join(','), cookieOpts);
}

export function setAuthStateCookies(
  response: NextResponse,
  input: {
    primaryRole: string;
    orgId: string | null;
    companyOnboardingCompleted: boolean;
    employeeProfile?: EmployeeOnboardingProfile | null;
    modulePayload?: AuthModulePayload;
    emailVerified: boolean;
  }
): void {
  response.cookies.set(COOKIE_EMAIL_VERIFIED, input.emailVerified ? '1' : '0', cookieOpts);

  const role = (input.primaryRole || '').toLowerCase();
  const modulePayload =
    input.modulePayload ??
    ({
      enabledModules: [],
      moduleCap: [],
      moduleFeatures: {},
    } satisfies AuthModulePayload);

  const companyOnboardingDone =
    !requiresCompanyOnboarding(role) ||
    (Boolean(input.orgId) && input.companyOnboardingCompleted);

  response.cookies.set(COOKIE_ONBOARDING, companyOnboardingDone ? '1' : '0', cookieOpts);

  let employeeOnboardingDone = true;
  if (requiresEmployeeOnboarding(role)) {
    employeeOnboardingDone = input.employeeProfile
      ? isEmployeeOnboardingComplete(input.employeeProfile)
      : false;
  }

  response.cookies.set(
    COOKIE_EMP_ONBOARDING,
    employeeOnboardingDone ? '1' : '0',
    cookieOpts
  );

  const welcomePending =
    requiresEmployeeOnboarding(role) &&
    employeeOnboardingDone &&
    input.employeeProfile?.tutorial_completed === false;

  response.cookies.set(COOKIE_EMP_WELCOME, welcomePending ? '1' : '0', cookieOpts);

  setModuleHintCookies(
    response,
    modulePayload,
    Boolean(input.orgId) && input.companyOnboardingCompleted
  );
}

export async function hydrateAuthResponseCookies(
  response: NextResponse,
  input: {
    employeeId: string;
    primaryRole: string;
    secondaryRoles?: string[] | null;
    orgId: string | null;
  }
): Promise<void> {
  const allRoles = [input.primaryRole];
  if (Array.isArray(input.secondaryRoles)) {
    for (const role of input.secondaryRoles) {
      if (typeof role === 'string' && role.trim() && !allRoles.includes(role)) {
        allRoles.push(role);
      }
    }
  }

  setAuthRoleCookies(response, input.primaryRole, allRoles);

  if (input.primaryRole === 'super_admin') {
    const modulePayload = await getAuthModulePayload(null);
    setAuthStateCookies(response, {
      primaryRole: input.primaryRole,
      orgId: null,
      companyOnboardingCompleted: true,
      employeeProfile: { tutorial_completed: true },
      modulePayload,
      emailVerified: true,
    });
    return;
  }

  const [company, profile, modulePayload, emailVerified] = await Promise.all([
    input.orgId
      ? prisma.company.findUnique({
          where: { id: input.orgId },
          select: { onboarding_completed: true },
        })
      : Promise.resolve(null),
    prisma.employee.findUnique({
      where: { id: input.employeeId },
      select: {
        phone: true,
        current_address: true,
        tutorial_completed: true,
      },
    }),
    getAuthModulePayload(input.orgId),
    isEmailVerified(input.employeeId),
  ]);

  setAuthStateCookies(response, {
    primaryRole: input.primaryRole,
    orgId: input.orgId,
    companyOnboardingCompleted: company?.onboarding_completed === true,
    employeeProfile: profile,
    modulePayload,
    emailVerified,
  });
}

export function deriveEmployeeOnboardingFlags(
  primaryRole: string,
  profile: EmployeeOnboardingProfile | null | undefined
): {
  employee_onboarding_completed: boolean;
  employee_welcome_pending: boolean;
} {
  const role = (primaryRole || '').toLowerCase();
  if (!requiresEmployeeOnboarding(role)) {
    return {
      employee_onboarding_completed: true,
      employee_welcome_pending: false,
    };
  }

  const completed = profile ? isEmployeeOnboardingComplete(profile) : false;
  return {
    employee_onboarding_completed: completed,
    employee_welcome_pending: completed && profile?.tutorial_completed === false,
  };
}
