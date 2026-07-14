import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword } from '@/lib/password-service';
import { validatePassword } from '@/lib/password-validation';
import { buildAppUrl } from '@/lib/url-origin';
import { createSuperAdminAuditLog } from '@/lib/super-admin-audit';
import { assertValidCompanyTimezone } from '@/lib/api-guards';
import { TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding-step-contract';
import type { Prisma, Role } from '@prisma/client';
import { buildDefaultModuleSeed } from '@/lib/core-functions/resolve';
import { isModuleSlug, type ModuleSlug } from '@/lib/core-functions/catalog';
import { clampEnabledToCap, validateDependencies } from '@/lib/core-functions/validate';

export const dynamic = 'force-dynamic';

const MAX_PAGE_LIMIT = 100;

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unknown error';
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

async function generateUniqueJoinCode(): Promise<string> {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = generateJoinCode();
    const existing = await prisma.company.findUnique({
      where: { join_code: code },
      select: { id: true },
    });

    if (!existing) {
      return code;
    }
  }

  throw new Error('Unable to generate a unique company join code. Please try again.');
}

/**
 * POST /api/super-admin/companies
 * 
 * Creates a new company AND its first user (company owner) by super admin.
 * This is the ONLY way companies are created - no public signup.
 */
export async function POST(request: NextRequest) {
  try {
    // Verify super admin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      // Company info
      companyName,
      legalName,
      industry,
      size,
      countryCode = 'IN',
      timezone = 'Asia/Kolkata',
      
      // Company owner info
      ownerEmail,
      ownerFirstName,
      ownerLastName,
      ownerPhone,
      ownerPassword,
      ownerRole = 'admin', // Default role for company owner
      moduleCap,
      superAdminCap,
      initialEnabledModules,
    } = body;

    const rawCap = Array.isArray(superAdminCap) ? superAdminCap : moduleCap;
    const capSlugs: ModuleSlug[] | undefined = Array.isArray(rawCap)
      ? rawCap.filter((s: unknown): s is ModuleSlug => typeof s === 'string' && isModuleSlug(s))
      : undefined;
    const requestedInitialEnabled: ModuleSlug[] | undefined = Array.isArray(initialEnabledModules)
      ? initialEnabledModules.filter((s: unknown): s is ModuleSlug => typeof s === 'string' && isModuleSlug(s))
      : undefined;
    let normalizedTimezone: string;

    try {
      normalizedTimezone = assertValidCompanyTimezone(timezone);
    } catch (timezoneError) {
      return NextResponse.json(
        {
          error:
            timezoneError instanceof Error
              ? timezoneError.message
              : 'Invalid timezone value.',
        },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!companyName || !ownerEmail || !ownerFirstName || !ownerLastName || !ownerPassword) {
      return NextResponse.json(
        { error: 'Company name, owner email, first name, last name, and password are required' },
        { status: 400 }
      );
    }

    const normalizedCompanyName = asString(companyName);
    const normalizedOwnerEmail = asString(ownerEmail).toLowerCase();
    const normalizedOwnerFirstName = asString(ownerFirstName);
    const normalizedOwnerLastName = asString(ownerLastName);

    if (!normalizedCompanyName || !normalizedOwnerEmail || !normalizedOwnerFirstName || !normalizedOwnerLastName) {
      return NextResponse.json(
        { error: 'Company name, owner email, first name, and last name cannot be blank' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(ownerPassword);
    if (!passwordValidation.valid) {
      return NextResponse.json(
        { error: passwordValidation.errors[0] || 'Owner password does not meet security requirements' },
        { status: 400 }
      );
    }

    const normalizedOwnerRole = asString(ownerRole).toLowerCase() || 'admin';
    const allowedOwnerRoles: Role[] = ['admin', 'hr', 'director', 'manager'];
    if (!allowedOwnerRoles.includes(normalizedOwnerRole as Role)) {
      return NextResponse.json(
        { error: 'Invalid owner role. Use admin, hr, director, or manager.' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.employee.findUnique({
      where: { email: normalizedOwnerEmail },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(ownerPassword);
    const joinCode = await generateUniqueJoinCode();

    // Transaction: Create company, owner, and initialize settings
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          id: crypto.randomUUID(),
          name: normalizedCompanyName,
          legalName: asString(legalName) || null,
          industry: asString(industry) || null,
          size: asString(size) || null,
          country_code: asString(countryCode) || 'IN',
          timezone: normalizedTimezone,
          join_code: joinCode,
          onboarding_completed: false,
          updated_at: new Date(),
        },
      });

      // 2. Create Company Owner
      const owner = await tx.employee.create({
        data: {
          id: crypto.randomUUID(),
          email: normalizedOwnerEmail,
          first_name: normalizedOwnerFirstName,
          last_name: normalizedOwnerLastName,
          phone: asString(ownerPhone) || null,
          org_id: company.id,
          primary_role: normalizedOwnerRole as Role,
          password_hash: passwordHash,
          status: 'onboarding',
          invited_by_type: 'super_admin',
          updated_at: new Date(),
        },
      });

      // 2b. Mark the owner's email as already verified. A super admin issues
      // these credentials directly (and the UI presents them as ready to use),
      // so the owner must not be trapped behind the email-verification wall on
      // first sign-in. Verification state is a used `email_verify` OtpToken row
      // (see getEmailVerificationState / email-verification confirm route).
      await tx.otpToken.create({
        data: {
          id: crypto.randomUUID(),
          emp_id: owner.id,
          company_id: company.id,
          action: 'email_verify',
          code_hash: `super-admin-issued:${crypto.randomUUID()}`,
          expires_at: new Date(),
          is_used: true,
        },
      });

      // 3. Initialize Company Settings with module cap + enabled defaults
      const moduleSeed = buildDefaultModuleSeed(capSlugs);
      if (requestedInitialEnabled) {
        const cap = moduleSeed.super_admin_cap as ModuleSlug[];
        const enabled = clampEnabledToCap(requestedInitialEnabled, cap);
        const dependencyIssues = validateDependencies(enabled);
        if (dependencyIssues.length > 0) {
          throw new Error(`Module dependency validation failed: ${dependencyIssues.map((issue) => issue.message).join('; ')}`);
        }
        moduleSeed.enabled_modules = enabled;
      }
      await tx.companySettings.create({
        data: {
          id: crypto.randomUUID(),
          company_id: company.id,
          hr_alerts: moduleSeed as Prisma.InputJsonValue,
          updated_at: new Date(),
        },
      });

      return { company, owner };
    });

    // Audit log - outside transaction for proper hash chain integrity.
    const audit = await createSuperAdminAuditLog({
      companyId: result.company.id,
      actor: currentUser,
      action: 'company_created',
      entityType: 'company',
      entityId: result.company.id,
      newState: {
        company_name: normalizedCompanyName,
        owner_email: normalizedOwnerEmail,
        created_by: 'super_admin',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    // Return onboarding details without exposing plaintext credentials
    const loginUrl = buildAppUrl('/sign-in', { request });

    return NextResponse.json({
      success: true,
      message: 'Company and owner created successfully',
      company: {
        id: result.company.id,
        name: result.company.name,
        joinCode: result.company.join_code,
        onboardingStatus: 'pending',
      },
      owner: {
        id: result.owner.id,
        email: result.owner.email,
        firstName: result.owner.first_name,
        lastName: result.owner.last_name,
        role: result.owner.primary_role,
        status: result.owner.status,
      },
      credentials: {
        email: normalizedOwnerEmail,
        loginUrl,
        mustChangePassword: false,
        setupRequired: true,
        setup_required: true,
        supportMessage: 'Owner password was set during profile creation. Share credentials via approved secure channel.',
      },
      audit,
      instructions: 'Do not share credentials over API responses. Provide onboarding access via approved secure channel. Owner can sign in immediately and complete onboarding wizard.',
    });
  } catch (error) {
    console.error('[SUPER ADMIN CREATE COMPANY] Error:', error);
    const errorMessage = getErrorMessage(error);
    const prismaCode = getPrismaErrorCode(error);

    if (prismaCode === 'P2002') {
      return NextResponse.json(
        { error: 'A company or user with one of these unique values already exists', details: errorMessage },
        { status: 409 }
      );
    }

    if (errorMessage.startsWith('Module dependency validation failed')) {
      return NextResponse.json(
        { error: errorMessage },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create company', details: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/super-admin/companies
 * 
 * Lists all companies with basic stats.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify super admin
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedPage = Number.parseInt(searchParams.get('page') || '1', 10);
    const requestedLimit = Number.parseInt(searchParams.get('limit') || '20', 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const limit = Number.isFinite(requestedLimit)
      ? Math.min(Math.max(requestedLimit, 1), MAX_PAGE_LIMIT)
      : 20;
    const search = (searchParams.get('search') || '').trim();
    const status = searchParams.get('status') || 'all';

    const skip = (page - 1) * limit;

    // Build where clause
    const where: Prisma.CompanyWhereInput = {
      deleted_at: null,
    };
    const andFilters: Prisma.CompanyWhereInput[] = [];

    if (search) {
      andFilters.push({
        OR: [
        { name: { contains: search, mode: 'insensitive' } },
          { legalName: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    if (status === 'pending') {
      andFilters.push({ onboarding_completed: false, onboarding_step: 0 });
    } else if (status === 'in_progress') {
      andFilters.push({
        onboarding_completed: false,
        onboarding_step: { gt: 0, lt: TOTAL_ONBOARDING_STEPS },
      });
    } else if (status === 'completed') {
      andFilters.push({
        OR: [
          { onboarding_completed: true },
          { onboarding_step: { gte: TOTAL_ONBOARDING_STEPS } },
        ],
      });
    } else if (status !== 'all') {
      return NextResponse.json(
        { error: 'Invalid status filter' },
        { status: 400 }
      );
    }

    if (andFilters.length > 0) {
      where.AND = andFilters;
    }

    // Fetch companies with employee count
    const [companies, total] = await Promise.all([
      prisma.company.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: 'desc' },
        include: {
          _count: {
            select: {
              employees: true,
              leave_requests: true,
              attendances: true,
            },
          },
          employees: {
            where: {
              invited_by_type: 'super_admin',
            },
            orderBy: { created_at: 'asc' },
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              primary_role: true,
              status: true,
              created_at: true,
            },
            take: 1,
          },
        },
      }),
      prisma.company.count({ where }),
    ]);

    const companiesWithStats = companies.map(company => {
      // Determine onboarding status based on step
      let onboardingStatus = 'pending';
      if (company.onboarding_step > 0 && company.onboarding_step < TOTAL_ONBOARDING_STEPS) {
        onboardingStatus = 'in_progress';
      } else if (company.onboarding_step >= TOTAL_ONBOARDING_STEPS || company.onboarding_completed) {
        onboardingStatus = 'completed';
      }

      return {
        id: company.id,
        name: company.name,
        legalName: company.legalName || company.name,
        industry: company.industry,
        size: company.size,
        countryCode: company.country_code,
        timezone: company.timezone,
        joinCode: company.join_code,
        onboardingCompleted: company.onboarding_completed,
        onboardingStatus, // 'pending' | 'in_progress' | 'completed'
        onboardingStep: company.onboarding_step || 0,
        createdAt: company.created_at,
        updatedAt: company.updated_at,
        stats: {
          totalEmployees: company._count.employees,
          totalLeaveRequests: company._count.leave_requests,
          totalAttendances: company._count.attendances,
        },
        owner: company.employees[0] || null,
      };
    });

    return NextResponse.json({
      companies: companiesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('[SUPER ADMIN LIST COMPANIES] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  }
}

/**
 * Helper function to generate unique join code
 */
function generateJoinCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
