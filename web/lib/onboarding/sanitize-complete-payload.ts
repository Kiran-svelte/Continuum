import type { ModuleSlug } from '@/lib/core-functions/catalog';
import { isModuleEnabled } from '@/lib/core-functions/resolve';
import type { CompanyModuleState } from '@/lib/core-functions/types';
import { filterApprovalChainsByEnabledModules } from '@/lib/approval-chain-config';

type CompletePayload = Record<string, unknown>;

/** Removes module-specific sections that are not enabled for this company. */
export function sanitizeOnboardingCompletePayload(
  payload: CompletePayload,
  state: CompanyModuleState
): CompletePayload {
  const next: CompletePayload = { ...payload };

  if (!isModuleEnabled(state, 'leave')) {
    delete next.leave_types;
    delete next.holidays;
    delete next.constraint_config;
    delete next.role_quotas;
    delete next.ai;
  } else {
    if (next.ai) {
      // AI config is part of leave module
    }
  }

  if (!isModuleEnabled(state, 'attendance')) {
    delete next.attendance;
  }

  if (!isModuleEnabled(state, 'payroll') && !isModuleEnabled(state, 'pf')) {
    delete next.payroll;
  }

  if (Array.isArray(next.approval_chains)) {
    next.approval_chains = filterApprovalChainsByEnabledModules(
      next.approval_chains as Array<{ workflowType: import('@/lib/approval-chain-config').WorkflowType }>,
      state.enabledSlugs
    );
  }

  if (Array.isArray(next.enabled_modules)) {
    const cap = new Set(state.superAdminCap);
    next.enabled_modules = (next.enabled_modules as string[]).filter(
      (slug) => cap.has(slug as ModuleSlug) || slug === 'employees'
    );
  }

  return next;
}
