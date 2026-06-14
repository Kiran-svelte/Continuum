/**
 * GET /api/reports/payroll-register
 *
 * Returns the payroll register for a specific payroll run:
 *   - per-employee gross, deductions, net pay
 *   - totals row
 *
 * Query params:
 *   run_id - PayrollRun ID (required)
 *
 * Auth: payroll module + payroll.view_all permission
 * @throws {AuthError} 401/403 on auth failures
 */

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
  AuthError,
} from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);

    const moduleGuard = await assertModule(employee.org_id!, 'payroll');
    if (moduleGuard) return moduleGuard;

    requirePermissionGuard(employee, 'payroll.view_all');

    const rateLimit = checkApiRateLimit(employee.id, 'reporting');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const { searchParams } = new URL(request.url);
    const runId = searchParams.get('run_id');

    if (!runId) {
      return NextResponse.json({ error: 'run_id query parameter is required.' }, { status: 400 });
    }

    const payrollRun = await prisma.payrollRun.findFirst({
      where: { id: runId, company_id: employee.org_id },
      select: { id: true, month: true, year: true, status: true, company_id: true },
    });

    if (!payrollRun) {
      return NextResponse.json({ error: 'Payroll run not found.' }, { status: 404 });
    }

    const slips = await prisma.payrollSlip.findMany({
      where: { payroll_run_id: runId },
      select: {
        id: true,
        emp_id: true,
        basic: true,
        hra: true,
        da: true,
        special_allowance: true,
        gross: true,
        pf_employee: true,
        pf_employer: true,
        esi_employee: true,
        professional_tax: true,
        tds: true,
        lop_deduction: true,
        total_deductions: true,
        net_pay: true,
        working_days: true,
        present_days: true,
        employee: { select: { first_name: true, last_name: true, department: true, designation: true } },
      },
      orderBy: { employee: { last_name: 'asc' } },
      take: 1000,
    });

    const totals = slips.reduce(
      (acc, s) => {
        acc.gross += Number(s.gross ?? 0);
        acc.totalDeductions += Number(s.total_deductions ?? 0);
        acc.netPay += Number(s.net_pay ?? 0);
        acc.pfEmployee += Number(s.pf_employee ?? 0);
        acc.pfEmployer += Number(s.pf_employer ?? 0);
        acc.tds += Number(s.tds ?? 0);
        return acc;
      },
      { gross: 0, totalDeductions: 0, netPay: 0, pfEmployee: 0, pfEmployer: 0, tds: 0 }
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      payrollRun: { id: payrollRun.id, month: payrollRun.month, year: payrollRun.year, status: payrollRun.status },
      totals,
      employees: slips.map((s) => ({
        empId: s.emp_id,
        name: `${s.employee.first_name} ${s.employee.last_name}`,
        department: s.employee.department,
        designation: s.employee.designation,
        gross: Number(s.gross ?? 0),
        totalDeductions: Number(s.total_deductions ?? 0),
        netPay: Number(s.net_pay ?? 0),
        pfEmployee: Number(s.pf_employee ?? 0),
        pfEmployer: Number(s.pf_employer ?? 0),
        tds: Number(s.tds ?? 0),
        lopDeduction: Number(s.lop_deduction ?? 0),
        workingDays: s.working_days,
        presentDays: s.present_days,
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
