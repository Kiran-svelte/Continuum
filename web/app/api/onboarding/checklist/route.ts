import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth-service';
import { backfillOnboardingChecklist, backfillPortalPolicy, toPrismaJson } from '@/lib/portal-policy-backfill';

export const dynamic = 'force-dynamic';

/**
 * GET /api/onboarding/checklist
 *
 * Returns the onboarding checklist and progress ratio for the authenticated user's company.
 *
 * @returns JSON with checklist items and completion ratio.
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
    const checklist = backfillOnboardingChecklist(policy.onboardingChecklist);
    const completed = checklist.filter((item) => item.completed).length;
    return NextResponse.json({ checklist, progress: checklist.length ? completed / checklist.length : 0 });
  } catch (error) {
    console.error('[GET /api/onboarding/checklist] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/onboarding/checklist
 *
 * Updates the onboarding checklist for the authenticated user's company.
 *
 * @param request - Must contain JSON body with { checklist: ChecklistItem[] }.
 * @returns JSON with success flag and updated checklist.
 * @throws Returns 400 if payload invalid; 401/403 on auth failure; 500 on DB error.
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || !user.orgId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!['admin', 'hr', 'super_admin'].includes(user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    if (!Array.isArray(body.checklist)) {
      return NextResponse.json({ error: 'Invalid checklist payload' }, { status: 400 });
    }
    const checklist = backfillOnboardingChecklist(body.checklist);
    const settings = await prisma.companySettings.findUnique({ where: { company_id: user.orgId } });
    const portalPolicy = backfillPortalPolicy(settings?.portal_policy);
    portalPolicy.onboardingChecklist = checklist;
    portalPolicy.welcomeSequence = {
      day0SentAt:
        typeof (portalPolicy.welcomeSequence as Record<string, unknown> | undefined)?.day0SentAt === 'string'
          ? (portalPolicy.welcomeSequence as Record<string, unknown>).day0SentAt
          : new Date().toISOString(),
      day3SentAt: null,
      day7SentAt: null,
    };
    await prisma.companySettings.upsert({
      where: { company_id: user.orgId },
      create: {
        id: crypto.randomUUID(),
        company_id: user.orgId,
        updated_at: new Date(),
        portal_policy: toPrismaJson(portalPolicy),
      },
      update: { portal_policy: toPrismaJson(portalPolicy), updated_at: new Date() },
    });
    return NextResponse.json({ success: true, checklist });
  } catch (error) {
    console.error('[PATCH /api/onboarding/checklist] Error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
