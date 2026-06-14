/**
 * Onboarding Wizard API
 *
 * GET /api/onboarding/progress — Returns wizard step completion status.
 *
 * @module api/onboarding/progress
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireCompanyContext, requirePermissionGuard, AuthError } from '@/lib/auth-guard';
import {
  filterWizardSteps,
  getWizardProgress,
  WIZARD_STEPS,
} from '@/lib/onboarding/setup-wizard-steps';
import { getCompanyModuleState } from '@/lib/core-functions/resolve';

export const dynamic = 'force-dynamic';

/**
 * Returns the onboarding wizard progress for the current company.
 */
export async function GET(request: NextRequest) {
  try {
    const employee = await getAuthEmployee(request);
    requireCompanyContext(employee);
    requirePermissionGuard(employee, 'company.edit_settings');

    const moduleState = await getCompanyModuleState(employee.org_id);
    const steps = filterWizardSteps(moduleState.enabledSlugs);
    const progress = await getWizardProgress(employee.org_id, moduleState.enabledSlugs);

    return NextResponse.json({
      progress,
      steps,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: { code: 'AUTH_ERROR', message: error.message } },
        { status: error.status }
      );
    }
    const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message } },
      { status: 500 }
    );
  }
}
