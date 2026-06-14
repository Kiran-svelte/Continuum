import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Scale, ArrowLeft } from 'lucide-react';
import { getAuthEmployee, requirePermissionGuard } from '@/lib/auth-guard';
import { getCompanyModuleState, isModuleEnabled } from '@/lib/core-functions/resolve';
import { generateComplianceReport } from '@/lib/compliance/consent';

export const dynamic = 'force-dynamic';

interface ComplianceViewProps {
  backHref?: string;
}

export default async function ComplianceView({ backHref = '/hr/dashboard' }: ComplianceViewProps) {
  const employee = await getAuthEmployee();
  requirePermissionGuard(employee, 'audit.view_all');

  if (!employee.org_id) redirect('/onboarding');

  const moduleState = await getCompanyModuleState(employee.org_id);
  if (!isModuleEnabled(moduleState, 'compliance')) {
    redirect('/module-disabled?module=compliance');
  }

  const report = await generateComplianceReport(employee.org_id);

  return (
    <div className="flex flex-col gap-6 max-w-4xl p-4 md:p-8">
      <header>
        <Link
          href={backHref}
          className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] inline-flex items-center gap-1 mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </Link>
        <h1 className="text-display flex items-center gap-3">
          <Scale className="w-8 h-8 text-[var(--primary)]" />
          Compliance &amp; Audit
        </h1>
        <p className="text-body mt-2">
          Consent coverage for your organization. Values are computed from live employee records.
        </p>
      </header>

      <section className="card p-6 border border-[var(--border)] space-y-4">
        <h2 className="text-h3">Summary</h2>
        <p className="text-sm text-[var(--muted-foreground)]">
          {report.totalEmployees} employees · generated {new Date(report.generatedAt).toLocaleString()}
        </p>
        <ul className="space-y-2 text-sm">
          {Object.entries(report.consentMetrics).map(([type, metric]) => (
            <li
              key={type}
              className="flex justify-between border-b border-[var(--border)] pb-2"
            >
              <span className="capitalize">{type.replace(/_/g, ' ')}</span>
              <span className="font-medium">
                {metric.granted} / {metric.total}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
