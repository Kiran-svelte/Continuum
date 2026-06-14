/**
 * Shared module-gating helpers for middleware, quick-start, setup hub, and checklists.
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';

/** Modules that unlock unified HR/manager approval hubs. */
export const WORKFLOW_APPROVAL_MODULES: readonly ModuleSlug[] = [
  'leave',
  'expenses',
  'reimbursements',
];

export function hasAnyEnabledModule(
  enabled: readonly ModuleSlug[],
  candidates: readonly ModuleSlug[]
): boolean {
  const set = new Set(enabled);
  return candidates.some((slug) => set.has(slug));
}

export function isModuleEnabledInList(
  enabled: readonly ModuleSlug[],
  slug: ModuleSlug
): boolean {
  if (slug === 'employees') return true;
  return enabled.includes(slug);
}

export type ModuleGateSpec =
  | { moduleSlug: ModuleSlug }
  | { requiresAnyModule: readonly ModuleSlug[] };

/** Setup hub card key → module gate (mirrors setup-hub-catalog; avoid import cycle). */
export const SETUP_WIZARD_CARD_GATES: Record<string, ModuleGateSpec | undefined> = {
  company_profile: undefined,
  departments: undefined,
  locations: undefined,
  employees: undefined,
  roles: undefined,
  job_titles: undefined,
  shifts: { moduleSlug: 'attendance' },
  holidays: { moduleSlug: 'leave' },
  leave_types: { moduleSlug: 'leave' },
  leave_approvals: { requiresAnyModule: WORKFLOW_APPROVAL_MODULES },
  salary_structure: { moduleSlug: 'payroll' },
  salary_structures_per_employee: { moduleSlug: 'payroll' },
  statutory: { moduleSlug: 'payroll' },
  pf_setup: { moduleSlug: 'pf' },
  notifications: undefined,
  workflows: { requiresAnyModule: ['leave', 'expenses', 'reimbursements'] },
  integrations: undefined,
  performance_setup: { moduleSlug: 'performance' },
  recruitment_setup: { moduleSlug: 'recruitment' },
  learning_setup: { moduleSlug: 'learning' },
  documents_setup: { moduleSlug: 'documents' },
  exit_setup: { moduleSlug: 'exit' },
  expenses_setup: { moduleSlug: 'expenses' },
  reimbursements_setup: { moduleSlug: 'reimbursements' },
  directory_setup: { moduleSlug: 'directory' },
  analytics_setup: { moduleSlug: 'analytics' },
  compliance_setup: { moduleSlug: 'compliance' },
};

export function isGatedItemVisible(
  gate: ModuleGateSpec | undefined,
  enabled: readonly ModuleSlug[]
): boolean {
  if (!gate) return true;
  if ('requiresAnyModule' in gate) {
    return hasAnyEnabledModule(enabled, gate.requiresAnyModule);
  }
  return isModuleEnabledInList(enabled, gate.moduleSlug);
}

export function filterSetupWizardCategories<
  T extends { cards: Array<{ key: string }> },
>(categories: T[], enabled: readonly ModuleSlug[]): T[] {
  return categories
    .map((category) => ({
      ...category,
      cards: category.cards.filter((card) =>
        isGatedItemVisible(SETUP_WIZARD_CARD_GATES[card.key], enabled)
      ),
    }))
    .filter((category) => category.cards.length > 0);
}
