/**
 * permission-module-map.ts
 *
 * Canonical bridge between PERMISSION_CATALOG `module` string tags (used in
 * rbac.ts) and the authoritative ModuleSlug values defined in catalog.ts.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * `PERMISSION_CATALOG` uses short, legacy module names as its `module` field
 * (e.g. `lms`, `employee`, `reimbursement`, `compensation`).  The module-gating
 * system uses `ModuleSlug` values from catalog.ts (e.g. `learning`, `employees`,
 * `reimbursements`, `payroll`).  Without a map these two systems cannot talk to
 * each other, causing permissions for disabled modules to leak into sessions.
 *
 * RULES
 * -----
 * - `null` means the permission group is always visible regardless of module
 *   state (platform infrastructure: company, audit, security, notifications,
 *   workflow).  These are never stripped by filterPermissionsByModules().
 * - Every PERMISSION_CATALOG `module` value must appear as a key here.
 *   Add new entries whenever a new permission group is created.
 *
 * @module lib/core-functions/permission-module-map
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';

/**
 * Maps a PERMISSION_CATALOG `module` tag to the corresponding catalog ModuleSlug.
 * A `null` value means the permission group is always on (mandatory infrastructure).
 */
export const PERMISSION_TAG_TO_MODULE_SLUG: Readonly<Record<string, ModuleSlug | null>> = {
  // ── Mandatory modules (always enabled) ───────────────────────────────────
  employee:     'employees',   // employee.* ↔ CF-001 employees (mandatory)
  leave:        'leave',       // leave.* ↔ CF-002 leave (mandatory)
  attendance:   'attendance',  // attendance.* ↔ CF-005 attendance (mandatory)
  compliance:   'compliance',  // future compliance.* ↔ CF-003 (mandatory)

  // ── Optional modules ──────────────────────────────────────────────────────
  payroll:       'payroll',       // payroll.* ↔ CF-006
  performance:   'performance',   // performance.* ↔ CF-007
  recruitment:   'recruitment',   // recruitment.* ↔ CF-008
  lms:           'learning',      // lms.* ↔ CF-009 (catalog slug = learning)
  expenses:      'expenses',      // expenses.* ↔ CF-010
  travel:        'expenses',      // travel.* co-gated with expenses (CF-010)
  reimbursement: 'reimbursements', // reimbursement.* ↔ CF-011 (catalog slug = reimbursements)
  compensation:  'payroll',        // compensation.* is a sub-feature of CF-006 payroll
  documents:     null,             // documents.* — no permission codes yet; treat as infra (forward-compat)
  exit:          null,             // exit.* — no permission codes yet; treat as infra (forward-compat)
  analytics:     null,             // analytics.* — no permission codes yet; treat as infra (forward-compat)

  // ── reports.* maps to null (always-on infrastructure) ─────────────────────
  // reports.view_team/view_all/export are core HR operations available to any HR
  // role regardless of optional module enablement.  They should NOT be gated by
  // the 'analytics' optional module, which is reserved for advanced AI/NLP
  // analytics features (CF-015) that do not yet have permission codes.
  reports:       null,

  // ── Platform infrastructure (always visible, never stripped) ─────────────
  // These exist in PERMISSION_CATALOG but are not gated by any optional module.
  company:       null,   // company settings — always accessible to admins
  audit:         null,   // audit trail — always accessible
  security:      null,   // security / RBAC management — always accessible
  notifications: null,   // notification config — always accessible
  workflow:      null,   // workflow engine — always accessible
  platform:      null,   // super-admin platform access — always accessible
};

/**
 * Returns the ModuleSlug that gates the given PERMISSION_CATALOG module tag.
 * Returns `null` for infrastructure permissions that are always on.
 * Returns `undefined` if the tag is not in the map (caller should treat as always-on
 * to be forward-compatible with unregistered tags).
 *
 * @param permissionModuleTag - The `module` field from a PermissionDefinition
 * @returns ModuleSlug | null | undefined
 */
export function getPermissionModuleSlug(
  permissionModuleTag: string
): ModuleSlug | null | undefined {
  return PERMISSION_TAG_TO_MODULE_SLUG[permissionModuleTag];
}
