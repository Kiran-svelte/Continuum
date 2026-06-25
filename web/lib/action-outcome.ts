/**
 * Action outcome transparency — every user-facing operation should report:
 *   1) whether the primary action succeeded
 *   2) what side effects ran (email, in-app, webhook, etc.)
 *   3) explicit failure/skipped reasons when something did not happen
 *
 * APIs include `actionOutcome` in JSON responses.
 * Clients call `reportActionOutcome()` to surface toasts + in-app clarity.
 */

import type { EmailResult } from '@/lib/email-service';
import { sendNotification } from '@/lib/notification-service';

/** Channels for side effects (email, push, in-app, webhook, audit, etc.). */
export type SideEffectChannel =
  | 'email'
  | 'in_app'
  | 'push'
  | 'whatsapp'
  | 'webhook'
  | 'audit'
  | 'other';

/** Result of one side effect attempt. */
export type SideEffectStatus = 'sent' | 'skipped' | 'failed';

export interface ActionSideEffect {
  channel: SideEffectChannel;
  status: SideEffectStatus;
  /** Human-readable label, e.g. "Invitation email to traderlighter11@gmail.com". */
  label: string;
  /** Detail when skipped or failed. */
  detail?: string;
}

/** Primary action lifecycle. */
export type ActionPrimaryStatus = 'completed' | 'partial' | 'failed';

/**
 * Standard envelope returned by API routes and interpreted by the UI / Zero UI.
 * - completed: primary action + all critical side effects succeeded
 * - partial: primary action succeeded but one or more side effects failed/skipped
 * - failed: primary action did not succeed
 */
export interface ActionOutcome {
  status: ActionPrimaryStatus;
  /** Short headline for toasts ("Invitation created", "Leave submitted"). */
  title: string;
  /** Optional longer explanation. */
  message?: string;
  sideEffects: ActionSideEffect[];
}

export function sideEffectFromEmail(
  label: string,
  result: EmailResult,
): ActionSideEffect {
  if (result.success) {
    return {
      channel: 'email',
      status: 'sent',
      label,
      detail: result.transport ? `Delivered via ${result.transport}` : undefined,
    };
  }
  return {
    channel: 'email',
    status: 'failed',
    label,
    detail: result.error ?? 'Email delivery failed',
  };
}

export function sideEffectSkipped(
  channel: SideEffectChannel,
  label: string,
  reason: string,
): ActionSideEffect {
  return { channel, status: 'skipped', label, detail: reason };
}

export function sideEffectFailed(
  channel: SideEffectChannel,
  label: string,
  detail: string,
): ActionSideEffect {
  return { channel, status: 'failed', label, detail };
}

export function sideEffectSent(
  channel: SideEffectChannel,
  label: string,
  detail?: string,
): ActionSideEffect {
  return { channel, status: 'sent', label, detail };
}

/**
 * Builds an ActionOutcome from the primary result and side-effect list.
 */
export function buildActionOutcome(params: {
  primarySucceeded: boolean;
  title: string;
  message?: string;
  sideEffects?: ActionSideEffect[];
}): ActionOutcome {
  const sideEffects = params.sideEffects ?? [];
  const anyFailed = sideEffects.some((s) => s.status === 'failed');
  const anySkipped = sideEffects.some((s) => s.status === 'skipped');

  let status: ActionPrimaryStatus;
  if (!params.primarySucceeded) {
    status = 'failed';
  } else if (anyFailed || anySkipped) {
    status = 'partial';
  } else {
    status = 'completed';
  }

  return {
    status,
    title: params.title,
    message: params.message,
    sideEffects,
  };
}

/** Summarizes side effects for assistant / log messages. */
export function formatSideEffectsSummary(sideEffects: ActionSideEffect[]): string {
  if (sideEffects.length === 0) return '';
  return sideEffects
    .map((s) => {
      const state =
        s.status === 'sent' ? 'OK' : s.status === 'skipped' ? 'skipped' : 'FAILED';
      return `• ${s.label}: ${state}${s.detail ? ` (${s.detail})` : ''}`;
    })
    .join('\n');
}

/**
 * When a post-response side effect fails, notify the actor in-app so silent
 * failures (e.g. email not sent after invite created) are visible later.
 */
export async function notifyActorSideEffectFailure(params: {
  actorEmployeeId: string;
  companyId: string;
  actionTitle: string;
  sideEffect: ActionSideEffect;
}): Promise<void> {
  if (params.sideEffect.status !== 'failed') return;

  const detail = params.sideEffect.detail ? `: ${params.sideEffect.detail}` : '';
  await sendNotification(
    params.actorEmployeeId,
    params.companyId,
    'action_side_effect_failed',
    `${params.actionTitle} — ${params.sideEffect.label} failed`,
    `${params.sideEffect.label} could not be completed${detail}. Check settings or retry the action.`,
    'in_app',
  ).catch((err) => {
    console.error('[ActionOutcome] Failed to notify actor of side effect failure:', err);
  });
}
