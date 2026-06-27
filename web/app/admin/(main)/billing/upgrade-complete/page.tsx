'use client';

/**
 * Plan upgrade completion page.
 *
 * Shown after Cashfree payment redirects back.
 * Verifies payment status and shows success/failure UI.
 *
 * Route: /admin/billing/upgrade-complete
 */
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle, XCircle, Loader2, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Status = 'checking' | 'success' | 'failed' | 'pending';

function UpgradeCompleteContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [plan, setPlan] = useState<string>('');

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    const paymentStatus = searchParams.get('status');

    if (!orderId) {
      setStatus('failed');
      return;
    }

    // Cashfree sends status in the URL on redirect
    if (paymentStatus === 'SUCCESS' || paymentStatus === 'PAID') {
      // Verify server-side
      void verifyPayment(orderId);
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      setStatus('failed');
    } else {
      // Unknown status — verify server-side
      void verifyPayment(orderId);
    }
  }, [searchParams]);

  async function verifyPayment(orderId: string) {
    try {
      const res = await fetch(`/api/payments/status?order_id=${orderId}`, {
        credentials: 'include',
      });
      const data = await res.json() as { status?: string; plan?: string };

      if (data.status === 'completed') {
        setPlan(data.plan ?? '');
        setStatus('success');
      } else if (data.status === 'pending') {
        setStatus('pending');
      } else {
        setStatus('failed');
      }
    } catch {
      setStatus('failed');
    }
  }

  if (status === 'checking') {
    return (
      <div className="text-center py-12">
        <Loader2 className="h-12 w-12 animate-spin text-[var(--primary)] mx-auto mb-4" />
        <h2 className="text-h3">Verifying your payment…</h2>
        <p className="text-body text-[var(--muted-foreground)] mt-2">
          Please don't close this page.
        </p>
      </div>
    );
  }

  if (status === 'success') {
    const planLabel = plan === 'enterprise' ? 'Enterprise' : plan === 'growth' ? 'Growth' : plan;
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--success)]/10 rounded-full mb-6">
          <CheckCircle className="h-10 w-10 text-[var(--success)]" aria-hidden />
        </div>
        <h2 className="text-h2">Plan upgraded successfully!</h2>
        <p className="text-body text-[var(--muted-foreground)] mt-2 mb-6">
          Your account is now on the{' '}
          <span className="font-semibold text-[var(--foreground)]">{planLabel}</span> plan.
          All features are immediately available.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            onClick={() => router.push('/admin/dashboard')}
          >
            Go to Dashboard
            <ArrowRight className="h-4 w-4 ml-1" aria-hidden />
          </Button>
          <Button
            variant="ghost"
            onClick={() => router.push('/admin/billing')}
          >
            View billing details
          </Button>
        </div>
      </div>
    );
  }

  if (status === 'pending') {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-amber-500/10 rounded-full mb-6">
          <Loader2 className="h-10 w-10 text-amber-500 animate-spin" aria-hidden />
        </div>
        <h2 className="text-h3">Payment is being processed</h2>
        <p className="text-body text-[var(--muted-foreground)] mt-2 mb-6">
          Your payment is in progress. Your plan will be upgraded automatically once confirmed.
          This usually takes less than a minute.
        </p>
        <Button
          variant="outline"
          onClick={() => router.push('/admin/billing')}
        >
          Check billing status
        </Button>
      </div>
    );
  }

  // Failed
  return (
    <div className="text-center py-12">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-[var(--error)]/10 rounded-full mb-6">
        <XCircle className="h-10 w-10 text-[var(--error)]" aria-hidden />
      </div>
      <h2 className="text-h3">Payment was not completed</h2>
      <p className="text-body text-[var(--muted-foreground)] mt-2 mb-6">
        Your payment could not be processed. You have not been charged.
        Please try again or contact support if the issue persists.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button
          variant="primary"
          onClick={() => router.push('/admin/billing')}
        >
          Try again
        </Button>
        <Button
          variant="ghost"
          onClick={() => window.open('/support', '_blank')}
        >
          Contact support
        </Button>
      </div>
    </div>
  );
}

export default function UpgradeCompletePage() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="glass-card p-8 max-w-lg w-full">
        <Suspense
          fallback={
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)] mx-auto" />
            </div>
          }
        >
          <UpgradeCompleteContent />
        </Suspense>
      </div>
    </div>
  );
}
