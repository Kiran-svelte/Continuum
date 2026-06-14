/**
 * Razorpay webhook handler.
 *
 * POST /api/webhooks/razorpay
 * Headers: X-Razorpay-Signature (HMAC-SHA256)
 *
 * Handles asynchronous payment events from Razorpay.
 * Responds 200 immediately to prevent webhook retries,
 * then processes the event asynchronously.
 *
 * This endpoint is NOT authenticated via user JWT — it uses
 * webhook signature verification instead.
 *
 * @module api/webhooks/razorpay
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookSignature } from '@/lib/payment-service';
import prisma from '@/lib/prisma';
import { clampModulesForPlan } from '@/lib/core-functions/plan-modules';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('x-razorpay-signature') ?? '';
  const rawBody = await request.text();

  // Verify webhook signature — respond 200 even on failure to prevent retries
  if (!verifyWebhookSignature(rawBody, signature)) {
    console.error('[Razorpay Webhook] Invalid signature — potential replay attack');
    return NextResponse.json({ status: 'ignored' }, { status: 200 });
  }

  try {
    const event = JSON.parse(rawBody) as {
      event: string;
      payload: {
        payment?: {
          entity: {
            id: string;
            order_id: string;
            status: string;
            amount: number;
          };
        };
      };
    };

    // Process based on event type
    switch (event.event) {
      case 'payment.captured': {
        await handlePaymentCaptured(event.payload.payment?.entity);
        break;
      }
      case 'payment.failed': {
        await handlePaymentFailed(event.payload.payment?.entity);
        break;
      }
      default:
        console.log(`[Razorpay Webhook] Unhandled event: ${event.event}`);
    }
  } catch (error) {
    console.error('[Razorpay Webhook] Processing error:', error instanceof Error ? error.message : error);
  }

  // Always return 200 to acknowledge receipt
  return NextResponse.json({ status: 'processed' }, { status: 200 });
}

/**
 * Handles payment.captured webhook — marks payment as completed.
 * Uses idempotency: if already completed, skip.
 */
async function handlePaymentCaptured(
  entity: { id: string; order_id: string; status: string; amount: number } | undefined,
): Promise<void> {
  if (!entity) return;

  const payment = await prisma.payment.findFirst({
    where: { razorpay_order_id: entity.order_id },
  });

  if (!payment) {
    console.warn(`[Razorpay Webhook] Payment not found for order: ${entity.order_id}`);
    return;
  }

  // Idempotency check
  if (payment.status === 'completed') {
    console.log(`[Razorpay Webhook] Payment already completed: ${payment.id}`);
    return;
  }

  await prisma.payment.update({
    where: { id: payment.id },
    data: {
      status: 'completed',
      razorpay_payment_id: entity.id,
      paid_at: new Date(),
    },
  });

  if (payment.subscription_id) {
    const subscription = await prisma.subscription.findUnique({
      where: { id: payment.subscription_id },
      select: { plan: true, company_id: true },
    });
    if (subscription?.company_id) {
      try {
        await clampModulesForPlan(subscription.company_id, subscription.plan);
        console.log(
          `[Razorpay Webhook] Module cap clamped for company=${subscription.company_id} plan=${subscription.plan}`
        );
      } catch (clampError) {
        console.error('[Razorpay Webhook] Module clamp failed:', clampError);
      }
    }
  }

  console.log(`[Razorpay Webhook] Payment captured: order=${entity.order_id} payment=${entity.id}`);
}

/**
 * Handles payment.failed webhook — marks payment as failed.
 */
async function handlePaymentFailed(
  entity: { id: string; order_id: string; status: string; amount: number } | undefined,
): Promise<void> {
  if (!entity) return;

  const payment = await prisma.payment.findFirst({
    where: { razorpay_order_id: entity.order_id },
  });

  if (!payment) return;

  // Don't overwrite a completed payment with a failure (out-of-order delivery)
  if (payment.status === 'completed') return;

  await prisma.payment.update({
    where: { id: payment.id },
    data: { status: 'failed' },
  });

  console.log(`[Razorpay Webhook] Payment failed: order=${entity.order_id}`);
}
