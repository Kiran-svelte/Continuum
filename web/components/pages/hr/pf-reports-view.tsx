import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft, Landmark, ReceiptText, Download, FileSpreadsheet } from 'lucide-react';
import { getAuthEmployee, requirePermissionGuard } from '@/lib/auth-guard';
import { getCompanyModuleState, isModuleEnabled } from '@/lib/core-functions/resolve';
import { generatePfReport } from '@/lib/compliance/pf-report';

export const dynamic = 'force-dynamic';

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function PfReportsView({ backHref = '/hr/payroll' }: { backHref?: string } = {}) {
  const employee = await getAuthEmployee();
  requirePermissionGuard(employee, 'payroll.view_all');

  if (!employee.org_id) redirect('/onboarding');

  const moduleState = await getCompanyModuleState(employee.org_id);
  if (!isModuleEnabled(moduleState, 'pf') || !isModuleEnabled(moduleState, 'payroll')) {
    redirect('/module-disabled?module=pf');
  }

  const report = await generatePfReport(employee.org_id);

  return (
    <div className="flex max-w-6xl flex-col gap-6 p-4 md:p-8">
      <header className="min-w-0">
        <Link
          href={backHref}
          className="mb-3 inline-flex min-h-10 items-center gap-1 rounded-lg text-sm text-[var(--muted-foreground)] transition-colors hover:text-[var(--foreground)]"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" /> Back to payroll
        </Link>
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--border)] bg-[var(--primary)]/10 text-[var(--primary)]">
            <Landmark className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-semibold tracking-normal text-[var(--foreground)] md:text-3xl">
              PF Reports
            </h1>
            <p className="mt-1 max-w-3xl break-words text-sm leading-6 text-[var(--muted-foreground)]">
              Employee and employer Provident Fund contributions from approved payroll data.
            </p>
          </div>
        </div>
      </header>

      {!report ? (
        <section className="card border border-[var(--border)] p-6">
          <div className="flex flex-col items-start gap-3 sm:flex-row">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)]">
              <ReceiptText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--foreground)]">No payroll data yet</h2>
              <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                Generate payroll first. Once payslips exist, this module will show PF totals by employee and period.
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Period', value: `${MONTHS[report.month - 1]} ${report.year}` },
              { label: 'Employees', value: String(report.employeeCount) },
              { label: 'Employee PF', value: formatCurrency(report.totalEmployeePf) },
              { label: 'Employer PF', value: formatCurrency(report.totalEmployerPf) },
              { label: 'Total ESI', value: formatCurrency(report.totalEsi) },
              { label: 'TDS', value: formatCurrency(report.totalTds) },
            ].map((item) => (
              <div key={item.label} className="card border border-[var(--border)] p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                  {item.label}
                </p>
                <p className="mt-2 break-words text-xl font-semibold text-[var(--foreground)]">
                  {item.value}
                </p>
              </div>
            ))}
          </section>

          <section className="card border border-[var(--border)] p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--foreground)]">
                  <FileSpreadsheet className="h-5 w-5 text-[var(--primary)]" />
                  Statutory exports
                </h2>
                <p className="mt-1 text-sm leading-6 text-[var(--muted-foreground)]">
                  Download payroll-backed registers without preparing spreadsheets manually.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {[
                  ['PF Challan CSV', 'pf'],
                  ['ESI Register CSV', 'esi'],
                  ['TDS Register CSV', 'tds'],
                  ['Form 16 Prep CSV', 'form16'],
                ].map(([label, type]) => (
                  <Link
                    key={type}
                    href={`/api/compliance/pf-report?month=${report.month}&year=${report.year}&format=csv&type=${type}`}
                    className="btn btn-outline btn-sm justify-center whitespace-nowrap no-underline"
                  >
                    <Download className="h-4 w-4" aria-hidden="true" />
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </section>

          <section className="card overflow-hidden border border-[var(--border)]">
            <div className="flex flex-col gap-2 border-b border-[var(--border)] bg-[var(--muted)]/40 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-[var(--foreground)]">Contribution Register</h2>
                <p className="text-sm leading-6 text-[var(--muted-foreground)]">
                  Status: {report.status.replace(/_/g, ' ')} · generated {new Date(report.generatedAt).toLocaleDateString('en-IN')}
                </p>
              </div>
              <div className="text-sm font-semibold text-[var(--foreground)]">
                Total PF {formatCurrency(report.totalPf)}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[860px] w-full text-sm">
                <thead className="bg-[var(--muted)]/30 text-left text-xs uppercase tracking-wide text-[var(--muted-foreground)]">
                  <tr>
                    <th className="px-4 py-3">Employee</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3 text-right">Basic</th>
                    <th className="px-4 py-3 text-right">Gross</th>
                    <th className="px-4 py-3 text-right">Employee PF</th>
                    <th className="px-4 py-3 text-right">Employer PF</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {report.rows.map((row) => (
                    <tr key={row.employeeId} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[var(--foreground)]">{row.employeeName}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {row.employeeCode || row.designation || 'Employee'}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[var(--muted-foreground)]">{row.department || '-'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.basic)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.gross)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.pfEmployee)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(row.pfEmployer)}</td>
                      <td className="px-4 py-3 text-right font-semibold">{formatCurrency(row.totalPf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
