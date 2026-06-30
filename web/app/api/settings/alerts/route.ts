import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { backfillAlerts, backfillPortalPolicy, toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.view_settings');
    const settings = await prisma.companySettings.findUnique({ where: { company_id: employee.org_id } });
    const policy = backfillPortalPolicy(settings?.portal_policy);
    return NextResponse.json({ alerts: backfillAlerts(policy.alertsConfig) });
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
    requirePermissionGuard(employee, 'notifications.configure');
    const body = await request.json().catch(() => ({}));
    if (!body.alerts || typeof body.alerts !== 'object' || Array.isArray(body.alerts)) {
      return NextResponse.json({ error: 'Invalid alerts payload' }, { status: 400 });
    }
    const alerts = backfillAlerts(body.alerts);
    const settings = await prisma.companySettings.findUnique({ where: { company_id: employee.org_id } });
    const policy = backfillPortalPolicy(settings?.portal_policy);
    policy.alertsConfig = alerts;
    await prisma.companySettings.upsert({
      where: { company_id: employee.org_id },
      create: { id: crypto.randomUUID(), company_id: employee.org_id, updated_at: new Date(), portal_policy: toPrismaJson(policy) },
      update: { portal_policy: toPrismaJson(policy), updated_at: new Date() },
    });
    return NextResponse.json({ success: true, alerts });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
