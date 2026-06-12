import PfReportsView from '@/components/pages/hr/pf-reports-view';

export default async function AdminPfReportsPage() {
  return PfReportsView({ backHref: '/admin/payroll' });
}
