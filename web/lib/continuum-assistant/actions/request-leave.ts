import { randomUUID } from 'crypto';
import type { AssistantContext, AssistantReply } from '@/lib/continuum-assistant/types';
import type {
  AssistantActionDraft,
  AssistantPendingAction,
  RequestLeavePayload,
} from '@/lib/continuum-assistant/action-types';
import {
  detectHalfDay,
  extractReason,
  inferLeaveTypeCode,
  loadCompanyLeaveTypeCodes,
  parseNaturalDateRange,
} from '@/lib/continuum-assistant/actions/parse-leave-input';
import { submitLeaveService } from '@/lib/services/leave-submit';
import { assistantContextToExecutionContext } from '@/lib/continuum-assistant/assistant-to-service-context';
import { logAssistantAction } from '@/lib/continuum-assistant/actions/http-execute';

const DRAFT_TTL_MS = 15 * 60 * 1000;

function newDraft(payload: RequestLeavePayload): AssistantActionDraft {
  const now = Date.now();
  return {
    id: randomUUID(),
    kind: 'request_leave',
    status: 'collecting',
    payload,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DRAFT_TTL_MS).toISOString(),
  };
}

function draftExpired(draft: AssistantActionDraft): boolean {
  return Date.now() > new Date(draft.expiresAt).getTime();
}

function missingFields(payload: RequestLeavePayload): string[] {
  const missing: string[] = [];
  if (!payload.leave_type) missing.push('leave type (e.g. sick, casual)');
  if (!payload.start_date || !payload.end_date) missing.push('date or date range');
  if (!payload.reason || payload.reason.trim().length < 2) missing.push('short reason');
  return missing;
}

function buildPending(payload: RequestLeavePayload): AssistantPendingAction {
  return {
    kind: 'request_leave',
    summary: 'Submit this leave request on your behalf?',
    details: [
      { label: 'Leave type', value: payload.leave_type ?? '—' },
      { label: 'From', value: payload.start_date ?? '—' },
      { label: 'To', value: payload.end_date ?? '—' },
      { label: 'Reason', value: payload.reason ?? '—' },
    ],
    confirmLabel: 'Confirm & submit',
    cancelLabel: 'Cancel',
  };
}

export async function mergeRequestLeaveDraft(
  message: string,
  draft: AssistantActionDraft | null,
  ctx: AssistantContext
): Promise<AssistantActionDraft> {
  const codes = await loadCompanyLeaveTypeCodes(ctx.companyId);
  const base: RequestLeavePayload =
    draft?.kind === 'request_leave' && !draftExpired(draft)
      ? { ...(draft.payload as RequestLeavePayload) }
      : {};

  const inferredType =
    inferLeaveTypeCode(message, codes) ?? (base.leave_type ? base.leave_type : undefined);
  if (inferredType) base.leave_type = inferredType;

  const dates = parseNaturalDateRange(message);
  if (dates) {
    base.start_date = dates.start_date;
    base.end_date = dates.end_date;
  }

  const reason = extractReason(message);
  if (reason && reason.length >= 2 && !/^(request|apply|sick|leave)\b/i.test(reason)) {
    base.reason = reason;
  }

  if (detectHalfDay(message)) {
    base.is_half_day = true;
    if (base.start_date && !base.end_date) base.end_date = base.start_date;
    if (base.end_date && !base.start_date) base.start_date = base.end_date;
  }

  return newDraft(base);
}

export function startRequestLeaveDraft(): AssistantActionDraft {
  return newDraft({});
}

export function replyForRequestLeaveDraft(
  draft: AssistantActionDraft,
  ctx: AssistantContext
): AssistantReply {
  const payload = draft.payload as RequestLeavePayload;
  const missing = missingFields(payload);

  if (missing.length === 0) {
    const ready: AssistantActionDraft = { ...draft, status: 'awaiting_confirmation' };
    return {
      reply:
        `Here is what I will submit for **${ctx.displayName}**:\n\n` +
        `• **Type:** ${payload.leave_type}\n` +
        `• **Dates:** ${payload.start_date} → ${payload.end_date}${payload.is_half_day ? ' (half day)' : ''}\n` +
        `• **Reason:** ${payload.reason}\n\n` +
        `Reply **confirm** or tap **Confirm & submit** below. I will not submit until you confirm.`,
      links: [{ label: 'Open Request Leave form', href: `/${ctx.portalSlug}/request-leave` }],
      suggestions: ['confirm', 'cancel'],
      source: 'rules',
      actionDraft: ready,
      pendingAction: buildPending(payload),
    };
  }

  return {
    reply:
      `I can help you **request leave** (with your permission only).\n\n` +
      (missing.includes('leave type (e.g. sick, casual)')
        ? `Which **leave type**? (e.g. sick, casual)\n`
        : '') +
      (missing.some((m) => m.includes('date'))
        ? `Which **date or range**? (e.g. "25 May" or "20–22 May")\n`
        : '') +
      (missing.includes('short reason') ? `What is the **reason**? (e.g. fever)\n` : '') +
      `\nExample: *"Sick leave on 25 May — fever"*`,
    links: [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
    suggestions: ['Sick leave tomorrow — fever', 'cancel'],
    source: 'rules',
    actionDraft: draft,
  };
}

export async function executeRequestLeave(
  draft: AssistantActionDraft,
  ctx: AssistantContext
): Promise<AssistantReply> {
  const payload = draft.payload as RequestLeavePayload;
  const missing = missingFields(payload);
  if (missing.length > 0) {
    return {
      reply: `Cannot submit yet — still missing: ${missing.join(', ')}.`,
      links: [],
      suggestions: [],
      source: 'rules',
      actionDraft: { ...draft, status: 'collecting' },
    };
  }

  const execCtx = assistantContextToExecutionContext(ctx, { idempotencyKey: draft.id });
  const result = await submitLeaveService(execCtx, {
    leave_type: payload.leave_type!,
    start_date: payload.start_date!,
    end_date: payload.end_date!,
    reason: payload.reason!,
    is_half_day: payload.is_half_day ?? false,
  });

  if (!result.ok) {
    const err = result.error.message;
    await logAssistantAction({
      companyId: ctx.companyId,
      actorId: ctx.employeeId,
      kind: 'request_leave',
      draftId: draft.id,
      payload: payload as Record<string, unknown>,
      result: 'failed',
      error: err,
    });
    return {
      reply: `Submission failed: **${err}**. You can fix details and try again, or use **Request Leave** in the menu.`,
      links: [{ label: 'Request Leave', href: `/${ctx.portalSlug}/request-leave` }],
      suggestions: ['cancel'],
      source: 'rules',
    };
  }

  const requestId = result.data.id;
  await logAssistantAction({
    companyId: ctx.companyId,
    actorId: ctx.employeeId,
    kind: 'request_leave',
    draftId: draft.id,
    payload: payload as Record<string, unknown>,
    result: 'confirmed',
    entityId: requestId,
  });

  const status = result.data.status;
  return {
    reply:
      `**Leave request submitted** (recorded in audit log).\n\n` +
      `• Status: **${status}**\n` +
      (requestId ? `• Reference: \`${requestId.slice(0, 8)}…\`\n` : '') +
      `\nYou will be notified when it is approved.`,
    links: [
      ...(ctx.portalSlug === 'employee'
        ? [{ label: 'Leave History', href: '/employee/leave-history' }]
        : [{ label: 'Leave Requests', href: `/${ctx.portalSlug}/leave-requests` }]),
    ],
    suggestions: ['How many sick leave days do I have?'],
    source: 'rules',
    actionDraft: null,
    actionResult: { executed: true, success: true, message: 'Leave submitted', entityId: requestId },
  };
}
