import { PageShell } from '@/components/design-system';

interface DashboardTemplateProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Global dashboard layout — Pulse bento shell with sticky header.
 */
export function DashboardTemplate({
  title,
  description,
  actions,
  breadcrumbs,
  children,
}: DashboardTemplateProps) {
  return (
    <PageShell
      title={title}
      description={description}
      actions={actions}
      breadcrumbs={breadcrumbs}
      maxWidth="full"
    >
      {children}
    </PageShell>
  );
}
