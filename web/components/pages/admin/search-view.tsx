import { GlobalSearchPage } from '@/components/global-search-page';

export default function SearchView() {
  return (
    <GlobalSearchPage
      title="Admin Search"
      subtitle="Search enterprise records across key operational domains."
      defaultDomains={['employees', 'leaves', 'policies', 'audit']}
      storageKey="continuum.search.admin.views"
      canShareViews={true}
    />
  );
}
