import type { Role } from '@prisma/client';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import type { PermissionCode } from '@/lib/rbac';

/**
 * Whether an approver may act on someone else's attendance regularization request.
 *
 * - HR / admin / director: any request in company (with attendance.regularize).
 * - Manager: only direct reports (manager_id match).
 */
export async function canActOnRegularizationRequest(params: {
  approverId: string;
  requesterId: string;
  companyId: string;
  approverRole: Role | string;
  permissions: PermissionCode[];
}): Promise<boolean> {
  if (params.approverId === params.requesterId) {
    return false;
  }

  if (!hasPermission(params.permissions, 'attendance.regularize')) {
    return false;
  }

  const role = String(params.approverRole).toLowerCase();
  if (role === 'hr' || role === 'admin' || role === 'director' || role === 'super_admin') {
    return true;
  }

  if (role === 'manager' || role === 'team_lead') {
    const requester = await prisma.employee.findUnique({
      where: { id: params.requesterId },
      select: { manager_id: true, org_id: true },
    });
    return requester?.org_id === params.companyId && requester.manager_id === params.approverId;
  }

  return false;
}
