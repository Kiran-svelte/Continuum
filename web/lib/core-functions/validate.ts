/**
 * Module state validation helpers.
 */

import {
  CORE_FUNCTION_CATALOG,
  MANDATORY_SLUGS,
  type ModuleSlug,
} from '@/lib/core-functions/catalog';

export interface ModuleValidationIssue {
  slug: ModuleSlug;
  code: 'UNKNOWN_SLUG' | 'EXCEEDS_CAP' | 'MISSING_DEPENDENCY' | 'MANDATORY_REMOVED';
  message: string;
}

function uniqueSlugs(slugs: string[]): ModuleSlug[] {
  const seen = new Set<string>();
  const out: ModuleSlug[] = [];
  for (const raw of slugs) {
    const slug = raw.trim();
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    out.push(slug as ModuleSlug);
  }
  return out;
}

/** Ensures enabled modules are a subset of super admin cap. */
export function clampEnabledToCap(
  enabled: ModuleSlug[],
  cap: ModuleSlug[]
): ModuleSlug[] {
  const capSet = new Set(cap);
  const clamped = enabled.filter((slug) => capSet.has(slug));
  for (const mandatory of MANDATORY_SLUGS) {
    if (capSet.has(mandatory) && !clamped.includes(mandatory)) {
      clamped.push(mandatory);
    }
  }
  return uniqueSlugs(clamped);
}

/** Ensures mandatory slugs are present when allowed by cap. */
export function ensureMandatorySlugs(
  enabled: ModuleSlug[],
  cap: ModuleSlug[]
): ModuleSlug[] {
  const capSet = new Set(cap);
  const next = uniqueSlugs(enabled);
  for (const mandatory of MANDATORY_SLUGS) {
    if (capSet.has(mandatory) && !next.includes(mandatory)) {
      next.push(mandatory);
    }
  }
  return next;
}

/** Validates dependencies for each enabled slug. */
export function validateDependencies(
  enabled: ModuleSlug[]
): ModuleValidationIssue[] {
  const enabledSet = new Set(enabled);
  const issues: ModuleValidationIssue[] = [];

  for (const slug of enabled) {
    const def = CORE_FUNCTION_CATALOG.find((cf) => cf.slug === slug);
    if (!def) {
      issues.push({
        slug,
        code: 'UNKNOWN_SLUG',
        message: `Unknown module slug: ${slug}`,
      });
      continue;
    }
    for (const dep of def.dependsOn) {
      if (!enabledSet.has(dep)) {
        issues.push({
          slug,
          code: 'MISSING_DEPENDENCY',
          message: `${def.name} requires ${dep} to be enabled`,
        });
      }
    }
  }

  for (const mandatory of MANDATORY_SLUGS) {
    if (!enabledSet.has(mandatory)) {
      issues.push({
        slug: mandatory,
        code: 'MANDATORY_REMOVED',
        message: `${mandatory} is mandatory and cannot be disabled`,
      });
    }
  }

  return issues;
}

/** Normalizes cap list: unknown slugs dropped, mandatory always included. */
export function normalizeCap(slugs: string[]): ModuleSlug[] {
  const cap = uniqueSlugs(slugs.filter((s) =>
    CORE_FUNCTION_CATALOG.some((cf) => cf.slug === s)
  ));
  return ensureMandatorySlugs(cap, cap);
}
