import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notification-service';
import {
  fetchPendingApproverProfile,
  resolveWorkflowApprovers,
  type PendingApproverProfile,
  type WorkflowApproverResolution,
} from '@/lib/workflow-approval-routing';
import type { WorkflowType } from '@/lib/approval-chain-config';

export type WorkflowSubmitRoutingResult = {
  approverRouting: WorkflowApproverResolution;
  pendingApprover: PendingApproverProfile | null;
};

export async function applyWorkflowSubmitRouting(params: {
  workflowType: WorkflowType | 'reimbursement';
  companyId: string;
  requesterId: string;
  requesterName: string;
  entityLabel: string;
  notificationType: string;
  notificationTitle: string;
  notificationBody: string;
}): Promise<WorkflowSubmitRoutingResult> {
  const approverRouting = await resolveWorkflowApprovers(
    params.workflowType,
    params.companyId,
    params.requesterId
  );

  const pendingApprover = await fetchPendingApproverProfile(approverRouting.approverId);

  if (approverRouting.approverId) {
    void sendNotification(
      approverRouting.approverId,
      params.companyId,
      params.notificationType,
      params.notificationTitle,
      params.notificationBody
    ).catch((err) => console.error('[WorkflowSubmitRouting] notify failed:', err));
  } else {
    const fallbackApprovers = await prisma.employee.findMany({
      where: {
        org_id: params.companyId,
        status: 'active',
        deleted_at: null,
        id: { not: params.requesterId },
        primary_role: { in: ['hr', 'admin', 'director'] },
      },
      orderBy: { created_at: 'asc' },
      select: { id: true },
      take: 5,
    });

    for (const approver of fallbackApprovers) {
      void sendNotification(
        approver.id,
        params.companyId,
        params.notificationType,
        `${params.notificationTitle} (unassigned approver)`,
        `${params.notificationBody} No approver could be resolved from the approval matrix — please assign or act on this ${params.entityLabel}.`
      ).catch((err) => console.error('[WorkflowSubmitRouting] fallback notify failed:', err));
    }

    console.warn('[WorkflowSubmitRouting] no approver resolved', {
      workflowType: params.workflowType,
      companyId: params.companyId,
      requesterId: params.requesterId,
      reason: approverRouting.reason,
    });
  }

  return { approverRouting, pendingApprover };
}

export async function loadCompanyApprovalChains(companyId: string) {
  const settings = await prisma.companySettings.findUnique({
    where: { company_id: companyId },
    select: { hr_alerts: true },
  });
  return settings?.hr_alerts ?? null;
}
