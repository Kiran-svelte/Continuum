/**
 * GET/PUT /api/admin/capability-owners
 * Manage which roles own which platform capabilities.
 * Allows admin to say "managers own people_operations" or
 * "HR owns reports" without developer intervention.
 *
 * @module api/admin/capability-owners
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError, requirePermissionGuard} from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import {
  CAPABILITY_POLICY_MAP,
} from '@/lib/capability-access';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  overrides: z.record(
    z.string(),
    z.array(z.string().min(1).max(50))
  ),
});

/**
 * GET handler: Fetch current capability owner configuration.
 */
export async function GET(request: NextRequest) {
  try {
    void request;
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'security.manage_roles');

    const companyId = employee.org_id!;

    const [settings, company] = await Promise.all([
      prisma.companySettings.findUnique({
        where: { company_id: companyId },
        select: { hr_alerts: true },
      }),
      prisma.company.findUnique({
        where: { id: companyId },
        select: { enabled_roles: true },
      }),
    ]);

    const enabledRoles = Array.isArray(company?.enabled_roles)
      ? company.enabled_roles as string[]
      : JSON.parse(String(company?.enabled_roles || '[]'));

    const overrides = parseOwnerOverrides(settings?.hr_alerts);

    const capabilities = Object.entries(CAPABILITY_POLICY_MAP).map(([key, definition]) => ({
      key,
      label: definition.label || key.replace(/_/g, ' '),
      description: definition.includes?.join(', ') || '',
      defaultOwners: definition.fallback ? [definition.owner, ...definition.fallback] : [definition.owner],
      currentOwners: overrides[key]
        ? overrides[key]
        : [definition.owner, ...definition.fallback],
      isOverridden: Boolean(overrides[key]),
    }));

    return NextResponse.json({
      capabilities,
      enabledRoles,
      overrides,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[CAPABILITY OWNERS GET] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT handler: Update capability owner overrides.
 */
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'security.manage_roles');

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { overrides } = parsed.data;
    const validKeys = Object.keys(CAPABILITY_POLICY_MAP);
    const invalidKeys = Object.keys(overrides).filter(
      (key) => !validKeys.includes(key)
    );
    if (invalidKeys.length > 0) {
      return NextResponse.json(
        { error: `Unknown capabilities: ${invalidKeys.join(', ')}` },
        { status: 400 }
      );
    }

    const companyId = employee.org_id!;

    const currentSettings = await prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });
    const previousOverrides = parseOwnerOverrides(currentSettings?.hr_alerts);

    const existingAlerts = (currentSettings?.hr_alerts as Record<string, unknown>) || {};
    const updatedAlerts = {
      ...existingAlerts,
      capability_owners: overrides,
    };

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

    await createAuditLog({
      companyId,
      actorId: employee.id,
      action: AUDIT_ACTIONS.COMPANY_SETTINGS_UPDATE,
      entityType: 'CompanySettings',
      entityId: companyId,
      previousState: { capabilityOwners: previousOverrides },
      newState: { capabilityOwners: overrides },
    });

    return NextResponse.json({
      success: true,
      overrides,
      message: 'Capability owners updated',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[CAPABILITY OWNERS PUT] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Parse capability owner overrides from hr_alerts JSON.
 */
function parseOwnerOverrides(raw: unknown): Record<string, string[]> {
  if (!raw || typeof raw !== 'object') return {};
  const alerts = raw as Record<string, unknown>;
  const owners = alerts.capability_owners;
  if (!owners || typeof owners !== 'object' || Array.isArray(owners)) return {};
  return owners as Record<string, string[]>;
}
