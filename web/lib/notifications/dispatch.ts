/**
 * Centralized notification dispatch for the Zero UI event-driven notifications.
 * Routes events to email, in-app, and WhatsApp channels.
 *
 * WhatsApp channel: ENABLED in Chunk 05 — dispatches proactive HR notifications
 * (leave approved/rejected, etc.) to verified employees via Cloud API.
 * Email and in-app remain stubbed until their services are cycle-validated.
 *
 * Implements L5-02-008 + L5-05 Zero UI proactive notifications.
 */
import { logger } from '@/lib/logger';
import prisma from '@/lib/prisma';
import { sendNotification } from '@/lib/notification-service';
import { getWhatsAppTenantConfig } from '@/lib/whatsapp/tenant-config';
import { sendWhatsAppMessages } from '@/lib/whatsapp/send';

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
    result.whatsapp = await dispatchWhatsApp(input);
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
 * Email channel for the Zero UI dispatcher.
 *
 * INTENTIONALLY a no-op ('skipped'). Transactional leave emails
 * (submitted/approved/rejected) are already sent — and AWAITED — directly in
 * the service layer (`leave-submit.ts`, `leave-approve.ts`) via
 * `email-service.ts`, gated by the company's email-notification settings.
 * Wiring email here as well would double-send to the same recipients, so this
 * channel deliberately defers to that path. Do NOT re-enable without first
 * removing the awaited sends in the leave services.
 *
 * @param input - Dispatch input.
 * @returns ChannelResult — always 'skipped' (handled in the service layer).
 */
async function dispatchEmail(input: DispatchInput): Promise<ChannelResult> {
  logger.info('email_notification_handled_in_service_layer', {
    event: input.event,
    recipientId: input.recipientEmployeeId,
  });
  return 'skipped';
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
    const text = buildNotificationText(input);
    if (!text) return 'skipped';

    await sendNotification(
      input.recipientEmployeeId,
      input.companyId,
      input.event,
      buildNotificationTitle(input.event),
      text,
      'in_app',
    );

    logger.info('inapp_notification_sent', {
      event: input.event,
      recipientId: input.recipientEmployeeId,
    });
    return 'sent';
  } catch (error) {
    logger.error('inapp_notification_failed', {
      event: input.event,
      recipientId: input.recipientEmployeeId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return 'failed';
  }
}

function buildNotificationTitle(event: NotificationEvent): string {
  switch (event) {
    case 'leave_submitted':
      return 'Leave Request Submitted';
    case 'leave_approved':
      return 'Leave Approved';
    case 'leave_rejected':
      return 'Leave Rejected';
    case 'leave_escalated':
      return 'Leave Escalated';
    case 'attendance_late':
      return 'Late Attendance Recorded';
    default:
      return 'Continuum Notification';
  }
}
/**
 * Dispatches a proactive WhatsApp notification to the employee.
 *
 * Looks up the employee's active ChannelIdentityLink, loads tenant config,
 * builds a plain-text notification message, and sends via Cloud API.
 *
 * @param input - Dispatch input.
 * @returns ChannelResult ('sent', 'skipped', or 'failed').
 */
async function dispatchWhatsApp(input: DispatchInput): Promise<ChannelResult> {
  try {
    // Look up employee's active WhatsApp link
    const link = await prisma.channelIdentityLink.findFirst({
      where: {
        employee_id: input.recipientEmployeeId,
        company_id: input.companyId,
        channel: 'whatsapp',
        revoked_at: null,
      },
      select: { external_id: true, phone_e164: true },
    });

    if (!link) {
      // Employee hasn't linked WhatsApp — skip silently
      return 'skipped';
    }

    const tenantConfig = await getWhatsAppTenantConfig(input.companyId);
    if (!tenantConfig) {
      return 'skipped';
    }

    // Build a plain notification message (no HITL required for notifications)
    const text = buildNotificationText(input);
    if (!text) return 'skipped';

    const result = await sendWhatsAppMessages(
      [{ type: 'text', text }],
      tenantConfig.phoneNumberId,
      link.external_id,   // wa_id
      tenantConfig.accessToken
    );

    return result.allOk ? 'sent' : 'failed';
  } catch (error) {
    logger.error('whatsapp_notification_failed', {
      event: input.event,
      recipientId: input.recipientEmployeeId,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return 'failed';
  }
}

/**
 * Builds the notification text for an event. Returns null for unhandled events.
 */
function buildNotificationText(input: DispatchInput): string | null {
  const deepLink = input.payload.deepLink ? `\nView: ${input.payload.deepLink}` : '';
  const dates = input.payload.dates ? ` (${input.payload.dates})` : '';

  switch (input.event) {
    case 'leave_submitted':
      return `📋 Leave request submitted${dates}. Awaiting approval.${deepLink}`;
    case 'leave_approved':
      return `✅ Your leave${dates} has been approved.${deepLink}`;
    case 'leave_rejected':
      return `❌ Your leave${dates} was not approved.${input.payload.reason ? ` Reason: ${input.payload.reason}` : ''}${deepLink}`;
    case 'leave_escalated':
      return `⚠️ Leave request escalated for review${dates}.${deepLink}`;
    case 'attendance_late':
      return `⏰ Late attendance recorded today. Please contact HR if this is an error.${deepLink}`;
    default:
      return null;
  }
}
