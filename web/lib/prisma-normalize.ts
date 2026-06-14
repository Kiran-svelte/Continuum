/**
 * Global Prisma response normalizer.
 *
 * Prisma generates verbose relation names when a model has multiple foreign keys
 * to the same target (e.g., `employee`).
 * If these are returned in API responses, the frontend crashes because it expects
 * clean aliases like `employee` or `approver`.
 *
 * This module provides a single function that recursively normalizes these keys
 * before the response is sent. It replaces per-endpoint manual destructuring
 * with a pattern-based, automatic solution.
 *
 * @module prisma-normalize
 */

// ─── Types ───────────────────────────────────────────────────────────────────

/** Mapping rule: regex pattern → clean alias */
interface NormalizationRule {
  /** Pattern to match against Prisma-generated key names */
  pattern: RegExp;
  /** Clean alias to use as the replacement key */
  alias: string;
}

// ─── Normalization Rules ─────────────────────────────────────────────────────

/**
 * Rules are evaluated in order. First match wins.
 *
 * The patterns are designed to catch Prisma's naming convention:
 * `Model_ForeignKeyRelation_fieldNameToTargetModel`
 *
 * Order matters: more specific patterns (approved_by, verified_by) must
 * come before the generic emp_id catch-all.
 */
const NORMALIZATION_RULES: NormalizationRule[] = [
  // Approver relations (approved_by foreign key)
  { pattern: /^Employee_\w+_approved_byToEmployee$/, alias: 'approver' },
  // Verifier relations (verified_by foreign key)
  { pattern: /^Employee_\w+_verified_byToEmployee$/, alias: 'verifier' },
  // Changed-by relations (changed_by foreign key)
  { pattern: /^Employee_\w+_changed_byToEmployee$/, alias: 'changedBy' },
  // Generated-by relations (generated_by foreign key)
  { pattern: /^Employee_\w+_generated_byToEmployee$/, alias: 'generatedBy' },
  // Employee (emp_id foreign key — the "owner" of the record)
  { pattern: /^Employee_\w+_emp_idToEmployee$/, alias: 'employee' },
  // Simple capitalized Employee (ExitChecklist pattern)
  // Only match exact "Employee" — not "EmployeeMovement" etc.
  // This rule runs last because it's the broadest.
];

/** Keys matching this pattern are capitalized Prisma model names that should be lowercased */
const SIMPLE_RELATION_PATTERN = /^[A-Z][a-z]+$/;

// ─── Core Normalizer ─────────────────────────────────────────────────────────

/**
 * Normalizes a single Prisma result object by renaming verbose relation keys
 * to clean, frontend-friendly aliases.
 *
 * Non-destructive: keys that don't match any rule are preserved as-is.
 * Recursive: normalizes nested objects and arrays.
 *
 * @param record - Raw Prisma query result
 * @returns Normalized object with clean relation keys
 *
 * @example
 * ```ts
 * const raw = await prisma.reimbursement.findMany({ include: { employee: true } });
 * const clean = raw.map(normalizePrismaRecord);
 * // clean[0].employee instead of clean[0].employee
 * ```
 */
export function normalizePrismaRecord<T extends Record<string, unknown>>(record: T): T {
  if (record === null || record === undefined || typeof record !== 'object') {
    return record;
  }

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    const alias = resolveAlias(key);
    const normalizedValue = normalizeValue(value);
    result[alias] = normalizedValue;
  }

  return result as T;
}

/**
 * Normalizes an array of Prisma records.
 * Convenience wrapper for `records.map(normalizePrismaRecord)`.
 *
 * @param records - Array of raw Prisma query results
 * @returns Array of normalized objects
 */
export function normalizePrismaRecords<T extends Record<string, unknown>>(records: T[]): T[] {
  return records.map(normalizePrismaRecord);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Resolves a key to its clean alias using the normalization rules.
 * Returns the original key if no rule matches.
 */
function resolveAlias(key: string): string {
  for (const rule of NORMALIZATION_RULES) {
    if (rule.pattern.test(key)) {
      return rule.alias;
    }
  }

  // Handle simple capitalized relation names like "Employee", "Company"
  // by lowercasing them (e.g., "Employee" → "employee")
  if (SIMPLE_RELATION_PATTERN.test(key)) {
    return key.charAt(0).toLowerCase() + key.slice(1);
  }

  return key;
}

/**
 * Recursively normalizes nested values.
 * - Objects are normalized via normalizePrismaRecord
 * - Arrays have each element normalized
 * - Primitives are returned as-is
 */
function normalizeValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((item) =>
      typeof item === 'object' && item !== null && !(item instanceof Date)
        ? normalizePrismaRecord(item as Record<string, unknown>)
        : item
    );
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === 'object') {
    return normalizePrismaRecord(value as Record<string, unknown>);
  }

  return value;
}
