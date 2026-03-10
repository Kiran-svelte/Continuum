import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'general');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');
    const empId = searchParams.get('emp_id');
    const month = searchParams.get('month') ? parseInt(searchParams.get('month')!, 10) : undefined;
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : undefined;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));

    const isHrOrAdmin = ['hr', 'admin'].includes(employee.primary_role);

    // Non-HR users can only view their own payslips
    if (!isHrOrAdmin && empId && empId !== employee.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const where: Record<string, unknown> = {
      company_id: employee.org_id,
    };

    if (runId) where.payroll_run_id = runId;
    if (isHrOrAdmin && empId) {
      where.emp_id = empId;
    } else if (!isHrOrAdmin) {
      where.emp_id = employee.id;
    }
    if (month) where.month = month;
    if (year) where.year = year;

    const slips = await prisma.payrollSlip.findMany({
      where,
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        employee: {
          select: {
            first_name: true,
            last_name: true,
            email: true,
            department: true,
            designation: true,
          },
        },
        payroll_run: {
          select: { status: true },
        },
      },
    });

    return NextResponse.json({
      slips: slips.map((s) => ({
        id: s.id,
        payroll_run_id: s.payroll_run_id,
        run_status: s.payroll_run.status,
        emp_id: s.emp_id,
        employee_name: `${s.employee.first_name} ${s.employee.last_name}`,
        employee_email: s.employee.email,
        department: s.employee.department,
        designation: s.employee.designation,
        month: s.month,
        year: s.year,
        basic: s.basic,
        hra: s.hra,
        da: s.da,
        special_allowance: s.special_allowance,
        gross: s.gross,
        pf_employee: s.pf_employee,
        pf_employer: s.pf_employer,
        esi_employee: s.esi_employee,
        esi_employer: s.esi_employer,
        professional_tax: s.professional_tax,
        tds: s.tds,
        lop_deduction: s.lop_deduction,
        total_deductions: s.total_deductions,
        net_pay: s.net_pay,
        working_days: s.working_days,
        present_days: s.present_days,
        leave_days: s.leave_days,
        absent_days: s.absent_days,
        created_at: s.created_at,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
