import { prisma } from '@/lib/prisma';

export interface PfReportRow {
  employeeId: string;
  employeeCode: string | null;
  employeeName: string;
  department: string | null;
  designation: string | null;
  gross: number;
  basic: number;
  pfEmployee: number;
  pfEmployer: number;
  esiEmployee: number;
  esiEmployer: number;
  professionalTax: number;
  tds: number;
  netPay: number;
  totalPf: number;
  totalEsi: number;
}

export interface PfReport {
  month: number;
  year: number;
  status: string;
  generatedAt: string;
  employeeCount: number;
  totalGross: number;
  totalEmployeePf: number;
  totalEmployerPf: number;
  totalPf: number;
  totalEmployeeEsi: number;
  totalEmployerEsi: number;
  totalEsi: number;
  totalProfessionalTax: number;
  totalTds: number;
  rows: PfReportRow[];
}

export interface AnnualTaxSummaryRow {
  employeeId: string;
  employeeCode: string | null;
  employeeName: string;
  department: string | null;
  designation: string | null;
  year: number;
  monthsProcessed: number;
  gross: number;
  basic: number;
  totalDeductions: number;
  professionalTax: number;
  tds: number;
  pfEmployee: number;
  esiEmployee: number;
  netPay: number;
}

export async function resolvePfReportPeriod(
  companyId: string,
  month?: number,
  year?: number
): Promise<{ month: number; year: number; status: string; createdAt: Date } | null> {
  if (month && year) {
    const run = await prisma.payrollRun.findUnique({
      where: { company_id_month_year: { company_id: companyId, month, year } },
      select: { month: true, year: true, status: true, created_at: true },
    });
    return run ? { month: run.month, year: run.year, status: run.status, createdAt: run.created_at } : null;
  }

  const latest = await prisma.payrollRun.findFirst({
    where: {
      company_id: companyId,
      status: { not: 'rejected' },
    },
    orderBy: [{ year: 'desc' }, { month: 'desc' }, { created_at: 'desc' }],
    select: { month: true, year: true, status: true, created_at: true },
  });

  return latest ? { month: latest.month, year: latest.year, status: latest.status, createdAt: latest.created_at } : null;
}

export async function generatePfReport(
  companyId: string,
  month?: number,
  year?: number
): Promise<PfReport | null> {
  const period = await resolvePfReportPeriod(companyId, month, year);
  if (!period) return null;

  const slips = await prisma.payrollSlip.findMany({
    where: {
      company_id: companyId,
      month: period.month,
      year: period.year,
    },
    include: {
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: [
      { emp_id: 'asc' },
    ],
  });

  let totalGross = 0;
  let totalEmployeePf = 0;
  let totalEmployerPf = 0;
  let totalEmployeeEsi = 0;
  let totalEmployerEsi = 0;
  let totalProfessionalTax = 0;
  let totalTds = 0;

  const rows = slips.map((slip) => {
    totalGross += slip.gross;
    totalEmployeePf += slip.pf_employee;
    totalEmployerPf += slip.pf_employer;
    totalEmployeeEsi += slip.esi_employee;
    totalEmployerEsi += slip.esi_employer;
    totalProfessionalTax += slip.professional_tax;
    totalTds += slip.tds;

    return {
      employeeId: slip.employee.id,
      employeeCode: slip.employee.id,
      employeeName: `${slip.employee.first_name} ${slip.employee.last_name}`.trim(),
      department: slip.employee.department,
      designation: slip.employee.designation,
      gross: slip.gross,
      basic: slip.basic,
      pfEmployee: slip.pf_employee,
      pfEmployer: slip.pf_employer,
      esiEmployee: slip.esi_employee,
      esiEmployer: slip.esi_employer,
      professionalTax: slip.professional_tax,
      tds: slip.tds,
      netPay: slip.net_pay,
      totalPf: slip.pf_employee + slip.pf_employer,
      totalEsi: slip.esi_employee + slip.esi_employer,
    };
  });

  return {
    month: period.month,
    year: period.year,
    status: period.status,
    generatedAt: period.createdAt.toISOString(),
    employeeCount: rows.length,
    totalGross,
    totalEmployeePf,
    totalEmployerPf,
    totalPf: totalEmployeePf + totalEmployerPf,
    totalEmployeeEsi,
    totalEmployerEsi,
    totalEsi: totalEmployeeEsi + totalEmployerEsi,
    totalProfessionalTax,
    totalTds,
    rows,
  };
}

export async function generateAnnualTaxSummary(
  companyId: string,
  year: number
): Promise<AnnualTaxSummaryRow[]> {
  const slips = await prisma.payrollSlip.findMany({
    where: {
      company_id: companyId,
      year,
    },
    include: {
      employee: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          department: true,
          designation: true,
        },
      },
    },
    orderBy: [
      { emp_id: 'asc' },
      { month: 'asc' },
    ],
  });

  const byEmployee = new Map<string, AnnualTaxSummaryRow>();

  for (const slip of slips) {
    const existing = byEmployee.get(slip.emp_id);
    if (!existing) {
      byEmployee.set(slip.emp_id, {
        employeeId: slip.employee.id,
        employeeCode: slip.employee.id,
        employeeName: `${slip.employee.first_name} ${slip.employee.last_name}`.trim(),
        department: slip.employee.department,
        designation: slip.employee.designation,
        year,
        monthsProcessed: 1,
        gross: slip.gross,
        basic: slip.basic,
        totalDeductions: slip.total_deductions,
        professionalTax: slip.professional_tax,
        tds: slip.tds,
        pfEmployee: slip.pf_employee,
        esiEmployee: slip.esi_employee,
        netPay: slip.net_pay,
      });
      continue;
    }

    existing.monthsProcessed += 1;
    existing.gross += slip.gross;
    existing.basic += slip.basic;
    existing.totalDeductions += slip.total_deductions;
    existing.professionalTax += slip.professional_tax;
    existing.tds += slip.tds;
    existing.pfEmployee += slip.pf_employee;
    existing.esiEmployee += slip.esi_employee;
    existing.netPay += slip.net_pay;
  }

  return Array.from(byEmployee.values());
}
