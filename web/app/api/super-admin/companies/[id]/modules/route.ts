import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentUser } from '@/lib/auth-service';
import { validationErrorResponse } from '@/lib/api-errors';
import {
  CORE_FUNCTION_CATALOG,
  isModuleSlug,
  maxModulesForPlan,
  type ModuleSlug,
} from '@/lib/core-functions/catalog';
import {
  getCompanyModuleState,
  saveCompanyModuleState,
} from '@/lib/core-functions/resolve';
import { getCompanySubscriptionPlan } from '@/lib/core-functions/company-plan';
import {
  normalizeCap,
  validateCapWithinPlan,
  validateDependencies,
} from '@/lib/core-functions/validate';
import prisma from '@/lib/prisma';
import {
  auditSuperAdminMetadata,
  resolveAuditActorId,
  safeCreateAuditLog,
} from '@/lib/audit';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  superAdminCap: z.array(z.string()).optional(),
  enabledModules: z.array(z.string()).optional(),
  moduleFeatures: z
    .record(
      z.object({
        enabled: z.boolean(),
        config: z.record(z.unknown()).optional(),
      })
    )
    .optional(),
});

/**
 * GET /api/super-admin/companies/[id]/modules
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = await params;
    const company = await prisma.company.findFirst({
      where: { id: companyId, deleted_at: null },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const state = await getCompanyModuleState(companyId);
    return NextResponse.json({
      companyId,
      companyName: company.name,
      catalog: CORE_FUNCTION_CATALOG,
      superAdminCap: state.superAdminCap,
      enabledModules: state.enabledSlugs,
      moduleFeatures: state.features,
    });
  } catch (error) {
    console.error('[SUPER ADMIN MODULES GET]', error);
    return NextResponse.json({ error: 'Failed to load modules' }, { status: 500 });
  }
}

/**
 * PATCH /api/super-admin/companies/[id]/modules
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
    const company = await prisma.company.findFirst({
      where: { id: companyId, deleted_at: null },
      select: { id: true, name: true },
    });
    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = patchSchema.safeParse(body);
    if (!parsed.success) {
      return validationErrorResponse(
        Object.fromEntries(
          parsed.error.errors.map((e) => [e.path.join('.') || 'body', e.message])
        )
      );
    }

    const capSlugs = parsed.data.superAdminCap
      ? normalizeCap(parsed.data.superAdminCap)
      : undefined;

    if (capSlugs) {
      const plan = await getCompanySubscriptionPlan(companyId);
      const planLimit = maxModulesForPlan(plan);
      const planIssues = validateCapWithinPlan(capSlugs, planLimit);
      if (planIssues.length > 0) {
        return validationErrorResponse(
          Object.fromEntries(planIssues.map((i, idx) => [`cap.${idx}`, i.message])),
          'Module cap exceeds billing plan limit'
        );
      }
    }

    const enabledSlugs = parsed.data.enabledModules
      ? parsed.data.enabledModules.filter((s): s is ModuleSlug => isModuleSlug(s))
      : undefined;

    const current = await getCompanyModuleState(companyId);
    const nextCap = capSlugs ?? current.superAdminCap;
    const nextEnabled = enabledSlugs ?? current.enabledSlugs;

    const depIssues = validateDependencies(nextEnabled);
    if (depIssues.length > 0) {
      return validationErrorResponse(
        Object.fromEntries(depIssues.map((i, idx) => [`modules.${idx}`, i.message])),
        'Module dependency validation failed'
      );
    }

    const saved = await saveCompanyModuleState(companyId, {
      superAdminCap: nextCap,
      enabledSlugs: nextEnabled,
      features: parsed.data.moduleFeatures
        ? Object.fromEntries(
            Object.entries(parsed.data.moduleFeatures).map(([k, v]) => [
              k,
              { enabled: v.enabled, config: v.config ?? {} },
            ])
          )
        : undefined,
    });

    await safeCreateAuditLog({
      companyId,
      actorId: resolveAuditActorId(currentUser),
      action: 'module_config_updated',
      entityType: 'CompanySettings',
      entityId: companyId,
      newState: {
        superAdminCap: saved.superAdminCap,
        enabledModules: saved.enabledSlugs,
        ...auditSuperAdminMetadata(currentUser),
      },
    });

    return NextResponse.json({
      success: true,
      superAdminCap: saved.superAdminCap,
      enabledModules: saved.enabledSlugs,
      moduleFeatures: saved.features,
    });
  } catch (error) {
    console.error('[SUPER ADMIN MODULES PATCH]', error);
    return NextResponse.json({ error: 'Failed to update modules' }, { status: 500 });
  }
}
