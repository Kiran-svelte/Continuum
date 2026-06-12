import { cn } from '@/lib/utils';
import { DSCard } from './card';

export interface DataTableShellProps {
  title: string;
  description?: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function DataTableShell({
  title,
  description,
  toolbar,
  footer,
  children,
  className,
}: DataTableShellProps) {
  return (
    <DSCard padding="none" className={cn('flex min-w-0 flex-col overflow-hidden', className)}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border)] px-4 py-4 md:px-5">
        <div className="min-w-0">
          <h3 className="break-words text-base font-semibold text-[var(--foreground)]">{title}</h3>
          {description && (
            <p className="mt-0.5 max-w-3xl break-words text-xs leading-5 text-[var(--muted-foreground)]">{description}</p>
          )}
        </div>
        {toolbar && <div className="flex min-w-0 flex-wrap items-center gap-2">{toolbar}</div>}
      </div>
      <div className="overflow-x-auto">{children}</div>
      {footer && (
        <div className="border-t border-[var(--border)] px-4 py-3 md:px-5">
          {footer}
        </div>
      )}
    </DSCard>
  );
}
