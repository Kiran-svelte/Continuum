/**
 * Headless latest payslip service.
 * Implements L5-03-PART-C getLatestPayslipService (A9).
 */
import prisma from '@/lib/prisma';
import { guardModule } from './_shared/guards';
import { serviceOk, serviceError } from './types';
import type { ServiceResult, AssistantExecutionContext } from './types';
import logger from '@/lib/logger';

export interface LatestPayslipOutput {
  id: string;
  month: number;
  year: number;
  net_pay: number;
  gross: number;
  total_deductions: number;
  payroll_run_id: string;
  run_status: string | null;
}

/**
 * Returns the most recent payslip for the employee in context.
 */
export async function getLatestPayslipService(
  ctx: Pick<AssistantExecutionContext, 'employeeId' | 'orgId'>
): Promise<ServiceResult<LatestPayslipOutput>> {
  try {
    if (!ctx.orgId) {
      return serviceError('FORBIDDEN', 'Company context required', 403);
    }

    const moduleGuard = await guardModule(ctx.orgId, 'payroll');
    if (moduleGuard) return moduleGuard;

    const slip = await prisma.payrollSlip.findFirst({
      where: {
        company_id: ctx.orgId,
        emp_id: ctx.employeeId,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
      include: {
        PayrollRun: { select: { status: true } },
      },
    });

    if (!slip) {
      return serviceError('NOT_FOUND', 'No payslip found for your account.', 404);
    }

    return serviceOk({
      id: slip.id,
      month: slip.month,
      year: slip.year,
      net_pay: slip.net_pay,
      gross: slip.gross,
      total_deductions: slip.total_deductions,
      payroll_run_id: slip.payroll_run_id,
      run_status: slip.PayrollRun?.status ?? null,
    });
  } catch (error) {
    logger.error('get_latest_payslip_service_error', {
      employeeId: ctx.employeeId,
      orgId: ctx.orgId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return serviceError('INTERNAL_ERROR', 'Failed to fetch payslip.', 500);
  }
}
