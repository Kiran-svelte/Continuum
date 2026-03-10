/**
 * Default notification templates for Continuum.
 *
 * These templates are seeded once per company when onboarding completes.
 * They can be customised per-company via the HR notification-templates page.
 *
 * Template variables (replaced at send time):
 *   {{employee_name}}   – Full name of the employee the event is about
 *   {{requester_name}}  – Full name of the employee who triggered the event
 *   {{leave_type}}      – Human-readable leave type (e.g. "Casual Leave")
 *   {{start_date}}      – Leave start date (YYYY-MM-DD)
 *   {{end_date}}        – Leave end date (YYYY-MM-DD)
 *   {{total_days}}      – Number of leave days requested
 *   {{reason}}          – Reason supplied in the request
 *   {{status}}          – Current request status
 *   {{company_name}}    – Company display name
 *   {{rejection_reason}}– Reason for rejection (leave approval rejections)
 *   {{sla_hours}}       – SLA duration in hours (escalation templates)
 */

export interface NotificationTemplateConfig {
  event: string;
  channel: 'email' | 'push' | 'in_app';
  subject: string;
  body: string;
}

export const DEFAULT_NOTIFICATION_TEMPLATES: NotificationTemplateConfig[] = [
  // ── Leave submitted ─────────────────────────────────────────────────────

  {
    event: 'LEAVE_SUBMITTED',
    channel: 'email',
    subject: 'Leave Request Submitted — {{leave_type}} ({{start_date}} to {{end_date}})',
    body: `Hi {{employee_name}},

Your leave request has been submitted successfully and is awaiting approval.

Details:
  • Leave Type   : {{leave_type}}
  • From         : {{start_date}}
  • To           : {{end_date}}
  • Total Days   : {{total_days}}
  • Reason       : {{reason}}

You will be notified once your manager reviews the request.

— {{company_name}} HR Team`,
  },
  {
    event: 'LEAVE_SUBMITTED',
    channel: 'in_app',
    subject: 'Leave request submitted',
    body:
      'Your {{leave_type}} request for {{total_days}} day(s) starting {{start_date}} has been submitted.',
  },

  // ── Manager notified of new request ─────────────────────────────────────

  {
    event: 'LEAVE_PENDING_MANAGER',
    channel: 'email',
    subject: 'Action Required: Leave Request from {{requester_name}}',
    body: `Hi,

{{requester_name}} has submitted a leave request that requires your approval.

Details:
  • Leave Type   : {{leave_type}}
  • From         : {{start_date}}
  • To           : {{end_date}}
  • Total Days   : {{total_days}}
  • Reason       : {{reason}}

Please log in to {{company_name}} to approve or reject this request.

— {{company_name}} HR Team`,
  },
  {
    event: 'LEAVE_PENDING_MANAGER',
    channel: 'in_app',
    subject: 'New leave request awaiting approval',
    body:
      '{{requester_name}} has requested {{total_days}} day(s) of {{leave_type}} starting {{start_date}}. Tap to review.',
  },

  // ── Leave approved ───────────────────────────────────────────────────────

  {
    event: 'LEAVE_APPROVED',
    channel: 'email',
    subject: 'Leave Request Approved — {{leave_type}} ({{start_date}} to {{end_date}})',
    body: `Hi {{employee_name}},

Great news! Your leave request has been approved.

Details:
  • Leave Type   : {{leave_type}}
  • From         : {{start_date}}
  • To           : {{end_date}}
  • Total Days   : {{total_days}}

Enjoy your time off!

— {{company_name}} HR Team`,
  },
  {
    event: 'LEAVE_APPROVED',
    channel: 'in_app',
    subject: 'Leave request approved ✓',
    body:
      'Your {{leave_type}} request for {{total_days}} day(s) starting {{start_date}} has been approved.',
  },
  {
    event: 'LEAVE_APPROVED',
    channel: 'push',
    subject: 'Leave Approved',
    body: '{{leave_type}} ({{start_date}} – {{end_date}}) approved.',
  },

  // ── Leave rejected ───────────────────────────────────────────────────────

  {
    event: 'LEAVE_REJECTED',
    channel: 'email',
    subject: 'Leave Request Rejected — {{leave_type}} ({{start_date}} to {{end_date}})',
    body: `Hi {{employee_name}},

Unfortunately, your leave request has been rejected.

Details:
  • Leave Type   : {{leave_type}}
  • From         : {{start_date}}
  • To           : {{end_date}}
  • Total Days   : {{total_days}}
  • Reason       : {{rejection_reason}}

If you have questions, please speak to your manager or HR.

— {{company_name}} HR Team`,
  },
  {
    event: 'LEAVE_REJECTED',
    channel: 'in_app',
    subject: 'Leave request rejected',
    body:
      'Your {{leave_type}} request for {{total_days}} day(s) starting {{start_date}} was rejected.',
  },
  {
    event: 'LEAVE_REJECTED',
    channel: 'push',
    subject: 'Leave Rejected',
    body: '{{leave_type}} request ({{start_date}} – {{end_date}}) rejected.',
  },

  // ── Leave cancelled ──────────────────────────────────────────────────────

  {
    event: 'LEAVE_CANCELLED',
    channel: 'email',
    subject: 'Leave Request Cancelled — {{leave_type}} ({{start_date}} to {{end_date}})',
    body: `Hi {{employee_name}},

Your leave request has been cancelled.

Details:
  • Leave Type   : {{leave_type}}
  • From         : {{start_date}}
  • To           : {{end_date}}
  • Total Days   : {{total_days}}

Your leave balance has been restored if applicable.

— {{company_name}} HR Team`,
  },
  {
    event: 'LEAVE_CANCELLED',
    channel: 'in_app',
    subject: 'Leave request cancelled',
    body:
      'Your {{leave_type}} request for {{total_days}} day(s) starting {{start_date}} has been cancelled.',
  },

  // ── SLA breach / escalation ──────────────────────────────────────────────

  {
    event: 'LEAVE_SLA_BREACH',
    channel: 'email',
    subject: 'SLA Breach: Leave Request Pending for {{sla_hours}}+ Hours',
    body: `Hi,

A leave request has exceeded the {{sla_hours}}-hour SLA and has been automatically escalated.

Request:
  • Employee     : {{requester_name}}
  • Leave Type   : {{leave_type}}
  • From         : {{start_date}}
  • To           : {{end_date}}
  • Total Days   : {{total_days}}

Please take action immediately.

— {{company_name}} HR System`,
  },
  {
    event: 'LEAVE_SLA_BREACH',
    channel: 'in_app',
    subject: 'SLA breach — leave request escalated',
    body:
      'A leave request from {{requester_name}} has been pending for over {{sla_hours}} hours and has been escalated.',
  },

  // ── Employee registration pending ────────────────────────────────────────

  {
    event: 'EMPLOYEE_REGISTRATION_PENDING',
    channel: 'email',
    subject: 'New Employee Registration: {{employee_name}}',
    body: `Hi,

A new employee has signed up and is awaiting your approval.

Details:
  • Name         : {{employee_name}}
  • Email        : {{requester_name}}

Log in to {{company_name}} to approve or reject this registration.

— {{company_name}} HR System`,
  },
  {
    event: 'EMPLOYEE_REGISTRATION_PENDING',
    channel: 'in_app',
    subject: 'New employee registration pending',
    body: '{{employee_name}} has signed up and is awaiting HR approval.',
  },

  // ── Employee registration approved ──────────────────────────────────────

  {
    event: 'EMPLOYEE_REGISTRATION_APPROVED',
    channel: 'email',
    subject: 'Welcome to {{company_name}} — Your Account is Active',
    body: `Hi {{employee_name}},

Your employee account has been approved! You can now log in to {{company_name}} and access all features.

Get started by exploring your dashboard and leave balance.

— {{company_name}} HR Team`,
  },
  {
    event: 'EMPLOYEE_REGISTRATION_APPROVED',
    channel: 'in_app',
    subject: 'Account approved — welcome aboard!',
    body: 'Your {{company_name}} account is now active. Log in to get started.',
  },
];
