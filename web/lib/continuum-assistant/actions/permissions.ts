import { hasPermission, type PermissionCode } from '@/lib/rbac';
import { assertModule } from '@/lib/core-functions/assert-module';
import type { AssistantContext } from '@/lib/continuum-assistant/types';
import type { AssistantActionKind } from '@/lib/continuum-assistant/action-types';

export type ActionPermissionResult =
  | { allowed: true }
  | { allowed: false; reason: string };

export function canUseAssistantAction(
  ctx: AssistantContext,
  kind: AssistantActionKind
): ActionPermissionResult {
  if (!ctx.enabledModules.includes('leave')) {
    return { allowed: false, reason: 'The leave module is not enabled for your company.' };
  }

  switch (kind) {
    case 'request_leave':
      if (!hasPermission(ctx.permissions, 'leave.apply_own')) {
        return {
          allowed: false,
          reason: 'You do not have permission to apply for your own leave (`leave.apply_own`).',
        };
      }
      return { allowed: true };
    case 'approve_leave':
    case 'reject_leave':
      if (
        !hasPermission(ctx.permissions, 'leave.approve_team') &&
        !hasPermission(ctx.permissions, 'leave.approve_any')
      ) {
        return {
          allowed: false,
          reason:
            'You do not have permission to approve leave. Ask your admin for `leave.approve_team` or use the Approvals page.',
        };
      }
      return { allowed: true };
    default:
      return { allowed: false, reason: 'Unknown action.' };
  }
}

export async function assertLeaveModule(companyId: string): Promise<ActionPermissionResult> {
  const guard = await assertModule(companyId, 'leave');
  if (guard) {
    return { allowed: false, reason: 'Leave module is disabled for this organization.' };
  }
  return { allowed: true };
}
