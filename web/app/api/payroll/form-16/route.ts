import { NextRequest, NextResponse } from 'next/server';
import { jsPDF } from 'jspdf';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/audit';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

function currentFinancialYearStart(now = new Date()): number {
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth() + 1;
  return month >= 4 ? year : year - 1;
}

function parseFinancialYear(value: string | null): number | null {
  if (!value) return currentFinancialYearStart();
  if (!/^\d{4}$/.test(value)) return null;
  const year = Number.parseInt(value, 10);
  return year >= 2020 && year <= 2100 ? year : null;
}

function money(value: number): string {
  return value.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function buildForm16Pdf(params: {
  companyName: string;
  employeeName: string;
  employeeCode: string;
  employeeEmail: string;
  panNumber: string | null;
  fyStartYear: number;
  monthsCovered: number;
  totals: {
    gross: number;
    basic: number;
    hra: number;
    da: number;
    specialAllowance: number;
    pfEmployee: number;
    esiEmployee: number;
    professionalTax: number;
    tds: number;
    totalDeductions: number;
    netPay: number;
  };
}): ArrayBuffer {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const fyLabel = `${params.fyStartYear}-${String(params.fyStartYear + 1).slice(-2)}`;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Form 16 - Salary and TDS Certificate', 20, 22);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Financial Year: ${fyLabel}`, 20, 32);
  pdf.text(`Employer: ${params.companyName}`, 20, 38);
  pdf.text(`Employee: ${params.employeeName}`, 20, 48);
  pdf.text(`Employee Code: ${params.employeeCode}`, 20, 54);
  pdf.text(`Email: ${params.employeeEmail}`, 20, 60);
  pdf.text(`PAN: ${params.panNumber || 'Not provided'}`, 20, 66);
  pdf.text(`Payroll months covered: ${params.monthsCovered}`, 20, 72);

  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, 80, 190, 80);

  const rows: Array<[string, string]> = [
    ['Gross Salary', money(params.totals.gross)],
    ['Basic', money(params.totals.basic)],
    ['HRA', money(params.totals.hra)],
    ['DA', money(params.totals.da)],
    ['Special Allowance', money(params.totals.specialAllowance)],
    ['PF Employee Contribution', money(params.totals.pfEmployee)],
    ['ESI Employee Contribution', money(params.totals.esiEmployee)],
    ['Professional Tax', money(params.totals.professionalTax)],
    ['TDS Deducted', money(params.totals.tds)],
    ['Total Deductions', money(params.totals.totalDeductions)],
    ['Net Pay', money(params.totals.netPay)],
  ];

  pdf.setFont('helvetica', 'bold');
  pdf.text('Component', 20, 90);
  pdf.text('Amount (INR)', 130, 90);

  pdf.setFont('helvetica', 'normal');
  let y = 100;
  for (const [label, amount] of rows) {
    pdf.text(label, 20, y);
    pdf.text(amount, 130, y);
    y += 8;
  }

  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, y + 2, 190, y + 2);
  pdf.setFontSize(9);
  pdf.text(
    'This is a system-generated Form 16 summary based on payroll slips recorded in Continuum.',
    20,
    y + 12
  );
  pdf.text('HR should verify statutory filings before sharing externally.', 20, y + 18);

  return pdf.output('arraybuffer');
}

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;

    const rateLimit = checkApiRateLimit(employee.id, 'export');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const fyStartYear = parseFinancialYear(searchParams.get('fy_start_year'));
    if (!fyStartYear) {
      return NextResponse.json(
        { error: 'fy_start_year must be a four-digit year between 2020 and 2100' },
        { status: 400 }
      );
    }

    const requestedEmployeeId = searchParams.get('emp_id')?.trim() || employee.id;
    const canViewAll =
      employee.primary_role === 'super_admin' ||
      employee.permissions.includes('*') ||
      employee.permissions.includes('payroll.view_all');

    if (requestedEmployeeId !== employee.id) {
      requirePermissionGuard(employee, 'payroll.view_all');
    } else if (canViewAll) {
      requirePermissionGuard(employee, 'payroll.view_all');
    } else {
      requirePermissionGuard(employee, 'payroll.view_own');
    }

    const targetEmployee = await prisma.employee.findFirst({
      where: {
        id: requestedEmployeeId,
        org_id: employee.org_id,
        deleted_at: null,
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
        employee_id: true,
        pan_number: true,
      },
    });

    if (!targetEmployee) {
      return NextResponse.json({ error: 'Employee not found in your organization' }, { status: 404 });
    }

    const company = await prisma.company.findUnique({
      where: { id: employee.org_id },
      select: { name: true, legalName: true },
    });

    const slips = await prisma.payrollSlip.findMany({
      where: {
        company_id: employee.org_id,
        emp_id: targetEmployee.id,
        OR: [
          { year: fyStartYear, month: { gte: 4, lte: 12 } },
          { year: fyStartYear + 1, month: { gte: 1, lte: 3 } },
        ],
      },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
      select: {
        basic: true,
        hra: true,
        da: true,
        special_allowance: true,
        gross: true,
        pf_employee: true,
        esi_employee: true,
        professional_tax: true,
        tds: true,
        total_deductions: true,
        net_pay: true,
      },
    });

    if (slips.length === 0) {
      return NextResponse.json(
        { error: 'No payroll slips found for this employee in the requested financial year' },
        { status: 404 }
      );
    }

    const totals = slips.reduce(
      (acc, slip) => ({
        gross: acc.gross + slip.gross,
        basic: acc.basic + slip.basic,
        hra: acc.hra + slip.hra,
        da: acc.da + slip.da,
        specialAllowance: acc.specialAllowance + slip.special_allowance,
        pfEmployee: acc.pfEmployee + slip.pf_employee,
        esiEmployee: acc.esiEmployee + slip.esi_employee,
        professionalTax: acc.professionalTax + slip.professional_tax,
        tds: acc.tds + slip.tds,
        totalDeductions: acc.totalDeductions + slip.total_deductions,
        netPay: acc.netPay + slip.net_pay,
      }),
      {
        gross: 0,
        basic: 0,
        hra: 0,
        da: 0,
        specialAllowance: 0,
        pfEmployee: 0,
        esiEmployee: 0,
        professionalTax: 0,
        tds: 0,
        totalDeductions: 0,
        netPay: 0,
      }
    );

    const employeeName = `${targetEmployee.first_name} ${targetEmployee.last_name}`.trim();
    const content = buildForm16Pdf({
      companyName: company?.legalName || company?.name || 'Continuum Company',
      employeeName,
      employeeCode: targetEmployee.employee_id || targetEmployee.id,
      employeeEmail: targetEmployee.email,
      panNumber: targetEmployee.pan_number,
      fyStartYear,
      monthsCovered: slips.length,
      totals,
    });

    await createAuditLog({
      companyId: employee.org_id,
      actorId: employee.id,
      action: AUDIT_ACTIONS.DATA_EXPORT,
      entityType: 'PayrollForm16',
      entityId: `${targetEmployee.id}:${fyStartYear}`,
      newState: {
        employee_id: targetEmployee.id,
        fy_start_year: fyStartYear,
        months_covered: slips.length,
        tds: totals.tds,
      },
    });

    const filename = `form-16-${fyStartYear}-${fyStartYear + 1}-${targetEmployee.employee_id || targetEmployee.id}.pdf`;
    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
