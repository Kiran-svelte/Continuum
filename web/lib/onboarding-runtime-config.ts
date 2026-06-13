type JsonRecord = Record<string, unknown>;

export interface RoleQuotaDraft {
  role_slug: string;
  leave_type_code: string;
  annual_quota: number;
}

export type RoleQuotaMap = Record<string, Record<string, number>>;

export function toJsonRecord(value: unknown): JsonRecord {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return { ...(value as JsonRecord) };
}

export function sanitizeRoleSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z_]/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function sanitizeLeaveTypeCode(value: string): string {
  return value.trim().toUpperCase();
}

export function buildRoleQuotaMap(input: RoleQuotaDraft[] | undefined): RoleQuotaMap {
  const map: RoleQuotaMap = {};

  if (!input || input.length === 0) {
    return map;
  }

  for (const row of input) {
    const roleSlug = sanitizeRoleSlug(row.role_slug || '');
    const leaveCode = sanitizeLeaveTypeCode(row.leave_type_code || '');
    const annualQuota = Number(row.annual_quota);

    if (!roleSlug || !leaveCode || !Number.isFinite(annualQuota) || annualQuota < 0) {
      continue;
    }

    if (!map[roleSlug]) {
      map[roleSlug] = {};
    }
    map[roleSlug][leaveCode] = annualQuota;
  }

  return map;
}

export function readRoleQuotaMap(hrAlerts: unknown): RoleQuotaMap {
  const root = toJsonRecord(hrAlerts);
  const roleQuotas = toJsonRecord(root.role_quotas);
  const map: RoleQuotaMap = {};

  for (const [roleSlug, value] of Object.entries(roleQuotas)) {
    const normalizedRole = sanitizeRoleSlug(roleSlug);
    if (!normalizedRole) continue;

    const leaveMap = toJsonRecord(value);
    for (const [leaveCode, quota] of Object.entries(leaveMap)) {
      const normalizedCode = sanitizeLeaveTypeCode(leaveCode);
      const parsedQuota = Number(quota);
      if (!normalizedCode || !Number.isFinite(parsedQuota) || parsedQuota < 0) {
        continue;
      }

      if (!map[normalizedRole]) {
        map[normalizedRole] = {};
      }
      map[normalizedRole][normalizedCode] = parsedQuota;
    }
  }

  return map;
}

export function mergeHrAlerts(existing: unknown, patch: JsonRecord): JsonRecord {
  const base = toJsonRecord(existing);
  return {
    ...base,
    ...patch,
  };
}

export function deriveEnabledRolesFromRoleSetup(roleSlugs: string[]): {
  enabledRoles: string[];
  requiresHr: boolean;
  requiresManager: boolean;
} {
  const normalized = new Set(
    roleSlugs
      .map((slug) => sanitizeRoleSlug(slug))
      .filter((slug) => slug.length > 0)
  );

  // Always keep mandatory core roles enabled.
  normalized.add('employee');
  normalized.add('admin');

  const enabledRoles = Array.from(normalized);

  return {
    enabledRoles,
    requiresHr: normalized.has('hr'),
    requiresManager:
      normalized.has('manager') || normalized.has('team_lead') || normalized.has('director'),
  };
}
