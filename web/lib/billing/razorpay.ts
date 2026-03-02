import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface RazorpaySubscriptionParams {
  companyId: string;
  planSlug: string;
  actorId: string;
}

export interface RazorpayPaymentVerification {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}

export interface RazorpayWebhookPayload {
  event: string;
  payload: {
    payment?: { entity: { id: string; amount: number; status: string } };
    subscription?: { entity: { id: string; status: string } };
  };
}

// ─── Razorpay Client ─────────────────────────────────────────────────────────

function getRazorpayClient() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials not configured');
  }

  // Dynamic import to avoid build errors when razorpay is not configured
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Razorpay = require('razorpay');
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Creates a Razorpay subscription for a company.
 * Stub: In production, this would call Razorpay API to create a subscription.
 */
export async function createRazorpaySubscription(
  params: RazorpaySubscriptionParams
): Promise<{ subscriptionId: string; shortUrl: string }> {
  const { companyId, planSlug, actorId } = params;

  try {
    const razorpay = getRazorpayClient();

    // In production: create a Razorpay plan and subscription
    const subscription = await razorpay.subscriptions.create({
      plan_id: `plan_${planSlug}`,
      total_count: 12,
      quantity: 1,
    });

    // Update local subscription record
    await prisma.subscription.updateMany({
      where: { company_id: companyId },
      data: {
        razorpay_subscription_id: subscription.id,
        status: 'active',
      },
    });

    await createAuditLog({
      companyId,
      actorId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGE,
      entityType: 'subscription',
      entityId: companyId,
      newState: { plan: planSlug, razorpay_id: subscription.id },
    });

    return {
      subscriptionId: subscription.id,
      shortUrl: subscription.short_url || '',
    };
  } catch (error) {
    console.error('[Razorpay] Subscription creation failed:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Verifies a Razorpay payment signature.
 * Stub: In production, validates using HMAC-SHA256.
 */
export async function verifyRazorpayPayment(
  verification: RazorpayPaymentVerification,
  companyId: string
): Promise<boolean> {
  try {
    const { createHmac } = await import('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET!;

    const body = `${verification.razorpay_payment_id}|${verification.razorpay_subscription_id}`;
    const expectedSignature = createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === verification.razorpay_signature;

    if (isValid) {
      // Record payment
      const subscription = await prisma.subscription.findFirst({
        where: { company_id: companyId, razorpay_subscription_id: verification.razorpay_subscription_id },
      });

      if (subscription) {
        await prisma.payment.create({
          data: {
            company_id: companyId,
            subscription_id: subscription.id,
            amount: 0, // Will be updated from webhook
            currency: 'INR',
            status: 'completed',
            razorpay_payment_id: verification.razorpay_payment_id,
          },
        });
      }
    }

    return isValid;
  } catch (error) {
    console.error('[Razorpay] Payment verification failed:', error);
    return false;
  }
}

/**
 * Handles Razorpay webhook events.
 * Stub: Processes subscription and payment events.
 */
export async function handleRazorpayWebhook(
  payload: RazorpayWebhookPayload,
  companyId: string
): Promise<void> {
  const { event } = payload;

  switch (event) {
    case 'subscription.activated':
      await prisma.subscription.updateMany({
        where: { company_id: companyId },
        data: { status: 'active' },
      });
      break;

    case 'subscription.cancelled':
      await prisma.subscription.updateMany({
        where: { company_id: companyId },
        data: { status: 'cancelled' },
      });
      break;

    case 'payment.captured':
      if (payload.payload.payment) {
        const payment = payload.payload.payment.entity;
        const subscription = await prisma.subscription.findFirst({
          where: { company_id: companyId },
        });

        if (subscription) {
          await prisma.payment.create({
            data: {
              company_id: companyId,
              subscription_id: subscription.id,
              amount: payment.amount / 100, // Convert paise to rupees
              currency: 'INR',
              status: 'completed',
              razorpay_payment_id: payment.id,
            },
          });
        }
      }
      break;

    default:
      console.log(`[Razorpay] Unhandled webhook event: ${event}`);
  }
}
