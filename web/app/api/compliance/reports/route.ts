import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { requireModuleForOrg } from '@/lib/core-functions/guard-handler';
import { generateComplianceReport } from '@/lib/compliance/consent';

export const dynamic = 'force-dynamic';

/**
 * GET /api/compliance/reports
 * Returns a tenant compliance summary (consent + audit snapshot).
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'audit.view_all');

    const moduleGuard = await requireModuleForOrg(employee.org_id, 'compliance');
    if (moduleGuard) return moduleGuard;

    const report = await generateComplianceReport(employee.org_id!);
    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
