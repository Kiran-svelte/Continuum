import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { backfillIntegrations, backfillPortalPolicy, toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'hr', 'manager', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const settings = await prisma.companySettings.findUnique({ where: { company_id: user.orgId }, select: { portal_policy: true } });
  const policy = backfillPortalPolicy(settings?.portal_policy);
  return NextResponse.json({
    connectors: backfillIntegrations(policy.integrations),
  });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const body = await request.json().catch(() => ({}));
  if (!Array.isArray(body.connectors)) {
    return NextResponse.json({ error: 'Invalid connectors payload' }, { status: 400 });
  }
  const connectors = backfillIntegrations(body.connectors);
  const existing = await prisma.companySettings.findUnique({ where: { company_id: user.orgId } });
  const policy = backfillPortalPolicy(existing?.portal_policy);
  policy.integrations = connectors;
  await prisma.companySettings.upsert({
    where: { company_id: user.orgId },
    create: { id: crypto.randomUUID(), company_id: user.orgId, updated_at: new Date(), portal_policy: toPrismaJson(policy) },
    update: { portal_policy: toPrismaJson(policy), updated_at: new Date() },
  });
  return NextResponse.json({ success: true, connectors });
}
