import Link from 'next/link';
import { ArrowLeft, Sparkles, ShieldCheck, Workflow } from 'lucide-react';
import { BentoCell, BentoGrid, DSCard } from '@/components/design-system';
import { LandingNav, LandingFooter } from '@/components/marketing/landing-bento';

export default function AboutView() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div className="ambient-glow" aria-hidden />
      <LandingNav />
      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-24 pt-32">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>
        <h1 className="mt-6 text-4xl font-black tracking-tight text-[var(--foreground)] md:text-5xl">
          About Continuum
        </h1>
        <p className="mt-4 max-w-3xl text-lg text-[var(--muted-foreground)]">
          A modern HRMS for multi-tenant scale, compliance, and a fast daily experience for employees, managers, and HR teams.
        </p>

        <BentoGrid className="mt-12">
          <BentoCell span={4}>
            <DSCard className="h-full" padding="lg">
              <Sparkles className="mb-3 h-6 w-6 text-[var(--primary)]" aria-hidden />
              <h2 className="text-lg font-semibold">Intentional UX</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Bento dashboards and workflows that reduce clicks and mistakes.
              </p>
            </DSCard>
          </BentoCell>
          <BentoCell span={4}>
            <DSCard className="h-full" padding="lg">
              <ShieldCheck className="mb-3 h-6 w-6 text-[var(--status-success)]" aria-hidden />
              <h2 className="text-lg font-semibold">Enterprise Security</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Role-aware access, auditing, and secure auth flows.
              </p>
            </DSCard>
          </BentoCell>
          <BentoCell span={4}>
            <DSCard className="h-full" padding="lg">
              <Workflow className="mb-3 h-6 w-6 text-[var(--primary)]" aria-hidden />
              <h2 className="text-lg font-semibold">Config-Driven Ops</h2>
              <p className="mt-2 text-sm text-[var(--muted-foreground)]">
                Policies and onboarding adapt to each organization.
              </p>
            </DSCard>
          </BentoCell>
        </BentoGrid>
      </div>
      <LandingFooter />
    </main>
  );
}
