/**
 * Create a Cashfree payment order for an admin plan upgrade.
 *
 * POST /api/payments/upgrade
 * Body: { plan: 'growth' | 'enterprise' }
 */
import { randomUUID } from 'crypto';
import type { SubscriptionPlan } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
} from '@/lib/auth-guard';
import { createCashfreeOrder, PLAN_PRICES } from '@/lib/cashfree/checkout';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const PLAN_RANK: Record<SubscriptionPlan, number> = {
  free: 0,
  starter: 1,
  growth: 2,
  enterprise: 3,
};

type UpgradePlan = 'growth' | 'enterprise';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await getAuthEmployee(request);
    requireCompanyContext(actor);
    requirePermissionGuard(actor, 'company.manage_billing');

    const body = await request.json() as { plan?: string };
    const plan = body.plan as UpgradePlan;
    if (!plan || !['growth', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid plan. Must be "growth" or "enterprise".' },
        { status: 400 }
      );
    }

    const [company, currentSubscription, employeeCount] = await Promise.all([
      prisma.company.findUnique({
        where: { id: actor.org_id },
        select: { id: true, name: true },
      }),
      prisma.subscription.findFirst({
        where: { company_id: actor.org_id },
        orderBy: { created_at: 'desc' },
        select: { id: true, plan: true },
      }),
      prisma.employee.count({
        where: {
          org_id: actor.org_id,
          deleted_at: null,
          status: { not: 'exited' },
        },
      }),
    ]);

    if (!company) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    const currentPlan = currentSubscription?.plan ?? 'free';
    if (PLAN_RANK[plan] <= PLAN_RANK[currentPlan]) {
      return NextResponse.json(
        { error: 'Cannot downgrade or re-buy the current plan through checkout.' },
        { status: 400 }
      );
    }

    const appUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? '';
    const returnUrl = `${appUrl}/admin/billing/upgrade-complete`;
    const orderId = `cf-${plan}-${actor.org_id.slice(0, 8)}-${Date.now()}`;

    const order = await createCashfreeOrder({
      orderId,
      companyId: actor.org_id,
      planName: plan,
      employeeCount: Math.max(employeeCount, 1),
      customerName: `${actor.first_name} ${actor.last_name}`.trim() || company.name,
      customerEmail: actor.email,
      customerPhone: '9999999999',
      returnUrl,
    });

    if (!order.ok) {
      return NextResponse.json({ error: order.error }, { status: 502 });
    }

    const subscription = currentSubscription
      ?? await prisma.subscription.create({
        data: {
          id: randomUUID(),
          company_id: actor.org_id,
          plan: currentPlan,
          status: 'trial',
          updated_at: new Date(),
        },
      });

    await prisma.payment.create({
      data: {
        id: randomUUID(),
        company_id: actor.org_id,
        subscription_id: subscription.id,
        cashfree_order_id: order.orderId,
        amount: order.amount,
        currency: 'INR',
        status: 'pending',
      },
    });

    return NextResponse.json({
      paymentSessionId: order.paymentSessionId,
      orderId: order.orderId,
      amount: order.amount,
      plan,
      pricePerEmployee: PLAN_PRICES[plan].pricePerEmployee,
      employeeCount,
    });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Payments Upgrade]', error);
    return NextResponse.json({ error: 'Failed to create payment order' }, { status: 500 });
  }
}
