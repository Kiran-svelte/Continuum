import prisma from '@/lib/prisma';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface StripeSubscriptionParams {
  companyId: string;
  planSlug: string;
  actorId: string;
  email: string;
}

export interface StripeWebhookPayload {
  type: string;
  data: {
    object: {
      id: string;
      customer: string;
      status: string;
      amount?: number;
      currency?: string;
    };
  };
}

// ─── Stripe Client ───────────────────────────────────────────────────────────

function getStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Stripe credentials not configured');
  }

  // Dynamic import to avoid build errors when stripe is not installed
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const Stripe = require('stripe');
  return new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' });
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Creates a Stripe checkout session for subscription.
 * Stub: In production, redirects to Stripe-hosted checkout.
 */
export async function createStripeCheckout(
  params: StripeSubscriptionParams
): Promise<{ sessionId: string; url: string }> {
  const { companyId, planSlug, actorId, email } = params;

  try {
    const stripe = getStripeClient();

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer_email: email,
      line_items: [
        {
          price: `price_${planSlug}`,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/hr/settings?billing=success`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/hr/settings?billing=cancelled`,
      metadata: {
        company_id: companyId,
        plan_slug: planSlug,
      },
    });

    await createAuditLog({
      companyId,
      actorId,
      action: AUDIT_ACTIONS.SUBSCRIPTION_CHANGE,
      entityType: 'subscription',
      entityId: companyId,
      newState: { plan: planSlug, provider: 'stripe', session_id: session.id },
    });

    return {
      sessionId: session.id,
      url: session.url || '',
    };
  } catch (error) {
    console.error('[Stripe] Checkout creation failed:', error);
    throw new Error('Failed to create checkout session');
  }
}

/**
 * Handles Stripe webhook events.
 * Stub: Processes checkout, subscription, and invoice events.
 */
export async function handleStripeWebhook(
  payload: StripeWebhookPayload,
  companyId: string
): Promise<void> {
  const { type, data } = payload;

  switch (type) {
    case 'checkout.session.completed': {
      const session = data.object;
      await prisma.subscription.updateMany({
        where: { company_id: companyId },
        data: {
          stripe_subscription_id: session.id,
          status: 'active',
        },
      });
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = data.object;
      const statusMap: Record<string, string> = {
        active: 'active',
        canceled: 'cancelled',
        past_due: 'expired',
        trialing: 'trial',
      };

      await prisma.subscription.updateMany({
        where: { company_id: companyId },
        data: {
          status: (statusMap[subscription.status] || 'active') as 'active' | 'cancelled' | 'expired' | 'trial',
        },
      });
      break;
    }

    case 'customer.subscription.deleted': {
      await prisma.subscription.updateMany({
        where: { company_id: companyId },
        data: { status: 'cancelled' },
      });
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = data.object;
      const subscription = await prisma.subscription.findFirst({
        where: { company_id: companyId },
      });

      if (subscription) {
        await prisma.payment.create({
          data: {
            company_id: companyId,
            subscription_id: subscription.id,
            amount: (invoice.amount || 0) / 100,
            currency: invoice.currency || 'USD',
            status: 'completed',
            stripe_payment_id: invoice.id,
          },
        });

        await createAuditLog({
          companyId,
          actorId: null,
          action: AUDIT_ACTIONS.PAYMENT_RECEIVED,
          entityType: 'payment',
          entityId: invoice.id,
          newState: {
            amount: (invoice.amount || 0) / 100,
            currency: invoice.currency,
            provider: 'stripe',
          },
        });
      }
      break;
    }

    default:
      console.log(`[Stripe] Unhandled webhook event: ${type}`);
  }
}

/**
 * Verifies a Stripe webhook signature.
 * Stub: In production, validates using Stripe's webhook secret.
 */
export function verifyStripeWebhookSignature(
  body: string,
  signature: string
): boolean {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[Stripe] Webhook secret not configured');
    return false;
  }

  try {
    const stripe = getStripeClient();
    stripe.webhooks.constructEvent(body, signature, webhookSecret);
    return true;
  } catch {
    console.error('[Stripe] Webhook signature verification failed');
    return false;
  }
}
