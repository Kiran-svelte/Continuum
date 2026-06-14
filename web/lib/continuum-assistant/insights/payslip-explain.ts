import prisma from '@/lib/prisma';

const LINE_HINTS: Record<string, string> = {
  basic: 'Base salary component before allowances and deductions.',
  hra: 'House Rent Allowance — tax-exempt portion depends on rent declared and metro rules.',
  da: 'Dearness Allowance — cost-of-living adjustment where applicable.',
  special_allowance: 'Flexible allowance bucket in your salary structure.',
  gross: 'Total earnings before statutory and other deductions.',
  pf_employee: 'Employee Provident Fund (EPF) — retirement savings; capped per statutory rules.',
  pf_employer: 'Employer PF contribution (not paid to you; shown for transparency on some slips).',
  esi_employee: 'Employee State Insurance — medical benefit where ESI applies.',
  esi_employer: 'Employer ESI contribution.',
  professional_tax: 'State professional tax deducted monthly where applicable.',
  tds: 'Tax Deducted at Source — income tax withheld based on projected annual tax.',
  lop_deduction: 'Loss of Pay — salary reduced for unpaid absence days in the period.',
  total_deductions: 'Sum of all deductions before net pay.',
  net_pay: 'Take-home amount credited after all deductions.',
  leave_days: 'Paid/unpaid leave days counted in this payroll period.',
  absent_days: 'Unpaid absence days that may drive LOP.',
};

export function parsePayslipLineKeyword(message: string): string | null {
  const m = message.match(
    /\b(what is|explain|meaning of|why is)\s+(?:this\s+|the\s+)?([a-z_\s]+?)(?:\s+on|\s+in|\s+from)?\s*(?:my\s+)?payslip\b/i
  );
  if (m) return m[2].trim().toLowerCase().replace(/\s+/g, '_');
  if (/\b(deduction|pf|tds|hra|lop|net pay|gross)\b/i.test(message) && /\bpayslip\b/i.test(message)) {
    if (/\bpf\b/i.test(message)) return 'pf_employee';
    if (/\btds\b/i.test(message)) return 'tds';
    if (/\bhra\b/i.test(message)) return 'hra';
    if (/\blop\b/i.test(message)) return 'lop_deduction';
    if (/\bnet\b/i.test(message)) return 'net_pay';
    if (/\bgross\b/i.test(message)) return 'gross';
    if (/\bdeduction/i.test(message)) return 'total_deductions';
  }
  return null;
}

export async function explainPayslipLineForEmployee(
  employeeId: string,
  companyId: string,
  keyword: string
): Promise<string> {
  const key = keyword.replace(/\s+/g, '_');
  const hint = LINE_HINTS[key];
  if (!hint) {
    return (
      `I could not match **${keyword}** to a payslip line. Try: **PF**, **TDS**, **HRA**, **LOP**, **gross**, or **net pay**.`
    );
  }

  const slip = await prisma.payrollSlip.findFirst({
    where: { emp_id: employeeId, company_id: companyId },
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });

  if (!slip) {
    return `**${key.replace(/_/g, ' ')}**: ${hint}\n\n_No payslip on file yet — ask HR after the payroll run is published._`;
  }

  const value = (slip as Record<string, unknown>)[key];
  const amount =
    typeof value === 'number' && key !== 'leave_days' && key !== 'absent_days' && key !== 'working_days'
      ? `\n\nOn your latest slip (**${slip.month}/${slip.year}**): **₹${value.toLocaleString('en-IN')}**`
      : typeof value === 'number'
        ? `\n\nOn your latest slip (**${slip.month}/${slip.year}**): **${value}** day(s)`
        : '';

  return `**${key.replace(/_/g, ' ')}**: ${hint}${amount}`;
}
