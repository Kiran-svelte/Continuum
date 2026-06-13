import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getAuthEmployee, AuthError, requireCompanyContext } from '@/lib/auth-guard';
import { buildContextFromSession } from '@/lib/channel/context-from-session';
import { getLatestPayslipService } from '@/lib/services/payslip-latest';
import { serviceResultToLegacyResponse } from '@/lib/services/service-response';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payroll/slips/latest — latest payslip for authenticated employee.
 */
export async function GET(request: NextRequest) {
  try {
    void request;
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    const ctx = buildContextFromSession(employee, { channel: 'web' });
    const result = await getLatestPayslipService(ctx);
    return serviceResultToLegacyResponse(result);
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
