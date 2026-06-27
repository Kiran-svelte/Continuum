'use client';

/**
 * Billing & Plan page — Admin portal.
 *
 * Shows the current plan, employee count, monthly cost,
 * plan limits, and upgrade CTA with Cashfree checkout.
 *
 * Route: /admin/billing
 */
import { useState, useEffect } from 'react';
import { CreditCard, Users, Zap, Check, AlertCircle, Loader2, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RetryButton } from '@/components/ui/retry-button';
import { toast } from 'sonner';

interface BillingData {
  plan: 'free' | 'starter' | 'growth' | 'enterprise';
  status: string;
  employeeCount: number;
  nextBillingDate?: string;
  monthlyAmount?: number;
  currency?: string;
}

const PLAN_DETAILS = {
  free: {
    label: 'Free',
    color: 'text-[var(--muted-foreground)]',
    badgeClass: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
    price: 0,
    perEmployee: 0,
    modules: ['Leave Management', 'Attendance Tracking', 'Employee Directory'],
    limit: 'Up to 10 employees',
  },
  starter: {
    label: 'Starter',
    color: 'text-[var(--muted-foreground)]',
    badgeClass: 'bg-[var(--muted)] text-[var(--muted-foreground)]',
    price: 0,
    perEmployee: 0,
    modules: ['Leave Management', 'Attendance Tracking', 'Employee Directory'],
    limit: 'Up to 10 employees',
  },
  growth: {
    label: 'Growth',
    color: 'text-[var(--primary)]',
    badgeClass: 'bg-[var(--primary)]/10 text-[var(--primary)]',
    price: 199,
    perEmployee: 199,
    modules: [
      'Everything in Starter',
      'Payroll Management',
      'Document Management',
      'Performance Reviews',
      'Reports & Analytics',
      'Priority Support',
    ],
    limit: 'Unlimited employees',
  },
  enterprise: {
    label: 'Enterprise',
    color: 'text-amber-500',
    badgeClass: 'bg-amber-500/10 text-amber-500',
    price: 399,
    perEmployee: 399,
    modules: [
      'Everything in Growth',
      'WhatsApp / Zero UI',
      'Advanced Compliance',
      'Custom Integrations',
      'Dedicated Account Manager',
      'SLA Guarantee',
    ],
    limit: 'Unlimited employees',
  },
};

type CashfreeCheckout = {
  checkout: (options: { paymentSessionId: string; redirectTarget: '_self' | '_blank' }) => void;
};

declare global {
  interface Window {
    Cashfree?: (options: { mode: string }) => Promise<CashfreeCheckout> | CashfreeCheckout;
  }
}

function loadCashfreeScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Checkout is only available in the browser.'));
      return;
    }

    if (window.Cashfree) {
      resolve();
      return;
    }

    const existing = document.getElementById('cashfree-sdk');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Cashfree checkout.')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.id = 'cashfree-sdk';
    script.src = 'https://sdk.cashfree.com/js/v3/cashfree.js';
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Cashfree checkout.'));
    document.body.appendChild(script);
  });
}

export function BillingView() {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState<'growth' | 'enterprise' | null>(null);

  async function loadBilling() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/billing', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json() as BillingData;
      setBilling(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load billing info');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadBilling(); }, []);

  async function handleUpgrade(plan: 'growth' | 'enterprise') {
    setUpgrading(plan);
    try {
      const res = await fetch('/api/payments/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
        credentials: 'include',
      });

      const data = await res.json() as { paymentSessionId?: string; error?: string };

      if (!res.ok || !data.paymentSessionId) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      await loadCashfreeScript();
      if (!window.Cashfree) {
        throw new Error('Cashfree checkout did not initialize.');
      }

      const cashfree = await window.Cashfree({
        mode: process.env.NEXT_PUBLIC_CASHFREE_ENV || 'sandbox',
      });
      cashfree.checkout({
        paymentSessionId: data.paymentSessionId,
        redirectTarget: '_self',
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Payment initiation failed. Please try again.');
      setUpgrading(null);
    }
  }

  const currentPlan = billing?.plan ?? 'starter';
  const currentDetails = PLAN_DETAILS[currentPlan];
  const planRank = { free: 0, starter: 1, growth: 2, enterprise: 3 };
  const currentRank = planRank[currentPlan] ?? 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center gap-3 min-h-[300px] justify-center text-center">
        <AlertCircle className="h-8 w-8 text-[var(--error)]" />
        <p className="text-body text-[var(--muted-foreground)]">{error}</p>
        <RetryButton onRetry={loadBilling} />
      </div>
    );
  }

  const monthlyCost = billing?.monthlyAmount
    ?? (currentDetails.perEmployee * (billing?.employeeCount ?? 0));

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Current Plan Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--primary)]/10">
              <CreditCard className="h-5 w-5 text-[var(--primary)]" />
            </span>
            <div>
              <p className="text-label text-[var(--muted-foreground)]">Current Plan</p>
              <div className="flex items-center gap-2">
                <h2 className="text-h3">{currentDetails.label}</h2>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${currentDetails.badgeClass}`}>
                  {billing?.status === 'active' ? 'Active' : billing?.status ?? 'Active'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-right">
            {currentDetails.perEmployee > 0 ? (
              <>
                <p className="text-h2 font-bold">
                  ₹{monthlyCost.toLocaleString('en-IN')}
                  <span className="text-body font-normal text-[var(--muted-foreground)]">/mo</span>
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  ₹{currentDetails.perEmployee}/employee × {billing?.employeeCount ?? 0} employees
                </p>
              </>
            ) : (
              <p className="text-h2 font-bold">Free</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4">
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <Users className="h-4 w-4" />
            <span>{billing?.employeeCount ?? 0} active employees</span>
          </div>
          {billing?.nextBillingDate && (
            <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <CreditCard className="h-4 w-4" />
              <span>Next billing: {new Date(billing.nextBillingDate).toLocaleDateString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Current plan features */}
        <div className="mt-4 pt-4 border-t border-[var(--border)]">
          <p className="text-label text-[var(--muted-foreground)] mb-2">Included in your plan</p>
          <div className="flex flex-wrap gap-2">
            {currentDetails.modules.map((mod) => (
              <span key={mod} className="inline-flex items-center gap-1 text-sm bg-[var(--success)]/10 text-[var(--success)] rounded-full px-2 py-0.5">
                <Check className="h-3 w-3" aria-hidden />
                {mod}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Upgrade Plans */}
      {currentRank < 2 && (
        <div>
          <h3 className="text-h4 mb-4">Upgrade your plan</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(['growth', 'enterprise'] as const).filter((p) => planRank[p] > currentRank).map((plan) => {
              const details = PLAN_DETAILS[plan];
              const isEnterprise = plan === 'enterprise';

              return (
                <div
                  key={plan}
                  className={`glass-card p-6 flex flex-col gap-4 ${isEnterprise ? 'border-amber-500/30' : 'border-[var(--primary)]/20'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isEnterprise && <Crown className="h-4 w-4 text-amber-500" aria-hidden />}
                      <h4 className={`text-h4 ${details.color}`}>{details.label}</h4>
                    </div>
                    <div className="text-right">
                      <p className="text-h3 font-bold">
                        ₹{details.perEmployee}
                        <span className="text-sm font-normal text-[var(--muted-foreground)]">/emp/mo</span>
                      </p>
                    </div>
                  </div>

                  <p className="text-sm text-[var(--muted-foreground)]">{details.limit}</p>

                  <ul className="space-y-1.5 flex-1">
                    {details.modules.map((mod) => (
                      <li key={mod} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-[var(--success)] flex-shrink-0" aria-hidden />
                        {mod}
                      </li>
                    ))}
                  </ul>

                  {billing && (
                    <p className="text-sm font-medium text-[var(--muted-foreground)] bg-[var(--muted)] rounded-lg px-3 py-2">
                      Estimated: ₹{(details.perEmployee * (billing.employeeCount)).toLocaleString('en-IN')}/mo
                      for {billing.employeeCount} employees
                    </p>
                  )}

                  <Button
                    variant="primary"
                    className="w-full"
                    onClick={() => handleUpgrade(plan)}
                    disabled={upgrading !== null}
                    aria-label={`Upgrade to ${details.label} plan`}
                  >
                    {upgrading === plan ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        Redirecting to payment…
                      </>
                    ) : (
                      <>
                        <Zap className="h-4 w-4" aria-hidden />
                        Upgrade to {details.label}
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-sm text-[var(--muted-foreground)] text-center">
            Secure payment via Cashfree. Upgrade is instant after payment confirmation.
            <br />
            Need help?{' '}
            <a href="/support" className="text-[var(--primary)] hover:underline">Contact support</a>
          </p>
        </div>
      )}

      {currentRank === 2 && (
        <div className="glass-card p-6 flex items-center gap-4">
          <Crown className="h-8 w-8 text-amber-500 flex-shrink-0" aria-hidden />
          <div>
            <p className="font-medium">You're on the Enterprise plan</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              You have access to all features. For changes to your plan, contact your account manager.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
