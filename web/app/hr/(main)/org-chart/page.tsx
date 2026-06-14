import ReportingTreeView from '@/components/pages/shared/reporting-tree-view';

export default function HrOrgChartPage() {
  return (
    <ReportingTreeView
      title="Reporting Structure"
      subtitle="See who reports to whom across the organization."
      employeesListHref="/hr/employees"
    />
  );
}
