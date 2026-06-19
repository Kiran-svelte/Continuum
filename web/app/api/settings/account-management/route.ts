import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

/**
 * Coerces an unknown JSON value to a Record for safe property access.
 *
 * @param value - Any JSON value from Prisma.
 * @returns The value cast as a plain object, or an empty object if not an object.
 */
function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

/**
 * GET /api/settings/account-management
 *
 * Returns company account management details including members count and policy settings.
 *
 * @returns JSON with company, members count, billing contact, and security settings.
 * @throws Returns 401 if unauthenticated; 500 on DB error.
 */
export async function GET() {
  try {
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
  } catch (error) {
    console.error('[GET /api/settings/account-management] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/account-management
 *
 * Updates account management settings — billing contact and security config.
 *
 * @param request - JSON body with optional { billingContact, security }.
 * @returns JSON success response.
 * @throws Returns 401 if unauthenticated; 500 on DB error.
 */
export async function PUT(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('[PUT /api/settings/account-management] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
