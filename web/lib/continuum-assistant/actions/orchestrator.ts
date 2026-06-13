import type { NextRequest } from 'next/server';
import type { AssistantContext, AssistantReply } from '@/lib/continuum-assistant/types';
import type { AssistantActionDraft } from '@/lib/continuum-assistant/action-types';
import {
  detectApproveLeaveIntent,
  detectRejectLeaveActionIntent,
  detectRequestLeaveIntent,
  isCancelMessage,
  isConfirmMessage,
  looksLikeLeaveRequestDetails,
  shouldAbandonLeaveDraft,
} from '@/lib/continuum-assistant/actions/parse-leave-input';
import { assertLeaveModule, canUseAssistantAction } from '@/lib/continuum-assistant/actions/permissions';
import {
  executeApproveLeave,
  mergeApproveRejectDraft,
  resumeApproveDraft,
  startApproveLeaveDraft,
} from '@/lib/continuum-assistant/actions/approve-leave';
import {
  executeRequestLeave,
  mergeRequestLeaveDraft,
  replyForRequestLeaveDraft,
  startRequestLeaveDraft,
} from '@/lib/continuum-assistant/actions/request-leave';
import { processInsightIntents } from '@/lib/continuum-assistant/insights/handlers';
import type { RequestLeavePayload } from '@/lib/continuum-assistant/action-types';

export type ActionOrchestratorInput = {
  message: string;
  actionCommand?: 'confirm' | 'cancel' | null;
  actionDraft: AssistantActionDraft | null;
  ctx: AssistantContext;
  request: NextRequest;
};

function cancelReply(ctx: AssistantContext): AssistantReply {
  return {
    reply: 'Action cancelled. Nothing was submitted or approved.',
    links: [],
    suggestions: ['Where do I request leave?', 'How many sick leave days do I have?'],
    source: 'rules',
    actionDraft: null,
  };
}

function expiredReply(): AssistantReply {
  return {
    reply: 'That action draft expired (15 minutes). Please start again if you still need help.',
    links: [],
    suggestions: ['Request sick leave tomorrow', 'cancel'],
    source: 'rules',
    actionDraft: null,
  };
}

function approvalsHref(ctx: AssistantContext): string {
  if (ctx.portalSlug === 'manager') return '/manager/approvals';
  if (ctx.portalSlug === 'hr' || ctx.portalSlug === 'admin') {
    return `/${ctx.portalSlug}/leave-requests`;
  }
  return '/employee/leave-history';
}

export async function processAssistantActions(
  input: ActionOrchestratorInput
): Promise<AssistantReply | null> {
  const { message, actionCommand, ctx, request } = input;
  const trimmed = message.trim();
  let actionDraft = input.actionDraft;

  if (actionDraft && shouldAbandonLeaveDraft(trimmed)) {
    actionDraft = null;
  }

  const moduleCheck = await assertLeaveModule(ctx.companyId);
  if (!moduleCheck.allowed) {
    return {
      reply: moduleCheck.reason,
      links: [],
      suggestions: [],
      source: 'rules',
      actionDraft: null,
    };
  }

  if (actionCommand === 'cancel' || isCancelMessage(trimmed)) {
    if (actionDraft) {
      return cancelReply(ctx);
    }
    if (isCancelMessage(trimmed)) {
      return cancelReply(ctx);
    }
  }

  const confirming =
    actionCommand === 'confirm' || (actionDraft?.status === 'awaiting_confirmation' && isConfirmMessage(trimmed));

  if (actionDraft && new Date(actionDraft.expiresAt).getTime() < Date.now()) {
    return expiredReply();
  }

  if (confirming && actionDraft?.status === 'awaiting_confirmation') {
    const perm = canUseAssistantAction(ctx, actionDraft.kind);
    if (!perm.allowed) {
      return {
        reply: perm.reason,
        links: [],
        suggestions: [],
        source: 'rules',
        actionDraft: null,
      };
    }

    if (actionDraft.kind === 'request_leave') {
      return executeRequestLeave(actionDraft, ctx, request);
    }
    if (actionDraft.kind === 'approve_leave' || actionDraft.kind === 'reject_leave') {
      return executeApproveLeave(actionDraft, ctx, request);
    }
  }

  if (actionDraft && !confirming && !isCancelMessage(trimmed)) {
    if (actionDraft.kind === 'request_leave') {
      const merged = await mergeRequestLeaveDraft(trimmed, actionDraft, ctx);
      return replyForRequestLeaveDraft(merged, ctx);
    }
    if (actionDraft.kind === 'approve_leave' || actionDraft.kind === 'reject_leave') {
      const merged = mergeApproveRejectDraft(trimmed, actionDraft);
      const resumed = resumeApproveDraft(merged, ctx);
      if (resumed) {
        return {
          ...resumed,
          actionDraft: merged,
        };
      }
    }
  }

  if (actionDraft?.status === 'awaiting_confirmation' && !confirming) {
    const resumed =
      actionDraft.kind === 'approve_leave' || actionDraft.kind === 'reject_leave'
        ? resumeApproveDraft(
            actionDraft.kind === 'reject_leave'
              ? mergeApproveRejectDraft(trimmed, actionDraft)
              : actionDraft,
            ctx
          )
        : replyForRequestLeaveDraft(actionDraft, ctx);
    if (resumed) {
      return {
        ...resumed,
        reply:
          `${resumed.reply}\n\nReply **confirm** to proceed or **cancel** to discard.`,
      };
    }
  }

  const draftPayload =
    actionDraft?.kind === 'request_leave'
      ? (actionDraft.payload as RequestLeavePayload)
      : undefined;

  const insightReply = await processInsightIntents(trimmed, ctx, draftPayload);
  if (insightReply && !confirming && actionCommand !== 'cancel') {
    return insightReply;
  }

  const continuingRequest =
    actionDraft?.kind === 'request_leave' ||
    detectRequestLeaveIntent(trimmed) ||
    looksLikeLeaveRequestDetails(trimmed);

  if (continuingRequest) {
    const perm = canUseAssistantAction(ctx, 'request_leave');
    if (!perm.allowed) {
      return {
        reply: perm.reason,
        links: [],
        suggestions: [],
        source: 'rules',
      };
    }
    const draft = actionDraft?.kind === 'request_leave'
      ? await mergeRequestLeaveDraft(trimmed, actionDraft, ctx)
      : await mergeRequestLeaveDraft(trimmed, startRequestLeaveDraft(), ctx);
    return replyForRequestLeaveDraft(draft, ctx);
  }

  if (detectApproveLeaveIntent(trimmed) || detectRejectLeaveActionIntent(trimmed)) {
    const kind = detectRejectLeaveActionIntent(trimmed) ? 'reject_leave' : 'approve_leave';
    const perm = canUseAssistantAction(ctx, kind);
    if (!perm.allowed) {
      return {
        reply: perm.reason,
        links: [{ label: 'Approvals', href: approvalsHref(ctx) }],
        suggestions: [],
        source: 'rules',
      };
    }
    const { draft, reply } = await startApproveLeaveDraft(trimmed, ctx, kind === 'reject_leave');
    return { ...reply, actionDraft: draft ?? reply.actionDraft ?? null };
  }

  return null;
}
