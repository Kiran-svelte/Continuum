/** Human-in-the-loop assistant actions — confirm before execute. */

export type AssistantActionKind = 'request_leave' | 'approve_leave' | 'reject_leave';

export type AssistantActionStatus = 'collecting' | 'awaiting_confirmation';

export type RequestLeavePayload = {
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
  is_half_day?: boolean;
};

export type ApproveLeavePayload = {
  request_id?: string;
  employee_name?: string;
  leave_type?: string;
  start_date?: string;
  end_date?: string;
  reason?: string;
};

export type AssistantActionDraft = {
  id: string;
  kind: AssistantActionKind;
  status: AssistantActionStatus;
  payload: RequestLeavePayload | ApproveLeavePayload;
  createdAt: string;
  expiresAt: string;
};

export type AssistantPendingAction = {
  kind: AssistantActionKind;
  summary: string;
  details: Array<{ label: string; value: string }>;
  confirmLabel: string;
  cancelLabel: string;
};

export type AssistantActionResult = {
  executed: boolean;
  success: boolean;
  message: string;
  entityId?: string;
};
