'use server';

import { getSessionFromCookies } from '@/lib/session';
import { prisma } from '@/lib/prisma';

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
  const session = await getSessionFromCookies();

  if (!session) {
    console.error('[syncUser] No authenticated session found');
    return {
      success: false,
      error: 'Not authenticated. Please sign in.',
      needsSetup: false,
      employee: null,
      company: null,
    };
  }

  try {
    const email = session.email;
    if (!email) {
      console.error('[syncUser] Session has no email address');
      return {
        success: false,
        error: 'No email address found on your account.',
        needsSetup: false,
        employee: null,
        company: null,
      };
    }

    // Check if an employee with this auth_id exists
    let employee = await prisma.employee.findUnique({
      where: { auth_id: session.uid },
      include: { company: true },
    });

    if (!employee) {
      // Also check by email (user might have registered before with different auth provider)
      const existingByEmail = await prisma.employee.findUnique({
        where: { email: email },
        include: { company: true },
      });

      if (existingByEmail) {
        // Migration case: Update auth_id to current Supabase User ID
        employee = await prisma.employee.update({
          where: { email: email },
          data: { auth_id: session.uid },
          include: { company: true },
        });
        console.log(`[syncUser] Migrated user ${email} to auth ID: ${session.uid}`);
      }
    }

    if (!employee) {
      // User authenticated but no Employee record yet
      // They need to go through Company Setup first
      console.log('[syncUser] User needs setup - no Employee record found');
      return {
        success: true,
        needsSetup: true,
        employee: null,
        company: null,
        userEmail: email,
        userName: email.split('@')[0],
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
  const session = await getSessionFromCookies();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const email = session.email;
  if (!email) {
    return { success: false, error: 'No email address found' };
  }

  // Check if user already has an employee record
  const existingEmployee = await prisma.employee.findUnique({
    where: { auth_id: session.uid },
  });

  if (existingEmployee) {
    return {
      success: false,
      error: 'You already have an account. Please refresh the page.',
    };
  }

  try {
    const { randomBytes } = await import('crypto');

    const generateJoinCode = () => randomBytes(4).toString('hex').toUpperCase();

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
    const firstName = input.firstName?.trim() || email.split('@')[0] || 'User';
    const lastName = input.lastName?.trim() || '';

    // Create Company + Employee in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: input.companyName,
          industry: input.industry || null,
          size: input.size || null,
          timezone: input.timezone || undefined,
          sla_hours: input.slaHours ?? 48,
          negative_balance: input.negativeBalance ?? false,
          probation_period_days: input.probationDays ?? 180,
          join_code: joinCode,
          onboarding_completed: false,
        },
      });

      const employee = await tx.employee.create({
        data: {
          auth_id: session.uid,
          email: email,
          first_name: firstName,
          last_name: lastName || 'Admin',
          org_id: company.id,
          primary_role: input.primaryRole || 'admin',
          date_of_joining: new Date(),
          gender: 'other',
          status: 'onboarding',
        },
      });

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
  const session = await getSessionFromCookies();

  if (!session) {
    return { success: false, error: 'Not authenticated' };
  }

  const email = session.email;
  if (!email) {
    return { success: false, error: 'No email address found' };
  }

  const code = (companyCode || '').trim().toUpperCase();
  if (!code) {
    return { success: false, error: 'Company code is required' };
  }

  try {
    const existingByAuth = await prisma.employee.findUnique({ where: { auth_id: session.uid } });
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
        data: { auth_id: session.uid, org_id: company.id, status: 'onboarding' },
      });
      return { success: true, employeeId: updated.id, orgId: updated.org_id };
    }

    const employee = await prisma.employee.create({
      data: {
        auth_id: session.uid,
        email,
        first_name: firstName,
        last_name: lastName || 'Employee',
        org_id: company.id,
        primary_role: 'employee',
        date_of_joining: new Date(),
        gender: 'other',
        // All direct joins require HR approval before activation.
        status: 'onboarding',
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
          emp_id: employee.id,
          company_id: company.id,
          leave_type: lt.code,
          year,
          annual_entitlement: lt.default_quota,
          remaining: lt.default_quota,
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
