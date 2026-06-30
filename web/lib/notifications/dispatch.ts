/**
 * Centralized notification dispatch for the Zero UI event-driven notifications.
 * Routes events to email, in-app, and WhatsApp channels.
 */
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email-service';

export type NotificationChannel = 'email' | 'in_app' | 'whatsapp';

export type NotificationEvent =
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_escalated'
  | 'attendance_late';

export type ChannelResult = 'sent' | 'skipped' | 'failed';

export interface DispatchInput {
  event: NotificationEvent;
  companyId: string;
  recipientEmployeeId: string;
  actorEmployeeId?: string;
  channels: NotificationChannel[];
  payload: {
    leaveRequestId?: string;
    dates?: string;
    reason?: string;
    deepLink?: string;
  };
}

export interface DispatchResult {
  email: ChannelResult;
  in_app: ChannelResult;
  whatsapp: ChannelResult;
}

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
  });

  return result;
}

async function dispatchToChannel(
  channel: NotificationChannel,
  input: DispatchInput,
  result: DispatchResult
): Promise<void> {
  if (channel === 'whatsapp') {
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

async function dispatchEmail(input: DispatchInput): Promise<ChannelResult> {
  try {
    const employee = await prisma.employee.findUnique({
      where: { id: input.recipientEmployeeId },
      select: { email: true, first_name: true }
    });

    if (!employee?.email) return 'skipped';

    await sendEmail(
      employee.email,
      `New Notification: ${input.event.replace('_', ' ').toUpperCase()}`,
      `<p>Hello ${employee.first_name},</p><p>You have a new notification regarding: <b>${input.event.replace('_', ' ')}</b>.</p>`
    );

    return 'sent';
  } catch (error) {
    logger.error('email_notification_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return 'failed';
  }
}

async function dispatchInApp(input: DispatchInput): Promise<ChannelResult> {
  try {
    await prisma.notification.create({
      data: {
        emp_id: input.recipientEmployeeId,
        company_id: input.companyId,
        type: input.event,
        title: input.event.replace('_', ' ').toUpperCase(),
        message: input.payload.reason || 'You have a new notification.',
        channel: 'in_app'
      }
    });
    return 'sent';
  } catch (error) {
    logger.error('inapp_notification_failed', { error: error instanceof Error ? error.message : 'unknown' });
    return 'failed';
  }
}
