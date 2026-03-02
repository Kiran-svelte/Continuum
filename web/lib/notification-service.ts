import prisma from '@/lib/prisma';
import Pusher from 'pusher';

// ─── Types ───────────────────────────────────────────────────────────────────

export type NotificationChannel = 'email' | 'push' | 'in_app';

export interface NotificationPayload {
  id: string;
  type: string;
  title: string;
  message: string;
  channel: NotificationChannel;
  is_read: boolean;
  created_at: Date;
}

// ─── Pusher Client ───────────────────────────────────────────────────────────

let pusherInstance: Pusher | null = null;

function getPusher(): Pusher | null {
  if (pusherInstance) return pusherInstance;

  if (
    !process.env.PUSHER_APP_ID ||
    !process.env.PUSHER_KEY ||
    !process.env.PUSHER_SECRET ||
    !process.env.PUSHER_CLUSTER
  ) {
    return null;
  }

  pusherInstance = new Pusher({
    appId: process.env.PUSHER_APP_ID,
    key: process.env.PUSHER_KEY,
    secret: process.env.PUSHER_SECRET,
    cluster: process.env.PUSHER_CLUSTER,
    useTLS: true,
  });

  return pusherInstance;
}

// ─── Core Functions ──────────────────────────────────────────────────────────

/**
 * Creates a Notification record in the database and optionally
 * sends a real-time event via Pusher.
 */
export async function sendNotification(
  empId: string,
  companyId: string,
  type: string,
  title: string,
  message: string,
  channel: NotificationChannel = 'in_app'
): Promise<string> {
  const notification = await prisma.notification.create({
    data: {
      emp_id: empId,
      company_id: companyId,
      type,
      title,
      message,
      channel,
      is_read: false,
    },
  });

  // Send real-time push if channel supports it
  if (channel === 'push' || channel === 'in_app') {
    await sendPusherEvent(`employee-${empId}`, 'notification', {
      id: notification.id,
      type,
      title,
      message,
      created_at: notification.created_at,
    }).catch((err) => {
      console.warn('[NotificationService] Pusher event failed:', err);
    });
  }

  return notification.id;
}

/** Sends a real-time event via Pusher */
export async function sendPusherEvent(
  channel: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const pusher = getPusher();
  if (!pusher) {
    console.warn('[NotificationService] Pusher not configured, skipping event');
    return;
  }

  await pusher.trigger(channel, event, data);
}

/** Fetches unread notifications for an employee, most recent first */
export async function getUnreadNotifications(
  empId: string
): Promise<NotificationPayload[]> {
  const notifications = await prisma.notification.findMany({
    where: {
      emp_id: empId,
      is_read: false,
    },
    orderBy: { created_at: 'desc' },
    take: 50,
    select: {
      id: true,
      type: true,
      title: true,
      message: true,
      channel: true,
      is_read: true,
      created_at: true,
    },
  });

  return notifications.map((n: { id: string; type: string; title: string; message: string; channel: string; is_read: boolean; created_at: Date }) => ({
    ...n,
    channel: n.channel as NotificationChannel,
  }));
}

/** Marks a notification as read */
export async function markAsRead(notificationId: string): Promise<void> {
  await prisma.notification.update({
    where: { id: notificationId },
    data: { is_read: true },
  });
}

/** Marks all notifications as read for an employee */
export async function markAllAsRead(empId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { emp_id: empId, is_read: false },
    data: { is_read: true },
  });
}
