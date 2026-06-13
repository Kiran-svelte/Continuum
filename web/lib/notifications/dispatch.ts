/**
 * Centralized notification dispatch for the Zero UI event-driven notifications.
 * Routes events to email, in-app, and WhatsApp channels.
 *
 * WhatsApp channel is stubbed (returns 'skipped') in Chunk 02 — wired in Chunk 05.
 * Email and in-app are also stubbed until their respective services are validated
 * as cycle-free relative to this module.
 *
 * Implements L5-02-008.
 */
import { logger } from '@/lib/logger';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Notification delivery channels. */
export type NotificationChannel = 'email' | 'in_app' | 'whatsapp';

/** Events that trigger notifications. */
export type NotificationEvent =
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_escalated'
  | 'attendance_late';

/** Result per channel for a dispatch operation. */
export type ChannelResult = 'sent' | 'skipped' | 'failed';

/** Payload for a notification dispatch. */
export interface DispatchInput {
  /** The event that triggered this notification. */
  event: NotificationEvent;
  /** Tenant identifier. */
  companyId: string;
  /** Employee who receives the notification. */
  recipientEmployeeId: string;
  /** Employee who triggered the action (optional). */
  actorEmployeeId?: string;
  /** Channels to deliver on. */
  channels: NotificationChannel[];
  /** Event-specific data for rendering message content. */
  payload: {
    leaveRequestId?: string;
    dates?: string;
    reason?: string;
    deepLink?: string;
  };
}

/** Result of a dispatch call, one status per channel. */
export interface DispatchResult {
  email: ChannelResult;
  in_app: ChannelResult;
  whatsapp: ChannelResult;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Dispatches a notification event to all configured channels.
 *
 * Uses Promise.allSettled so one channel failure never blocks the others.
 * WhatsApp channel always returns 'skipped' until Chunk 05.
 *
 * @param input - Dispatch input with event, recipient, channels, and payload.
 * @returns DispatchResult with per-channel delivery status.
 */
export async function dispatchNotification(input: DispatchInput): Promise<DispatchResult> {
  const result: DispatchResult = {
    email: 'skipped',
    in_app: 'skipped',
    whatsapp: 'skipped',
  };

  const dispatches = input.channels.map((channel) =>
    dispatchToChannel(channel, input, result)
  );
  await Promise.allSettled(dispatches);

  logger.info('notification_dispatched', {
    event: input.event,
    companyId: input.companyId,
    recipientId: input.recipientEmployeeId,
    emailResult: result.email,
    inAppResult: result.in_app,
    whatsappResult: result.whatsapp,
  });

  return result;
}

// ─── Private Channel Handlers ────────────────────────────────────────────────

/**
 * Routes a single channel dispatch and writes the result in-place.
 *
 * @param channel - Target channel.
 * @param input - Original dispatch input.
 * @param result - Mutable result object shared across all channels.
 */
async function dispatchToChannel(
  channel: NotificationChannel,
  input: DispatchInput,
  result: DispatchResult
): Promise<void> {
  if (channel === 'whatsapp') {
    // TODO(agent): Wire WhatsApp dispatch in Chunk 05 (L5-05)
    result.whatsapp = 'skipped';
    return;
  }

  if (channel === 'email') {
    result.email = await dispatchEmail(input);
    return;
  }

  if (channel === 'in_app') {
    result.in_app = await dispatchInApp(input);
  }
}

/**
 * Dispatches an email notification.
 * Stubbed — wire to email-service.ts once import-cycle safety is confirmed.
 *
 * @param input - Dispatch input.
 * @returns ChannelResult.
 */
async function dispatchEmail(input: DispatchInput): Promise<ChannelResult> {
  try {
    // TODO(agent): verify — wire to email-service.ts sendNotificationEmail after
    // confirming email-service does not transitively import from this module.
    logger.info('email_notification_queued', {
      event: input.event,
      recipientId: input.recipientEmployeeId,
    });
    return 'skipped';
  } catch (error) {
    logger.error('email_notification_failed', {
      event: input.event,
      recipientId: input.recipientEmployeeId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return 'failed';
  }
}

/**
 * Creates an in-app notification record.
 * Stubbed — wire to Notification Prisma model create in Chunk 03+.
 *
 * @param input - Dispatch input.
 * @returns ChannelResult.
 */
async function dispatchInApp(input: DispatchInput): Promise<ChannelResult> {
  try {
    // TODO(agent): verify — wire to Notification prisma model create
    logger.info('inapp_notification_queued', {
      event: input.event,
      recipientId: input.recipientEmployeeId,
    });
    return 'skipped';
  } catch (error) {
    logger.error('inapp_notification_failed', {
      event: input.event,
      recipientId: input.recipientEmployeeId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return 'failed';
  }
}
