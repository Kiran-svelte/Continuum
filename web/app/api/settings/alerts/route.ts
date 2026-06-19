import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { backfillAlerts, backfillPortalPolicy, toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

/**
 * GET /api/settings/alerts
 *
 * Returns the company's alert configuration.
 *
 * @returns JSON with alerts config.
 * @throws Returns 401/403 on auth failure; 500 on DB error.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'hr', 'manager', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const settings = await prisma.companySettings.findUnique({ where: { company_id: user.orgId } });
    const policy = backfillPortalPolicy(settings?.portal_policy);
    return NextResponse.json({ alerts: backfillAlerts(policy.alertsConfig) });
  } catch (error) {
    console.error('[GET /api/settings/alerts] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PUT /api/settings/alerts
 *
 * Updates the company's alert configuration.
 *
 * @param request - JSON body with { alerts: object }.
 * @returns JSON success response with updated alerts.
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
  } catch (error) {
    console.error('[PUT /api/settings/alerts] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
