import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { hashPassword } from '@/lib/password-service';
import { validatePassword } from '@/lib/password-validation';
import { buildAppUrl } from '@/lib/url-origin';
import { createAuditLog } from '@/lib/audit';
import { assertValidCompanyTimezone } from '@/lib/api-guards';
import { TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding-step-contract';
import type { Prisma, Role } from '@prisma/client';
import { buildDefaultModuleSeed } from '@/lib/core-functions/resolve';
import { isModuleSlug, type ModuleSlug } from '@/lib/core-functions/catalog';
import { clampEnabledToCap, validateDependencies } from '@/lib/core-functions/validate';

export const dynamic = 'force-dynamic';

function jsonNoStore(body: unknown, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function statusCondition(status: string): Prisma.CompanyWhereInput | null {
  if (status === 'pending') {
    return { onboarding_completed: false, onboarding_step: 0 };
  }
  if (status === 'in_progress') {
    return {
      onboarding_completed: false,
      onboarding_step: { gt: 0, lt: TOTAL_ONBOARDING_STEPS },
    };
  }
  if (status === 'completed') {
    return {
      OR: [
        { onboarding_completed: true },
        { onboarding_step: { gte: TOTAL_ONBOARDING_STEPS } },
      ],
    };
  }
  return null;
}

function withStatus(base: Prisma.CompanyWhereInput, status: string): Prisma.CompanyWhereInput {
  const condition = statusCondition(status);
  return condition ? { AND: [base, condition] } : base;
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
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      // Company info
      companyName,
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
      return jsonNoStore(
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
      return jsonNoStore(
        { error: 'Company name, owner email, first name, last name, and password are required' },
        { status: 400 }
      );
    }

    const passwordValidation = validatePassword(ownerPassword);
    if (!passwordValidation.valid) {
      return jsonNoStore(
        { error: passwordValidation.errors[0] || 'Owner password does not meet security requirements' },
        { status: 400 }
      );
    }

    // Check if email already exists
    const existingUser = await prisma.employee.findUnique({
      where: { email: ownerEmail.toLowerCase() },
    });

    if (existingUser) {
      return jsonNoStore(
        { error: 'A user with this email already exists' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(ownerPassword);
    const joinCode = generateJoinCode();

    // Transaction: Create company, owner, and initialize settings
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create Company
      const company = await tx.company.create({
        data: {
          id: crypto.randomUUID(),
          name: companyName,
          industry,
          size,
          country_code: countryCode,
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
          email: ownerEmail.toLowerCase(),
          first_name: ownerFirstName,
          last_name: ownerLastName,
          phone: ownerPhone,
          org_id: company.id,
          primary_role: ownerRole as Role,
          password_hash: passwordHash,
          status: 'onboarding',
          invited_by_id: currentUser.id,
          invited_by_type: 'super_admin',
          updated_at: new Date(),
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

    // Audit log - outside transaction for proper hash chain integrity
    await createAuditLog({
      companyId: result.company.id,
      actorId: currentUser.id,
      action: 'company_created',
      entityType: 'company',
      entityId: result.company.id,
      newState: {
        company_name: companyName,
        owner_email: ownerEmail,
        created_by: 'super_admin',
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    // Return onboarding details without exposing plaintext credentials
    const loginUrl = buildAppUrl('/sign-in', { request });

    return jsonNoStore({
      success: true,
      message: 'Company and owner created successfully',
      company: {
        id: result.company.id,
        name: result.company.name,
        joinCode: result.company.join_code,
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
        email: ownerEmail.toLowerCase(),
        loginUrl,
        mustChangePassword: false,
        setupRequired: true,
        supportMessage: 'Owner password was set during profile creation. Share credentials via approved secure channel.',
      },
      instructions: 'Do not share credentials over API responses. Provide onboarding access via approved secure channel. Owner can sign in immediately and complete onboarding wizard.',
    });
  } catch (error) {
    console.error('[SUPER ADMIN CREATE COMPANY] Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return jsonNoStore(
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
      return jsonNoStore({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, Number.parseInt(searchParams.get('page') || '1', 10) || 1);
    const limit = Math.min(100, Math.max(1, Number.parseInt(searchParams.get('limit') || '20', 10) || 20));
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';

    const skip = (page - 1) * limit;

    // Build where clause
    const baseWhere: Prisma.CompanyWhereInput = {
      deleted_at: null,
    };

    if (search) {
      baseWhere.OR = [
        { name: { contains: search, mode: 'insensitive' } },
      ];
    }

    const where = withStatus(baseWhere, status);
    const pendingWhere = withStatus(baseWhere, 'pending');
    const inProgressWhere = withStatus(baseWhere, 'in_progress');
    const completedWhere = withStatus(baseWhere, 'completed');

    // Fetch companies with employee count
    const [companies, total, pending, inProgress, completed] = await Promise.all([
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
      prisma.company.count({ where: pendingWhere }),
      prisma.company.count({ where: inProgressWhere }),
      prisma.company.count({ where: completedWhere }),
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
        legalName: company.name, // Use name as legal name if not different
        industry: company.industry,
        size: company.size,
        countryCode: company.country_code,
        timezone: company.timezone,
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

    return jsonNoStore({
      companies: companiesWithStats,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        total,
        pending,
        inProgress,
        completed,
      },
    });
  } catch (error) {
    console.error('[SUPER ADMIN LIST COMPANIES] Error:', error);
    return jsonNoStore(
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
  const values = new Uint8Array(8);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => chars[value % chars.length]).join('');
}
