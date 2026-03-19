import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { DEFAULT_CONSTRAINT_RULES } from '@/lib/constraint-rules-config';

export const dynamic = 'force-dynamic';

const ruleUpdateSchema = z.object({
  rule_id: z.string().min(1).max(20),
  is_active: z.boolean().optional(),
  is_blocking: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
});

const policyPatchSchema = z.object({
  rules: z.array(ruleUpdateSchema).min(1).max(20),
});

/**
 * GET /api/hr/policy
 * Returns the active constraint rules for the company.
 * Company-specific overrides are merged on top of defaults.
 * Accessible by admin, hr, and director roles.
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr', 'director');

    // Fetch company-specific rules from DB
    const dbRules = await prisma.leaveRule.findMany({
      where: { company_id: employee.org_id!, deleted_at: null },
      orderBy: { priority: 'asc' },
    });

    // Fetch active leave types for the company
    const leaveTypes = await prisma.leaveType.findMany({
      where: { company_id: employee.org_id!, is_active: true, deleted_at: null },
      orderBy: { code: 'asc' },
      select: {
        id: true,
        code: true,
        name: true,
        category: true,
        default_quota: true,
        carry_forward: true,
        max_carry_forward: true,
        encashment_enabled: true,
        encashment_max_days: true,
        paid: true,
        gender_specific: true,
        is_active: true,
      },
    });

    // Merge DB rules with defaults so callers see all 13 rules.
    // DB rules (company-customized during onboarding) take full precedence.
    // The DEFAULT_CONSTRAINT_RULES only provide the structural skeleton for
    // rules not yet persisted in the DB.
    const rulesMap = new Map<string, Record<string, unknown>>();

    // Seed with defaults (structural template only)
    for (const def of DEFAULT_CONSTRAINT_RULES) {
      rulesMap.set(def.rule_id, {
        rule_id: def.rule_id,
        name: def.name,
        description: def.description,
        category: def.category,
        is_blocking: def.is_blocking,
        is_active: true,
        priority: def.priority,
        config: def.config,
        persisted: false,
      });
    }

    // Overlay with company-specific DB rules (takes full precedence)
    for (const row of dbRules) {
      const existing = rulesMap.get(row.rule_id);
      rulesMap.set(row.rule_id, {
        rule_id: row.rule_id,
        name: row.name,
        description: row.description ?? (existing?.description ?? ''),
        category: row.category,
        is_blocking: row.is_blocking,
        is_active: row.is_active,
        priority: row.priority,
        config: row.config, // DB config is the full config, not a partial overlay
        persisted: true,
        db_id: row.id,
      });
    }

    const rules = Array.from(rulesMap.values()).sort(
      (a, b) => (a.priority as number) - (b.priority as number)
    );

    // Fetch latest ConstraintPolicy version
    const latestPolicy = await prisma.constraintPolicy.findFirst({
      where: { company_id: employee.org_id!, is_active: true },
      orderBy: { version: 'desc' },
      select: { version: true, created_at: true },
    });

    return NextResponse.json({
      rules,
      leave_types: leaveTypes,
      policy_version: latestPolicy?.version ?? 0,
      policy_updated_at: latestPolicy?.created_at ?? null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * PATCH /api/hr/policy
 * Updates one or more constraint rule configs for the company.
 * Each updated rule is upserted into the LeaveRule table.
 * A new ConstraintPolicy snapshot is created on every change.
 * Only callable by admin or hr roles.
 */
export async function PATCH(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    requireRole(employee, 'admin', 'hr');

    const body = await request.json();
    const parsed = policyPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const companyId = employee.org_id!;
    const { rules: updates } = parsed.data;

    // Validate rule IDs: must exist in defaults or already be persisted for this company
    const validIds = new Set(DEFAULT_CONSTRAINT_RULES.map((r) => r.rule_id));
    const existingDbRuleIds = new Set(
      (await prisma.leaveRule.findMany({
        where: { company_id: companyId, deleted_at: null },
        select: { rule_id: true },
      })).map((r) => r.rule_id)
    );
    for (const u of updates) {
      if (!validIds.has(u.rule_id) && !existingDbRuleIds.has(u.rule_id)) {
        return NextResponse.json(
          { error: `Unknown rule_id: ${u.rule_id}` },
          { status: 400 }
        );
      }
    }

    const previousRules = await prisma.leaveRule.findMany({
      where: { company_id: companyId, deleted_at: null },
    });

    await prisma.$transaction(async (tx) => {
      for (const update of updates) {
        const defaultRule = DEFAULT_CONSTRAINT_RULES.find((r) => r.rule_id === update.rule_id)!;
        const existing = previousRules.find((r) => r.rule_id === update.rule_id);
        const existingConfig = existing?.config as Record<string, unknown> | null;
        const mergedConfig = { ...(existingConfig ?? defaultRule.config), ...(update.config ?? {}) };

        await tx.leaveRule.upsert({
          where: { company_id_rule_id: { company_id: companyId, rule_id: update.rule_id } },
          create: {
            company_id: companyId,
            rule_id: update.rule_id,
            rule_type: defaultRule.category,
            name: defaultRule.name,
            description: defaultRule.description,
            category: defaultRule.category as 'validation' | 'business' | 'compliance',
            is_blocking: update.is_blocking ?? defaultRule.is_blocking,
            is_active: update.is_active ?? true,
            priority: defaultRule.priority,
            config: mergedConfig as Prisma.InputJsonValue,
          },
          update: {
            is_blocking: update.is_blocking ?? (existing?.is_blocking ?? defaultRule.is_blocking),
            is_active: update.is_active ?? (existing?.is_active ?? true),
            config: mergedConfig as Prisma.InputJsonValue,
          },
        });
      }

      // Snapshot: deactivate old policy, create new version
      const latest = await tx.constraintPolicy.findFirst({
        where: { company_id: companyId, is_active: true },
        orderBy: { version: 'desc' },
        select: { version: true },
      });
      const nextVersion = (latest?.version ?? 0) + 1;

      await tx.constraintPolicy.updateMany({
        where: { company_id: companyId, is_active: true },
        data: { is_active: false },
      });

      const allRules = await tx.leaveRule.findMany({
        where: { company_id: companyId, is_active: true, deleted_at: null },
      });

      await tx.constraintPolicy.create({
        data: {
          company_id: companyId,
          version: nextVersion,
          is_active: true,
          rules: allRules as unknown as import('@prisma/client').Prisma.InputJsonValue,
        },
      });
    });

    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_POLICY_UPDATE,
      entityType: 'ConstraintPolicy',
      entityId: companyId,
      previousState: { rules: previousRules.map((r) => ({ rule_id: r.rule_id, config: r.config })) },
      newState: { updated_rules: updates },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
