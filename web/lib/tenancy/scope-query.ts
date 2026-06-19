/**
 * Tenant row-level scope helpers — every domain query must include companyId.
 */

export class TenantScopeViolationError extends Error {
  readonly code = 'TENANT_SCOPE_VIOLATION' as const;
  readonly status = 403;

  constructor(message = 'Access denied') {
    super(message);
    this.name = 'TenantScopeViolationError';
  }
}

/** Prisma where fragment for company-scoped tables (snake_case column). */
export function scopedWhereCompanyId(companyId: string): { company_id: string } {
  return { company_id: companyId };
}

/** Prisma where fragment for models using org_id (Employee). */
export function scopedWhereOrgId(orgId: string): { org_id: string } {
  return { org_id: orgId };
}

/**
 * Ensures a loaded resource belongs to the authenticated tenant.
 * Use before returning a single record by id.
 */
export function assertTenantScope(
  resourceCompanyId: string | null | undefined,
  requestCompanyId: string
): void {
  if (!resourceCompanyId || resourceCompanyId !== requestCompanyId) {
    throw new TenantScopeViolationError();
  }
}

/** Merge tenant scope into an existing where clause. */
export function withCompanyScope<T extends Record<string, unknown>>(
  companyId: string,
  where: T,
  field: 'company_id' | 'org_id' = 'company_id'
): T & { company_id: string } | T & { org_id: string } {
  return { ...where, [field]: companyId } as T & { company_id: string } | T & { org_id: string };
}
