'use client';

/**
 * BillingUpgradeButton
 *
 * Client component that triggers Razorpay checkout for plan upgrades.
 * Calls POST /api/payments/create-order to get a Razorpay order,
 * then opens the Razorpay modal. On success, reloads the billing page.
 *
 * @param planId - PricingPlan.id from the database
 * @param label - Button label text
 * @param isEnterprise - If true, redirects to /help instead of Razorpay
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Zap, Loader2 } from 'lucide-react';

/** Razorpay checkout options type (minimal surface we use). */
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => void;
  prefill: { email?: string };
  theme: { color: string };
}

/** Shape of the window.Razorpay constructor (not typed by default). */
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Razorpay: new (options: RazorpayOptions) => { open: () => void };
  }
}

interface BillingUpgradeButtonProps {
  planId: string;
  label: string;
  isEnterprise: boolean;
}

/** Dynamically injects the Razorpay checkout script if not already loaded. */
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (document.getElementById('razorpay-script')) {
      resolve(true);
      return;
    }
    const script = document.createElement('script');
    script.id = 'razorpay-script';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

/** Opens Razorpay modal with the given order details. */
async function openRazorpayCheckout(params: {
  orderId: string;
  amount: number;
  keyId: string;
  planName: string;
  onSuccess: () => void;
  onError: (message: string) => void;
}): Promise<void> {
  const isLoaded = await loadRazorpayScript();
  if (!isLoaded || !window.Razorpay) {
    params.onError('Could not load payment gateway. Please check your connection and try again.');
    return;
  }

  const razorpay = new window.Razorpay({
    key: params.keyId,
    amount: params.amount,
    currency: 'INR',
    name: 'Continuum HR',
    description: `${params.planName} Plan — Monthly`,
    order_id: params.orderId,
    handler: async (response) => {
      try {
        const verifyResponse = await fetch('/api/payments/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          }),
        });

        if (!verifyResponse.ok) {
          params.onError('Payment verification failed. Contact support with your payment reference.');
          return;
        }

        params.onSuccess();
      } catch {
        params.onError('Payment verification request failed. Please contact support.');
      }
    },
    prefill: {},
    theme: { color: '#6366f1' },
  });

  razorpay.open();
}

export function BillingUpgradeButton({ planId, label, isEnterprise }: BillingUpgradeButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (isEnterprise) {
    return (
      <a
        href="/help"
        className="btn btn-secondary flex items-center gap-2"
        id="billing-contact-sales"
      >
        <Zap className="w-4 h-4" aria-hidden="true" />
        {label}
      </a>
    );
  }

  async function handleUpgrade(): Promise<void> {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetch('/api/payments/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json() as {
        orderId?: string;
        amount?: number;
        keyId?: string;
        planName?: string;
        error?: { message: string };
      };

      if (!response.ok || !data.orderId) {
        setErrorMessage(data.error?.message ?? 'Failed to start checkout. Please try again.');
        setIsLoading(false);
        return;
      }

      await openRazorpayCheckout({
        orderId: data.orderId,
        amount: data.amount!,
        keyId: data.keyId!,
        planName: data.planName ?? 'Growth',
        onSuccess: () => {
          router.refresh();
        },
        onError: (message) => {
          setErrorMessage(message);
        },
      });
    } catch {
      setErrorMessage('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={() => { void handleUpgrade(); }}
        disabled={isLoading}
        className="btn btn-primary flex items-center gap-2"
        id="billing-upgrade-button"
        aria-busy={isLoading}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
        ) : (
          <Zap className="w-4 h-4" aria-hidden="true" />
        )}
        {isLoading ? 'Opening checkout…' : label}
      </button>
      {errorMessage && (
        <p className="text-xs text-[var(--danger)] max-w-xs text-right" role="alert">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
