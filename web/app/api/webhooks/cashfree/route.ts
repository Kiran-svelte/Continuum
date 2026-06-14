/**
 * Cashfree webhook handler.
 *
 * POST /api/webhooks/cashfree
 * Headers: x-webhook-signature, x-webhook-timestamp
 *
 * Verifies Cashfree's signature against the raw body, then updates payment and
 * subscription state idempotently.
 */

import { NextRequest, NextResponse } from 'next/server';
import { markCashfreeOrderStatus, verifyCashfreeWebhookSignature } from '@/lib/payment-service';

export const dynamic = 'force-dynamic';

type CashfreeWebhook = {
  type?: string;
  data?: {
    order?: {
      order_id?: string;
      order_status?: string;
    };
    payment?: {
      cf_payment_id?: string | number;
      payment_status?: string;
    };
  };
};

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-webhook-signature') ?? '';
  const timestamp = request.headers.get('x-webhook-timestamp') ?? '';
  const rawBody = await request.text();

  if (!verifyCashfreeWebhookSignature(rawBody, signature, timestamp)) {
    console.error('[Cashfree Webhook] Invalid signature');
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  try {
    const event = JSON.parse(rawBody) as CashfreeWebhook;
    const orderId = event.data?.order?.order_id;
    const paymentStatus = (event.data?.payment?.payment_status || event.data?.order?.order_status || '').toUpperCase();
    const cfPaymentId = event.data?.payment?.cf_payment_id;

    if (!orderId) {
      return NextResponse.json({ status: 'ignored', reason: 'missing_order_id' }, { status: 200 });
    }

    if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
      await markCashfreeOrderStatus({
        orderId,
        status: 'completed',
        cfPaymentId: cfPaymentId == null ? null : String(cfPaymentId),
      });
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED' || paymentStatus === 'EXPIRED') {
      await markCashfreeOrderStatus({
        orderId,
        status: 'failed',
        cfPaymentId: cfPaymentId == null ? null : String(cfPaymentId),
      });
    } else {
      console.log(`[Cashfree Webhook] Ignored event=${event.type || 'unknown'} status=${paymentStatus || 'unknown'}`);
    }
  } catch (error) {
    console.error('[Cashfree Webhook] Processing error:', error instanceof Error ? error.message : error);
  }

  return NextResponse.json({ status: 'processed' }, { status: 200 });
}
