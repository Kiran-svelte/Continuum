import ReportingTreeView from '@/components/pages/shared/reporting-tree-view';

export default function AdminOrgChartPage() {
  return (
    <ReportingTreeView
      title="Reporting Structure"
      subtitle="Company-wide hierarchy from reporting manager assignments."
      employeesListHref="/admin/people"
    />
  );
}
