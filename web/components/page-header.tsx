import { ReactNode } from 'react';
import { FadeIn } from '@/components/motion';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, description, icon, action }: PageHeaderProps) {
  return (
    <FadeIn>
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          {icon && (
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--secondary)] text-[var(--primary)]">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">{title}</h1>
            {description && (
              <p className="mt-1 text-[var(--muted-foreground)]">{description}</p>
            )}
          </div>
        </div>
        {action && <div>{action}</div>}
      </div>
    </FadeIn>
  );
}
