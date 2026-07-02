import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { getCurrentUser } from '@/lib/auth-service';
import prisma from '@/lib/prisma';
import { clampModulesForPlan } from '@/lib/core-functions/plan-modules';
import { createSuperAdminAuditLog } from '@/lib/super-admin-audit';

export const dynamic = 'force-dynamic';

const patchSchema = z.object({
  plan: z.enum(['free', 'starter', 'growth', 'enterprise']),
  status: z.enum(['trial', 'active', 'cancelled', 'expired']).optional(),
});

/**
 * PATCH /api/super-admin/companies/[id]/subscription
 * Assign plan and clamp module cap to plan limits.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'super_admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: companyId } = await params;
    const body = patchSchema.parse(await request.json());
    const existing = await prisma.subscription.findFirst({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    });

    const subscription = existing
      ? await prisma.subscription.update({
          where: { id: existing.id },
          data: {
            plan: body.plan,
            ...(body.status ? { status: body.status } : {}),
            updated_at: new Date(),
          },
        })
      : await prisma.subscription.create({
          data: {
            id: randomUUID(),
            company_id: companyId,
            plan: body.plan,
            status: body.status ?? 'trial',
            updated_at: new Date(),
          },
        });

    const { moduleCap: capped } = await clampModulesForPlan(companyId, body.plan);

    const audit = await createSuperAdminAuditLog({
      companyId,
      actor: currentUser,
      action: 'subscription.update',
      entityType: 'subscription',
      entityId: subscription.id,
      newState: { plan: body.plan, status: subscription.status, moduleCap: capped },
    });

    return NextResponse.json({ subscription, moduleCap: capped, audit });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.flatten() }, { status: 422 });
    }
    return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
  }
}
