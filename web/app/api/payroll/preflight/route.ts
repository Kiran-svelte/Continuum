import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, requirePermissionGuard, requireCompanyContext, AuthError } from '@/lib/auth-guard';
import { assertModule } from '@/lib/core-functions/assert-module';
import { loadPayrollPreflight } from '@/lib/continuum-assistant/insights/payroll-preflight';
import type { AssistantContext } from '@/lib/continuum-assistant/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payroll/preflight
 * Payroll readiness for the current period (salary structures, regularizations).
 */
export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requirePermissionGuard(employee, 'payroll.generate');
    requireCompanyContext(employee);
    const moduleGuard = await assertModule(employee.org_id!, 'payroll');
    if (moduleGuard) return moduleGuard;

    const now = new Date();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    const ctx: AssistantContext = {
      employeeId: employee.id,
      companyId: employee.org_id!,
      companyName: '',
      role: employee.primary_role,
      portalSlug: 'hr',
      displayName: `${employee.first_name} ${employee.last_name}`,
      enabledModules: [],
      permissions: employee.permissions ?? [],
      navHints: [],
    };

    const report = await loadPayrollPreflight(ctx);
    if (!report) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    const periodStart = new Date(Date.UTC(year, month - 1, 1));
    const periodEnd = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const existingRun = await prisma.payrollRun.findUnique({
      where: {
        company_id_month_year: {
          company_id: employee.org_id!,
          month,
          year,
        },
      },
      select: { id: true, status: true },
    });

    const pendingInPeriod = await prisma.attendanceRegularization.count({
      where: {
        company_id: employee.org_id!,
        status: 'pending',
        date: { gte: periodStart, lte: periodEnd },
      },
    });

    const ready =
      report.activeEmployees > 0 &&
      report.missingSalaryStructures.length === 0 &&
      !existingRun;

    return NextResponse.json({
      month,
      year,
      ready,
      canGenerate: ready && pendingInPeriod === 0,
      canForceGenerate: ready,
      existingRun: existingRun
        ? { id: existingRun.id, status: existingRun.status }
        : null,
      activeEmployees: report.activeEmployees,
      payrollEligibleCount: report.activeEmployees - report.missingSalaryStructures.length,
      missingSalaryStructures: report.missingSalaryStructures,
      pendingRegularizationsInPeriod: pendingInPeriod,
      pendingRegularizationsTotal: report.pendingRegularizations,
      salaryComponentCount: report.salaryComponentCount,
      blockers: [
        ...(report.activeEmployees === 0
          ? [{ code: 'no_active_employees', message: 'No active or probation employees.' }]
          : []),
        ...(report.missingSalaryStructures.length > 0
          ? [
              {
                code: 'missing_salary_structures',
                message: `${report.missingSalaryStructures.length} employee(s) need a per-employee salary structure (CTC).`,
              },
            ]
          : []),
        ...(existingRun
          ? [
              {
                code: 'run_exists',
                message: `Payroll for ${month}/${year} already exists (${existingRun.status}).`,
              },
            ]
          : []),
        ...(pendingInPeriod > 0
          ? [
              {
                code: 'pending_regularizations',
                message: `${pendingInPeriod} attendance regularization(s) pending in this period.`,
              },
            ]
          : []),
      ],
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
