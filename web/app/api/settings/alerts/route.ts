import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { backfillAlerts, backfillPortalPolicy, toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'hr', 'manager', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const settings = await prisma.companySettings.findUnique({ where: { company_id: user.orgId } });
  const policy = backfillPortalPolicy(settings?.portal_policy);
  return NextResponse.json({ alerts: backfillAlerts(policy.alertsConfig) });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (!body.alerts || typeof body.alerts !== 'object' || Array.isArray(body.alerts)) {
    return NextResponse.json({ error: 'Invalid alerts payload' }, { status: 400 });
  }
  const alerts = backfillAlerts(body.alerts);
  const settings = await prisma.companySettings.findUnique({ where: { company_id: user.orgId } });
  const policy = backfillPortalPolicy(settings?.portal_policy);
  policy.alertsConfig = alerts;
  await prisma.companySettings.upsert({
    where: { company_id: user.orgId },
    create: { id: crypto.randomUUID(), company_id: user.orgId, updated_at: new Date(), portal_policy: toPrismaJson(policy) },
    update: { portal_policy: toPrismaJson(policy), updated_at: new Date() },
  });
  return NextResponse.json({ success: true, alerts });
}
