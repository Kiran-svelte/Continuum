/**
 * AssistantConversation draft persistence for WhatsApp channel.
 *
 * Stores multi-turn conversation state (history + action draft) in the
 * AssistantConversation table, keyed by (company_id, employee_id, channel).
 *
 * Draft state expires after 30 minutes of inactivity to prevent stale HITL loops.
 * Implements L5-03-005 conversation persistence.
 */
import prisma from '@/lib/prisma';
import type { AssistantActionDraft } from '@/lib/continuum-assistant/action-types';
import type { AssistantMessage } from '@/lib/continuum-assistant/types';

/** Number of messages kept in history. Matches MAX_HISTORY in respond.ts. */
const MAX_HISTORY = 6;

/** How long a draft stays valid after the last message (minutes). */
const DRAFT_TTL_MINUTES = 30;

export interface ConversationDraft {
  history: AssistantMessage[];
  actionDraft: AssistantActionDraft | null;
}

const EMPTY_DRAFT: ConversationDraft = { history: [], actionDraft: null };

/**
 * Loads the current conversation draft for a WhatsApp session.
 *
 * @param companyId  - Tenant company UUID.
 * @param employeeId - Employee UUID.
 * @param channel    - Channel identifier (always 'whatsapp' for this context).
 * @returns Current draft (history + actionDraft) or empty defaults.
 */
export async function loadConversationDraft(
  companyId: string,
  employeeId: string,
  channel: 'whatsapp'
): Promise<ConversationDraft> {
  const convo = await prisma.assistantConversation.findUnique({
    where: {
      company_id_employee_id_channel: {
        company_id: companyId,
        employee_id: employeeId,
        channel,
      },
    },
    select: {
      draft_json: true,
      draft_expires_at: true,
    },
  });

  if (!convo?.draft_json) return EMPTY_DRAFT;

  // Expired draft → treat as empty (will be overwritten on next save)
  if (convo.draft_expires_at && convo.draft_expires_at < new Date()) {
    return EMPTY_DRAFT;
  }

  const raw = convo.draft_json as Record<string, unknown>;
  const history = Array.isArray(raw.history) ? (raw.history as AssistantMessage[]) : [];
  const actionDraft = (raw.actionDraft as AssistantActionDraft | null) ?? null;

  return { history: history.slice(-MAX_HISTORY), actionDraft };
}

/**
 * Saves conversation draft after each turn (upsert).
 * Refreshes the expiry TTL on every write.
 *
 * @param companyId  - Tenant company UUID.
 * @param employeeId - Employee UUID.
 * @param channel    - Channel identifier.
 * @param draft      - New draft state to persist.
 */
export async function saveConversationDraft(
  companyId: string,
  employeeId: string,
  channel: 'whatsapp',
  draft: ConversationDraft
): Promise<void> {
  const expiresAt = new Date(Date.now() + DRAFT_TTL_MINUTES * 60 * 1000);
  const draftJson = {
    history: draft.history.slice(-MAX_HISTORY),
    actionDraft: draft.actionDraft ?? null,
  };

  await prisma.assistantConversation.upsert({
    where: {
      company_id_employee_id_channel: {
        company_id: companyId,
        employee_id: employeeId,
        channel,
      },
    },
    create: {
      company_id: companyId,
      employee_id: employeeId,
      channel,
      draft_json: draftJson,
      draft_expires_at: expiresAt,
    },
    update: {
      draft_json: draftJson,
      draft_expires_at: expiresAt,
      updated_at: new Date(),
    },
  });
}

/**
 * Clears the action draft while preserving message history.
 * Called after an action completes (confirm/cancel resolved).
 *
 * @param companyId  - Tenant company UUID.
 * @param employeeId - Employee UUID.
 * @param channel    - Channel identifier.
 */
export async function clearActionDraft(
  companyId: string,
  employeeId: string,
  channel: 'whatsapp'
): Promise<void> {
  const current = await loadConversationDraft(companyId, employeeId, channel);
  await saveConversationDraft(companyId, employeeId, channel, {
    history: current.history,
    actionDraft: null,
  });
}
