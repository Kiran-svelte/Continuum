import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { backfillIntegrations, backfillPortalPolicy, toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.view_settings');
    const settings = await prisma.companySettings.findUnique({ where: { company_id: employee.org_id }, select: { portal_policy: true } });
    const policy = backfillPortalPolicy(settings?.portal_policy);
    return NextResponse.json({
      connectors: backfillIntegrations(policy.integrations),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.edit_settings');
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.connectors)) {
      return NextResponse.json({ error: 'Invalid connectors payload' }, { status: 400 });
    }
    const connectors = backfillIntegrations(body.connectors);
    const existing = await prisma.companySettings.findUnique({ where: { company_id: employee.org_id } });
    const policy = backfillPortalPolicy(existing?.portal_policy);
    policy.integrations = connectors;
    await prisma.companySettings.upsert({
      where: { company_id: employee.org_id },
      create: { id: crypto.randomUUID(), company_id: employee.org_id, updated_at: new Date(), portal_policy: toPrismaJson(policy) },
      update: { portal_policy: toPrismaJson(policy), updated_at: new Date() },
    });
    return NextResponse.json({ success: true, connectors });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
