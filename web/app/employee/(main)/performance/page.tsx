/**
 * Employee performance portal page — /employee/performance
 *
 * Delegates to the EmployeePerformanceView client component.
 * @module app/employee/(main)/performance/page
 */

import EmployeePerformanceView from '@/components/pages/employee/performance-view';

export const dynamic = 'force-dynamic';

export default function EmployeePerformancePage() {
  return <EmployeePerformanceView />;
}
