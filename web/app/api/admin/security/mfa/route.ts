import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard } from '@/lib/auth-guard';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { prismaDirect } from '@/lib/prisma';
import { toJsonRecord } from '@/lib/onboarding-runtime-config';
import type { Prisma } from '@prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'security.manage_roles');

    const body = await request.json().catch(() => ({}));
    const forceGlobalMfa = body.forceGlobalMfa === true;
    if (!forceGlobalMfa) {
      return NextResponse.json({ error: 'forceGlobalMfa must be true' }, { status: 400 });
    }

    const companyId = employee.org_id;
    const existing = await prismaDirect.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    });
    const currentAlerts = toJsonRecord(existing?.hr_alerts);
    const mergedAlerts = {
      ...currentAlerts,
      force_global_mfa: true,
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
      newState: { updatedKeys: ['force_global_mfa'] },
    });

    return NextResponse.json({ success: true, forceGlobalMfa: true });
  } catch (error) {
    console.error('[ADMIN MFA POST]', error instanceof Error ? error.message : error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
