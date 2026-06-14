export const CORE_HIERARCHY_ROLES = ['admin', 'hr', 'manager', 'employee'] as const;
export const LEGACY_HIERARCHY_ROLES = ['director', 'team_lead'] as const;

export type HierarchyRole = (typeof CORE_HIERARCHY_ROLES)[number] | (typeof LEGACY_HIERARCHY_ROLES)[number] | 'super_admin';

export interface CompanyRolePolicyInput {
  slug: string;
  base_role?: string | null;
  can_create_roles?: unknown;
  can_create_users?: boolean | null;
  authority_level?: number | null;
  is_active?: boolean | null;
}

export interface CompanyHierarchyPolicyInput {
  enabledRoles: unknown;
  requiresHr?: boolean | null;
  requiresManager?: boolean | null;
  companyRoles?: CompanyRolePolicyInput[];
}

export interface InviteTargetResolution {
  allowedRoles: string[];
  defaultRole: string;
  source: 'company-role' | 'derived';
  note: string;
}

export interface CompanyHierarchyPolicySnapshot {
  enabledRoles: string[];
  requiresHr: boolean;
  requiresManager: boolean;
  creationTargetsByRole: Record<string, string[]>;
  inviteTargetsByRole: Record<string, InviteTargetResolution>;
  roleLadder: string[];
  summary: string[];
}

const ROLE_PRIORITY: HierarchyRole[] = ['admin', 'hr', 'manager', 'director', 'team_lead', 'employee', 'super_admin'];

const ROLE_LABELS: Record<HierarchyRole, string> = {
  admin: 'Company Admin',
  hr: 'HR',
  manager: 'Manager',
  director: 'Director',
  team_lead: 'Team Lead',
  employee: 'Employee',
  super_admin: 'Super Admin',
};

export function sanitizeHierarchyRole(value: unknown): HierarchyRole | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  return ROLE_PRIORITY.includes(normalized as HierarchyRole) ? (normalized as HierarchyRole) : null;
}

export function normalizeHierarchyRoleList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const result = new Set<string>();
  for (const entry of value) {
    const role = sanitizeHierarchyRole(entry);
    if (role) {
      result.add(role);
    }
  }
  return Array.from(result);
}

function hasRole(enabledRoles: Set<string>, role: string): boolean {
  return enabledRoles.has(role);
}

function pickAllowedRoles(preferredRoles: string[], enabledRoles: Set<string>): string[] {
  return preferredRoles.filter((role) => enabledRoles.has(role));
}

export function resolveDefaultCreationTargets(actorRole: string, enabledRolesInput: unknown): string[] {
  const enabledRoles = new Set(normalizeHierarchyRoleList(enabledRolesInput));
  enabledRoles.add('employee');
  enabledRoles.add('admin');

  const role = sanitizeHierarchyRole(actorRole);
  if (!role) return [];

  switch (role) {
    case 'super_admin':
      return pickAllowedRoles(['admin', 'hr', 'manager', 'employee'], enabledRoles);
    case 'admin':
      return pickAllowedRoles(['hr', 'manager', 'employee'], enabledRoles);
    case 'hr':
      return pickAllowedRoles(['manager', 'employee'], enabledRoles);
    case 'manager':
    case 'director':
    case 'team_lead':
      return pickAllowedRoles(['employee'], enabledRoles);
    case 'employee':
    default:
      return [];
  }
}

export function resolveInviteTargets(
  actorRole: string,
  enabledRolesInput: unknown,
  companyRole: CompanyRolePolicyInput | null | undefined
): InviteTargetResolution {
  const enabledRoles = new Set(normalizeHierarchyRoleList(enabledRolesInput));
  enabledRoles.add('employee');
  enabledRoles.add('admin');

  const actor = sanitizeHierarchyRole(actorRole) ?? 'employee';
  const derivedTargets = resolveDefaultCreationTargets(actor, Array.from(enabledRoles));
  const explicitTargets = normalizeHierarchyRoleList(companyRole?.can_create_roles);
  const explicitAllowed = explicitTargets.length > 0
    ? derivedTargets.filter((role) => explicitTargets.includes(role))
    : [];

  const allowedRoles = explicitAllowed.length > 0 ? explicitAllowed : derivedTargets;
  const defaultRole = allowedRoles[0] || 'employee';

  return {
    allowedRoles,
    defaultRole,
    source: explicitAllowed.length > 0 ? 'company-role' : 'derived',
    note:
      allowedRoles.length > 0
        ? `Creation policy resolved from ${explicitAllowed.length > 0 ? 'company role' : 'tenant hierarchy'} rules.`
        : 'No downstream creation targets are available for this role.',
  };
}

export function buildCompanyHierarchyPolicySnapshot(
  input: CompanyHierarchyPolicyInput
): CompanyHierarchyPolicySnapshot {
  const enabledRoles = normalizeHierarchyRoleList(input.enabledRoles);
  const enabledRoleSet = new Set(enabledRoles);
  enabledRoleSet.add('employee');
  enabledRoleSet.add('admin');

  const creationTargetsByRole: Record<string, string[]> = {};
  const inviteTargetsByRole: Record<string, InviteTargetResolution> = {};

  for (const role of ROLE_PRIORITY) {
    const defaults = resolveDefaultCreationTargets(role, Array.from(enabledRoleSet));
    creationTargetsByRole[role] = defaults;

    const explicitRole = input.companyRoles?.find((entry) => entry.slug === role && entry.is_active !== false) ?? null;
    inviteTargetsByRole[role] = resolveInviteTargets(role, Array.from(enabledRoleSet), explicitRole);
  }

  const ladder = ['admin', 'hr', 'manager', 'employee'].filter((role) => hasRole(enabledRoleSet, role));
  if (ladder.length === 0) {
    ladder.push('employee');
  }

  return {
    enabledRoles,
    requiresHr: Boolean(input.requiresHr),
    requiresManager: Boolean(input.requiresManager),
    creationTargetsByRole,
    inviteTargetsByRole,
    roleLadder: ladder,
    summary: [
      `Admin can create: ${creationTargetsByRole.admin.join(', ') || 'none'}`,
      `HR can create: ${creationTargetsByRole.hr.join(', ') || 'none'}`,
      `Manager can create: ${creationTargetsByRole.manager.join(', ') || 'none'}`,
    ],
  };
}

export function getHierarchyRoleLabel(role: string): string {
  const normalized = sanitizeHierarchyRole(role);
  if (!normalized) return role;
  return ROLE_LABELS[normalized];
}
