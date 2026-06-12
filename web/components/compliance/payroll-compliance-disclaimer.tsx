import { Info } from 'lucide-react';

/**
 * Honest India payroll scope disclaimer for HR/admin surfaces.
 */
export function PayrollComplianceDisclaimer({ className = '' }: { className?: string }) {
  return (
    <div
      className={`flex gap-3 rounded-lg border border-[var(--border)] bg-[color-mix(in_srgb,var(--card)_94%,var(--warning)_6%)] p-4 text-sm readable-copy ${className}`}
      role="note"
      aria-label="Payroll compliance notice"
    >
      <Info className="h-5 w-5 shrink-0 text-[var(--warning)] mt-0.5" aria-hidden />
      <p className="text-[var(--muted-foreground)]">
        <strong className="text-[var(--foreground)]">India-oriented payroll defaults.</strong>{' '}
        Continuum helps you configure CTC components, run internal payroll, and publish payslips.
        It does <strong>not</strong> replace your CA or statutory filing software (Form 16, challans,
        ESI/PF returns) unless you add those modules later.
      </p>
    </div>
  );
}
