'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Home } from 'lucide-react';

function labelFromSegment(segment: string): string {
  return segment
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PortalBreadcrumbs({ portalSlug }: { portalSlug: string }) {
  const pathname = usePathname() ?? '';
  const segments = pathname.split('/').filter(Boolean);
  const portalIndex = segments.indexOf(portalSlug);
  const trail = portalIndex >= 0 ? segments.slice(portalIndex) : segments;

  if (trail.length <= 1) {
    return null;
  }

  const crumbs = trail.map((segment, index) => {
    const href = `/${trail.slice(0, index + 1).join('/')}`;
    const isLast = index === trail.length - 1;
    return { href, label: labelFromSegment(segment), isLast };
  });

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-xs text-[var(--muted-foreground)]">
      <Link
        href={`/${portalSlug}/dashboard`}
        className="inline-flex items-center gap-1 no-underline hover:text-[var(--foreground)]"
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
        <span className="sr-only">Dashboard</span>
      </Link>
      {crumbs.slice(1).map((crumb) => (
        <span key={crumb.href} className="inline-flex items-center gap-1">
          <ChevronRight className="h-3 w-3 opacity-50" aria-hidden />
          {crumb.isLast ? (
            <span className="font-medium text-[var(--foreground)]">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="no-underline hover:text-[var(--foreground)]">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
