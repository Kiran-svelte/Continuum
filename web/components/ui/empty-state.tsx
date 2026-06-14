import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  className?: string;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const actionNode = action?.href ? (
    <Link href={action.href} className="btn btn-primary btn-sm no-underline">
      {action.label}
    </Link>
  ) : action?.onClick ? (
    <Button type="button" variant="primary" size="sm" onClick={action.onClick}>
      {action.label}
    </Button>
  ) : null;

  return (
    <div className={cn('empty-state', className)}>
      <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--muted)] text-[var(--muted-foreground)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <div>
        <h3 className="text-h4">{title}</h3>
        {description && <p className="mt-2 max-w-sm text-body">{description}</p>}
      </div>
      {actionNode && <div className="mt-2">{actionNode}</div>}
    </div>
  );
}
