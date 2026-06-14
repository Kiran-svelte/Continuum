/**
 * Rejects onboarding complete payloads that reference disabled modules.
 */

import { getCompanyModuleState, isModuleEnabled } from '@/lib/core-functions/resolve';
import type { ModuleSlug } from '@/lib/core-functions/catalog';
import { clampEnabledToCap } from '@/lib/core-functions/validate';

export type OnboardingModuleFieldError = {
  field: string;
  module: ModuleSlug;
  code: 'MODULE_DISABLED';
  message: string;
};

type OnboardingPayloadSlice = {
  leave_types?: unknown[];
  holidays?: unknown[];
  constraint_config?: unknown;
  role_quotas?: unknown[];
  attendance?: unknown;
  ai?: unknown;
  payroll?: unknown;
  enabled_modules?: string[];
};

export function validateOnboardingPayloadAgainstState(
  state: import('@/lib/core-functions/types').CompanyModuleState,
  data: OnboardingPayloadSlice
): OnboardingModuleFieldError[] {
  const errors: OnboardingModuleFieldError[] = [];

  const requireModule = (field: string, slug: ModuleSlug) => {
    if (!isModuleEnabled(state, slug)) {
      errors.push({
        field,
        module: slug,
        code: 'MODULE_DISABLED',
        message: `Module "${slug}" is not enabled for this company.`,
      });
    }
  };

  if (data.leave_types?.length || data.holidays?.length || data.constraint_config || data.role_quotas?.length) {
    requireModule('leave_types', 'leave');
  }
  if (data.attendance) requireModule('attendance', 'attendance');
  if (data.payroll) requireModule('payroll', 'payroll');
  if (data.ai) requireModule('ai', 'leave');

  if (data.enabled_modules?.length) {
    const clamped = clampEnabledToCap(
      data.enabled_modules.filter((s): s is ModuleSlug => typeof s === 'string') as ModuleSlug[],
      state.superAdminCap
    );
    const requested = new Set(data.enabled_modules);
    for (const slug of requested) {
      if (!clamped.includes(slug as ModuleSlug) && slug !== 'employees') {
        errors.push({
          field: 'enabled_modules',
          module: slug as ModuleSlug,
          code: 'MODULE_DISABLED',
          message: `Module "${slug}" is outside the platform cap or not enabled.`,
        });
      }
    }
  }

  return errors;
}

export async function validateOnboardingPayloadModules(
  companyId: string,
  data: OnboardingPayloadSlice
): Promise<OnboardingModuleFieldError[]> {
  const state = await getCompanyModuleState(companyId);
  return validateOnboardingPayloadAgainstState(state, data);
}
