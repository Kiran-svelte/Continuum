import Link from 'next/link';
import { Lock } from 'lucide-react';
import { AuthShell, DSCard } from '@/components/design-system';

export const dynamic = 'force-dynamic';

export default function ModuleDisabledView({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; returnTo?: string }>;
}) {
  return <ModuleDisabledContent searchParams={searchParams} />;
}

async function ModuleDisabledContent({
  searchParams,
}: {
  searchParams: Promise<{ module?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const moduleName = params.module?.replace(/_/g, ' ') || 'This feature';
  const returnTo = params.returnTo || '/';

  return (
    <AuthShell
      title={`${moduleName} isn't enabled`}
      subtitle="Your administrator can enable this module in company settings. Until then, this area stays hidden."
      eyebrow="Module unavailable"
      footer={
        <Link href={returnTo} className="btn btn-primary w-full no-underline">
          Back to dashboard
        </Link>
      }
    >
      <DSCard className="flex flex-col items-center py-8 text-center" padding="lg">
        <span className="mb-4 inline-flex rounded-2xl bg-[var(--status-warning-soft)] p-4 text-[var(--status-warning)]">
          <Lock className="h-8 w-8" aria-hidden />
        </span>
        <p className="text-sm text-[var(--muted-foreground)]">
          Contact your company admin or platform operator to request access to{' '}
          <span className="font-medium text-[var(--foreground)]">{moduleName}</span>.
        </p>
      </DSCard>
    </AuthShell>
  );
}
