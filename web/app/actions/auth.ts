'use server';

import { getCurrentUser, type AuthUser } from '@/lib/auth-service';
import prisma from '@/lib/prisma';
import { randomBytes, randomUUID } from 'crypto';
import { assertValidCompanyTimezone } from '@/lib/api-guards';
import type { Employee, Company } from '@prisma/client';

async function resolveAuthenticatedEmployee(user: AuthUser): Promise<(Employee & { company: Company | null }) | null> {
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

/* =========================================================================
   syncUser - Identity Sync for Onboarding
   =========================================================================

   Checks if the authenticated user (via session JWT) exists in our Employee table.

   RETURNS:
   - success: false, needsSetup: false → Error (not authenticated, etc.)
   - success: true, needsSetup: true → User exists in auth but NOT in
     our database. Frontend should show Company Setup form first.
   - success: true, needsSetup: false → User & Company exist. Returns employee
     data so frontend can continue/complete onboarding.

   NOTE: Employee model REQUIRES org_id (Company). So we can't create an Employee
   without a Company. The actual Company + Employee creation happens via
   createCompanyAndEmployee() after the Company Setup step.
   ========================================================================= */
export async function syncUser() {
  const user = await getCurrentUser();

  if (!user) {
    console.error('[syncUser] No authenticated JWT session found');
    return {
      success: false,
      error: 'Not authenticated. Please sign in.',
      needsSetup: false,
      employee: null,
      company: null,
    };
  }

  try {
    const email = user.email;
    if (!email) {
      console.error('[syncUser] Auth user has no email address');
      return {
        success: false,
        error: 'No email address found on your account.',
        needsSetup: false,
        employee: null,
        company: null,
      };
    }

    const employee = await resolveAuthenticatedEmployee(user);

    if (!employee) {
      console.log('[syncUser] User needs setup - no Employee record found');
      return {
        success: true,
        needsSetup: true,
        employee: null,
        company: null,
        userEmail: email,
        userName: user.firstName || email.split('@')[0],
      };
    }

    // User exists - check onboarding status
    return {
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
      company: employee.company ? {
        id: employee.company.id,
        name: employee.company.name,
        onboardingCompleted: employee.company.onboarding_completed,
        joinCode: employee.company.join_code,
      } : null,
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string; meta?: { target?: string[] } };
    console.error('[syncUser] Database error:', err?.message || error);

    if (err?.code === 'P2002') {
      const field = err?.meta?.target?.[0] || 'unknown';
      return {
        success: false,
        error: `A duplicate ${field} exists. Please contact support.`,
        needsSetup: false,
        employee: null,
        company: null,
      };
    }
    if (err?.code === 'P1001' || err?.code === 'P1002') {
      return {
        success: false,
        error: 'Database connection issue. Please try again.',
        needsSetup: false,
        employee: null,
        company: null,
      };
    }

    return {
      success: false,
      error: `Failed to load profile: ${err?.message || 'Unknown error'}`,
      needsSetup: false,
      employee: null,
      company: null,
    };
  }
}

/* =========================================================================
   createCompanyAndEmployee - Creates Company + Employee in one transaction
   =========================================================================

   Called from Company Setup step of onboarding. Creates minimal records:
   - Company (with name, industry, size, timezone, settings)
   - Employee (as admin, linked to company)

   Leave Types, Holidays, and other settings are created in subsequent steps.
   This is intentionally LIGHTWEIGHT to avoid memory/timeout issues.
   ========================================================================= */
interface CreateCompanyInput {
  companyName: string;
  industry?: string;
  size?: string;
  timezone?: string;
  slaHours?: number;
  negativeBalance?: boolean;
  probationDays?: number;
  primaryRole?: 'admin' | 'hr';
  firstName?: string;
  lastName?: string;
}

export async function createCompanyAndEmployee(input: CreateCompanyInput) {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated. Please sign in.' };
  }

  const email = user.email;
  if (!email) {
    return { success: false, error: 'No email address found' };
  }

  const existingEmployee = await resolveAuthenticatedEmployee(user);

  // If employee already has a company, redirect them — don't re-create
  if (existingEmployee?.org_id) {
    const onboardingDone = existingEmployee.company?.onboarding_completed;
    return {
      success: false,
      alreadySetup: true,
      onboardingCompleted: !!onboardingDone,
      companyId: existingEmployee.org_id,
      error: onboardingDone
        ? 'Your company is already set up.'
        : 'You already have a company in progress. Resuming setup.',
    };
  }

  try {
    const generateJoinCode = () => randomBytes(4).toString('hex').toUpperCase();
    const normalizedTimezone =
      input.timezone && input.timezone.trim().length > 0
        ? assertValidCompanyTimezone(input.timezone)
        : undefined;

    let joinCode = generateJoinCode();
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    while (attempts < MAX_ATTEMPTS) {
      const existing = await prisma.company.findUnique({ where: { join_code: joinCode } });
      if (!existing) break;
      joinCode = generateJoinCode();
      attempts++;
    }

    if (attempts >= MAX_ATTEMPTS) {
      return {
        success: false,
        error: 'Unable to generate unique company code. Please try again.',
      };
    }

    // Use provided names from sign-up form, fallback to email prefix
    const firstName = input.firstName?.trim() || existingEmployee?.first_name || email.split('@')[0] || 'User';
    const lastName = input.lastName?.trim() || existingEmployee?.last_name || '';

    // Create Company + Employee in a transaction
    // If employee record already exists without a company, link it instead of creating new
    const result = await prisma.$transaction(async (tx) => {
      const now = new Date();
      const company = await tx.company.create({
        data: {
          id: randomUUID(),
          name: input.companyName,
          industry: input.industry || null,
          size: input.size || null,
          timezone: normalizedTimezone,
          sla_hours: input.slaHours ?? 48,
          negative_balance: input.negativeBalance ?? false,
          probation_period_days: input.probationDays ?? 180,
          join_code: joinCode,
          onboarding_completed: false,
          updated_at: now,
        },
      });

      let employee;
      if (existingEmployee) {
        // Link existing employee record to the new company
        employee = await tx.employee.update({
          where: { id: existingEmployee.id },
          data: {
            org_id: company.id,
            auth_id: user.id,
            primary_role: input.primaryRole || existingEmployee.primary_role || 'admin',
            status: 'onboarding',
            updated_at: now,
          },
        });
      } else {
        employee = await tx.employee.create({
          data: {
            id: randomUUID(),
            auth_id: user.id,
            email: email,
            first_name: firstName,
            last_name: lastName || 'Admin',
            org_id: company.id,
            primary_role: input.primaryRole || 'admin',
            date_of_joining: new Date(),
            gender: 'other',
            status: 'onboarding',
            updated_at: now,
          },
        });
      }

      return { company, employee };
    });

    console.log(`[createCompanyAndEmployee] Created company ${result.company.id} and employee ${result.employee.id}`);

    return {
      success: true,
      company: {
        id: result.company.id,
        name: result.company.name,
        joinCode: result.company.join_code,
      },
      employee: {
        id: result.employee.id,
        email: result.employee.email,
      },
    };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('[createCompanyAndEmployee] Error:', err?.message || error);

    if (err?.code === 'P2002') {
      return { success: false, error: 'This email is already registered.' };
    }

    return {
      success: false,
      error: `Failed to create company: ${err?.message || 'Unknown error'}`,
    };
  }
}

/* =========================================================================
   joinCompanyAsEmployee - Joins an existing company by join code
   =========================================================================

   Creates an Employee record linked to an existing Company (join_code).
   Keeps the operation lightweight and idempotent.
   ========================================================================= */
export async function joinCompanyAsEmployee(companyCode: string) {
  const user = await getCurrentUser();

  if (!user) {
    return { success: false, error: 'Not authenticated. Please sign in.' };
  }

  const email = user.email;
  if (!email) {
    return { success: false, error: 'No email address found' };
  }

  const code = (companyCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false, error: 'Company code is required' };
  }

  try {
    const existingByAuth = await resolveAuthenticatedEmployee(user);
    if (existingByAuth) {
      return { success: true, employeeId: existingByAuth.id, orgId: existingByAuth.org_id };
    }

    const company = await prisma.company.findUnique({
      where: { join_code: code },
      select: { id: true, onboarding_completed: true, leave_types: { where: { is_active: true } } },
    });

    if (!company) {
      return { success: false, error: 'Invalid company code' };
    }

    const firstName = email.split('@')[0] || 'User';
    const lastName = '';

    const existingByEmail = await prisma.employee.findUnique({ where: { email } });
    if (existingByEmail) {
      const updated = await prisma.employee.update({
        where: { email },
        data: { auth_id: user.id, org_id: company.id, status: 'onboarding' },
      });
      return { success: true, employeeId: updated.id, orgId: updated.org_id };
    }

    const employee = await prisma.employee.create({
      data: {
        id: randomUUID(),
        auth_id: user.id,
        email,
        first_name: firstName,
        last_name: lastName || 'Employee',
        org_id: company.id,
        primary_role: 'employee',
        date_of_joining: new Date(),
        gender: 'other',
        // All direct joins require HR approval before activation.
        status: 'onboarding',
        updated_at: new Date(),
      },
    });

    // Seed leave balances from company's active leave types
    if (company.leave_types && company.leave_types.length > 0) {
      const year = new Date().getFullYear();
      const balanceInserts = company.leave_types
        .filter((lt) => {
          const genderFilter = (lt as { gender_specific?: string }).gender_specific;
          if (!genderFilter || genderFilter === 'all') return true;
          return true;
        })
        .map((lt) => ({
          id: randomUUID(),
          emp_id: employee.id,
          company_id: company.id,
          leave_type: lt.code,
          year,
          annual_entitlement: lt.default_quota,
          remaining: lt.default_quota,
          updated_at: new Date(),
        }));
      if (balanceInserts.length > 0) {
        await prisma.leaveBalance.createMany({ data: balanceInserts });
      }
    }

    return { success: true, employeeId: employee.id, orgId: employee.org_id };
  } catch (error: unknown) {
    const err = error as { message?: string; code?: string };
    console.error('[joinCompanyAsEmployee] Error:', err?.message || error);
    if (err?.code === 'P2002') {
      return { success: false, error: 'This email is already registered.' };
    }
    return { success: false, error: `Failed to join company: ${err?.message || 'Unknown error'}` };
  }
}
