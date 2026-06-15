import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';
import { jsPDF } from 'jspdf';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

function toPositiveInt(value: string): number | null {
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

function monthLabel(month: number): string {
  const monthNames = [
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

  return monthNames[month - 1] ?? `Month-${month}`;
}

function buildPayslipPdf(params: {
  employeeName: string;
  employeeId: string;
  payrollId: string;
  month: number;
  year: number;
  gross: number;
  totalDeductions: number;
  netPay: number;
}): ArrayBuffer {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const monthName = monthLabel(params.month);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text('Employee Payslip', 20, 22);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Employee: ${params.employeeName}`, 20, 32);
  pdf.text(`Employee ID: ${params.employeeId}`, 20, 38);
  pdf.text(`Payroll Run: ${params.payrollId}`, 20, 44);
  pdf.text(`Period: ${monthName} ${params.year}`, 20, 50);

  pdf.setDrawColor(220, 220, 220);
  pdf.line(20, 56, 190, 56);

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('Earnings', 20, 66);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Gross Pay: ${params.gross.toFixed(2)}`, 20, 76);

  pdf.setFont('helvetica', 'bold');
  pdf.text('Deductions', 20, 90);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Total Deductions: ${params.totalDeductions.toFixed(2)}`, 20, 100);

  pdf.setFont('helvetica', 'bold');
  pdf.text(`Net Pay: ${params.netPay.toFixed(2)}`, 20, 116);

  pdf.setFont('helvetica', 'normal');
  pdf.text('This is a system-generated payslip.', 20, 132);
  pdf.text('Please contact HR for any discrepancies.', 20, 138);

  return pdf.output('arraybuffer');
}

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);

    if (!employee.org_id) {
      return NextResponse.json({ error: 'Company context is required' }, { status: 400 });
    }

    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;

    const { searchParams } = new URL(request.url);
    const payrollId = searchParams.get('payroll')?.trim() ?? '';

    if (!payrollId) {
      return NextResponse.json({ error: 'Query parameter payroll is required' }, { status: 400 });
    }

    const payrollRun = await prisma.payrollRun.findUnique({
      where: { id: payrollId },
      select: {
        id: true,
        company_id: true,
        month: true,
        year: true,
      },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found' }, { status: 404 });
    }

    if (payrollRun.company_id !== employee.org_id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const month = toPositiveInt(String(payrollRun.month));
    const year = toPositiveInt(String(payrollRun.year));

    if (!month || !year) {
      return NextResponse.json({ error: 'Payroll run has invalid period metadata' }, { status: 404 });
    }

    const slip = await prisma.payrollSlip.findUnique({
      where: {
        payroll_run_id_emp_id: {
          payroll_run_id: payrollRun.id,
          emp_id: employee.id,
        },
      },
      select: {
        id: true,
        gross: true,
        total_deductions: true,
        net_pay: true,
      },
    });

    const fileName = `payslip_${year}_${String(month).padStart(2, '0')}_${employee.id}.pdf`;

    if (!slip) {
      return NextResponse.json(
        { error: 'Payslip is not generated for this employee in the requested payroll run' },
        { status: 404 }
      );
    }

    const content = buildPayslipPdf({
      employeeName: `${employee.first_name} ${employee.last_name}`,
      employeeId: employee.id,
      payrollId: payrollRun.id,
      month,
      year,
      gross: slip.gross,
      totalDeductions: slip.total_deductions,
      netPay: slip.net_pay,
    });

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
