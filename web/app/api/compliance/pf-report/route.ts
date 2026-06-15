import { NextRequest, NextResponse } from 'next/server';
import { AuthError, getAuthEmployee, requireCompanyContext, requirePermissionGuard } from '@/lib/auth-guard';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';
import { generateAnnualTaxSummary, generatePfReport } from '@/lib/compliance/pf-report';

export const dynamic = 'force-dynamic';

function readPositiveInt(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function csvCell(value: unknown): string {
  const text = value == null ? '' : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function csvResponse(filename: string, rows: unknown[][]): NextResponse {
  const csv = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}

/**
 * GET /api/compliance/pf-report
 * Returns the latest or requested period PF contribution report.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'payroll.view_all');

    const pfGuard = await requireModuleForOrg(employee.org_id, 'pf');
    if (pfGuard) return pfGuard;

    const payrollGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (payrollGuard) return payrollGuard;

    const { searchParams } = new URL(request.url);
    const month = readPositiveInt(searchParams.get('month'));
    const year = readPositiveInt(searchParams.get('year'));
    const format = searchParams.get('format') || 'json';
    const exportType = searchParams.get('type') || 'pf';

    if ((month && !year) || (!month && year) || (month && month > 12)) {
      return NextResponse.json(
        { error: 'Provide both month and year. Month must be between 1 and 12.' },
        { status: 422 }
      );
    }

    if (format === 'csv' && exportType === 'form16') {
      const selectedYear = year ?? new Date().getFullYear();
      const annualRows = await generateAnnualTaxSummary(employee.org_id!, selectedYear);
      return csvResponse(`form16-prep-${selectedYear}.csv`, [
        ['Employee Code', 'Employee Name', 'Department', 'Designation', 'Year', 'Months Processed', 'Gross', 'Basic', 'Total Deductions', 'Professional Tax', 'TDS', 'Employee PF', 'Employee ESI', 'Net Pay'],
        ...annualRows.map((row) => [
          row.employeeCode,
          row.employeeName,
          row.department,
          row.designation,
          row.year,
          row.monthsProcessed,
          row.gross,
          row.basic,
          row.totalDeductions,
          row.professionalTax,
          row.tds,
          row.pfEmployee,
          row.esiEmployee,
          row.netPay,
        ]),
      ]);
    }

    const report = await generatePfReport(employee.org_id!, month, year);
    if (!report) {
      return NextResponse.json(
        { report: null, message: 'No payroll run found for the selected PF report period.' },
        { status: 404 }
      );
    }

    if (format === 'csv') {
      const period = `${report.year}-${String(report.month).padStart(2, '0')}`;
      if (exportType === 'esi') {
        return csvResponse(`esi-register-${period}.csv`, [
          ['Employee Code', 'Employee Name', 'Department', 'Designation', 'Gross', 'Employee ESI', 'Employer ESI', 'Total ESI', 'Period'],
          ...report.rows.map((row) => [
            row.employeeCode,
            row.employeeName,
            row.department,
            row.designation,
            row.gross,
            row.esiEmployee,
            row.esiEmployer,
            row.totalEsi,
            period,
          ]),
        ]);
      }

      if (exportType === 'tds') {
        return csvResponse(`tds-register-${period}.csv`, [
          ['Employee Code', 'Employee Name', 'Department', 'Designation', 'Gross', 'Professional Tax', 'TDS', 'Net Pay', 'Period'],
          ...report.rows.map((row) => [
            row.employeeCode,
            row.employeeName,
            row.department,
            row.designation,
            row.gross,
            row.professionalTax,
            row.tds,
            row.netPay,
            period,
          ]),
        ]);
      }

      return csvResponse(`pf-challan-${period}.csv`, [
        ['Employee Code', 'Employee Name', 'Department', 'Designation', 'Basic', 'Gross', 'Employee PF', 'Employer PF', 'Total PF', 'Period'],
        ...report.rows.map((row) => [
          row.employeeCode,
          row.employeeName,
          row.department,
          row.designation,
          row.basic,
          row.gross,
          row.pfEmployee,
          row.pfEmployer,
          row.totalPf,
          period,
        ]),
      ]);
    }

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
