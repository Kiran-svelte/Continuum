/**
 * GET/PUT /api/hr/leave-quotas-by-role
 * Manage default leave quotas per role.
 * Stored in CompanySettings.hr_alerts.role_quota_map JSON.
 *
 * @module api/hr/leave-quotas-by-role
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import type { Role } from '@prisma/client';

export const dynamic = 'force-dynamic';

const quotaEntrySchema = z.object({
  role: z.string().min(1).max(50),
  leaveType: z.string().min(1).max(50),
  quota: z.number().min(0).max(365),
});

const updateSchema = z.object({
  quotas: z.array(quotaEntrySchema).min(1).max(100),
  applyToExisting: z.boolean().default(false),
});

/**
 * GET handler: Fetch current leave quotas by role.
 */
export async function GET(request: NextRequest) {
  try {
    void request;
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'leave.adjust_balance');

    const moduleGuard = await assertModule(employee.org_id!, 'leave');
    if (moduleGuard) return moduleGuard;

    const companyId = employee.org_id!;

    const [settings, leaveTypes, company] = await Promise.all([
      prisma.companySettings.findUnique({
        where: { company_id: companyId },
        select: { hr_alerts: true },
      }),
      prisma.leaveType.findMany({
        where: { company_id: companyId },
        select: { code: true, name: true, default_quota: true },
        orderBy: { name: 'asc' },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { enabled_roles: true },
      }),
    ]);

    const enabledRoles = Array.isArray(company?.enabled_roles)
      ? company.enabled_roles as string[]
      : JSON.parse(String(company?.enabled_roles || '[]'));

    const roleQuotaMap = extractRoleQuotaMap(settings?.hr_alerts);

    return NextResponse.json({
      roleQuotaMap,
      leaveTypes,
      enabledRoles,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[LEAVE QUOTAS BY ROLE GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT handler: Update leave quotas per role.
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'leave.adjust_balance');

    const moduleGuard = await assertModule(employee.org_id!, 'leave');
    if (moduleGuard) return moduleGuard;

    const companyId = employee.org_id!;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { quotas, applyToExisting } = parsed.data;

    const roleQuotaMap: Record<string, Record<string, number>> = {};
    for (const entry of quotas) {
      if (!roleQuotaMap[entry.role]) {
        roleQuotaMap[entry.role] = {};
      }
      roleQuotaMap[entry.role][entry.leaveType] = entry.quota;
    }

    const currentSettings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });
    const previousQuotas = extractRoleQuotaMap(currentSettings?.hr_alerts);

    // Store in hr_alerts JSON alongside other config
    const existingAlerts = (currentSettings?.hr_alerts as Record<string, unknown>) || {};
    const updatedAlerts = { ...existingAlerts, role_quota_map: roleQuotaMap };

    await prisma.companySettings.upsert({
      where: { company_id: companyId },
      create: {
        id: crypto.randomUUID(),
        company_id: companyId,
        hr_alerts: JSON.parse(JSON.stringify(updatedAlerts)),
        updated_at: new Date(),
      },
      update: {
        hr_alerts: JSON.parse(JSON.stringify(updatedAlerts)),
        updated_at: new Date(),
      },
    });

    let appliedCount = 0;

    if (applyToExisting) {
      const currentYear = new Date().getFullYear();

      for (const [role, typeQuotas] of Object.entries(roleQuotaMap)) {
        const employeesWithRole = await prisma.employee.findMany({
          where: {
            org_id: companyId,
            primary_role: role as Role,
            deleted_at: null,
            status: { not: 'terminated' },
          },
          select: { id: true },
        });

        for (const emp of employeesWithRole) {
          for (const [leaveType, quota] of Object.entries(typeQuotas)) {
            const existing = await prisma.leaveBalance.findFirst({
              where: { emp_id: emp.id, leave_type: leaveType, year: currentYear },
            });

            if (existing) {
              const diff = quota - existing.annual_entitlement;
              await prisma.leaveBalance.update({
                where: { id: existing.id },
                data: {
                  annual_entitlement: quota,
                  remaining: Math.max(0, existing.remaining + diff),
                  updated_at: new Date(),
                },
              });
            } else {
              await prisma.leaveBalance.create({
                data: {
                  id: crypto.randomUUID(),
                  emp_id: emp.id,
                  company_id: companyId,
                  leave_type: leaveType,
                  year: currentYear,
                  annual_entitlement: quota,
                  used_days: 0,
                  pending_days: 0,
                  remaining: quota,
                  carried_forward: 0,
                  updated_at: new Date(),
                },
              });
            }
            appliedCount++;
          }
        }
      }
    }

    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'CompanySettings',
      entityId: companyId,
      previousState: { roleQuotaMap: previousQuotas },
      newState: { roleQuotaMap, applyToExisting, appliedCount },
    });

    return NextResponse.json({
      success: true,
      roleQuotaMap,
      appliedCount,
      message: applyToExisting
        ? `Quotas updated and applied to ${appliedCount} balance records`
        : 'Quotas updated. New employees will use these defaults.',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[LEAVE QUOTAS BY ROLE PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Extract role_quota_map from hr_alerts JSON.
 */
function extractRoleQuotaMap(raw: unknown): Record<string, Record<string, number>> {
  if (!raw || typeof raw !== 'object') return {};
  const alerts = raw as Record<string, unknown>;
  const map = alerts.role_quota_map;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return {};
  return map as Record<string, Record<string, number>>;
}
