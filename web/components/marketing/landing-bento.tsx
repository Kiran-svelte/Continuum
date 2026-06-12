import Link from 'next/link';
import {
  ArrowRight,
  MonitorPlay,
  Settings,
  Building2,
  Scale,
  Brain,
  Shield,
  Bell,
  Check,
  Users,
  Briefcase,
  UserCircle,
  Sparkles,
  Clock,
  Workflow,
} from 'lucide-react';
import { BentoCell, BentoGrid, DSCard } from '@/components/design-system';
import { ThemeToggle } from '@/components/theme-toggle';

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

const ROLE_PORTALS = [
  {
    title: 'Admin',
    tagline: 'Command center for your company',
    icon: Settings,
    highlights: ['Company setup wizard', 'RBAC & audit logs', 'Billing & integrations'],
  },
  {
    title: 'HR',
    tagline: 'People operations without the spreadsheet chaos',
    icon: Users,
    highlights: ['Leave & payroll in one place', 'Bulk import & org chart', 'Compliance-ready reports'],
  },
  {
    title: 'Manager',
    tagline: 'Approvals and team context in seconds',
    icon: Briefcase,
    highlights: ['One-click leave approvals', 'Team attendance view', 'Reports that managers actually use'],
  },
  {
    title: 'Employee',
    tagline: 'Self-service that feels premium',
    icon: UserCircle,
    highlights: ['Request leave from anywhere', 'Payslips & documents', 'Onboarding that guides, not confuses'],
  },
];

const LAUNCH_STEPS = [
  {
    title: 'Get invited',
    description: 'Your admin sends a secure invite with role-based access. No public signup funnel.',
    icon: Sparkles,
  },
  {
    title: 'Configure once',
    description: 'Leave policies, approval chains, and payroll defaults set up in minutes, not weeks.',
    icon: Workflow,
  },
  {
    title: 'Run the day',
    description: 'HR, managers, and employees work from live dashboards, not stale exports.',
    icon: Clock,
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
        <div className="flex items-center gap-3">
          <Link href="/about" className="hidden text-sm font-medium text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)] md:inline">
            About
          </Link>
          <Link href="/help" className="hidden text-sm font-medium text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)] md:inline">
            Support
          </Link>
          <ThemeToggle />
          <Link href="/sign-in?inviteOnly=1" className="btn btn-primary inline-flex items-center gap-2 px-5 no-underline">
            Sign in <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
}

export function LandingHero() {
  return (
    <section className="relative z-10 flex min-h-[100dvh] items-center px-6 pt-24 pb-16">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-2 lg:items-center">
        <div className="space-y-6">
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-[var(--foreground)] md:text-5xl lg:text-6xl">
            HR operations built for teams that move fast
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-[var(--muted-foreground)] md:text-lg">
            Bento dashboards, role portals, and India-ready payroll in one workspace for HR, managers, and employees.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/sign-in?inviteOnly=1" className="btn btn-primary btn-lg w-full sm:w-auto no-underline shadow-[var(--shadow-bento)]">
              Sign in to your workspace
            </Link>
            <Link href="/help" className="btn btn-secondary btn-lg w-full sm:w-auto no-underline">
              Contact support
            </Link>
          </div>
        </div>
        <BentoGrid className="w-full">
          {STATS.map((stat) => (
            <BentoCell key={stat.label} span={6} className="md:col-span-6">
              <DSCard className="liquid-glass text-center" padding="md">
                <p className="text-2xl font-bold text-[var(--primary)]">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-[var(--muted-foreground)]">{stat.label}</p>
              </DSCard>
            </BentoCell>
          ))}
        </BentoGrid>
      </div>
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

export function LandingExperience() {
  return (
    <>
      <section className="relative z-10 border-t border-[var(--border)] px-6 py-24" id="portals">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--foreground)] md:text-4xl">
              One platform. Four portals. Zero chaos.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-[var(--muted-foreground)]">
              Every role gets a purpose-built workspace — not a cluttered mega-menu pretending to be simple.
            </p>
          </div>
          <BentoGrid>
            {ROLE_PORTALS.map((portal) => (
              <BentoCell key={portal.title} span={6} className="md:col-span-3">
                <DSCard interactive className="flex h-full flex-col" padding="lg">
                  <span className="mb-4 inline-flex rounded-xl bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] p-3 text-[var(--primary)]">
                    <portal.icon className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="text-xs font-semibold uppercase tracking-wide text-[var(--primary)]">{portal.title}</p>
                  <h3 className="mt-1 text-lg font-bold text-[var(--foreground)]">{portal.tagline}</h3>
                  <ul className="mt-4 flex-1 space-y-2 text-sm text-[var(--muted-foreground)]">
                    {portal.highlights.map((item) => (
                      <li key={item} className="flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-[var(--primary)]" aria-hidden />
                        {item}
                      </li>
                    ))}
                  </ul>
                </DSCard>
              </BentoCell>
            ))}
          </BentoGrid>
        </div>
      </section>

      <section className="relative z-10 px-6 py-24" id="launch">
        <div className="mx-auto max-w-5xl">
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold text-[var(--foreground)]">Live in an afternoon, not a quarter</h2>
            <p className="mt-3 text-[var(--muted-foreground)]">
              Continuum is invite-only — built for teams who want control, not another open signup funnel.
            </p>
          </div>
          <BentoGrid>
            {LAUNCH_STEPS.map((item) => (
              <BentoCell key={item.title} span={4}>
                <DSCard className="h-full" padding="lg">
                  <div className="mb-4 flex items-center justify-between">
                    <item.icon className="h-5 w-5 text-[var(--primary)]" aria-hidden />
                  </div>
                  <h3 className="text-lg font-bold text-[var(--foreground)]">{item.title}</h3>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">{item.description}</p>
                </DSCard>
              </BentoCell>
            ))}
            <BentoCell span={12}>
              <DSCard
                className="relative overflow-hidden border-[var(--primary)] text-center shadow-[var(--shadow-bento)]"
                padding="lg"
              >
                <div
                  className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_srgb,var(--primary)_14%,transparent),transparent_70%)]"
                  aria-hidden
                />
                <div className="relative space-y-4">
                  <h3 className="text-2xl font-black text-[var(--foreground)] md:text-3xl">
                    Your team deserves software that feels inevitable
                  </h3>
                  <p className="mx-auto max-w-2xl text-[var(--muted-foreground)]">
                    Bento dashboards, real-time approvals, India-ready payroll, and role portals that stay fast as you
                    scale — all backed by live APIs, not placeholder screens.
                  </p>
                  <div className="flex flex-col items-center justify-center gap-3 pt-2 sm:flex-row">
                    <Link
                      href="/sign-in?inviteOnly=1"
                      className="btn btn-primary btn-lg inline-flex items-center gap-2 no-underline shadow-[var(--shadow-bento)]"
                    >
                      Sign in to your workspace <ArrowRight className="h-4 w-4" aria-hidden />
                    </Link>
                    <Link href="/help" className="btn btn-secondary btn-lg no-underline">
                      Talk to support
                    </Link>
                  </div>
                </div>
              </DSCard>
            </BentoCell>
          </BentoGrid>
        </div>
      </section>
    </>
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
