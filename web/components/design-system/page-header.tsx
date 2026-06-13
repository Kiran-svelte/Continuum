import { cn } from '@/lib/utils';

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  breadcrumbs,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        'sticky top-0 z-20 flex flex-col gap-3 border-b border-[var(--border)]',
        'bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-md',
        'px-4 py-5 md:px-8',
        className
      )}
    >
      {breadcrumbs}
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-h1">
            {title}
          </h1>
          {description && (
            <p className="mt-1 max-w-3xl break-words text-body">{description}</p>
          )}
        </div>
        {actions && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{actions}</div>}
      </div>
    </header>
  );
}
