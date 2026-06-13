/**
 * Manager performance portal page — /manager/performance
 *
 * Delegates to the ManagerPerformanceView client component.
 * @module app/manager/(main)/performance/page
 */

import ManagerPerformanceView from '@/components/pages/manager/performance-view';

export const dynamic = 'force-dynamic';

export default function ManagerPerformancePage() {
  return <ManagerPerformanceView />;
}
