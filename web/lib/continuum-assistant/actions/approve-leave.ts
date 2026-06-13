import { randomUUID } from 'crypto';
import prisma from '@/lib/prisma';
import { hasPermission } from '@/lib/rbac';
import type { AssistantContext, AssistantReply } from '@/lib/continuum-assistant/types';
import { parseEmployeeNameHint } from '@/lib/continuum-assistant/actions/parse-leave-input';
import type {
  AssistantActionDraft,
  AssistantPendingAction,
  ApproveLeavePayload,
} from '@/lib/continuum-assistant/action-types';
import { approveLeaveService } from '@/lib/services/leave-approve';
import { assistantContextToExecutionContext } from '@/lib/continuum-assistant/assistant-to-service-context';
import { logAssistantAction } from '@/lib/continuum-assistant/actions/http-execute';
import {
  formatRejectReasonSuggestions,
  parseRejectReasonFromMessage,
} from '@/lib/continuum-assistant/insights/reject-reason-helper';

const DRAFT_TTL_MS = 15 * 60 * 1000;

function approvalsHref(ctx: AssistantContext): string {
  if (ctx.portalSlug === 'manager') return '/manager/approvals';
  if (ctx.portalSlug === 'hr' || ctx.portalSlug === 'admin') {
    return `/${ctx.portalSlug}/leave-requests`;
  }
  return '/employee/leave-history';
}

function newDraft(payload: ApproveLeavePayload, kind: 'approve_leave' | 'reject_leave'): AssistantActionDraft {
  const now = Date.now();
  return {
    id: randomUUID(),
    kind,
    status: 'collecting',
    payload,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + DRAFT_TTL_MS).toISOString(),
  };
}

function draftExpired(draft: AssistantActionDraft): boolean {
  return Date.now() > new Date(draft.expiresAt).getTime();
}

async function loadAssignablePending(
  employeeId: string,
  companyId: string,
  canApproveAny: boolean
) {
  return prisma.leaveRequest.findMany({
    where: {
      company_id: companyId,
      status: { in: ['pending', 'escalated'] },
      ...(canApproveAny ? {} : { employee: { manager_id: employeeId } }),
    },
    include: {
      employee: {
        select: { first_name: true, last_name: true },
      },
    },
    orderBy: { created_at: 'asc' },
    take: 8,
  });
}

function buildPending(
  payload: ApproveLeavePayload,
  kind: 'approve_leave' | 'reject_leave'
): AssistantPendingAction {
  const verb = kind === 'reject_leave' ? 'Reject' : 'Approve';
  return {
    kind,
    summary: `${verb} this leave request?`,
    details: [
      { label: 'Employee', value: payload.employee_name ?? '—' },
      { label: 'Type', value: payload.leave_type ?? '—' },
      { label: 'Dates', value: `${payload.start_date ?? '—'} → ${payload.end_date ?? '—'}` },
    ],
    confirmLabel: `Confirm & ${verb.toLowerCase()}`,
    cancelLabel: 'Cancel',
  };
}

function pickRequestByNameHint<T extends { employee: { first_name: string; last_name: string } | null }>(
  pending: T[],
  hint: string | null
): T | null {
  if (!hint || pending.length === 0) return null;
  const norm = hint.toLowerCase().replace(/\s+/g, ' ');
  const match = pending.find((p) => {
    const emp = p.employee;
    const full = `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim().toLowerCase();
    return full.includes(norm) || norm.includes(full) || full.split(' ').some((part) => norm.includes(part));
  });
  return match ?? null;
}

export async function startApproveLeaveDraft(
  message: string,
  ctx: AssistantContext,
  reject: boolean
): Promise<{ draft: AssistantActionDraft | null; reply: AssistantReply }> {
  const canApproveAny = hasPermission(ctx.permissions, 'leave.approve_any');
  const pending = await loadAssignablePending(ctx.employeeId, ctx.companyId, canApproveAny);
  const kind = reject ? 'reject_leave' : 'approve_leave';

  if (pending.length === 0) {
    return {
      draft: null,
      reply: {
        reply:
          'You have **no pending leave requests** assigned to you right now. Open **Approvals** to refresh.',
        links: [{ label: 'Approvals', href: approvalsHref(ctx) }],
        suggestions: [],
        source: 'rules',
      },
    };
  }

  const pickIndex = message.match(/\b(\d)\b/);
  const idx = pickIndex ? Number(pickIndex[1]) - 1 : 0;
  const chosen = pending[Math.min(Math.max(0, idx), pending.length - 1)];

  if (pending.length > 1 && !pickIndex) {
    const lines = pending
      .map((p, i) => {
        const emp = p.employee;
        const name = `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim();
        const start = p.start_date.toISOString().split('T')[0];
        const end = p.end_date.toISOString().split('T')[0];
        return `${i + 1}. **${name}** — ${p.leave_type} (${start} → ${end})`;
      })
      .join('\n');
    return {
      draft: null,
      reply: {
        reply:
          `You have **${pending.length}** pending requests. Reply with the **number** to ${reject ? 'reject' : 'approve'}:\n\n${lines}`,
        links: [{ label: 'Approvals', href: approvalsHref(ctx) }],
        suggestions: pending.length > 0 ? ['1', 'cancel'] : ['cancel'],
        source: 'rules',
      },
    };
  }

  const emp = chosen.employee;
  const payload: ApproveLeavePayload = {
    request_id: chosen.id,
    employee_name: `${emp?.first_name ?? ''} ${emp?.last_name ?? ''}`.trim(),
    leave_type: chosen.leave_type,
    start_date: chosen.start_date.toISOString().split('T')[0],
    end_date: chosen.end_date.toISOString().split('T')[0],
  };

  const draft: AssistantActionDraft = {
    ...newDraft(payload, kind),
    status: 'awaiting_confirmation',
  };

  const reasonHint = reject
    ? `\n\n${formatRejectReasonSuggestions(payload.leave_type)}\n\nOptional: **reason: your text** before **confirm**.`
    : '';

  return {
    draft,
    reply: {
      reply:
        `Ready to **${reject ? 'reject' : 'approve'}**:\n\n` +
        `• **${payload.employee_name}** — ${payload.leave_type}\n` +
        `• **${payload.start_date}** → **${payload.end_date}**` +
        reasonHint +
        `\n\nReply **confirm** or use the button below. I will not act without your confirmation.`,
      links: [{ label: 'Approvals', href: approvalsHref(ctx) }],
      suggestions: reject ? ['reason: Insufficient team coverage for these dates.', 'confirm', 'cancel'] : ['confirm', 'cancel'],
      source: 'rules',
      actionDraft: draft,
      pendingAction: buildPending(payload, kind),
    },
  };
}

export function mergeApproveRejectDraft(
  message: string,
  draft: AssistantActionDraft
): AssistantActionDraft {
  if (draft.kind !== 'reject_leave') return draft;
  const reason = parseRejectReasonFromMessage(message);
  if (!reason) return draft;
  const payload = draft.payload as ApproveLeavePayload;
  return {
    ...draft,
    payload: { ...payload, reason },
  };
}

export async function executeApproveLeave(
  draft: AssistantActionDraft,
  ctx: AssistantContext
): Promise<AssistantReply> {
  const payload = draft.payload as ApproveLeavePayload;
  if (!payload.request_id) {
    return {
      reply: 'No leave request selected.',
      links: [],
      suggestions: [],
      source: 'rules',
      actionDraft: null,
    };
  }

  const action = draft.kind === 'reject_leave' ? 'reject' : 'approve';
  const execCtx = assistantContextToExecutionContext(ctx, { idempotencyKey: draft.id });
  const result = await approveLeaveService(execCtx, {
    requestId: payload.request_id,
    action,
    reason:
      action === 'reject'
        ? payload.reason ?? 'Rejected via Continuum Guide (user confirmed)'
        : 'Approved via Continuum Guide (user confirmed)',
  });

  if (!result.ok) {
    const err = result.error.message;
    await logAssistantAction({
      companyId: ctx.companyId,
      actorId: ctx.employeeId,
      kind: draft.kind,
      draftId: draft.id,
      payload: payload as Record<string, unknown>,
      result: 'failed',
      error: err,
    });
    return {
      reply: `Could not ${action} leave: **${err}**. Use **Approvals** to complete this manually.`,
      links: [{ label: 'Approvals', href: approvalsHref(ctx) }],
      suggestions: [],
      source: 'rules',
      actionDraft: null,
    };
  }

  await logAssistantAction({
    companyId: ctx.companyId,
    actorId: ctx.employeeId,
    kind: draft.kind,
    draftId: draft.id,
    payload: payload as Record<string, unknown>,
    result: 'confirmed',
    entityId: payload.request_id,
  });

  const finalStatus = result.data.status;
  const isFinal = result.data.is_final === true || finalStatus === 'approved' || finalStatus === 'rejected';

  let outcome: string;
  if (action === 'reject' || finalStatus === 'rejected') {
    outcome = `**Rejected** leave for **${payload.employee_name}**.`;
  } else if (isFinal || finalStatus === 'approved') {
    outcome = `**Fully approved** leave for **${payload.employee_name}**.`;
  } else {
    outcome =
      `**Recorded your approval** for **${payload.employee_name}** — status is **${finalStatus ?? 'pending'}** (another approver may still be required).`;
  }

  return {
    reply: `${outcome}\n\n_This was executed via the real approvals API — refresh **Leave Requests** to confirm._`,
    links: [{ label: 'Approvals', href: approvalsHref(ctx) }],
    suggestions: [],
    source: 'rules',
    actionDraft: null,
    actionResult: {
      executed: true,
      success: true,
      message: outcome,
      entityId: payload.request_id,
    },
  };
}

export function resumeApproveDraft(
  draft: AssistantActionDraft,
  ctx: AssistantContext
): AssistantReply | null {
  if (draftExpired(draft)) return null;
  if (draft.status !== 'awaiting_confirmation') return null;
  const payload = draft.payload as ApproveLeavePayload;
  const kind = draft.kind === 'reject_leave' ? 'reject_leave' : 'approve_leave';
  const reasonNote =
    draft.kind === 'reject_leave' && payload.reason
      ? `\n\nReject reason: **${payload.reason}**`
      : '';
  return {
    reply: `You still have a pending approval.${reasonNote} Reply **confirm** or **cancel**.`,
    links: [{ label: 'Approvals', href: approvalsHref(ctx) }],
    suggestions: ['confirm', 'cancel'],
    source: 'rules',
    actionDraft: draft,
    pendingAction: buildPending(payload, kind),
  };
}
