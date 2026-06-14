import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import {
  type ApprovalChainConfig,
  type WorkflowType,
  resolveChainRolesForRequester,
} from '@/lib/approval-chain-config';

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

function excludeRequester(candidateId: string | null, requesterId: string): string | null {
  if (!candidateId || candidateId === requesterId) return null;
  return candidateId;
}

async function resolveEmployeeForRoleSlug(params: {
  companyId: string;
  requesterId: string;
  roleSlug: string;
  managerId: string | null;
}): Promise<string | null> {
  const role = params.roleSlug.trim().toLowerCase();
  if (!role) return null;

  if (role === 'manager' && params.managerId) {
    const skipLevelManager = excludeRequester(params.managerId, params.requesterId);
    if (skipLevelManager) {
      const directManager = await prisma.employee.findFirst({
        where: {
          id: skipLevelManager,
          org_id: params.companyId,
          status: 'active',
          deleted_at: null,
        },
        select: { id: true },
      });
      if (directManager) return directManager.id;
    }
  }

  const rows = await prisma.employee.findMany({
    where: {
      org_id: params.companyId,
      status: 'active',
      deleted_at: null,
      id: { not: params.requesterId },
      primary_role: role as Role,
    },
    orderBy: [{ primary_role: 'asc' }, { created_at: 'asc' }],
    take: 5,
    select: { id: true },
  });

  return rows[0]?.id ?? null;
}

export type WorkflowApproverResolution = {
  approverId: string | null;
  allApproverIds: string[];
  reason: string;
  level1Role: string;
  level2Role: string;
  matchedRequesterRole: string | null;
};

export async function resolveConfiguredWorkflowApprovers(params: {
  workflowType: WorkflowType;
  companyId: string;
  requesterId: string;
  requesterRole: string | null | undefined;
  managerId: string | null;
  approvalChains: ApprovalChainConfig[];
}): Promise<WorkflowApproverResolution | null> {
  const chain = params.approvalChains.find((item) => item.workflowType === params.workflowType);
  if (!chain) return null;

  const { level1Role, level2Role, matchedRequesterRole } = resolveChainRolesForRequester(
    chain,
    params.requesterRole
  );

  const [level1Id, level2Id] = await Promise.all([
    resolveEmployeeForRoleSlug({
      companyId: params.companyId,
      requesterId: params.requesterId,
      roleSlug: level1Role,
      managerId: params.managerId,
    }),
    resolveEmployeeForRoleSlug({
      companyId: params.companyId,
      requesterId: params.requesterId,
      roleSlug: level2Role,
      managerId: null,
    }),
  ]);

  const safeLevel1 = excludeRequester(level1Id, params.requesterId);
  const safeLevel2 = excludeRequester(level2Id, params.requesterId);
  const allApproverIds = uniqueNonEmpty([safeLevel1, safeLevel2]);
  if (allApproverIds.length === 0) return null;

  return {
    approverId: allApproverIds[0],
    allApproverIds,
    reason: matchedRequesterRole
      ? `approval_chain_role_override:${params.workflowType}:${matchedRequesterRole}`
      : `approval_chain_default:${params.workflowType}`,
    level1Role,
    level2Role,
    matchedRequesterRole,
  };
}

export async function resolveConfiguredLeaveApprovers(params: {
  companyId: string;
  requesterId: string;
  requesterRole: string | null | undefined;
  managerId: string | null;
  approvalChains: ApprovalChainConfig[];
}): Promise<{ approverId: string | null; allApproverIds: string[]; reason: string } | null> {
  const result = await resolveConfiguredWorkflowApprovers({
    workflowType: 'leave',
    ...params,
  });
  if (!result) return null;
  return {
    approverId: result.approverId,
    allApproverIds: result.allApproverIds,
    reason: result.reason,
  };
}
