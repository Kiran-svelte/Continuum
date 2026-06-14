/**
 * Admin Billing & Subscription Page
 *
 * Displays current plan, usage metrics, payment history, and upgrade options.
 * Renders Razorpay checkout when user clicks "Upgrade".
 * Only accessible by users with `company.manage_billing` permission.
 *
 * @module app/admin/(main)/billing/page
 */

import { redirect } from 'next/navigation';
import { CreditCard, Zap, Users, CheckCircle2, Calendar, ArrowRight, Building2 } from 'lucide-react';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { DashboardTemplate } from '@/components/layouts/dashboard-template';
import { BillingUpgradeButton } from '@/components/admin/billing-upgrade-button';

/** Plan display metadata aligned with pricing page copy. */
const PLAN_DISPLAY = {
  starter: {
    name: 'Starter',
    color: 'var(--muted-foreground)',
    maxEmployees: 50,
    priceMonthly: 2499,
  },
  growth: {
    name: 'Growth',
    color: 'var(--primary)',
    maxEmployees: 500,
    priceMonthly: 5999,
  },
  enterprise: {
    name: 'Enterprise',
    color: 'var(--success)',
    maxEmployees: Infinity,
    priceMonthly: 0,
  },
} as const;

type PlanKey = keyof typeof PLAN_DISPLAY;

/**
 * Formats a Date as a readable locale string for display.
 * Always uses UTC source, locale formatting happens on render.
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Returns days remaining until the given date.
 * Returns 0 if date is in the past.
 */
function daysUntil(date: Date): number {
  const diff = date.getTime() - Date.now();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default async function BillingView() {
  let employee;
  try {
    employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'company.manage_billing');
  } catch (err) {
    if (err instanceof AuthError) {
      redirect(`/sign-in?redirect=/admin/billing&error=auth_required`);
    }
    throw err;
  }

  const companyId = employee.org_id;
  if (!companyId) {
    redirect('/admin/dashboard');
  }

  // Fetch subscription, employee count, and payment history in parallel.
  const [subscription, employeeCount, recentPayments, company] = await Promise.all([
    prisma.subscription.findFirst({
      where: { company_id: companyId },
      orderBy: { created_at: 'desc' },
    }),
    prisma.employee.count({
      where: { org_id: companyId, deleted_at: null },
    }),
    prisma.payment.findMany({
      where: { company_id: companyId, status: 'completed' },
      orderBy: { paid_at: 'desc' },
      take: 5,
    }),
    prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    }),
  ]);

  const currentPlanKey = (subscription?.plan ?? 'starter') as PlanKey;
  const planInfo = PLAN_DISPLAY[currentPlanKey] ?? PLAN_DISPLAY.starter;
  const isActive = subscription?.status === 'active';
  const periodEnd = subscription?.current_period_end ?? null;
  const daysLeft = periodEnd ? daysUntil(periodEnd) : null;

  const growthPlanId = 'plan_growth'; // TODO(agent): replace with real PricingPlan.id from DB seed

  return (
    <DashboardTemplate
      title="Billing & Subscription"
      description={`Manage your subscription for ${company?.name ?? 'your organisation'}.`}
    >
      {/* ── Current Plan Banner ── */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card p-6 col-span-2">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)] mb-1">
                Current Plan
              </p>
              <h2 className="text-3xl font-black" style={{ color: planInfo.color }}>
                {planInfo.name}
              </h2>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
                    isActive
                      ? 'bg-[var(--success)]/10 text-[var(--success)]'
                      : 'bg-[var(--warning)]/10 text-[var(--warning)]'
                  }`}
                >
                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                  {isActive ? 'Active' : 'Inactive'}
                </span>
                {daysLeft !== null && (
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {daysLeft} days remaining
                  </span>
                )}
              </div>
            </div>
            {currentPlanKey !== 'enterprise' && (
              <BillingUpgradeButton
                planId={growthPlanId}
                label={currentPlanKey === 'starter' ? 'Upgrade to Growth' : 'Contact Sales'}
                isEnterprise={currentPlanKey === 'growth'}
              />
            )}
          </div>

          {periodEnd && (
            <div className="mt-6 pt-4 border-t border-[var(--border)] flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              Next renewal: <span className="font-medium text-[var(--foreground)]">{formatDate(periodEnd)}</span>
            </div>
          )}
        </div>

        {/* Usage Card */}
        <div className="card p-6 flex flex-col gap-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
            Seat Usage
          </p>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black">{employeeCount}</span>
            <span className="text-[var(--muted-foreground)] text-lg pb-1">
              / {planInfo.maxEmployees === Infinity ? '∞' : planInfo.maxEmployees}
            </span>
          </div>
          <div className="w-full bg-[var(--muted)] rounded-full h-2 overflow-hidden">
            <div
              className="h-2 rounded-full bg-[var(--primary)] transition-all"
              style={{
                width: planInfo.maxEmployees === Infinity
                  ? '10%'
                  : `${Math.min(100, (employeeCount / planInfo.maxEmployees) * 100)}%`,
              }}
              role="progressbar"
              aria-valuenow={employeeCount}
              aria-valuemax={planInfo.maxEmployees === Infinity ? 9999 : planInfo.maxEmployees}
              aria-label="Seat usage"
            />
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">
            {planInfo.maxEmployees === Infinity
              ? 'Unlimited seats on your plan'
              : `${planInfo.maxEmployees - employeeCount} seats remaining`}
          </p>
        </div>
      </section>

      {/* ── Plan Comparison ── */}
      <section className="mb-8">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
          Available Plans
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(Object.entries(PLAN_DISPLAY) as [PlanKey, typeof PLAN_DISPLAY[PlanKey]][]).map(([key, plan]) => (
            <div
              key={key}
              className={`card p-5 ${
                key === currentPlanKey
                  ? 'border-[var(--primary)] bg-[var(--primary)]/5'
                  : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-lg" style={{ color: plan.color }}>{plan.name}</span>
                {key === currentPlanKey && (
                  <span className="text-[10px] bg-[var(--primary)] text-white font-bold uppercase px-2 py-0.5 rounded-full tracking-wider">
                    Current
                  </span>
                )}
              </div>
              <div className="text-2xl font-black mb-1">
                {plan.priceMonthly === 0 ? 'Custom' : `₹${plan.priceMonthly.toLocaleString('en-IN')}`}
                {plan.priceMonthly > 0 && (
                  <span className="text-sm font-normal text-[var(--muted-foreground)]">/mo</span>
                )}
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Up to {plan.maxEmployees === Infinity ? 'unlimited' : plan.maxEmployees} employees
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Payment History ── */}
      <section>
        <h3 className="text-sm font-semibold uppercase tracking-wider text-[var(--muted-foreground)] mb-4">
          Payment History
        </h3>
        {recentPayments.length === 0 ? (
          <div className="card p-8 text-center text-[var(--muted-foreground)]">
            <CreditCard className="w-8 h-8 mx-auto mb-3 opacity-40" aria-hidden="true" />
            <p className="text-sm">No payments on record yet.</p>
            <p className="text-xs mt-1">Your invoices will appear here after your first payment.</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm" aria-label="Payment history">
              <thead>
                <tr className="border-b border-[var(--border)] text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Date</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Amount</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wide">Reference</th>
                </tr>
              </thead>
              <tbody>
                {recentPayments.map((payment) => (
                  <tr key={payment.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--accent)] transition-colors">
                    <td className="px-4 py-3 text-[var(--foreground)]">
                      {payment.paid_at ? formatDate(payment.paid_at) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      ₹{payment.amount.toLocaleString('en-IN')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full bg-[var(--success)]/10 text-[var(--success)]">
                        <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Paid
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                      {payment.razorpay_payment_id ?? payment.id.slice(0, 12)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardTemplate>
  );
}
