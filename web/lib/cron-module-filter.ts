/**
 * cron-module-filter.ts
 *
 * Shared utility for cron jobs to filter companies based on their enabled
 * module configuration. Cron jobs must never run business logic for a
 * company that has the relevant module disabled — doing so can corrupt
 * balances, trigger spurious notifications, and create audit noise.
 *
 * Usage:
 *   const enabledCompanyIds = await getCompanyIdsWithModuleEnabled('leave');
 *   // then query: where: { company_id: { in: enabledCompanyIds } }
 *
 * @module lib/cron-module-filter
 */

import prisma from '@/lib/prisma';
import { getCompanyModuleState, isModuleEnabled } from '@/lib/core-functions/resolve';
import type { ModuleSlug } from '@/lib/core-functions/catalog';

/**
 * Returns the set of company IDs that have the specified module enabled.
 * Delegates to getCompanyModuleState so it respects both Prisma and Appwrite
 * module sources, clamp/cap rules, and mandatory-slug injection.
 *
 * Companies that have no CompanySettings row default to ALL modules on
 * (backward-compatible for orgs created before module gating was introduced).
 *
 * @param moduleSlug - The module slug to check (e.g. 'leave', 'payroll')
 * @returns Promise resolving to an array of company IDs with the module on
 * @throws Never — logs and returns empty array on DB error to prevent cron crash
 */
export async function getCompanyIdsWithModuleEnabled(moduleSlug: ModuleSlug): Promise<string[]> {
  try {
    // Fetch all company IDs that have completed onboarding (active orgs only)
    const companies = await prisma.company.findMany({
      where: { onboarding_completed: true },
      select: { id: true },
    });

    const enabledIds: string[] = [];

    for (const company of companies) {
      const moduleState = await getCompanyModuleState(company.id);
      if (isModuleEnabled(moduleState, moduleSlug)) {
        enabledIds.push(company.id);
      }
    }

    return enabledIds;
  } catch (error) {
    console.error('[cron-module-filter] Failed to load company module settings', {
      moduleSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    // Return empty to prevent cron from running against unknown state.
    return [];
  }
}

/**
 * Checks whether a single company has the given module enabled.
 * Delegates to getCompanyModuleState for canonical resolution.
 *
 * @param companyId - Company UUID
 * @param moduleSlug - The module slug to check
 * @returns Promise<boolean> — false on error (safe default)
 */
export async function isModuleEnabledForCompany(
  companyId: string,
  moduleSlug: ModuleSlug
): Promise<boolean> {
  try {
    const moduleState = await getCompanyModuleState(companyId);
    return isModuleEnabled(moduleState, moduleSlug);
  } catch (error) {
    console.error('[cron-module-filter] Single-company check failed', {
      companyId,
      moduleSlug,
      error: error instanceof Error ? error.message : String(error),
    });
    return false; // safe default — skip if uncertain
  }
}
