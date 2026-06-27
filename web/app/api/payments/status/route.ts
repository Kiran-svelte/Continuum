/**
 * Check a Cashfree order and synchronize local payment/subscription state.
 *
 * GET /api/payments/status?order_id=<cashfree-order-id>
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
} from '@/lib/auth-guard';
import { verifyCashfreeOrder } from '@/lib/cashfree/checkout';
import { markCashfreeOrderStatus } from '@/lib/payment-service';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const actor = await getAuthEmployee(request);
    requireCompanyContext(actor);
    requirePermissionGuard(actor, 'company.manage_billing');

    const orderId = request.nextUrl.searchParams.get('order_id');
    if (!orderId) {
      return NextResponse.json({ error: 'Missing order_id' }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        cashfree_order_id: orderId,
        company_id: actor.org_id,
      },
      select: {
        status: true,
        amount: true,
        subscription: { select: { plan: true } },
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (payment.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        plan: payment.subscription.plan,
        amount: payment.amount,
      });
    }

    if (payment.status === 'failed') {
      return NextResponse.json({ status: 'failed' });
    }

    const cashfree = await verifyCashfreeOrder(orderId);
    if (!cashfree.ok) {
      return NextResponse.json({ status: 'pending' });
    }

    const cashfreeStatus = cashfree.status.toUpperCase();
    if (cashfreeStatus === 'PAID' || cashfreeStatus === 'SUCCESS') {
      await markCashfreeOrderStatus({ orderId, status: 'completed' });
      const updated = await prisma.payment.findFirst({
        where: {
          cashfree_order_id: orderId,
          company_id: actor.org_id,
        },
        select: {
          status: true,
          amount: true,
          subscription: { select: { plan: true } },
        },
      });
      return NextResponse.json({
        status: 'completed',
        plan: updated?.subscription.plan ?? payment.subscription.plan,
        amount: updated?.amount ?? payment.amount,
      });
    }

    if (['FAILED', 'CANCELLED', 'EXPIRED'].includes(cashfreeStatus)) {
      await markCashfreeOrderStatus({ orderId, status: 'failed' });
      return NextResponse.json({ status: 'failed' });
    }

    return NextResponse.json({ status: 'pending' });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Payments Status]', error);
    return NextResponse.json({ error: 'Failed to check payment status' }, { status: 500 });
  }
}
