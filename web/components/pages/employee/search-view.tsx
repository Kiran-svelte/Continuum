import { GlobalSearchPage } from '@/components/global-search-page';

export default function SearchView() {
  return (
    <GlobalSearchPage
      title="Search"
      subtitle="Find your leave requests and profile data quickly."
      defaultDomains={['employees', 'leaves']}
      storageKey="continuum.search.employee.views"
      canShareViews={false}
    />
  );
}

