// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanSlug = 'free' | 'starter' | 'growth' | 'enterprise';

export interface PricingPlan {
  name: string;
  slug: PlanSlug;
  priceMonthly: number;
  priceAnnual: number;
  currency: string;
  features: string[];
  employeeLimit: number;
  hrLimit: number;
  apiRateLimit: number;
  dataRetentionYears: number;
  uptime: string;
  support: string;
}

// ─── Pricing Plans ───────────────────────────────────────────────────────────

export const PRICING_PLANS: PricingPlan[] = [
  {
    name: 'Free',
    slug: 'free',
    priceMonthly: 0,
    priceAnnual: 0,
    currency: 'INR',
    features: [
      'Up to 10 employees',
      '1 HR admin',
      'Basic leave management',
      'Basic attendance tracking',
      'Email notifications',
      'Community support',
      '1-year data retention',
    ],
    employeeLimit: 10,
    hrLimit: 1,
    apiRateLimit: 30,
    dataRetentionYears: 1,
    uptime: '95%',
    support: 'Community',
  },
  {
    name: 'Starter',
    slug: 'starter',
    priceMonthly: 2499,
    priceAnnual: 24990,
    currency: 'INR',
    features: [
      'Up to 50 employees',
      '3 HR admins',
      'Full leave management',
      'Payroll processing',
      'Constraint engine',
      'Email support (48h)',
      '3-year data retention',
      'Custom leave types',
      'Basic reports',
    ],
    employeeLimit: 50,
    hrLimit: 3,
    apiRateLimit: 100,
    dataRetentionYears: 3,
    uptime: '99%',
    support: 'Email (48h)',
  },
  {
    name: 'Growth',
    slug: 'growth',
    priceMonthly: 5999,
    priceAnnual: 59990,
    currency: 'INR',
    features: [
      'Up to 200 employees',
      '10 HR admins',
      'Everything in Starter',
      'Advanced analytics',
      'AI-powered insights',
      'Priority support (24h)',
      '7-year data retention',
      'Custom workflows',
      'API access',
      'Multi-location support',
      'Audit logs',
    ],
    employeeLimit: 200,
    hrLimit: 10,
    apiRateLimit: 500,
    dataRetentionYears: 7,
    uptime: '99.9%',
    support: 'Priority (24h)',
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    priceMonthly: 14999,
    priceAnnual: 149990,
    currency: 'INR',
    features: [
      'Unlimited employees',
      'Unlimited HR admins',
      'Everything in Growth',
      '24/7 dedicated support',
      'Custom data retention',
      'Multi-AZ backups',
      'SSO integration',
      'Custom integrations',
      'Dedicated account manager',
      'SLA guarantee (99.99%)',
      'White-label option',
      'On-premise deployment option',
    ],
    employeeLimit: -1, // Unlimited
    hrLimit: -1, // Unlimited
    apiRateLimit: 2000,
    dataRetentionYears: -1, // Custom
    uptime: '99.99%',
    support: '24/7 Dedicated',
  },
];

// ─── Functions ───────────────────────────────────────────────────────────────

/** Get a plan by its slug */
export function getPlan(slug: PlanSlug): PricingPlan | undefined {
  return PRICING_PLANS.find((p) => p.slug === slug);
}

/** Check if a plan supports the given number of employees */
export function isPlanSufficient(
  slug: PlanSlug,
  employeeCount: number
): boolean {
  const plan = getPlan(slug);
  if (!plan) return false;
  if (plan.employeeLimit === -1) return true; // Unlimited
  return employeeCount <= plan.employeeLimit;
}

/** Get the recommended plan based on employee count */
export function getRecommendedPlan(employeeCount: number): PlanSlug {
  if (employeeCount <= 10) return 'free';
  if (employeeCount <= 50) return 'starter';
  if (employeeCount <= 200) return 'growth';
  return 'enterprise';
}

/** Calculate savings for annual billing vs monthly */
export function getAnnualSavings(slug: PlanSlug): number {
  const plan = getPlan(slug);
  if (!plan || plan.priceMonthly === 0) return 0;
  return plan.priceMonthly * 12 - plan.priceAnnual;
}
