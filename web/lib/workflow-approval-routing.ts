import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  readApprovalChains,
  type ApprovalChainConfig,
  type WorkflowType,
} from '@/lib/approval-chain-config';
import { resolveConfiguredWorkflowApprovers } from '@/lib/approval-chain-resolver';

export type WorkflowApprovalType = WorkflowType | 'reimbursement';

export type WorkflowApproverResolution = {
  approverId: string | null;
  allApproverIds: string[];
  reason: string;
};

export type PendingApproverProfile = {
  id: string;
  name: string;
  role: string;
  department: string | null;
};

export const PAYROLL_ADVANCE_API_PENDING = false;

export function normalizeWorkflowType(workflowType: WorkflowApprovalType): WorkflowType {
  return workflowType === 'reimbursement' ? 'expense' : workflowType;
}

/** Requester roles that must use the role matrix before per-employee hierarchy (avoids manager→manager). */
const ROLE_MATRIX_FIRST_REQUESTER_ROLES = new Set([
  'manager',
  'director',
  'hr',
  'admin',
]);

export function shouldPreferConfiguredApprovalChain(requesterRole: string | null | undefined): boolean {
  const role = (requesterRole || '').trim().toLowerCase();
  return ROLE_MATRIX_FIRST_REQUESTER_ROLES.has(role);
}

async function filterHierarchyApproverIds(params: {
  hierarchyIds: string[];
  requesterId: string;
  requesterRole: string | null | undefined;
  companyId: string;
}): Promise<string[]> {
  if (params.hierarchyIds.length === 0) return [];

  const requesterRole = (params.requesterRole || '').trim().toLowerCase();
  const rows = await prisma.employee.findMany({
    where: {
      id: { in: params.hierarchyIds },
      org_id: params.companyId,
      status: 'active',
      deleted_at: null,
    },
    select: { id: true, primary_role: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  return params.hierarchyIds.filter((id) => {
    if (!id || id === params.requesterId) return false;
    const approver = byId.get(id);
    if (!approver) return false;
    const approverRole = (approver.primary_role || '').toLowerCase();
    if (!requesterRole || !approverRole) return true;
    // Never route to a peer role (e.g. manager approving manager's leave).
    return approverRole !== requesterRole;
  });
}

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

async function getFallbackApproverIds(companyId: string, requesterId: string): Promise<string[]> {
  const rows = await prisma.employee.findMany({
    where: {
      org_id: companyId,
      status: 'active',
      deleted_at: null,
      id: { not: requesterId },
      primary_role: { in: ['hr', 'director', 'admin'] },
    },
    orderBy: [{ primary_role: 'asc' }, { created_at: 'asc' }],
    select: { id: true },
    take: 10,
  });

  return rows.map((row) => row.id);
}

export async function resolveWorkflowApprovers(
  workflowType: WorkflowApprovalType,
  companyId: string,
  requesterId: string
): Promise<WorkflowApproverResolution> {
  const normalizedWorkflowType = normalizeWorkflowType(workflowType);

  const [employee, hierarchy, companySettings] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: requesterId },
      select: {
        manager_id: true,
        invited_by_id: true,
        primary_role: true,
      },
    }),
    prisma.approvalHierarchy.findFirst({
      where: { company_id: companyId, emp_id: requesterId },
      select: {
        level1_approver: true,
        level2_approver: true,
        level3_approver: true,
        level4_approver: true,
        hr_partner: true,
      },
    }),
    prisma.companySettings.findUnique({
      where: { company_id: companyId },
      select: { hr_alerts: true },
    }),
  ]);

  const approvalChains = readApprovalChains(companySettings?.hr_alerts);
  const requesterRole = employee?.primary_role ?? null;

  const configuredRouting = await resolveConfiguredWorkflowApprovers({
    workflowType: normalizedWorkflowType,
    companyId,
    requesterId,
    requesterRole,
    managerId: employee?.manager_id ?? null,
    approvalChains,
  });

  if (shouldPreferConfiguredApprovalChain(requesterRole) && configuredRouting?.approverId) {
    return {
      approverId: configuredRouting.approverId,
      allApproverIds: configuredRouting.allApproverIds,
      reason: configuredRouting.reason,
    };
  }

  const hierarchyIds = await filterHierarchyApproverIds({
    hierarchyIds: uniqueNonEmpty([
      hierarchy?.level1_approver,
      hierarchy?.level2_approver,
      hierarchy?.level3_approver,
      hierarchy?.level4_approver,
      hierarchy?.hr_partner,
    ]),
    requesterId,
    requesterRole,
    companyId,
  });

  if (hierarchyIds.length > 0) {
    return {
      approverId: hierarchyIds[0],
      allApproverIds: hierarchyIds,
      reason: `approval_hierarchy_chain:${normalizedWorkflowType}`,
    };
  }

  if (configuredRouting?.approverId) {
    return {
      approverId: configuredRouting.approverId,
      allApproverIds: configuredRouting.allApproverIds,
      reason: configuredRouting.reason,
    };
  }

  const directApproverCandidates = uniqueNonEmpty([employee?.manager_id, employee?.invited_by_id]);
  const directApproverRows =
    directApproverCandidates.length > 0
      ? await prisma.employee.findMany({
          where: {
            id: { in: directApproverCandidates },
            org_id: companyId,
            status: 'active',
            deleted_at: null,
          },
          select: { id: true },
        })
      : [];

  const fallbackIds = uniqueNonEmpty([
    ...directApproverRows.map((row) => row.id),
    ...(await getFallbackApproverIds(companyId, requesterId)),
  ]);

  return {
    approverId: fallbackIds[0] ?? null,
    allApproverIds: fallbackIds,
    reason: fallbackIds.length > 0 ? `manager_inviter_or_role_fallback:${normalizedWorkflowType}` : 'no_approver_found',
  };
}

export async function canActOnWorkflowRequest(params: {
  workflowType: WorkflowApprovalType;
  requesterId: string;
  approverId: string;
  companyId: string;
  approverRole?: Role | string | null;
  currentApproverId?: string | null;
  allowAnyApprover?: boolean;
}): Promise<boolean> {
  if (!params.requesterId || !params.approverId || params.requesterId === params.approverId) {
    return false;
  }

  const role = (params.approverRole || '').toString().toLowerCase();
  if (role === 'super_admin' || params.allowAnyApprover) {
    return true;
  }

  if (
    params.currentApproverId &&
    params.currentApproverId !== params.approverId
  ) {
    return false;
  }

  const { allApproverIds } = await resolveWorkflowApprovers(
    params.workflowType,
    params.companyId,
    params.requesterId
  );
  return allApproverIds.includes(params.approverId);
}

export async function isAssignedWorkflowApprover(params: {
  workflowType: WorkflowApprovalType;
  companyId: string;
  requesterId: string;
  approverId: string;
  currentApproverId?: string | null;
}): Promise<boolean> {
  if (!params.approverId || params.approverId === params.requesterId) {
    return false;
  }

  if (params.currentApproverId) {
    return params.currentApproverId === params.approverId;
  }

  const { allApproverIds } = await resolveWorkflowApprovers(
    params.workflowType,
    params.companyId,
    params.requesterId
  );
  return allApproverIds.includes(params.approverId);
}

export async function fetchPendingApproverProfile(
  approverId: string | null | undefined
): Promise<PendingApproverProfile | null> {
  if (!approverId) return null;

  const approver = await prisma.employee.findUnique({
    where: { id: approverId },
    select: {
      id: true,
      first_name: true,
      last_name: true,
      primary_role: true,
      designation: true,
      department: true,
    },
  });

  if (!approver) return null;

  return {
    id: approver.id,
    name: `${approver.first_name} ${approver.last_name}`.trim(),
    role: approver.designation || approver.primary_role,
    department: approver.department,
  };
}

export function getNextWorkflowApproverId(
  allApproverIds: string[],
  currentApproverId: string | null | undefined
): string | null {
  if (!currentApproverId) {
    return allApproverIds[0] ?? null;
  }

  const currentIndex = allApproverIds.indexOf(currentApproverId);
  if (currentIndex === -1) {
    return allApproverIds[0] ?? null;
  }

  return allApproverIds[currentIndex + 1] ?? null;
}

export function getAutoApproveAfterHours(
  chains: ApprovalChainConfig[],
  workflowType: WorkflowApprovalType
): number {
  const normalizedWorkflowType = normalizeWorkflowType(workflowType);
  return chains.find((chain) => chain.workflowType === normalizedWorkflowType)?.autoApproveAfterHours ?? 0;
}
