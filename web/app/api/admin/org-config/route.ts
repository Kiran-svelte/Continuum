/**
 * app/api/admin/org-config/route.ts
 *
 * GET  /api/admin/org-config — Returns org_structure, approval_chains, enabled_modules
 *                              for the calling admin's company.
 * POST /api/admin/org-config — Updates one or more of those three config blobs.
 *
 * All three blobs are stored inside CompanySettings.hr_alerts as JSON sub-keys
 * (org_structure, approval_chains, enabled_modules). No schema migration required.
 *
 * @module app/api/admin/org-config
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { prismaDirect } from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { toJsonRecord } from '@/lib/onboarding-runtime-config';
import type { Prisma } from '@prisma/client';
import { sanitizeInput } from '@/lib/security';
import { MODULE_SLUGS, type ModuleSlug } from '@/lib/core-functions/catalog';
import { getCompanyModuleState } from '@/lib/core-functions/resolve';
import { clampEnabledToCap, validateDependencies } from '@/lib/core-functions/validate';
import { validationErrorResponse } from '@/lib/api-errors';

export const dynamic = 'force-dynamic';

// ─── Validation schemas ───────────────────────────────────────────────────────

const departmentSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(100).transform(sanitizeInput),
  code: z.string().min(1).max(16).toUpperCase(),
  headRole: z.string().min(1).max(40),
});

const locationSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(100).transform(sanitizeInput),
  city: z.string().min(1).max(100).transform(sanitizeInput),
  country: z.string().min(1).max(100).transform(sanitizeInput),
});

const costCenterSchema = z.object({
  id: z.string().min(1).max(40),
  name: z.string().min(1).max(100).transform(sanitizeInput),
  code: z.string().min(1).max(16).toUpperCase(),
});

const orgStructureSchema = z.object({
  departments: z.array(departmentSchema).max(200),
  locations: z.array(locationSchema).max(100),
  costCenters: z.array(costCenterSchema).max(100),
  orgModel: z.enum(['flat', 'two_tier', 'full_hierarchy']),
});

const approvalChainSchema = z.object({
  workflowType: z.enum(['leave', 'expense', 'payroll_advance', 'travel']),
  level1Role: z.string().min(1).max(40),
  level2Role: z.string().min(1).max(40),
  autoApproveAfterHours: z.number().int().min(0).max(720),
});

const KNOWN_MODULE_SLUGS = MODULE_SLUGS;

const updateSchema = z.object({
  orgStructure: orgStructureSchema.optional(),
  approvalChains: z.array(approvalChainSchema).max(20).optional(),
  enabledModules: z.array(z.enum(KNOWN_MODULE_SLUGS)).optional(),
});

// ─── GET ──────────────────────────────────────────────────────────────────────

/**
 * Returns the org structure, approval chains, and enabled modules for the company.
 * Falls back to safe defaults when a key has never been set.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requirePermissionGuard(employee, 'employee.onboard');

    const settings = await prismaDirect.companySettings.findUnique({
      where: { company_id: employee.org_id },
      select: { hr_alerts: true },
    });

    const hrAlerts = toJsonRecord(settings?.hr_alerts);

    return NextResponse.json({
      orgStructure: hrAlerts.org_structure ?? {
        departments: [],
        locations: [],
        costCenters: [],
        orgModel: 'two_tier',
      },
      approvalChains: hrAlerts.approval_chains ?? [
        { workflowType: 'leave', level1Role: 'manager', level2Role: 'hr', autoApproveAfterHours: 48 },
        { workflowType: 'expense', level1Role: 'manager', level2Role: 'admin', autoApproveAfterHours: 0 },
        { workflowType: 'payroll_advance', level1Role: 'hr', level2Role: 'admin', autoApproveAfterHours: 0 },
        { workflowType: 'travel', level1Role: 'manager', level2Role: 'admin', autoApproveAfterHours: 0 },
      ],
      enabledModules: hrAlerts.enabled_modules ?? ['leave', 'attendance', 'payroll', 'documents'],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[ORG CONFIG GET]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

/**
 * Persists one or more of: orgStructure, approvalChains, enabledModules.
 * Partial updates are supported — omit a key to leave it unchanged.
 *
 * @throws 400 on validation failure
 * @throws 403 if caller lacks company.settings.edit permission
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requirePermissionGuard(employee, 'security.manage_roles');

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { orgStructure, approvalChains } = parsed.data;
    let { enabledModules } = parsed.data;

    if (!orgStructure && !approvalChains && !enabledModules) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const companyId = employee.org_id;

    const existing = await prismaDirect.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });

    const currentAlerts = toJsonRecord(existing?.hr_alerts);

    if (enabledModules !== undefined) {
      const moduleState = await getCompanyModuleState(companyId);
      const requested = enabledModules as ModuleSlug[];
      const blocked = requested.filter((slug) => !moduleState.superAdminCap.includes(slug));
      if (blocked.length > 0) {
        return validationErrorResponse(
          Object.fromEntries(blocked.map((slug) => [`enabledModules.${slug}`, 'Module is outside the super-admin cap'])),
          'Enabled modules exceed company cap'
        );
      }

      const clamped = clampEnabledToCap(requested, moduleState.superAdminCap);
      const depIssues = validateDependencies(clamped);
      if (depIssues.length > 0) {
        return validationErrorResponse(
          Object.fromEntries(depIssues.map((issue, idx) => [`enabledModules.${idx}`, issue.message])),
          'Module dependency validation failed'
        );
      }
      enabledModules = clamped;
    }

    const mergedAlerts: Record<string, unknown> = {
      ...currentAlerts,
      ...(orgStructure !== undefined && { org_structure: orgStructure }),
      ...(approvalChains !== undefined && { approval_chains: approvalChains }),
      ...(enabledModules !== undefined && { enabled_modules: enabledModules }),
    };

    await prismaDirect.companySettings.upsert({
      where: { company_id: companyId },
      create: {
        id: crypto.randomUUID(),
        company_id: companyId,
        hr_alerts: mergedAlerts as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
      update: {
        hr_alerts: mergedAlerts as Prisma.InputJsonValue,
        updated_at: new Date(),
      },
    });

    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'CompanySettings',
      entityId: companyId,
      newState: {
        updatedKeys: [
          orgStructure ? 'org_structure' : null,
          approvalChains ? 'approval_chains' : null,
          enabledModules ? 'enabled_modules' : null,
        ].filter(Boolean),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal error';
    console.error('[ORG CONFIG POST]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
