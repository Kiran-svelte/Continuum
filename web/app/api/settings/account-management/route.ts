import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [company, members, settings] = await Promise.all([
    prisma.company.findUnique({
      where: { id: user.orgId },
      select: { id: true, name: true, legalName: true, industry: true, timezone: true, size: true, join_code: true },
    }),
    prisma.employee.count({ where: { org_id: user.orgId, deleted_at: null } }),
    prisma.companySettings.findUnique({ where: { company_id: user.orgId }, select: { portal_policy: true } }),
  ]);
  const policy = asRecord(settings?.portal_policy);
  return NextResponse.json({
    company,
    members,
    billingContact: policy.billingContact || null,
    security: policy.accountSecurity || { ownershipTransferEnabled: false, workspaceDeactivationGuard: true },
  });
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const settings = await prisma.companySettings.findUnique({ where: { company_id: user.orgId } });
  const policy = asRecord(settings?.portal_policy);
  if (body.billingContact) policy.billingContact = body.billingContact;
  if (body.security) policy.accountSecurity = body.security;
  await prisma.companySettings.upsert({
    where: { company_id: user.orgId },
    create: { id: crypto.randomUUID(), company_id: user.orgId, updated_at: new Date(), portal_policy: toPrismaJson(policy) },
    update: { portal_policy: toPrismaJson(policy), updated_at: new Date() },
  });
  return NextResponse.json({ success: true });
}
