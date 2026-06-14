/**
 * Payroll Preview API — Calculate salary breakdown from CTC.
 *
 * POST /api/payroll/calculate-preview
 * Body: { annualCtc, city?, month?, joiningMonth?, isFirstYear? }
 *
 * Returns a full salary breakdown using the company's PayrollConfig
 * and the India Tax Engine. Used by the salary structures page
 * for real-time CTC breakdown preview.
 *
 * @module api/payroll/calculate-preview
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthEmployee,
  requireCompanyContext,
  AuthError,
} from '@/lib/auth-guard';
import {
  getPayrollConfig,
  computeEmployeePayroll,
} from '@/lib/payroll-engine';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';

export const dynamic = 'force-dynamic';

/** Maximum CTC value accepted (₹10 crore). */
const MAX_CTC_RUPEES = 100_000_000;

/**
 * Computes a full salary breakdown preview from annual CTC.
 *
 * @param request - Incoming request with CTC and optional parameters
 * @returns Salary breakdown with all components and deductions
 */
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    const moduleGuard = await requireModuleForOrg(employee.org_id, 'payroll');
    if (moduleGuard) return moduleGuard;

    const body = await request.json();
    const { annualCtc, city, month, joiningMonth, isFirstYear } = body as {
      annualCtc?: number;
      city?: string;
      month?: number;
      joiningMonth?: number;
      isFirstYear?: boolean;
    };

    if (!annualCtc || annualCtc <= 0 || annualCtc > MAX_CTC_RUPEES) {
      return NextResponse.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `annualCtc must be between 1 and ${MAX_CTC_RUPEES}`,
          },
        },
        { status: 400 }
      );
    }

    const config = await getPayrollConfig(employee.org_id);
    const currentMonth = month ?? new Date().getMonth() + 1;

    const result = computeEmployeePayroll(
      {
        employeeId: employee.id,
        annualCtc,
        month: currentMonth,
        year: new Date().getFullYear(),
        joiningMonth: joiningMonth ?? 4,
        isFirstYear: isFirstYear ?? false,
        workingMonthsInFy: 12,
        city: city ?? 'mumbai',
        monthlyRentPaid: 0,
        presentDays: 22,
        workingDays: 22,
        leaveDays: 0,
        absentDays: 0,
      },
      config
    );

    return NextResponse.json({
      breakdown: {
        annual: {
          ctc: annualCtc,
          basic: Math.round(result.basic * 12),
          hra: Math.round(result.hra * 12),
          da: Math.round(result.da * 12),
          specialAllowance: Math.round(result.specialAllowance * 12),
          pfEmployee: Math.round(result.pfEmployee * 12),
          pfEmployer: Math.round(result.pfEmployer * 12),
          esiEmployee: Math.round(result.esiEmployee * 12),
          esiEmployer: Math.round(result.esiEmployer * 12),
          professionalTax: Math.round(result.professionalTax * 12),
          tds: Math.round(result.tds * 12),
        },
        monthly: {
          gross: result.gross,
          basic: result.basic,
          hra: result.hra,
          da: result.da,
          specialAllowance: result.specialAllowance,
          pfEmployee: result.pfEmployee,
          pfEmployer: result.pfEmployer,
          esiEmployee: result.esiEmployee,
          esiEmployer: result.esiEmployer,
          professionalTax: result.professionalTax,
          tds: result.tds,
          totalDeductions: result.totalDeductions,
          netPay: result.netPay,
        },
      },
      config: {
        state: config.state,
        taxRegime: config.taxRegime,
        isPfEnabled: config.isPfEnabled,
        isEsiEnabled: config.isEsiEnabled,
        isPtEnabled: config.isPtEnabled,
        basicPercentOfCtc: config.basicPercentOfCtc,
        hraPercentOfBasic: config.hraPercentOfBasic,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message } },
        { status: error.status }
      );
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
