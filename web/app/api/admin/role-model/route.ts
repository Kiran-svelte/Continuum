/**
 * GET/PUT /api/admin/role-model
 * Post-onboarding role model management.
 * Allows company admin to upgrade/change the company's role model
 * (e.g., from hr_employee to hr_manager_employee to full_hierarchy)
 * without developer intervention.
 *
 * @module api/admin/role-model
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

export const dynamic = 'force-dynamic';

/** The role configurations for each model tier. */
const ROLE_MODEL_CONFIGS: Record<string, string[]> = {
  hr_employee: ['admin', 'hr', 'employee'],
  hr_manager_employee: ['admin', 'hr', 'manager', 'employee'],
  full_hierarchy: ['admin', 'hr', 'director', 'manager', 'team_lead', 'employee'],
};

const ROLE_MODEL_LABELS: Record<string, string> = {
  hr_employee: 'HR + Employee (Simple)',
  hr_manager_employee: 'HR + Manager + Employee (Standard)',
  full_hierarchy: 'Full Hierarchy (Enterprise)',
};

const updateSchema = z.object({
  roleModel: z.enum(['hr_employee', 'hr_manager_employee', 'full_hierarchy']),
});

/**
 * GET handler: Fetch current role model configuration.
 */
export async function GET(request: NextRequest) {
  try {
    void request;
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'security.manage_roles');

    const companyId = employee.org_id!;

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: {
        id: true,
        enabled_roles: true,
        requires_hr: true,
        requires_manager: true,
      },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const enabledRoles = Array.isArray(company.enabled_roles)
      ? company.enabled_roles as string[]
      : JSON.parse(String(company.enabled_roles || '[]'));

    const currentModel = detectCurrentModel(enabledRoles);

    return NextResponse.json({
      currentModel,
      currentModelLabel: ROLE_MODEL_LABELS[currentModel] || currentModel,
      enabledRoles,
      availableModels: Object.entries(ROLE_MODEL_LABELS).map(([key, label]) => ({
        key,
        label,
        roles: ROLE_MODEL_CONFIGS[key],
        isCurrent: key === currentModel,
        isUpgrade: isUpgrade(currentModel, key),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[ROLE MODEL GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT handler: Change the company role model.
 * Only upgrades are safe. Downgrades require confirmation because
 * they may orphan users with roles that no longer exist.
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'security.manage_roles');

    const companyId = employee.org_id!;

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { roleModel } = parsed.data;
    const newRoles = ROLE_MODEL_CONFIGS[roleModel];

    if (!newRoles) {
      return NextResponse.json({ error: 'Invalid role model' }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { enabled_roles: true },
    });

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const currentRoles = Array.isArray(company.enabled_roles)
      ? company.enabled_roles as string[]
      : JSON.parse(String(company.enabled_roles || '[]'));

    // Check for orphaned employees on downgrade
    const currentModel = detectCurrentModel(currentRoles);
    if (!isUpgrade(currentModel, roleModel)) {
      const removedRoles = currentRoles.filter(
        (role: string) => !newRoles.includes(role)
      );

      if (removedRoles.length > 0) {
        const orphanedCount = await prisma.employee.count({
          where: {
            org_id: companyId,
            primary_role: { in: removedRoles },
            deleted_at: null,
            status: { not: 'terminated' },
          },
        });

        if (orphanedCount > 0) {
          return NextResponse.json(
            {
              error: `Cannot downgrade: ${orphanedCount} active employees have roles (${removedRoles.join(', ')}) that would be removed. Reassign them first.`,
              orphanedRoles: removedRoles,
              orphanedCount,
            },
            { status: 409 }
          );
        }
      }
    }

    await prisma.company.update({
      where: { id: companyId },
      data: {
        enabled_roles: newRoles,
        requires_manager: newRoles.includes('manager'),
        updated_at: new Date(),
      },
    });

    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'Company',
      entityId: companyId,
      previousState: { roleModel: currentModel, enabledRoles: currentRoles },
      newState: { roleModel, enabledRoles: newRoles },
    });

    return NextResponse.json({
      success: true,
      roleModel,
      enabledRoles: newRoles,
      message: `Role model updated to ${ROLE_MODEL_LABELS[roleModel]}`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[ROLE MODEL PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const MODEL_TIERS = ['hr_employee', 'hr_manager_employee', 'full_hierarchy'];

/**
 * Detect which role model a company is currently using based on enabled_roles.
 */
function detectCurrentModel(enabledRoles: string[]): string {
  if (enabledRoles.includes('director') || enabledRoles.includes('team_lead')) {
    return 'full_hierarchy';
  }
  if (enabledRoles.includes('manager')) {
    return 'hr_manager_employee';
  }
  return 'hr_employee';
}

/**
 * Check if moving from one model to another is an upgrade (additive only).
 */
function isUpgrade(from: string, to: string): boolean {
  return MODEL_TIERS.indexOf(to) > MODEL_TIERS.indexOf(from);
}
