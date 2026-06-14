import { GlobalSearchPage } from '@/components/global-search-page';

export default function SearchView() {
  return (
    <GlobalSearchPage
      title="Team Search"
      subtitle="Search team members and leave requests in one place."
      defaultDomains={['employees', 'leaves']}
      storageKey="continuum.search.manager.views"
      canShareViews={false}
    />
  );
}
