import { after } from 'next/server';
import {
  notifyActorSideEffectFailure,
  sideEffectFailed,
  type ActionSideEffect,
} from '@/lib/action-outcome';
import type { EmailResult } from '@/lib/email-service';

export interface DeliverAfterResponseOptions {
  /** Employee to notify in-app if the side effect fails. */
  actorEmployeeId?: string;
  companyId?: string;
  /** Headline for the in-app failure notification. */
  actionTitle?: string;
  /** Label for the failed side effect, e.g. "Welcome email". */
  sideEffectLabel?: string;
  channel?: ActionSideEffect['channel'];
}

/**
 * Guarantees a post-response side-effect (email, webhook, etc.) actually runs
 * to completion on serverless platforms such as Vercel.
 *
 * When `actorEmployeeId` is provided and the task fails (throws or EmailResult
 * with success:false), an in-app notification is created so the user is not
 * left thinking everything succeeded.
 */
export function deliverAfterResponse(
  label: string,
  task: () => Promise<unknown>,
  options?: DeliverAfterResponseOptions,
): void {
  const run = async () => {
    try {
      const result = await task();
      const emailResult = result as EmailResult | undefined;
      if (
        emailResult &&
        typeof emailResult === 'object' &&
        'success' in emailResult &&
        emailResult.success === false
      ) {
        const detail = emailResult.error ?? 'Delivery failed';
        console.error(`[EmailDeliver] ${label} failed:`, detail);
        if (options?.actorEmployeeId && options.companyId && options.sideEffectLabel) {
          await notifyActorSideEffectFailure({
            actorEmployeeId: options.actorEmployeeId,
            companyId: options.companyId,
            actionTitle: options.actionTitle ?? label,
            sideEffect: sideEffectFailed(
              options.channel ?? 'email',
              options.sideEffectLabel,
              detail,
            ),
          });
        }
      }
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      console.error(`[EmailDeliver] ${label} failed:`, detail);
      if (options?.actorEmployeeId && options.companyId && options.sideEffectLabel) {
        await notifyActorSideEffectFailure({
          actorEmployeeId: options.actorEmployeeId,
          companyId: options.companyId,
          actionTitle: options.actionTitle ?? label,
          sideEffect: sideEffectFailed(
            options.channel ?? 'email',
            options.sideEffectLabel,
            detail,
          ),
        });
      }
    }
  };

  try {
    after(run);
  } catch {
    void run();
  }
}
