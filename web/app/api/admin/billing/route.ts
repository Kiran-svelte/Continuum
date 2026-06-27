/**
 * Admin billing information endpoint.
 *
 * GET /api/admin/billing
 *
 * Returns current subscription plan, status, employee count,
 * and next billing date for the authenticated company admin.
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
} from '@/lib/auth-guard';
import { getPlan } from '@/lib/billing/plans';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await getAuthEmployee(request);
    requireCompanyContext(actor);
    requirePermissionGuard(actor, 'company.manage_billing');

    const [subscription, latestPayment, employeeCount] = await Promise.all([
      prisma.subscription.findFirst({
        where: { company_id: actor.org_id },
        orderBy: { created_at: 'desc' },
        select: {
          plan: true,
          status: true,
          current_period_end: true,
        },
      }),
      prisma.payment.findFirst({
        where: { company_id: actor.org_id, status: 'completed' },
        orderBy: { paid_at: 'desc' },
        select: {
          amount: true,
          currency: true,
        },
      }),
      prisma.employee.count({
        where: { org_id: actor.org_id, deleted_at: null, status: { not: 'exited' } },
      }),
    ]);

    const plan = subscription?.plan ?? 'starter';
    const planDetails = getPlan(plan);

    return NextResponse.json({
      plan,
      status: subscription?.status ?? 'trial',
      employeeCount,
      nextBillingDate: subscription?.current_period_end?.toISOString() ?? null,
      monthlyAmount: latestPayment?.amount ?? planDetails?.priceMonthly ?? 0,
      currency: latestPayment?.currency ?? planDetails?.currency ?? 'INR',
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Admin Billing]', error);
    return NextResponse.json({ error: 'Failed to load billing information' }, { status: 500 });
  }
}
