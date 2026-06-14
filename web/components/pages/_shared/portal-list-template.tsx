import { PageShell, EmptyState, DataTableShell } from '@/components/design-system';

export interface PortalListTemplateProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  isEmpty?: boolean;
}

/**
 * Standard list/settings page shell for portal routes.
 */
export function PortalListTemplate({
  title,
  description,
  actions,
  children,
  empty,
  isEmpty,
}: PortalListTemplateProps) {
  return (
    <PageShell title={title} description={description} actions={actions}>
      {isEmpty && empty ? (
        <EmptyState title={empty.title} description={empty.description} action={empty.action} />
      ) : (
        <div className="space-y-4">{children}</div>
      )}
    </PageShell>
  );
}
