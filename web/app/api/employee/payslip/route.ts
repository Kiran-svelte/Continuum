import { NextResponse, NextRequest } from 'next/server';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import prisma from '@/lib/prisma';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();
    if (!employee.org_id) {
      return NextResponse.json({ error: 'Company context is required' }, { status: 400 });
    }

    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;

    const { searchParams } = new URL(request.url);
    
    const month = searchParams.get('month');
    const year = searchParams.get('year');

    if (!month || !year) {
      return NextResponse.json({ 
        error: 'Month and year parameters are required' 
      }, { status: 400 });
    }

    const monthNum = Number.parseInt(month, 10);
    const yearNum = Number.parseInt(year, 10);

    if (Number.isNaN(monthNum) || monthNum < 1 || monthNum > 12 || Number.isNaN(yearNum) || yearNum < 2000 || yearNum > 3000) {
      return NextResponse.json(
        { error: 'Invalid month/year values' },
        { status: 400 }
      );
    }

    // Check if employee-specific payroll slip exists for the given month/year
    const payrollSlip = await prisma.payrollSlip.findFirst({
      where: {
        company_id: employee.org_id,
        emp_id: employee.id,
        year: yearNum,
        month: monthNum,
      },
      select: {
        id: true,
        payroll_run_id: true,
      },
    });

    if (!payrollSlip) {
      return NextResponse.json({ 
        error: 'Payslip not available for the requested period',
        available: false
      }, { status: 404 });
    }

    return NextResponse.json({
      available: true,
      payrollId: payrollSlip.payroll_run_id,
      payrollSlipId: payrollSlip.id,
      month,
      year,
      downloadUrl: `/api/employee/payslip/download?payroll=${payrollSlip.payroll_run_id}`,
      message: 'Payslip is available for download'
    });

  } catch (error) {
    console.error('Payslip API Error:', error);
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
