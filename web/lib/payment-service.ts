/**
 * Razorpay payment service.
 *
 * Handles order creation, payment signature verification, and webhook processing.
 * All Razorpay interactions go through this adapter — the core domain never
 * imports Razorpay directly.
 *
 * Configuration:
 * - RAZORPAY_KEY_ID: Razorpay API key
 * - RAZORPAY_KEY_SECRET: Razorpay API secret
 * - RAZORPAY_WEBHOOK_SECRET: Webhook signature verification secret
 *
 * @module payment-service
 */

import { createHmac } from 'crypto';
import prisma from '@/lib/prisma';
import { randomUUID } from 'crypto';
import type { PaymentStatus, SubscriptionPlan } from '@prisma/client';
import { clampModulesForPlan } from '@/lib/core-functions/plan-modules';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CreateOrderParams {
  /** Amount in INR (rupees, not paise — this service converts internally) */
  amountInr: number;
  /** Company ID for tenant isolation */
  companyId: string;
  /** Subscription/plan reference */
  planId: string;
  /** Optional receipt identifier */
  receipt?: string;
  /** Additional notes for Razorpay dashboard */
  notes?: Record<string, string>;
}

export interface CreateOrderResult {
  isSuccess: boolean;
  /** Razorpay order ID (only on success) */
  orderId?: string;
  /** Amount in paise (only on success) */
  amountPaise?: number;
  /** Razorpay key ID for frontend checkout (only on success) */
  keyId?: string;
  error?: string;
}

export interface VerifyPaymentParams {
  /** Razorpay order ID from checkout */
  orderId: string;
  /** Razorpay payment ID from checkout callback */
  paymentId: string;
  /** Razorpay signature from checkout callback */
  signature: string;
  /** Company ID for tenant isolation */
  companyId: string;
}

export interface VerifyPaymentResult {
  isSuccess: boolean;
  /** Payment record ID in our database */
  paymentRecordId?: string;
  error?: string;
}

// ─── Configuration ───────────────────────────────────────────────────────────

/**
 * Reads Razorpay configuration from environment variables.
 * Returns null if not configured.
 */
function getRazorpayConfig(): {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
} | null {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return {
    keyId,
    keySecret,
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || undefined,
  };
}

/** Razorpay API base URL */
const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

/** HTTP request timeout for Razorpay API calls */
const RAZORPAY_TIMEOUT_MS = 10_000;

const SUBSCRIPTION_PLANS = new Set<SubscriptionPlan>([
  'free',
  'starter',
  'growth',
  'enterprise',
]);

async function ensureBillingSubscription(companyId: string, planId: string) {
  const existingSubscription = await prisma.subscription.findFirst({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
  });

  if (existingSubscription) {
    return existingSubscription;
  }

  const plan = SUBSCRIPTION_PLANS.has(planId as SubscriptionPlan)
    ? (planId as SubscriptionPlan)
    : 'growth';

  return prisma.subscription.create({
    data: {
      id: randomUUID(),
      company_id: companyId,
      plan,
      status: 'trial',
      updated_at: new Date(),
    },
  });
}

// ─── Order Creation ──────────────────────────────────────────────────────────

/**
 * Creates a Razorpay order for a subscription payment.
 *
 * Converts INR to paise, creates the order via Razorpay API,
 * and persists a Payment record in our database.
 *
 * @param params - Order details
 * @returns Order creation result with Razorpay order ID
 */
export async function createPaymentOrder(params: CreateOrderParams): Promise<CreateOrderResult> {
  const config = getRazorpayConfig();
  if (!config) {
    return { isSuccess: false, error: 'Payment provider is not configured.' };
  }

  const amountPaise = Math.round(params.amountInr * 100);
  if (amountPaise <= 0) {
    return { isSuccess: false, error: 'Amount must be greater than zero.' };
  }

  try {
    const authHeader = Buffer.from(`${config.keyId}:${config.keySecret}`).toString('base64');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), RAZORPAY_TIMEOUT_MS);

    const response = await fetch(`${RAZORPAY_API_BASE}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${authHeader}`,
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency: 'INR',
        receipt: params.receipt ?? `rcpt_${randomUUID().slice(0, 8)}`,
        notes: {
          company_id: params.companyId,
          plan_id: params.planId,
          ...params.notes,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[PaymentService] Razorpay order creation failed: ${response.status}`, errorBody);
      return { isSuccess: false, error: 'Failed to create payment order.' };
    }

    const order = await response.json() as { id: string; amount: number };

    const subscription = await ensureBillingSubscription(params.companyId, params.planId);

    // Persist payment record in pending state
    await prisma.payment.create({
      data: {
        id: randomUUID(),
        company_id: params.companyId,
        subscription_id: subscription.id,
        amount: params.amountInr,
        currency: 'INR',
        status: 'pending',
        razorpay_order_id: order.id,
      },
    });

    return {
      isSuccess: true,
      orderId: order.id,
      amountPaise: order.amount,
      keyId: config.keyId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown payment error';
    console.error('[PaymentService] Order creation failed:', message);
    return { isSuccess: false, error: 'Payment service temporarily unavailable.' };
  }
}

// ─── Payment Verification ────────────────────────────────────────────────────

/**
 * Verifies a Razorpay payment signature and marks the payment as completed.
 *
 * Uses HMAC-SHA256 to verify the signature provided by Razorpay's checkout.
 * On success, updates the Payment record and activates the subscription.
 *
 * @param params - Payment verification details from Razorpay checkout callback
 * @returns Verification result
 */
export async function verifyPayment(params: VerifyPaymentParams): Promise<VerifyPaymentResult> {
  const config = getRazorpayConfig();
  if (!config) {
    return { isSuccess: false, error: 'Payment provider is not configured.' };
  }

  // Verify signature: HMAC-SHA256(orderId + "|" + paymentId, keySecret)
  const expectedSignature = createHmac('sha256', config.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex');

  if (expectedSignature !== params.signature) {
    console.error('[PaymentService] Payment signature verification FAILED', {
      orderId: params.orderId,
      companyId: params.companyId,
    });
    return { isSuccess: false, error: 'Payment verification failed.' };
  }

  try {
    // Find and update the payment record
    const payment = await prisma.payment.findFirst({
      where: {
        razorpay_order_id: params.orderId,
        company_id: params.companyId,
        status: 'pending',
      },
    });

    if (!payment) {
      return { isSuccess: false, error: 'Payment record not found.' };
    }

    // Update payment as completed
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: 'completed',
        razorpay_payment_id: params.paymentId,
        razorpay_signature: params.signature,
        paid_at: new Date(),
      },
    });

    // Activate subscription for the company
    await activateSubscription(params.companyId);

    return { isSuccess: true, paymentRecordId: payment.id };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PaymentService] Payment verification DB update failed:', message);
    return { isSuccess: false, error: 'Failed to process payment.' };
  }
}

// ─── Webhook Verification ────────────────────────────────────────────────────

/**
 * Verifies a Razorpay webhook signature.
 *
 * @param body - Raw request body string
 * @param signature - X-Razorpay-Signature header value
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const config = getRazorpayConfig();
  if (!config?.webhookSecret) {
    console.error('[PaymentService] Webhook secret not configured');
    return false;
  }

  const expectedSignature = createHmac('sha256', config.webhookSecret)
    .update(body)
    .digest('hex');

  return expectedSignature === signature;
}

export function verifyCashfreeWebhookSignature(
  body: string,
  signature: string,
  timestamp: string
): boolean {
  const webhookSecret = process.env.CASHFREE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    console.error('[PaymentService] Cashfree webhook secret not configured');
    return false;
  }

  if (!signature || !timestamp) {
    return false;
  }

  const expectedSignature = createHmac('sha256', webhookSecret)
    .update(timestamp + body)
    .digest('base64');

  return expectedSignature === signature;
}

export async function markCashfreeOrderStatus(params: {
  orderId: string;
  status: Extract<PaymentStatus, 'completed' | 'failed'>;
  cfPaymentId?: string | null;
}): Promise<void> {
  const data: {
    status: Extract<PaymentStatus, 'completed' | 'failed'>;
    cashfree_payment_id?: string;
    paid_at?: Date;
  } = { status: params.status };

  if (params.cfPaymentId) {
    data.cashfree_payment_id = params.cfPaymentId;
  }
  if (params.status === 'completed') {
    data.paid_at = new Date();
  }

  const matchingPayments = await prisma.payment.findMany({
    where: {
      OR: [
        { cashfree_order_id: params.orderId },
        { razorpay_order_id: params.orderId },
        { id: params.orderId },
      ],
    },
    select: {
      id: true,
      company_id: true,
      subscription_id: true,
      subscription: {
        select: {
          id: true,
          plan: true,
        },
      },
    },
  });

  const result = await prisma.payment.updateMany({
    where: {
      OR: [
        { cashfree_order_id: params.orderId },
        { razorpay_order_id: params.orderId },
        { id: params.orderId },
      ],
    },
    data,
  });

  if (result.count === 0) {
    console.warn(`[PaymentService] Cashfree order not matched: ${params.orderId}`);
  }

  if (params.status !== 'completed') {
    return;
  }

  const targetPlan = getCashfreePlanFromOrderId(params.orderId);
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1);

  for (const payment of matchingPayments) {
    const plan = targetPlan ?? payment.subscription.plan;
    await prisma.subscription.update({
      where: { id: payment.subscription_id },
      data: {
        plan,
        status: 'active',
        current_period_start: startDate,
        current_period_end: endDate,
        updated_at: new Date(),
      },
    });
    await clampModulesForPlan(payment.company_id, plan);
  }
}

function getCashfreePlanFromOrderId(orderId: string): SubscriptionPlan | null {
  const match = /^cf-(growth|enterprise)-/.exec(orderId);
  if (!match) return null;
  return match[1] as SubscriptionPlan;
}

// ─── Subscription Activation ─────────────────────────────────────────────────

/**
 * Activates a company's subscription after successful payment.
 * Creates or extends the subscription period.
 *
 * @param companyId - Company to activate
 */
async function activateSubscription(companyId: string): Promise<void> {
  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setMonth(endDate.getMonth() + 1); // Default to monthly

  // Upsert subscription
  const existingSubscription = await prisma.subscription.findFirst({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' },
  });

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: {
        status: 'active',
        current_period_start: startDate,
        current_period_end: endDate,
        updated_at: new Date(),
      },
    });
  } else {
    await prisma.subscription.create({
      data: {
        id: randomUUID(),
        company_id: companyId,
        plan: 'growth',
        status: 'active',
        current_period_start: startDate,
        current_period_end: endDate,
        updated_at: new Date(),
      },
    });
  }

  console.log(`[PaymentService] Subscription activated: company=${companyId} until=${endDate.toISOString()}`);
}
