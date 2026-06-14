/**
 * Bridges the notification service to the email delivery service.
 *
 * When a notification is created, this module determines whether an email
 * should also be sent and dispatches it using the appropriate template
 * from email-service.ts.
 *
 * This is intentionally fire-and-forget — email delivery failures
 * must never block the notification creation or the calling API route.
 * However, failures ARE logged (never silently swallowed).
 *
 * @module notification-email-bridge
 */

import prisma from '@/lib/prisma';
import {
  sendLeaveApprovalEmail,
  sendLeaveRejectionEmail,
  sendLeaveSubmissionEmail,
  sendWelcomeEmail,
} from '@/lib/email-service';

// ─── Types ───────────────────────────────────────────────────────────────────

/** Notification types that trigger an email delivery */
const EMAIL_ELIGIBLE_TYPES = new Set([
  'leave_approved',
  'leave_rejected',
  'leave_submitted',
  'welcome',
  'reimbursement',
  'exit_checklist',
]);

interface NotificationContext {
  type: string;
  title: string;
  message: string;
  empId: string;
  companyId: string;
  /** Optional metadata passed by the caller for richer email content */
  metadata?: Record<string, string>;
}

// ─── Core Bridge Function ────────────────────────────────────────────────────

/**
 * Dispatches an email for a notification if the type is email-eligible.
 *
 * This function is designed to be called after the notification DB record
 * is created. It resolves the employee's email address, picks the right
 * email template, and sends. All errors are logged, never swallowed.
 *
 * @param context - Notification details including type, employee, and metadata
 * @returns void — fire-and-forget, but logs all outcomes
 */
export async function dispatchNotificationEmail(context: NotificationContext): Promise<void> {
  if (!EMAIL_ELIGIBLE_TYPES.has(context.type)) {
    return;
  }

  try {
    const employee = await prisma.employee.findUnique({
      where: { id: context.empId },
      select: {
        email: true,
        first_name: true,
        last_name: true,
      },
    });

    if (!employee?.email) {
      console.warn(`[NotificationEmailBridge] No email found for employee ${context.empId}, skipping email delivery`);
      return;
    }

    const fullName = `${employee.first_name} ${employee.last_name}`.trim();
    const meta = context.metadata ?? {};

    await routeToTemplate(context.type, employee.email, fullName, meta);
  } catch (error) {
    console.error(
      `[NotificationEmailBridge] Failed to send email for notification type="${context.type}" empId="${context.empId}"`,
      error instanceof Error ? error.message : error
    );
  }
}

// ─── Template Router ─────────────────────────────────────────────────────────

/**
 * Routes a notification type to the correct email template function.
 *
 * Each case extracts the relevant metadata fields and calls the
 * corresponding template from email-service.ts.
 *
 * @param type - Notification type string
 * @param email - Recipient email address
 * @param name - Recipient full name
 * @param meta - Additional metadata from the notification context
 */
async function routeToTemplate(
  type: string,
  email: string,
  name: string,
  meta: Record<string, string>,
): Promise<void> {
  switch (type) {
    case 'leave_approved': {
      const result = await sendLeaveApprovalEmail(
        email,
        name,
        meta.leaveType ?? 'Leave',
        meta.startDate ?? '—',
        meta.endDate ?? '—',
        meta.approverName ?? 'Management',
      );
      logEmailResult('leave_approved', email, result.success, result.error);
      break;
    }

    case 'leave_rejected': {
      const result = await sendLeaveRejectionEmail(
        email,
        name,
        meta.leaveType ?? 'Leave',
        meta.startDate ?? '—',
        meta.endDate ?? '—',
        meta.rejectorName ?? 'Management',
        meta.reason ?? 'No reason provided',
      );
      logEmailResult('leave_rejected', email, result.success, result.error);
      break;
    }

    case 'leave_submitted': {
      const result = await sendLeaveSubmissionEmail(
        email,
        meta.approverName ?? 'Manager',
        meta.employeeName ?? name,
        meta.leaveType ?? 'Leave',
        meta.startDate ?? '—',
        meta.endDate ?? '—',
        Number(meta.totalDays) || 1,
        meta.reason ?? '',
      );
      logEmailResult('leave_submitted', email, result.success, result.error);
      break;
    }

    case 'welcome': {
      const result = await sendWelcomeEmail(
        email,
        name,
        meta.companyName ?? 'your company',
      );
      logEmailResult('welcome', email, result.success, result.error);
      break;
    }

    default:
      // For types that are email-eligible but don't have a dedicated template,
      // skip silently. This allows adding new types to EMAIL_ELIGIBLE_TYPES
      // before their templates are built.
      console.warn(`[NotificationEmailBridge] No email template for type="${type}", skipping`);
      break;
  }
}

// ─── Logging Helper ──────────────────────────────────────────────────────────

/**
 * Logs the outcome of an email delivery attempt.
 * Success is INFO, failure is ERROR — never silent.
 */
function logEmailResult(
  type: string,
  recipient: string,
  isSuccess: boolean,
  error?: string,
): void {
  if (isSuccess) {
    console.log(`[NotificationEmailBridge] Email sent: type="${type}" to="${recipient}"`);
    return;
  }
  console.error(`[NotificationEmailBridge] Email FAILED: type="${type}" to="${recipient}" error="${error}"`);
}
