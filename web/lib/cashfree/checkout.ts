/**
 * Cashfree Payment Gateway integration.
 *
 * Creates payment orders for plan upgrades.
 * Cashfree is the primary payment processor for Indian market.
 *
 * Environment variables:
 *   CASHFREE_APP_ID     — Cashfree App ID
 *   CASHFREE_SECRET_KEY — Cashfree Secret Key
 *   CASHFREE_ENV        — 'sandbox' | 'production' (default: 'sandbox')
 *   APP_URL             — Base URL for return URLs
 *
 * @see https://docs.cashfree.com/docs/create-order
 */

const CASHFREE_BASE_URL = {
  sandbox: 'https://sandbox.cashfree.com/pg',
  production: 'https://api.cashfree.com/pg',
};

function getCashfreeConfig() {
  const appId = process.env.CASHFREE_APP_ID;
  const secretKey = process.env.CASHFREE_SECRET_KEY;
  const env = (process.env.CASHFREE_ENV || 'sandbox') as 'sandbox' | 'production';

  if (!appId || !secretKey) return null;

  return { appId, secretKey, env, baseUrl: CASHFREE_BASE_URL[env] };
}

export interface PlanPrice {
  plan: 'growth' | 'enterprise';
  pricePerEmployee: number; // INR per employee per month
  currency: 'INR';
}

// Plan pricing (configurable here, shown on pricing page)
export const PLAN_PRICES: Record<string, PlanPrice> = {
  growth: {
    plan: 'growth',
    pricePerEmployee: 199,
    currency: 'INR',
  },
  enterprise: {
    plan: 'enterprise',
    pricePerEmployee: 399,
    currency: 'INR',
  },
};

export interface CreateOrderInput {
  orderId: string;           // Your unique order ID
  companyId: string;
  planName: 'growth' | 'enterprise';
  employeeCount: number;     // Number of employees (determines price)
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  returnUrl: string;         // Redirect after payment
}

export type CreateOrderResult =
  | {
      ok: true;
      paymentSessionId: string;  // Used to initialize Cashfree JS SDK
      orderId: string;
      amount: number;
      cfOrderId: string;
    }
  | {
      ok: false;
      error: string;
    };

/**
 * Creates a Cashfree payment order for a plan upgrade.
 *
 * @param input - Order details
 * @returns Payment session ID for the Cashfree JS SDK
 */
export async function createCashfreeOrder(
  input: CreateOrderInput
): Promise<CreateOrderResult> {
  const config = getCashfreeConfig();
  if (!config) {
    return { ok: false, error: 'Payment gateway not configured' };
  }

  const planPrice = PLAN_PRICES[input.planName];
  if (!planPrice) {
    return { ok: false, error: `Unknown plan: ${input.planName}` };
  }

  const amount = planPrice.pricePerEmployee * input.employeeCount;

  const orderPayload = {
    order_id: input.orderId,
    order_amount: amount,
    order_currency: 'INR',
    order_note: `Continuum HR — ${input.planName} plan (${input.employeeCount} employees)`,
    customer_details: {
      customer_id: input.companyId,
      customer_name: input.customerName,
      customer_email: input.customerEmail,
      customer_phone: input.customerPhone,
    },
    order_meta: {
      return_url: `${input.returnUrl}?order_id={order_id}&status={order_status}`,
      notify_url: `${process.env.APP_URL ?? ''}/api/webhooks/cashfree`,
    },
    order_tags: {
      company_id: input.companyId,
      plan: input.planName,
      employee_count: String(input.employeeCount),
    },
  };

  try {
    const response = await fetch(`${config.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown');
      return { ok: false, error: `Cashfree error ${response.status}: ${errText.slice(0, 200)}` };
    }

    const data = (await response.json()) as {
      order_id: string;
      cf_order_id: string;
      payment_session_id: string;
      order_amount: number;
    };

    return {
      ok: true,
      paymentSessionId: data.payment_session_id,
      orderId: data.order_id,
      amount: data.order_amount,
      cfOrderId: data.cf_order_id,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : 'Network error',
    };
  }
}

/**
 * Verifies a Cashfree payment order status.
 * Call this after the customer returns from the payment page.
 *
 * @param orderId - The order ID to verify
 * @returns Order status
 */
export async function verifyCashfreeOrder(
  orderId: string
): Promise<{ ok: true; status: string; amount: number } | { ok: false; error: string }> {
  const config = getCashfreeConfig();
  if (!config) return { ok: false, error: 'Payment gateway not configured' };

  try {
    const response = await fetch(`${config.baseUrl}/orders/${orderId}`, {
      method: 'GET',
      headers: {
        'x-api-version': '2023-08-01',
        'x-client-id': config.appId,
        'x-client-secret': config.secretKey,
      },
    });

    if (!response.ok) {
      return { ok: false, error: `Verification failed: ${response.status}` };
    }

    const data = (await response.json()) as {
      order_status: string;
      order_amount: number;
    };

    return { ok: true, status: data.order_status, amount: data.order_amount };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Network error' };
  }
}
