/**
 * Attrition Risk API
 *
 * GET /api/ai/attrition?employeeId=  — Single employee risk
 * GET /api/ai/attrition?department=  — Department-level risk heatmap
 * GET /api/ai/attrition              — Company-wide risk overview
 *
 * @module api/ai/attrition
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import { predictAttritionRisk, predictCompanyAttritionRisk } from '@/lib/ai-engine/attrition-predictor';

export const dynamic = 'force-dynamic';

/**
 * Returns attrition risk data scoped by employeeId, department, or company.
 * Requires `reports.view_all` permission.
 *
 * @returns 200 with risk results array or single result.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'reports.view_all');

    const url = new URL(request.url);
    const employeeId = url.searchParams.get('employeeId');
    const department = url.searchParams.get('department');

    if (employeeId) {
      const result = await predictAttritionRisk(employeeId, employee.org_id);
      return NextResponse.json({ result });
    }

    const results = await predictCompanyAttritionRisk(
      employee.org_id,
      department ?? undefined
    );

    return NextResponse.json({
      results,
      summary: {
        total: results.length,
        critical: results.filter((r) => r.riskLevel === 'critical').length,
        high: results.filter((r) => r.riskLevel === 'high').length,
        medium: results.filter((r) => r.riskLevel === 'medium').length,
        low: results.filter((r) => r.riskLevel === 'low').length,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: { code: 'AUTH_ERROR', message: error.message } }, { status: error.status });
  }
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message } }, { status: 500 });
}
