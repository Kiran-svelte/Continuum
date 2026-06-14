import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { validateTenantAccess } from '@/lib/tenant-service';
import { createAuditLog } from '@/lib/audit';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { readRoleQuotaMap, sanitizeLeaveTypeCode, sanitizeRoleSlug, toJsonRecord } from '@/lib/onboarding-runtime-config';

export const dynamic = 'force-dynamic';

const quotaSchema = z.object({
  leaveTypeId: z.string().min(1),
  roleId: z.string().optional(),
  annualQuota: z.number().min(0),
  accrualType: z.enum(['yearly', 'monthly', 'quarterly', 'none']),
  accrualRate: z.number().min(0).optional(),
  proRataEnabled: z.boolean().default(true),
  carryForwardEnabled: z.boolean().default(false),
  maxCarryForward: z.number().min(0).default(0),
});

/**
 * GET /api/company/quotas
 * List all leave quotas (global and role-specific)
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const companyId = user.orgId;
    await validateTenantAccess(companyId);

    const leaveTypes = await prisma.leaveType.findMany({
      where: { company_id: companyId, deleted_at: null },
      orderBy: [{ code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        default_quota: true,
        carry_forward: true,
        max_carry_forward: true,
      },
    });

    const [companyRoles, settings] = await Promise.all([
      prisma.companyRole.findMany({
        where: { company_id: companyId, is_active: true },
        select: { id: true, slug: true, name: true },
      }),
      prisma.companySettings.findUnique({
        where: { company_id: companyId },
        select: { hr_alerts: true },
      }),
    ]);

    const roleQuotaMap = readRoleQuotaMap(settings?.hr_alerts);

    const grouped = leaveTypes.map((leaveType) => {
      const leaveCode = sanitizeLeaveTypeCode(leaveType.code);
      const roleQuotas = companyRoles
        .map((role) => {
          const normalizedRole = sanitizeRoleSlug(role.slug);
          const roleQuota = roleQuotaMap[normalizedRole]?.[leaveCode];
          if (typeof roleQuota !== 'number') {
            return null;
          }

          return {
            id: `${leaveType.id}:${role.id}`,
            role: { id: role.id, slug: role.slug, name: role.name },
            annualQuota: roleQuota,
            accrualType: 'yearly',
            accrualRate: null,
            proRataEnabled: true,
            carryForwardEnabled: leaveType.carry_forward,
            maxCarryForward: leaveType.max_carry_forward,
          };
        })
        .filter(Boolean);

      return {
        leaveType: {
          id: leaveType.id,
          code: leaveType.code,
          name: leaveType.name,
          category: leaveType.category,
        },
        quotas: [
          {
            id: leaveType.id,
            role: null,
            annualQuota: leaveType.default_quota,
            accrualType: 'yearly',
            accrualRate: null,
            proRataEnabled: true,
            carryForwardEnabled: leaveType.carry_forward,
            maxCarryForward: leaveType.max_carry_forward,
          },
          ...roleQuotas,
        ],
      };
    });

    return NextResponse.json({
      quotas: grouped,
      total: leaveTypes.length,
    });
  } catch (error) {
    console.error('[GET QUOTAS] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotas' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/company/quotas
 * Create or update leave quota
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    
    if (!user || !user.orgId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const companyId = user.orgId;
    await validateTenantAccess(companyId);

    const body = await request.json();
    const data = quotaSchema.parse(body);

    // Verify leave type exists
    const leaveType = await prisma.leaveType.findFirst({
      where: {
        id: data.leaveTypeId,
        company_id: companyId,
        deleted_at: null,
      },
    });

    if (!leaveType) {
      return NextResponse.json(
        { error: 'Leave type not found' },
        { status: 404 }
      );
    }

    let quota: {
      id: string;
      code: string;
      name: string;
      default_quota: number;
    };
    let rolePayload: { id: string; slug: string; name: string } | null = null;

    if (data.roleId) {
      const companyRole = await prisma.companyRole.findFirst({
        where: {
          id: data.roleId,
          company_id: companyId,
          is_active: true,
        },
        select: { id: true, slug: true, name: true },
      });

      if (!companyRole) {
        return NextResponse.json({ error: 'Role not found' }, { status: 404 });
      }

      const settings = await prisma.companySettings.findUnique({
        where: { company_id: companyId },
        select: { hr_alerts: true },
      });

      const hrAlerts = toJsonRecord(settings?.hr_alerts);
      const roleQuotaMap = readRoleQuotaMap(hrAlerts);
      const roleSlug = sanitizeRoleSlug(companyRole.slug);
      const leaveCode = sanitizeLeaveTypeCode(leaveType.code);
      if (!roleQuotaMap[roleSlug]) {
        roleQuotaMap[roleSlug] = {};
      }
      roleQuotaMap[roleSlug][leaveCode] = data.annualQuota;

      const nextHrAlerts = {
        ...hrAlerts,
        role_quotas: roleQuotaMap,
      };

      await prisma.companySettings.upsert({
        where: { company_id: companyId },
        create: {
          id: randomUUID(),
          company_id: companyId,
          hr_alerts: nextHrAlerts,
          updated_at: new Date(),
        },
        update: {
          hr_alerts: nextHrAlerts,
          updated_at: new Date(),
        },
      });

      quota = {
        id: leaveType.id,
        code: leaveType.code,
        name: leaveType.name,
        default_quota: leaveType.default_quota,
      };
      rolePayload = companyRole;
    } else {
      quota = await prisma.leaveType.update({
        where: { id: leaveType.id },
        data: {
          default_quota: data.annualQuota,
          carry_forward: data.carryForwardEnabled,
          max_carry_forward: data.maxCarryForward,
        },
        select: {
          id: true,
          code: true,
          name: true,
          default_quota: true,
        },
      });
    }

    await createAuditLog({
      companyId,
      actorId: user.id,
      action: 'quota_updated',
      entityType: 'leave_type',
      entityId: leaveType.id,
      newState: {
        leave_type: leaveType.name,
        role_id: rolePayload?.id ?? null,
        role_slug: rolePayload?.slug ?? null,
        annual_quota: data.annualQuota,
        accrual_type: data.accrualType,
        accrual_rate: data.accrualRate || 0,
        pro_rata_enabled: data.proRataEnabled,
        carry_forward_enabled: data.carryForwardEnabled,
        max_carry_forward: data.maxCarryForward,
      },
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
      userAgent: request.headers.get('user-agent'),
    });

    return NextResponse.json({
      success: true,
      quota: {
        id: quota.id,
        leaveType: {
          id: quota.id,
          code: quota.code,
          name: quota.name,
        },
        role: rolePayload,
        annualQuota: quota.default_quota,
        accrualType: data.accrualType,
      },
    }, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('[CREATE/UPDATE QUOTA] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create/update quota' },
      { status: 500 }
    );
  }
}


