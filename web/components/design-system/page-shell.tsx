import { PageHeader } from './page-header';

export interface PageShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  children: React.ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | 'full';
}

const maxWidthClass = {
  md: 'max-w-3xl',
  lg: 'max-w-5xl',
  xl: 'max-w-7xl',
  full: 'max-w-[1400px]',
};

export function PageShell({
  title,
  description,
  actions,
  breadcrumbs,
  children,
  maxWidth = 'full',
}: PageShellProps) {
  return (
    <div className="flex min-h-full w-full min-w-0 flex-col overflow-x-hidden">
      <PageHeader
        title={title}
        description={description}
        actions={actions}
        breadcrumbs={breadcrumbs}
      />
      <main className={`mx-auto w-full min-w-0 flex-1 p-4 md:p-8 page-enter ${maxWidthClass[maxWidth]}`}>
        {children}
      </main>
    </div>
  );
}
