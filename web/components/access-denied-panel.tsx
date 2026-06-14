import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';

type AccessDeniedPanelProps = {
  title?: string;
  message: string;
  homeHref: string;
  homeLabel?: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};

export function AccessDeniedPanel({
  title = 'Access not available',
  message,
  homeHref,
  homeLabel = 'Go to your dashboard',
  secondaryHref,
  secondaryLabel,
}: AccessDeniedPanelProps) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 px-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--secondary)] text-[var(--warning)]">
        <ShieldAlert className="h-7 w-7" aria-hidden />
      </div>
      <h1 className="text-2xl font-semibold text-[var(--foreground)]">{title}</h1>
      <p className="text-sm text-[var(--muted-foreground)]">{message}</p>
      <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
        <Link href={homeHref} className="btn btn-primary btn-sm no-underline">
          {homeLabel}
        </Link>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="btn btn-outline btn-sm no-underline">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
