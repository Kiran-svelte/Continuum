/**
 * Clamp tenant module cap/enabled slugs when billing plan changes.
 */

import { maxModulesForPlan } from '@/lib/core-functions/catalog';
import { getCompanyModuleState, saveCompanyModuleState } from '@/lib/core-functions/resolve';
import { clampEnabledToCap, normalizeCap } from '@/lib/core-functions/validate';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

export async function clampModulesForPlan(
  companyId: string,
  plan: string
): Promise<{ moduleCap: ModuleSlug[]; enabledSlugs: ModuleSlug[] }> {
  const planLimit = maxModulesForPlan(plan);
  const state = await getCompanyModuleState(companyId);
  const capped = normalizeCap(
    clampEnabledToCap(state.superAdminCap, planLimit).filter((s) => planLimit.includes(s))
  );
  const enabled = clampEnabledToCap(state.enabledSlugs, capped);
  await saveCompanyModuleState(companyId, {
    superAdminCap: capped,
    enabledSlugs: enabled,
  });
  return { moduleCap: capped, enabledSlugs: enabled };
}
