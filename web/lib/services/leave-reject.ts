/**
 * Headless leave rejection service — delegates to approveLeaveService.
 */
import type { ServiceResult, AssistantExecutionContext } from './types';
import { approveLeaveService, type LeaveApproveInput } from './leave-approve';

export type { LeaveApproveInput as LeaveRejectInput } from './leave-approve';

/**
 * Rejects a leave request on behalf of an authorized approver.
 */
export async function rejectLeaveService(
  ctx: AssistantExecutionContext,
  input: Omit<LeaveApproveInput, 'action'>
): Promise<ServiceResult<{ requestId: string; status: string }>> {
  return approveLeaveService(ctx, { ...input, action: 'reject' });
}
