import nodemailer from 'nodemailer';

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
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const emailSendTimestamps: number[] = [];
const MAX_EMAILS_PER_MINUTE = 20;

function checkEmailRateLimit(): boolean {
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;

  // Remove timestamps older than 1 minute
  while (emailSendTimestamps.length > 0 && emailSendTimestamps[0] < oneMinuteAgo) {
    emailSendTimestamps.shift();
  }

  return emailSendTimestamps.length < MAX_EMAILS_PER_MINUTE;
}

// ─── Transport ───────────────────────────────────────────────────────────────

function createTransport(): nodemailer.Transporter {
  const hasOAuth = process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN;

  if (hasOAuth) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_USER!,
        clientId: process.env.GMAIL_CLIENT_ID!,
        clientSecret: process.env.GMAIL_CLIENT_SECRET!,
        refreshToken: process.env.GMAIL_REFRESH_TOKEN!,
      },
    });
  }

  // SMTP fallback
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_APP_PASSWORD || '',
    },
  });
}

// ─── Core Send Function ─────────────────────────────────────────────────────

/**
 * Sends an email via Gmail OAuth2/SMTP.
 * Graceful fallback: logs errors but never crashes the calling process.
 */
export async function sendEmail(
  to: string | string[],
  subject: string,
  html: string,
  options?: EmailOptions
): Promise<EmailResult> {
  try {
    if (!checkEmailRateLimit()) {
      console.warn('[EmailService] Rate limit exceeded, skipping email');
      return { success: false, error: 'Email rate limit exceeded' };
    }

    const transporter = createTransport();
    const from = `Continuum HR <${process.env.GMAIL_USER || 'noreply@continuum.hr'}>`;

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
    emailSendTimestamps.push(Date.now());

    return { success: true, messageId: info.messageId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown email error';
    console.error('[EmailService] Failed to send email:', message);
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
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your leave request has been approved:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${leaveType}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Period</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${startDate} — ${endDate}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Approved by</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${approverName}</strong></td></tr>
    </table>
  `);

  return sendEmail(to, `Leave Approved: ${leaveType} (${startDate} - ${endDate})`, html);
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
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your leave request has been rejected:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${leaveType}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Period</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${startDate} — ${endDate}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Rejected by</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${rejectorName}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Reason</td><td style="padding: 8px; border-bottom: 1px solid #eee;">${reason}</td></tr>
    </table>
  `);

  return sendEmail(to, `Leave Rejected: ${leaveType} (${startDate} - ${endDate})`, html);
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
    <p>Hi <strong>${managerName}</strong>,</p>
    <p>A leave request has exceeded the SLA deadline of <strong>${slaHours} hours</strong>:</p>
    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Employee</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${employeeName}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Type</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${leaveType}</strong></td></tr>
      <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Requested on</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${requestDate}</strong></td></tr>
    </table>
    <p>Please take immediate action to approve or reject this request.</p>
  `);

  return sendEmail(to, `⚠ SLA Breach: ${employeeName}'s ${leaveType} request`, html);
}

export async function sendOTPEmail(
  to: string,
  employeeName: string,
  otp: string,
  action: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #2563eb;">Security Verification</h2>
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Your one-time password for <strong>${action.replace(/_/g, ' ')}</strong>:</p>
    <div style="text-align: center; margin: 24px 0;">
      <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; background: #f1f5f9; padding: 16px 32px; border-radius: 8px; display: inline-block;">${otp}</span>
    </div>
    <p style="color: #666; font-size: 14px;">This code expires in <strong>10 minutes</strong>. Do not share this code with anyone.</p>
  `);

  return sendEmail(to, `Continuum: Your verification code is ${otp}`, html);
}

export async function sendWelcomeEmail(
  to: string,
  employeeName: string,
  companyName: string
): Promise<EmailResult> {
  const html = wrapTemplate(`
    <h2 style="color: #2563eb;">Welcome to Continuum! 🎉</h2>
    <p>Hi <strong>${employeeName}</strong>,</p>
    <p>Welcome to <strong>${companyName}</strong> on the Continuum HR platform.</p>
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

  return sendEmail(to, `Welcome to ${companyName} on Continuum`, html);
}
