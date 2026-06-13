import Link from 'next/link';
import {
  ArrowRight,
  MonitorPlay,
  Rocket,
  Settings,
  Building2,
  Scale,
  Brain,
  Shield,
  Bell,
  Check,
} from 'lucide-react';
import { BentoCell, BentoGrid, DSCard } from '@/components/design-system';

const FEATURES = [
  { title: 'Config-Driven Workflows', description: 'Leave policies, approvals, and payroll rules through configuration.', icon: Settings },
  { title: 'True Multi-Tenancy', description: 'Unlimited organizations with isolated data and per-tenant customization.', icon: Building2 },
  { title: 'India-Compliant Payroll', description: 'PF, ESI, TDS, and statutory leave built for Indian labor law.', icon: Scale },
  { title: 'AI Leave Intelligence', description: 'Anomaly detection and smart approvals with manager context.', icon: Brain },
  { title: 'Enterprise Security', description: 'RBAC, audit logs, rate limiting, and CSP headers out of the box.', icon: Shield },
  { title: 'Real-Time Notifications', description: 'Live updates across leave, payroll, and onboarding milestones.', icon: Bell },
];

const STATS = [
  { value: '10 min', label: 'Average onboarding' },
  { value: '99.9%', label: 'Uptime SLA' },
  { value: '3-tier', label: 'Approval hierarchy' },
  { value: 'SOC 2', label: 'Security roadmap' },
];

const PRICING = [
  {
    name: 'Starter',
    price: '₹2,499',
    period: '/mo',
    description: 'Growing teams up to 50 employees.',
    features: ['Unlimited leave types', 'Manager approvals', 'Basic analytics', 'Email notifications'],
    href: '/sign-up',
    highlighted: false,
  },
  {
    name: 'Growth',
    price: '₹5,999',
    period: '/mo',
    description: 'Scaling companies up to 500 employees.',
    features: ['Multi-location', 'AI leave analysis', 'Full payroll', 'API access', 'Custom workflows'],
    href: '/sign-up',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Unlimited scale with dedicated support.',
    features: ['Unlimited employees', 'On-premise option', 'SSO & SCIM', 'SLA guarantee', 'Dedicated CSM'],
    href: '/help',
    highlighted: false,
  },
];

export function LandingNav() {
  return (
    <nav
      className="fixed z-50 w-full border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-semibold text-[var(--foreground)] no-underline">
          <MonitorPlay className="h-6 w-6 text-[var(--primary)]" aria-hidden />
          Continuum
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/about" className="hidden text-sm font-medium text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)] md:inline">
            About
          </Link>
          <Link href="/help" className="hidden text-sm font-medium text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)] md:inline">
            Support
          </Link>
          <Link href="/sign-in" className="hidden text-sm font-medium text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)] md:inline">
            Sign in
          </Link>
          <Link href="/sign-up" className="btn btn-primary inline-flex items-center gap-2 px-5 no-underline">
            Get started <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function LandingHero() {
  return (
    <section className="relative z-10 flex min-h-[88vh] items-center justify-center px-6 pt-36 pb-20">
      <BentoGrid className="max-w-6xl mx-auto w-full">
        <BentoCell span={12}>
          <DSCard className="relative overflow-hidden p-8 md:p-12 lg:p-14 text-center" padding="none">
            <div
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,color-mix(in_srgb,var(--primary)_16%,transparent),transparent_65%)]"
              aria-hidden
            />
            <div className="relative space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--card)] px-4 py-1.5 text-xs font-semibold uppercase tracking-wide shadow-[var(--shadow-xs)]">
                <Rocket className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                Continuum Pulse — v4
              </span>
              <h1 className="text-4xl font-black leading-tight tracking-tight text-[var(--foreground)] md:text-6xl lg:text-7xl">
                HR operations,
                <br />
                <span className="text-[var(--primary)]">designed like an award dashboard.</span>
              </h1>
              <p className="mx-auto max-w-2xl text-lg text-[var(--muted-foreground)]">
                Bento dashboards, role portals, and India-ready payroll — one workspace for HR, managers, and employees.
              </p>
              <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                <Link href="/sign-up" className="btn btn-primary btn-lg w-full sm:w-auto no-underline shadow-[var(--shadow-bento)]">
                  Start free trial
                </Link>
                <Link href="/sign-in" className="btn btn-secondary btn-lg w-full sm:w-auto no-underline">
                  Sign in
                </Link>
              </div>
            </div>
          </DSCard>
        </BentoCell>
        {STATS.map((stat) => (
          <BentoCell key={stat.label} span={3} className="md:col-span-3">
            <DSCard className="text-center" padding="md">
              <p className="text-2xl font-black text-[var(--primary)]">{stat.value}</p>
              <p className="mt-1 text-xs font-medium text-[var(--muted-foreground)]">{stat.label}</p>
            </DSCard>
          </BentoCell>
        ))}
      </BentoGrid>
    </section>
  );
}

export function LandingFeatures() {
  return (
    <section className="relative z-10 border-t border-[var(--border)] px-6 py-24" id="features">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold text-[var(--foreground)] md:text-4xl">Everything your HR team needs</h2>
          <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">
            Integrated modules that work together — not in silos.
          </p>
        </div>
        <BentoGrid>
          {FEATURES.map((feature, i) => (
            <BentoCell key={feature.title} span={i === 0 || i === 3 ? 6 : 4}>
              <DSCard interactive className="h-full" padding="lg">
                <span className="mb-4 inline-flex rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] p-3 text-[var(--primary)]">
                  <feature.icon className="h-6 w-6" aria-hidden />
                </span>
                <h3 className="text-h4 mb-2">{feature.title}</h3>
                <p className="text-body">{feature.description}</p>
              </DSCard>
            </BentoCell>
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

export function LandingPricing() {
  return (
    <section className="relative z-10 px-6 py-24" id="pricing">
      <div className="mx-auto max-w-5xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
          <p className="mt-3 text-[var(--muted-foreground)]">Start free. Upgrade when you need it.</p>
        </div>
        <BentoGrid>
          {PRICING.map((plan) => (
            <BentoCell key={plan.name} span={4}>
              <DSCard
                className={`flex h-full flex-col ${plan.highlighted ? 'border-[var(--primary)] shadow-[var(--shadow-bento)]' : ''}`}
                padding="lg"
              >
                {plan.highlighted && (
                  <span className="mb-3 inline-block self-start rounded-full bg-[var(--primary)] px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--primary-foreground)]">
                    Popular
                  </span>
                )}
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <p className="mt-2 text-3xl font-black">
                  {plan.price}
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">{plan.period}</span>
                </p>
                <p className="mt-2 text-sm text-[var(--muted-foreground)]">{plan.description}</p>
                <ul className="mt-6 flex-1 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-[var(--primary)]" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={plan.href}
                  className={`btn mt-6 w-full no-underline ${plan.highlighted ? 'btn-primary' : 'btn-secondary'}`}
                >
                  {plan.name === 'Enterprise' ? 'Contact sales' : 'Start free trial'}
                </Link>
              </DSCard>
            </BentoCell>
          ))}
        </BentoGrid>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const links = [
    { label: 'Privacy', href: '/privacy' },
    { label: 'Terms', href: '/terms' },
    { label: 'Status', href: '/status' },
    { label: 'Support', href: '/help' },
    { label: 'Changelog', href: '/changelog' },
  ];
  return (
    <footer className="relative z-10 border-t border-[var(--border)] bg-[var(--card)] px-6 py-12">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 md:flex-row">
        <div className="flex items-center gap-2 font-semibold opacity-80">
          <MonitorPlay className="h-5 w-5" aria-hidden />
          Continuum
        </div>
        <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2" aria-label="Footer">
          {links.map((link) => (
            <Link key={link.label} href={link.href} className="text-sm text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)]">
              {link.label}
            </Link>
          ))}
        </nav>
        <p className="text-sm text-[var(--muted-foreground)]">© {new Date().getFullYear()} Continuum Inc.</p>
      </div>
    </footer>
  );
}
