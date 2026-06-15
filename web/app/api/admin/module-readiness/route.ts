import { NextResponse } from 'next/server';
import {
  AuthError,
  getAuthEmployee,
  requireCompanyContext,
  requirePermissionGuard,
} from '@/lib/auth-guard';
import { getCompanyModuleState } from '@/lib/core-functions/resolve';
import { buildModuleReadinessReport } from '@/lib/modules/module-readiness';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.view_settings');

    const moduleState = await getCompanyModuleState(employee.org_id);
    const report = buildModuleReadinessReport(moduleState);

    return NextResponse.json({ report });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
