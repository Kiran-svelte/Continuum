/**
 * Global approval-chain configuration (Workday / BambooHR / Zoho People pattern):
 *
 * 1. Per workflow (leave, expense, travel, payroll_advance) define a role matrix:
 *    requester role → first approver role → escalation approver role.
 * 2. Never self-approve: resolved employee IDs exclude the requester (see approval-chain-resolver.ts).
 * 3. "Manager" means skip-level reporting manager (manager_id), not the requester.
 * 4. Per-employee ApprovalHierarchy rows override this matrix when present.
 */

import type { ModuleSlug } from '@/lib/core-functions/catalog';

export type WorkflowType = 'leave' | 'expense' | 'payroll_advance' | 'travel';

/** Module slug required for each approval workflow to appear in onboarding / settings. */
export const WORKFLOW_REQUIRED_MODULE: Record<WorkflowType, ModuleSlug> = {
  leave: 'leave',
  expense: 'expenses',
  travel: 'expenses',
  payroll_advance: 'payroll',
};

export type ApprovalRoleOverride = {
  requesterRole: string;
  level1Role: string;
  level2Role: string;
};

export type ApprovalChainConfig = {
  workflowType: WorkflowType;
  level1Role: string;
  level2Role: string;
  autoApproveAfterHours: number;
  roleOverrides?: ApprovalRoleOverride[];
};

export const REQUESTER_ROLES: Array<{ slug: string; label: string }> = [
  { slug: 'employee', label: 'Employee' },
  { slug: 'team_lead', label: 'Team Lead' },
  { slug: 'manager', label: 'Manager' },
  { slug: 'director', label: 'Director' },
  { slug: 'hr', label: 'HR' },
  { slug: 'admin', label: 'Admin' },
];

/** @deprecated use REQUESTER_ROLES */
export const LEAVE_REQUESTER_ROLES = REQUESTER_ROLES;

const EMPLOYEE_L1_MANAGER_L2_HR: ApprovalRoleOverride[] = [
  { requesterRole: 'employee', level1Role: 'manager', level2Role: 'hr' },
  { requesterRole: 'team_lead', level1Role: 'manager', level2Role: 'hr' },
];

const MANAGER_HR_ADMIN: ApprovalRoleOverride[] = [
  { requesterRole: 'manager', level1Role: 'hr', level2Role: 'admin' },
  { requesterRole: 'director', level1Role: 'admin', level2Role: 'hr' },
  { requesterRole: 'hr', level1Role: 'admin', level2Role: 'director' },
  { requesterRole: 'admin', level1Role: 'director', level2Role: 'hr' },
];

export const DEFAULT_LEAVE_ROLE_OVERRIDES: ApprovalRoleOverride[] = [
  ...EMPLOYEE_L1_MANAGER_L2_HR,
  ...MANAGER_HR_ADMIN,
];

export const DEFAULT_EXPENSE_ROLE_OVERRIDES: ApprovalRoleOverride[] = [
  ...EMPLOYEE_L1_MANAGER_L2_HR.map((row) => ({ ...row, level2Role: 'admin' })),
  { requesterRole: 'manager', level1Role: 'admin', level2Role: 'director' },
  { requesterRole: 'director', level1Role: 'admin', level2Role: 'hr' },
  { requesterRole: 'hr', level1Role: 'admin', level2Role: 'director' },
  { requesterRole: 'admin', level1Role: 'director', level2Role: 'hr' },
];

export const DEFAULT_TRAVEL_ROLE_OVERRIDES: ApprovalRoleOverride[] = DEFAULT_EXPENSE_ROLE_OVERRIDES.map(
  (row) => ({ ...row })
);

export const DEFAULT_PAYROLL_ADVANCE_ROLE_OVERRIDES: ApprovalRoleOverride[] = [
  { requesterRole: 'employee', level1Role: 'manager', level2Role: 'hr' },
  { requesterRole: 'team_lead', level1Role: 'manager', level2Role: 'hr' },
  { requesterRole: 'manager', level1Role: 'hr', level2Role: 'admin' },
  { requesterRole: 'director', level1Role: 'hr', level2Role: 'admin' },
  { requesterRole: 'hr', level1Role: 'admin', level2Role: 'director' },
  { requesterRole: 'admin', level1Role: 'director', level2Role: 'hr' },
];

export const DEFAULT_ROLE_OVERRIDES_BY_WORKFLOW: Record<WorkflowType, ApprovalRoleOverride[]> = {
  leave: DEFAULT_LEAVE_ROLE_OVERRIDES,
  expense: DEFAULT_EXPENSE_ROLE_OVERRIDES,
  travel: DEFAULT_TRAVEL_ROLE_OVERRIDES,
  payroll_advance: DEFAULT_PAYROLL_ADVANCE_ROLE_OVERRIDES,
};

export function getDefaultRoleOverrides(workflowType: WorkflowType): ApprovalRoleOverride[] {
  return DEFAULT_ROLE_OVERRIDES_BY_WORKFLOW[workflowType].map((row) => ({ ...row }));
}

export function ensureChainRoleOverrides(chain: ApprovalChainConfig): ApprovalChainConfig {
  const defaults = getDefaultRoleOverrides(chain.workflowType);
  const existing = chain.roleOverrides ?? [];
  if (existing.length === 0) {
    return { ...chain, roleOverrides: defaults };
  }

  const merged = defaults.map((defaultRow) => {
    const saved = existing.find((row) => row.requesterRole === defaultRow.requesterRole);
    return saved ? { ...defaultRow, ...saved } : defaultRow;
  });

  return { ...chain, roleOverrides: merged };
}

export function filterApprovalChainsByEnabledModules<T extends { workflowType: WorkflowType }>(
  chains: T[],
  enabledSlugs: readonly ModuleSlug[]
): T[] {
  const enabled = new Set(enabledSlugs);
  return chains.filter((chain) => {
    const required = WORKFLOW_REQUIRED_MODULE[chain.workflowType];
    return enabled.has(required);
  });
}

export function createDefaultApprovalChainConfigs(): ApprovalChainConfig[] {
  return (['leave', 'expense', 'payroll_advance', 'travel'] as WorkflowType[]).map((workflowType) => {
    const overrides = getDefaultRoleOverrides(workflowType);
    const employeeRow = overrides.find((row) => row.requesterRole === 'employee');
    return ensureChainRoleOverrides({
      workflowType,
      level1Role: employeeRow?.level1Role ?? 'manager',
      level2Role: employeeRow?.level2Role ?? 'hr',
      autoApproveAfterHours: workflowType === 'leave' ? 48 : 0,
      roleOverrides: overrides,
    });
  });
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function normalizeRole(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export function readApprovalChains(rawHrAlerts: unknown): ApprovalChainConfig[] {
  const hrAlerts = asRecord(rawHrAlerts);
  const rawChains = Array.isArray(hrAlerts.approval_chains) ? hrAlerts.approval_chains : [];
  const validWorkflows = new Set<WorkflowType>(['leave', 'expense', 'payroll_advance', 'travel']);

  const parsed = rawChains
    .map((rawChain) => {
      const chain = asRecord(rawChain);
      const workflowType = normalizeRole(chain.workflowType) as WorkflowType;
      if (!validWorkflows.has(workflowType)) return null;

      const roleOverrides = Array.isArray(chain.roleOverrides)
        ? chain.roleOverrides
            .map((rawOverride) => {
              const override = asRecord(rawOverride);
              const requesterRole = normalizeRole(override.requesterRole);
              const level1Role = normalizeRole(override.level1Role);
              const level2Role = normalizeRole(override.level2Role);
              if (!requesterRole || !level1Role || !level2Role) return null;
              return { requesterRole, level1Role, level2Role };
            })
            .filter((row): row is ApprovalRoleOverride => row !== null)
        : undefined;

      return ensureChainRoleOverrides({
        workflowType,
        level1Role: normalizeRole(chain.level1Role) || 'manager',
        level2Role: normalizeRole(chain.level2Role) || 'hr',
        autoApproveAfterHours:
          typeof chain.autoApproveAfterHours === 'number' && Number.isFinite(chain.autoApproveAfterHours)
            ? Math.max(0, Math.min(720, Math.trunc(chain.autoApproveAfterHours)))
            : 0,
        ...(roleOverrides && roleOverrides.length > 0 ? { roleOverrides } : {}),
      });
    })
    .filter((chain): chain is ApprovalChainConfig => chain !== null);

  if (parsed.length > 0) return parsed;
  return createDefaultApprovalChainConfigs();
}

export function resolveChainRolesForRequester(
  chain: ApprovalChainConfig,
  requesterRole: string | null | undefined
): { level1Role: string; level2Role: string; matchedRequesterRole: string | null } {
  const normalizedRequesterRole = normalizeRole(requesterRole);
  const chainWithOverrides = ensureChainRoleOverrides(chain);
  const overrides = chainWithOverrides.roleOverrides ?? [];
  const matched =
    overrides.find((row) => row.requesterRole === normalizedRequesterRole) ??
    (normalizedRequesterRole === 'team_lead'
      ? overrides.find((row) => row.requesterRole === 'employee')
      : undefined);

  if (matched) {
    return {
      level1Role: matched.level1Role,
      level2Role: matched.level2Role,
      matchedRequesterRole: matched.requesterRole,
    };
  }

  return {
    level1Role: chainWithOverrides.level1Role,
    level2Role: chainWithOverrides.level2Role,
    matchedRequesterRole: null,
  };
}

export type OrgModel = 'flat' | 'two_tier' | 'full_hierarchy';

export function deriveApprovalChainsFromOrgModel(orgModel: OrgModel): ApprovalChainConfig[] {
  const chains = createDefaultApprovalChainConfigs();

  if (orgModel === 'flat') {
    return chains.map((chain) =>
      ensureChainRoleOverrides({
        ...chain,
        level1Role: 'admin',
        level2Role: 'hr',
        roleOverrides: REQUESTER_ROLES.map(({ slug }) => ({
          requesterRole: slug,
          level1Role: slug === 'admin' ? 'director' : 'admin',
          level2Role: 'hr',
        })),
      })
    );
  }

  if (orgModel === 'full_hierarchy') {
    return chains.map((chain) => {
      const overrides = getDefaultRoleOverrides(chain.workflowType).map((row) => {
        if (row.requesterRole === 'employee' || row.requesterRole === 'team_lead') {
          return { ...row, level1Role: 'manager', level2Role: 'director' };
        }
        return row;
      });
      const employeeRow = overrides.find((row) => row.requesterRole === 'employee');
      return ensureChainRoleOverrides({
        ...chain,
        level1Role: employeeRow?.level1Role ?? 'manager',
        level2Role: employeeRow?.level2Role ?? 'director',
        roleOverrides: overrides,
      });
    });
  }

  return chains;
}
