import type { LucideIcon } from 'lucide-react';
import { DSCard } from './card';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <DSCard className="flex flex-col items-center justify-center py-12 text-center">
      {Icon && (
        <span className="mb-4 inline-flex rounded-2xl bg-[var(--muted)] p-4 text-[var(--muted-foreground)]">
          <Icon className="h-6 w-6" aria-hidden />
        </span>
      )}
      <h3 className="text-base font-semibold text-[var(--foreground)]">{title}</h3>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-[var(--muted-foreground)]">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </DSCard>
  );
}
