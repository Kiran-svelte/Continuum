import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import {
  auditSuperAdminMetadata,
  resolveAuditActorId,
  safeCreateAuditLog,
} from '@/lib/audit';
import { assertValidCompanyTimezone } from '@/lib/api-guards';
import { TOTAL_ONBOARDING_STEPS } from '@/lib/onboarding-step-contract';
import { purgeCompanyById } from '@/lib/tenancy/purge-company';

export const dynamic = 'force-dynamic';

/**
 * GET /api/super-admin/companies/[id]
 * 
 * Get detailed information about a specific company.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = await params;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
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
            OR: [
              { invited_by_type: 'super_admin' },
              { primary_role: 'admin' },
            ],
          },
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            primary_role: true,
            status: true,
            last_login_at: true,
          },
          take: 1,
        },
        subscriptions: {
          where: {
            status: { in: ['active', 'trial'] },
          },
          orderBy: { created_at: 'desc' },
          take: 1,
        },
        settings: true,
        audit_logs: {
          orderBy: { created_at: 'desc' },
          take: 10,
          include: {
            actor: {
              select: {
                email: true,
                first_name: true,
                last_name: true,
              },
            },
          },
        },
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Get additional stats
    const [pendingRequests, activeUsers] = await Promise.all([
      prisma.leaveRequest.count({
        where: {
          company_id: companyId,
          status: 'pending',
        },
      }),
      prisma.employee.count({
        where: {
          org_id: companyId,
          status: 'active',
        },
      }),
    ]);

    const owner = company.employees[0] || null;
    const subscription = company.subscriptions[0] || null;

    // Determine onboarding status based on step
    let onboardingStatus = 'pending';
    if (company.onboarding_step > 0 && company.onboarding_step < TOTAL_ONBOARDING_STEPS) {
      onboardingStatus = 'in_progress';
    } else if (company.onboarding_step >= TOTAL_ONBOARDING_STEPS || company.onboarding_completed) {
      onboardingStatus = 'completed';
    }

    const response = {
      company: {
        id: company.id,
        name: company.name,
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
          pendingRequests,
          activeUsers,
        },
        owner: owner
          ? {
              id: owner.id,
              email: owner.email,
              firstName: owner.first_name,
              lastName: owner.last_name,
              role: owner.primary_role,
              status: owner.status,
              lastLoginAt: owner.last_login_at,
            }
          : null,
        subscription: subscription
          ? {
              plan: subscription.plan,
              status: subscription.status,
              currentPeriodEnd: subscription.current_period_end,
            }
          : null,
        settings: company.settings
          ? {
              customHolidays: company.settings.custom_holidays,
              emailNotifications: company.settings.email_notifications,
            }
          : null,
        recentActivity: company.audit_logs.map((log) => ({
          id: log.id,
          action: log.action,
          entityType: log.entity_type,
          createdAt: log.created_at,
          actor: log.actor
            ? {
                email: log.actor.email,
                name: `${log.actor.first_name} ${log.actor.last_name}`,
              }
            : null,
        })),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[SUPER ADMIN GET COMPANY] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company details' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/companies/[id]
 * 
 * Update company details.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = await params;
    const body = await request.json();

    const {
      name,
      legalName,
      industry,
      size,
      countryCode,
      timezone,
      domain,
    } = body;
    let normalizedTimezone: string | undefined;

    if (timezone !== undefined) {
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
    }

    const company = await prisma.company.update({
      where: { id: companyId },
      data: {
        ...(name !== undefined && { name }),
        ...(legalName !== undefined && { legalName }),
        ...(industry !== undefined && { industry }),
        ...(size !== undefined && { size }),
        ...(countryCode !== undefined && { country_code: countryCode }),
        ...(normalizedTimezone !== undefined && { timezone: normalizedTimezone }),
        ...(domain !== undefined && { domain }),
        updated_at: new Date(),
      },
    });

    // Audit log
    await safeCreateAuditLog({
      companyId,
      actorId: resolveAuditActorId(currentUser),
      action: 'company_updated',
      entityType: 'company',
      entityId: companyId,
      newState: { ...body, ...auditSuperAdminMetadata(currentUser) },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      company: {
        id: company.id,
        name: company.name,
      },
    });
  } catch (error) {
    console.error('[SUPER ADMIN UPDATE COMPANY] Error:', error);
    return NextResponse.json(
      { error: 'Failed to update company' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/companies/[id]
 *
 * Permanently deletes a company and all tenant data (Prisma cascades).
 * Idempotent: returns success when the company record no longer exists.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = await params;

    const existing = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, deleted_at: true },
    });

    if (!existing) {
      return NextResponse.json({
        success: true,
        message: 'Company already deleted',
      });
    }

    await safeCreateAuditLog({
      companyId,
      actorId: resolveAuditActorId(currentUser),
      action: 'company_deleted',
      entityType: 'company',
      entityId: companyId,
      previousState: {
        name: existing.name,
        deleted_at: existing.deleted_at?.toISOString() ?? null,
      },
      newState: {
        purge: true,
        ...auditSuperAdminMetadata(currentUser),
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    const result = await purgeCompanyById(companyId);

    if (result.alreadyGone) {
      return NextResponse.json({
        success: true,
        message: 'Company already deleted',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Company and all associated data deleted permanently',
    });
  } catch (error) {
    console.error('[SUPER ADMIN DELETE COMPANY] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete company' },
      { status: 500 }
    );
  }
}
