/**
 * Unified assistant turn processor (v1).
 * Implements DEEP-04-001 processAssistantTurn.
 */
import type { AssistantExecutionContext } from '@/lib/services/types';
import type { AssistantReply, AssistantMessage, AssistantContext } from '@/lib/continuum-assistant/types';
import type { AssistantActionDraft } from '@/lib/continuum-assistant/action-types';
import { respondAssistantMessage } from '@/lib/continuum-assistant/respond';

export async function processAssistantTurn(input: {
  ctx: AssistantExecutionContext;
  message: string;
  actionCommand?: 'confirm' | 'cancel';
  history?: AssistantMessage[];
  assistantContext: AssistantContext;
  actionDraft?: AssistantActionDraft | null;
}): Promise<AssistantReply> {
  return respondAssistantMessage(input.message, input.history ?? [], input.assistantContext, {
    actionDraft: input.actionDraft ?? null,
    actionCommand: input.actionCommand ?? null,
  });
}
