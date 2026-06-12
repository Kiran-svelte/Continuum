import ComplianceView from '@/components/pages/hr/compliance-view';

export default async function AdminCompliancePage() {
  return ComplianceView({ backHref: '/admin/dashboard' });
}
