type RoleName =
  | 'super_admin'
  | 'admin'
  | 'hr'
  | 'director'
  | 'manager'
  | 'team_lead'
  | 'employee';

export type CapabilityKey =
  | 'organization_governance'
  | 'people_operations'
  | 'approval_operations'
  | 'employee_self_service'
  | 'security_and_audit';

export interface CapabilityPolicy {
  label: string;
  owner: RoleName;
  fallback: RoleName[];
  includes: string[];
}

export interface CapabilityResolution {
  capability: CapabilityKey;
  capabilityLabel: string;
  owner: RoleName;
  configuredOwner: RoleName;
  effectiveOwner: RoleName | null;
  fallbackApplied: boolean;
  fallbackReason: string | null;
}

export interface CapabilityOwnerOverrides {
  people_operations?: RoleName;
  organization_governance?: RoleName;
  approval_operations?: RoleName;
  employee_self_service?: RoleName;
  security_and_audit?: RoleName;
}

interface CapabilityContext {
  ownerOverrides?: CapabilityOwnerOverrides;
  staffedRoles?: RoleName[];
}

export const CAPABILITY_POLICY_MAP: Record<CapabilityKey, CapabilityPolicy> = {
  organization_governance: {
    label: 'Organization Governance',
    owner: 'admin',
    fallback: ['hr'],
    includes: ['Company settings', 'Policy baseline', 'Org structure', 'High-risk config'],
  },
  people_operations: {
    label: 'People Operations',
    owner: 'hr',
    fallback: ['admin'],
    includes: ['Employee lifecycle', 'Leave policy setup', 'Attendance policy', 'Salary components'],
  },
  approval_operations: {
    label: 'Approval Operations',
    owner: 'manager',
    fallback: ['hr', 'admin'],
    includes: ['Leave approvals', 'Reimbursements', 'Escalation handling'],
  },
  employee_self_service: {
    label: 'Employee Self Service',
    owner: 'employee',
    fallback: [],
    includes: ['Requests', 'Profile', 'Payslips', 'Documents'],
  },
  security_and_audit: {
    label: 'Security And Audit',
    owner: 'admin',
    fallback: [],
    includes: ['RBAC', 'Audit logs', 'Security alerts'],
  },
};

const ROLE_SET = new Set<RoleName>([
  'super_admin',
  'admin',
  'hr',
  'director',
  'manager',
  'team_lead',
  'employee',
]);

function isRoleName(value: unknown): value is RoleName {
  return typeof value === 'string' && ROLE_SET.has(value as RoleName);
}

export function normalizeRoleList(input: unknown): RoleName[] {
  if (!Array.isArray(input)) {
    return [];
  }

  const normalized = new Set<RoleName>();
  for (const value of input) {
    if (typeof value !== 'string') {
      continue;
    }

    const candidate = value.trim().toLowerCase();
    if (
      candidate === 'super_admin' ||
      candidate === 'admin' ||
      candidate === 'hr' ||
      candidate === 'director' ||
      candidate === 'manager' ||
      candidate === 'team_lead' ||
      candidate === 'employee'
    ) {
      normalized.add(candidate);
    }
  }

  return Array.from(normalized);
}

export function normalizeActorRoles(
  primaryRole?: string | null,
  secondaryRoles?: string[] | null
): RoleName[] {
  return normalizeRoleList([primaryRole, ...(secondaryRoles || [])]);
}

export function parseCapabilityOwnerOverrides(
  companySettingsHrAlerts: unknown
): CapabilityOwnerOverrides {
  if (
    !companySettingsHrAlerts ||
    typeof companySettingsHrAlerts !== 'object' ||
    Array.isArray(companySettingsHrAlerts)
  ) {
    return {};
  }

  const root = companySettingsHrAlerts as Record<string, unknown>;
  const capabilityOwners = root.capability_owners;

  if (
    !capabilityOwners ||
    typeof capabilityOwners !== 'object' ||
    Array.isArray(capabilityOwners)
  ) {
    return {};
  }

  const owners = capabilityOwners as Record<string, unknown>;
  const parsed: CapabilityOwnerOverrides = {};

  if (isRoleName(owners.people_operations)) {
    parsed.people_operations = owners.people_operations;
  }
  if (isRoleName(owners.organization_governance)) {
    parsed.organization_governance = owners.organization_governance;
  }
  if (isRoleName(owners.approval_operations)) {
    parsed.approval_operations = owners.approval_operations;
  }
  if (isRoleName(owners.employee_self_service)) {
    parsed.employee_self_service = owners.employee_self_service;
  }
  if (isRoleName(owners.security_and_audit)) {
    parsed.security_and_audit = owners.security_and_audit;
  }

  return parsed;
}

export function getRoleCatalogFromCompany(enabledRolesJson: unknown): RoleName[] {
  const roles = normalizeRoleList(enabledRolesJson);
  if (!roles.includes('admin')) {
    roles.push('admin');
  }
  return roles;
}

function getCapabilityChain(
  capability: CapabilityKey,
  ownerOverrides?: CapabilityOwnerOverrides
): { configuredOwner: RoleName; chain: RoleName[] } {
  const policy = CAPABILITY_POLICY_MAP[capability];
  const configuredOwner = ownerOverrides?.[capability] ?? policy.owner;
  const chain: RoleName[] = [configuredOwner, ...policy.fallback];
  const deduped = Array.from(new Set(chain));

  return {
    configuredOwner,
    chain: deduped,
  };
}

export function getCapabilityAccessRoles(
  capability: CapabilityKey,
  availableRoles: RoleName[],
  context?: CapabilityContext
): RoleName[] {
  const roleSet = new Set(availableRoles);
  const { chain } = getCapabilityChain(capability, context?.ownerOverrides);
  return chain.filter((role) => roleSet.has(role));
}

export function getCapabilityResolution(
  capability: CapabilityKey,
  availableRoles: RoleName[],
  context?: CapabilityContext
): CapabilityResolution {
  const policy = CAPABILITY_POLICY_MAP[capability];
  const roleSet = new Set(availableRoles);
  const staffedRoleSet = context?.staffedRoles ? new Set(context.staffedRoles) : null;
  const { configuredOwner, chain } = getCapabilityChain(capability, context?.ownerOverrides);

  let effectiveOwner = chain.find((role) => roleSet.has(role)) ?? null;

  if (staffedRoleSet && staffedRoleSet.size > 0) {
    const staffedMatch = chain.find((role) => roleSet.has(role) && staffedRoleSet.has(role));
    if (staffedMatch) {
      effectiveOwner = staffedMatch;
    }
  }

  return {
    capability,
    capabilityLabel: policy.label,
    owner: policy.owner,
    configuredOwner,
    effectiveOwner,
    fallbackApplied: effectiveOwner !== null && effectiveOwner !== configuredOwner,
    fallbackReason:
      effectiveOwner === null
        ? `No eligible owner present for ${policy.label}.`
        : effectiveOwner !== configuredOwner
          ? `${policy.label} reassigned from ${configuredOwner} to ${effectiveOwner}.`
          : null,
  };
}

export function getCapabilityRoute(
  capability: CapabilityKey,
  availableRoles: RoleName[],
  context?: CapabilityContext
): string {
  const resolution = getCapabilityResolution(capability, availableRoles, context);

  switch (capability) {
    case 'organization_governance':
      return '/admin/company-settings';
    case 'people_operations':
      if (resolution.effectiveOwner === 'manager' || resolution.effectiveOwner === 'director' || resolution.effectiveOwner === 'team_lead') {
        return '/manager/people/invite';
      }
      return resolution.effectiveOwner === 'admin' ? '/admin/people/invite' : '/hr/employees/invite';
    case 'approval_operations':
      if (resolution.effectiveOwner === 'manager' || resolution.effectiveOwner === 'team_lead') {
        return '/manager/team-attendance';
      }
      return resolution.effectiveOwner === 'admin' ? '/admin/dashboard' : '/hr/approvals';
    case 'employee_self_service':
      return '/employee/dashboard';
    case 'security_and_audit':
      return '/admin/audit-logs';
    default:
      return '/employee/dashboard';
  }
}

export function getFallbackWarningSummary(availableRoles: RoleName[]): string[] {
  const messages: string[] = [];

  for (const capability of Object.keys(CAPABILITY_POLICY_MAP) as CapabilityKey[]) {
    const resolution = getCapabilityResolution(capability, availableRoles);
    if (resolution.fallbackApplied && resolution.fallbackReason) {
      messages.push(resolution.fallbackReason);
    }
  }

  return messages;
}
