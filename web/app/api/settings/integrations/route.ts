import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { backfillIntegrations, backfillPortalPolicy, toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/integrations
 *
 * Returns the company's integration connector configuration.
 *
 * @returns JSON with connectors array.
 * @throws Returns 401/403 on auth failure; 500 on DB error.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'hr', 'manager', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const settings = await prisma.companySettings.findUnique({
      where: { company_id: user.orgId },
      select: { portal_policy: true },
    });
    const policy = backfillPortalPolicy(settings?.portal_policy);
    return NextResponse.json({ connectors: backfillIntegrations(policy.integrations) });
  } catch (error) {
    console.error('[GET /api/settings/integrations] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/integrations
 *
 * Updates the company's integration connectors configuration.
 *
 * @param request - JSON body with { connectors: ConnectorItem[] }.
 * @returns JSON success response with updated connectors.
 * @throws Returns 400 if payload invalid; 401/403 on auth failure; 500 on DB error.
 */
export async function PUT(request: NextRequest) {
  try {
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
  } catch (error) {
    console.error('[PUT /api/settings/integrations] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
