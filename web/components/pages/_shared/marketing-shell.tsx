import Link from 'next/link';
import { DSCard } from '@/components/design-system';

export interface MarketingShellProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function MarketingShell({ title, subtitle, children, actions }: MarketingShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div className="ambient-glow" aria-hidden />
      <header className="sticky top-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-lg font-semibold text-[var(--foreground)] no-underline">
            Continuum <span className="text-xs font-medium text-[var(--muted-foreground)]">Pulse</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/help" className="text-sm text-[var(--muted-foreground)] no-underline hover:text-[var(--foreground)]">
              Help
            </Link>
            <Link href="/sign-in" className="btn btn-primary btn-sm no-underline">
              Sign in
            </Link>
          </div>
        </nav>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-14 md:py-20">
        <div className="mb-10 max-w-3xl">
          <h1 className="text-display">{title}</h1>
          {subtitle && <p className="mt-3 text-body text-lg">{subtitle}</p>}
          {actions && <div className="mt-6 flex flex-wrap gap-3">{actions}</div>}
        </div>
        {children}
      </section>

      <footer className="border-t border-[var(--border)] py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-6 px-6 text-sm text-[var(--muted-foreground)]">
          <Link href="/privacy" className="no-underline hover:text-[var(--foreground)]">Privacy</Link>
          <Link href="/terms" className="no-underline hover:text-[var(--foreground)]">Terms</Link>
          <Link href="/support" className="no-underline hover:text-[var(--foreground)]">Support</Link>
          <Link href="/status" className="no-underline hover:text-[var(--foreground)]">Status</Link>
        </div>
      </footer>
    </main>
  );
}

export function MarketingContentCard({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <DSCard className={className} padding="lg">
      {children}
    </DSCard>
  );
}
