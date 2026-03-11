import sgMail from '@sendgrid/mail';
import nodemailer from 'nodemailer';
import { redisEmailRateLimit } from '@/lib/redis';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EmailOptions {
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
  /** SendGrid category tag for analytics (e.g., 'welcome', 'leave', 'invite') */
  category?: string;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  /** Which transport delivered the email */
  transport?: 'sendgrid' | 'smtp';
}

// ─── HTML Escaping (XSS Prevention) ─────────────────────────────────────────

function escapeHtml(text: string): string {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => htmlEscapes[char] || char);
}

// ─── Rate Limiting (in-memory, will be replaced by Redis in Chunk 3) ────────

const emailSendTimestamps: number[] = [];
const MAX_EMAILS_PER_MINUTE = 20;

function checkEmailRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;
  while (emailSendTimestamps.length > 0 && emailSendTimestamps[0] < oneMinuteAgo) {
    emailSendTimestamps.shift();
  }
  return emailSendTimestamps.length < MAX_EMAILS_PER_MINUTE;
}

// ─── SendGrid Web API Transport ─────────────────────────────────────────────

let sgInitialized = false;

function initSendGrid(): boolean {
  if (sgInitialized) return true;
  const apiKey = process.env.SENDGRID_API_KEY?.trim();
  if (!apiKey) return false;
  sgMail.setApiKey(apiKey);
  sgInitialized = true;
  return true;
}

async function sendViaSendGrid(
  to: string | string[],
  subject: string,
  html: string,
  options?: EmailOptions
): Promise<EmailResult> {
  if (!initSendGrid()) {
    return { success: false, error: 'SendGrid API key not configured' };
  }

  const fromEmail = process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@continuum.hr';
  const fromName = process.env.SENDGRID_FROM_NAME || 'Continuum HR';

  const msg: sgMail.MailDataRequired = {
    to: Array.isArray(to) ? to : [to],
    from: { email: fromEmail, name: fromName },
    subject,
    html,
    ...(options?.cc && { cc: Array.isArray(options.cc) ? options.cc : [options.cc] }),
    ...(options?.bcc && { bcc: Array.isArray(options.bcc) ? options.bcc : [options.bcc] }),
    ...(options?.replyTo && { replyTo: options.replyTo }),
    ...(options?.category && { categories: [options.category] }),
    trackingSettings: {
      clickTracking: { enable: false },
      openTracking: { enable: false },
    },
  };

  // Handle attachments
  if (options?.attachments?.length) {
    msg.attachments = options.attachments.map((att) => ({
      filename: att.filename,
      content: typeof att.content === 'string' ? att.content : att.content.toString('base64'),
      type: att.contentType || 'application/octet-stream',
      disposition: 'attachment' as const,
    }));
  }

  try {
    const [response] = await sgMail.send(msg);
    const messageId = response.headers['x-message-id'] as string | undefined;
    return { success: true, messageId: messageId || undefined, transport: 'sendgrid' };
  } catch (error: unknown) {
    const sgError = error as { code?: number; response?: { body?: { errors?: Array<{ message: string }> } } };
    const statusCode = sgError.code;
    const errorMessages = sgError.response?.body?.errors?.map((e) => e.message).join('; ');

    let errorMsg = 'SendGrid delivery failed';
    if (statusCode === 401) errorMsg = 'SendGrid: Invalid API key';
    else if (statusCode === 403) errorMsg = 'SendGrid: Sender not verified — verify email in SendGrid dashboard';
    else if (statusCode === 429) errorMsg = 'SendGrid: Rate limit exceeded';
    else if (errorMessages) errorMsg = `SendGrid: ${errorMessages}`;

    console.error(`[EmailService] SendGrid failed (${statusCode}):`, errorMsg);
    return { success: false, error: errorMsg };
  }
}

// ─── SMTP Fallback Transport ────────────────────────────────────────────────

function createSmtpTransport(): nodemailer.Transporter {
  const smtpHost = process.env.SMTP_HOST?.trim() || 'smtp.sendgrid.net';
  const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
  const smtpUser = process.env.SMTP_USER?.trim() || '';
  const smtpPass = process.env.SMTP_PASS?.trim() || '';

  if (!smtpUser || !smtpPass) {
    console.warn('[EmailService] SMTP credentials not set — SMTP fallback will fail');
  }

  return nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
    tls: { rejectUnauthorized: process.env.NODE_ENV === 'production' },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
}

async function sendViaSmtp(
  to: string | string[],
  subject: string,
  html: string,
  options?: EmailOptions
): Promise<EmailResult> {
  const transporter = createSmtpTransport();
  const from = `${process.env.SENDGRID_FROM_NAME || 'Continuum HR'} <${process.env.SMTP_FROM || process.env.SENDGRID_FROM_EMAIL || 'noreply@continuum.hr'}>`;

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: Array.isArray(to) ? to.join(', ') : to,
    subject,
    html,
    ...(options?.cc && { cc: Array.isArray(options.cc) ? options.cc.join(', ') : options.cc }),
    ...(options?.bcc && { bcc: Array.isArray(options.bcc) ? options.bcc.join(', ') : options.bcc }),
    ...(options?.replyTo && { replyTo: options.replyTo }),
    ...(options?.attachments && { attachments: options.attachments }),
  };

  const info = await transporter.sendMail(mailOptions);
  return { success: true, messageId: info.messageId, transport: 'smtp' };
}

// ─── Core Send Function (SendGrid primary → SMTP fallback) ─────────────────

/**
 * Sends an email via SendGrid Web API (primary) with SMTP fallback.
 * Never crashes the calling process — all errors are caught and returned.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  options?: EmailOptions
): Promise<EmailResult> {
  try {
    // Check rate limit — Redis (distributed) then in-memory (local)
    const redisAllowed = await redisEmailRateLimit(MAX_EMAILS_PER_MINUTE);
    if (!redisAllowed || !checkEmailRateLimit()) {
      console.warn('[EmailService] Rate limit exceeded, skipping email');
      return { success: false, error: 'Email rate limit exceeded' };
    }

    const provider = process.env.EMAIL_PROVIDER?.trim() || 'sendgrid';

    // Try primary: SendGrid Web API
    if (provider === 'sendgrid' || !provider) {
      const sgResult = await sendViaSendGrid(to, subject, html, options);
      if (sgResult.success) {
        emailSendTimestamps.push(Date.now());
        console.log(`[EmailService] Sent via SendGrid to ${Array.isArray(to) ? to.join(', ') : to} (${options?.category || 'general'})`);
        return sgResult;
      }

      // SendGrid failed — fall through to SMTP
      console.warn(`[EmailService] SendGrid failed, falling back to SMTP: ${sgResult.error}`);
    }

    // Fallback: SMTP
    const smtpResult = await sendViaSmtp(to, subject, html, options);
    emailSendTimestamps.push(Date.now());
    console.log(`[EmailService] Sent via SMTP fallback to ${Array.isArray(to) ? to.join(', ') : to}`);
    return smtpResult;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    console.error('[EmailService] All transports failed:', message);
    return { success: false, error: message };
  }
}

// ─── Template Helpers ────────────────────────────────────────────────────────

function wrapTemplate(content: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
      <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
        ${content}
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #999; text-align: center;">
          Continuum HR Platform — This is an automated message, please do not reply directly.
        </p>
      </div>
    </body>
    </html>
  `;
}

export async function sendLeaveApprovalEmail(
  to: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  approverName: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #16a34a;">Leave Approved ✓</h2>
    <p>Hi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Your leave request has been approved:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(leaveType)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Period</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(startDate)} — ${escapeHtml(endDate)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Approved by</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(approverName)}</strong></td></tr>
    </table>
  `);

  return sendEmail(to, `Leave Approved: ${escapeHtml(leaveType)} (${startDate} - ${endDate})`, html, { category: 'leave' });
}

export async function sendLeaveRejectionEmail(
  to: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  rejectorName: string,
  reason: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #dc2626;">Leave Rejected ✗</h2>
    <p>Hi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Your leave request has been rejected:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(leaveType)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Period</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(startDate)} — ${escapeHtml(endDate)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Rejected by</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(rejectorName)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(reason)}</td></tr>
    </table>
  `);

  return sendEmail(to, `Leave Rejected: ${escapeHtml(leaveType)} (${startDate} - ${endDate})`, html, { category: 'leave' });
}

export async function sendSLABreachEmail(
  to: string,
  managerName: string,
  employeeName: string,
  leaveType: string,
  requestDate: string,
  slaHours: number
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #f59e0b;">⚠ SLA Breach Alert</h2>
    <p>Hi <strong>${escapeHtml(managerName)}</strong>,</p>
    <p>A leave request has exceeded the SLA deadline of <strong>${slaHours} hours</strong>:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Employee</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(employeeName)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(leaveType)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Requested on</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(requestDate)}</strong></td></tr>
    </table>
    <p>Please take immediate action to approve or reject this request.</p>
  `);

  return sendEmail(to, `⚠ SLA Breach: ${escapeHtml(employeeName)}'s ${escapeHtml(leaveType)} request`, html, { category: 'sla' });
}

export async function sendOTPEmail(
  to: string,
  employeeName: string,
  otp: string,
  action: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #2563eb;">Security Verification</h2>
    <p>Hi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Your one-time password for <strong>${escapeHtml(action.replace(/_/g, ' '))}</strong>:</p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f1f5f9; padding: 16px 32px; border-radius: 8px; display: inline-block;">${escapeHtml(otp)}</span>
    </div>
    <p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
  `);

  return sendEmail(to, `Continuum: Your verification code is ${escapeHtml(otp)}`, html, { category: 'security' });
}

export async function sendWelcomeEmail(
  to: string,
  employeeName: string,
  companyName: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #2563eb;">Welcome to Continuum! 🎉</h2>
    <p>Hi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Welcome to <strong>${escapeHtml(companyName)}</strong> on the Continuum HR platform.</p>
    <p>Your account has been set up and you can now:</p>
    <ul style="color: #444; line-height: 1.8;">
      <li>View your leave balance and apply for leave</li>
      <li>Check in/out for attendance tracking</li>
      <li>View your payslips and documents</li>
      <li>Access your team calendar</li>
    </ul>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.hr'}/employee/dashboard"
         style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Go to Dashboard →
      </a>
    </div>
  `);

  return sendEmail(to, `Welcome to ${escapeHtml(companyName)} on Continuum`, html, { category: 'welcome' });
}

export async function sendRegistrationApprovedEmail(
  to: string,
  employeeName: string,
  companyName: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #16a34a;">Registration Approved! ✅</h2>
    <p>Hi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Great news! Your registration to join <strong>${escapeHtml(companyName)}</strong> has been approved.</p>
    <p>You can now log in and access the employee portal:</p>
    <ul style="color: #444; line-height: 1.8;">
      <li>View your leave balance and apply for leave</li>
      <li>Check in/out for attendance tracking</li>
      <li>Access your team calendar and documents</li>
    </ul>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.hr'}/sign-in"
         style="background: #16a34a; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Sign In Now →
      </a>
    </div>
  `);

  return sendEmail(to, `Your registration to ${escapeHtml(companyName)} has been approved`, html, { category: 'registration' });
}

export async function sendRegistrationRejectedEmail(
  to: string,
  employeeName: string,
  reason: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #dc2626;">Registration Not Approved</h2>
    <p>Hi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Unfortunately, your registration request was not approved at this time.</p>
    <p><strong>Reason:</strong> ${escapeHtml(reason)}</p>
    <p>If you believe this is an error, please contact your company's HR department directly.</p>
  `);

  return sendEmail(to, `Regarding your registration request`, html, { category: 'registration' });
}

export async function sendLeaveSubmissionEmail(
  to: string,
  approverName: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  totalDays: number,
  reason: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #2563eb;">New Leave Request 📋</h2>
    <p>Hi <strong>${escapeHtml(approverName)}</strong>,</p>
    <p><strong>${escapeHtml(employeeName)}</strong> has submitted a leave request requiring your approval:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(leaveType)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Period</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(startDate)} — ${escapeHtml(endDate)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Days</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${totalDays}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(reason)}</td></tr>
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.hr'}/manager/leave-requests"
         style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Review Request →
      </a>
    </div>
  `);

  return sendEmail(to, `Leave Request: ${escapeHtml(employeeName)} - ${escapeHtml(leaveType)} (${startDate} - ${endDate})`, html, { category: 'leave' });
}

export async function sendInviteEmail(
  to: string,
  companyName: string,
  inviterName: string,
  token: string,
  role: string,
  department?: string
): Promise<EmailResult> {
  const signUpUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://continuum.hr'}/sign-up?invite=${token}`;
  const roleLabel = role.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());

  const html = wrapTemplate(`
    <h2 style="color: #2563eb;">You're Invited! 🎉</h2>
    <p>Hi there,</p>
    <p><strong>${escapeHtml(inviterName)}</strong> has invited you to join <strong>${escapeHtml(companyName)}</strong> on Continuum.</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Role</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(roleLabel)}</strong></td></tr>
      ${department ? `<tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Department</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(department)}</strong></td></tr>` : ''}
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a href="${signUpUrl}"
         style="background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block;">
        Accept Invitation →
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">This invitation expires in <strong>7 days</strong>. If you didn't expect this, you can safely ignore this email.</p>
  `);

  return sendEmail(to, `${escapeHtml(inviterName)} invited you to join ${escapeHtml(companyName)}`, html, { category: 'invite' });
}

export async function sendLeaveAutoApprovedEmail(
  to: string,
  employeeName: string,
  leaveType: string,
  startDate: string,
  endDate: string,
  confidenceScore: number
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #16a34a;">Leave Auto-Approved ✓</h2>
    <p>Hi <strong>${escapeHtml(employeeName)}</strong>,</p>
    <p>Your leave request has been automatically approved by our intelligent system:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(leaveType)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Period</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${escapeHtml(startDate)} — ${escapeHtml(endDate)}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Confidence</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${(confidenceScore * 100).toFixed(0)}%</strong></td></tr>
    </table>
    <p style="color: #666; font-size: 14px;">No further action is needed. Enjoy your time off!</p>
  `);

  return sendEmail(to, `Leave Auto-Approved: ${escapeHtml(leaveType)} (${startDate} - ${endDate})`, html, { category: 'leave' });
}
