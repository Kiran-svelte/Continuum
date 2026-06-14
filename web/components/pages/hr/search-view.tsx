import { GlobalSearchPage } from '@/components/global-search-page';

export default function SearchView() {
  return (
    <GlobalSearchPage
      title="Enterprise Search"
      subtitle="Search employees, leave requests, policies, and audit trails."
      defaultDomains={['employees', 'leaves', 'policies', 'audit']}
      storageKey="continuum.search.hr.views"
      canShareViews={true}
    />
  );
}

