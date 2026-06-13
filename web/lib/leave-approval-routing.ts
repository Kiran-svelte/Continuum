import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';

export type LeaveApproverResolution = {
  approverId: string | null;
  allApproverIds: string[];
  reason: string;
};

function uniqueNonEmpty(values: Array<string | null | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))));
}

async function getFallbackApproverIds(companyId: string): Promise<string[]> {
  const rows = await prisma.employee.findMany({
    where: {
      org_id: companyId,
      status: 'active',
      primary_role: {
        in: ['hr', 'director', 'admin'],
      },
    },
    orderBy: [
      { primary_role: 'asc' },
      { created_at: 'asc' },
    ],
    select: { id: true },
    take: 10,
  });

  return rows.map((row) => row.id);
}

export async function resolveLeaveApprovers(
  companyId: string,
  requesterId: string
): Promise<LeaveApproverResolution> {
  const [employee, hierarchy] = await Promise.all([
    prisma.employee.findUnique({
      where: { id: requesterId },
      select: { manager_id: true, invited_by_id: true },
    }),
    prisma.approvalHierarchy.findFirst({
      where: {
        company_id: companyId,
        emp_id: requesterId,
      },
      select: {
        level1_approver: true,
        level2_approver: true,
        level3_approver: true,
        level4_approver: true,
        hr_partner: true,
      },
    }),
  ]);

  const hierarchyIds = uniqueNonEmpty([
    hierarchy?.level1_approver,
    hierarchy?.level2_approver,
    hierarchy?.level3_approver,
    hierarchy?.level4_approver,
    hierarchy?.hr_partner,
  ]);

  if (hierarchyIds.length > 0) {
    return {
      approverId: hierarchyIds[0],
      allApproverIds: hierarchyIds,
      reason: 'approval_hierarchy_chain',
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

  const directApproverIds = directApproverRows.map((row) => row.id);
  const fallbackIds = uniqueNonEmpty([...directApproverIds, ...(await getFallbackApproverIds(companyId))]);

  return {
    approverId: fallbackIds[0] ?? null,
    allApproverIds: fallbackIds,
    reason: fallbackIds.length > 0 ? 'manager_inviter_or_role_fallback' : 'no_approver_found',
  };
}

export async function canActOnLeaveRequest(params: {
  requesterId: string;
  approverId: string;
  companyId: string;
  approverRole?: Role | string | null;
}): Promise<boolean> {
  const role = (params.approverRole || '').toString().toLowerCase();
  if (role === 'hr' || role === 'admin' || role === 'director' || role === 'super_admin') {
    return true;
  }

  const { allApproverIds } = await resolveLeaveApprovers(params.companyId, params.requesterId);
  return allApproverIds.includes(params.approverId);
}
