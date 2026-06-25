'use client';

import { toast } from 'sonner';
import type { ActionOutcome, ActionSideEffect } from '@/lib/action-outcome';

function sideEffectLines(sideEffects: ActionSideEffect[]): string | undefined {
  const notable = sideEffects.filter((s) => s.status !== 'sent');
  if (notable.length === 0) return undefined;
  return notable
    .map((s) => {
      const verb = s.status === 'failed' ? 'Failed' : 'Skipped';
      return `${verb}: ${s.label}${s.detail ? ` — ${s.detail}` : ''}`;
    })
    .join('\n');
}

/**
 * Surfaces an ActionOutcome to the user via Sonner toasts.
 * Call this after every mutating API request once `actionOutcome` is present.
 */
export function reportActionOutcome(outcome: ActionOutcome | null | undefined): void {
  if (!outcome) return;

  const description =
    outcome.message ||
    sideEffectLines(outcome.sideEffects) ||
    undefined;

  if (outcome.status === 'completed') {
    toast.success(outcome.title, { description, duration: 4000 });
    return;
  }

  if (outcome.status === 'partial') {
    toast.warning(outcome.title, {
      description:
        description ??
        'The main action succeeded, but one or more follow-up steps did not complete.',
      duration: 8000,
    });
    return;
  }

  toast.error(outcome.title, {
    description: description ?? 'The action could not be completed.',
    duration: 8000,
  });
}

/**
 * Reads a standard API JSON body and reports `actionOutcome` if present.
 */
export function reportApiActionOutcome(data: unknown): void {
  if (!data || typeof data !== 'object') return;
  const record = data as Record<string, unknown>;
  if (record.actionOutcome && typeof record.actionOutcome === 'object') {
    reportActionOutcome(record.actionOutcome as ActionOutcome);
  }
}
