import { NextRequest, NextResponse } from 'next/server';
import { getAuthEmployee, requireRole } from '@/lib/auth-guard';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { sendEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/test-email
 *
 * Sends a test email to the requesting admin's email address.
 * Used to verify that email delivery (SendGrid/SMTP) is working.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimit = checkApiRateLimit(ip, 'general');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin');

    const result = await sendEmail(
      employee.email,
      'Continuum — Test Email',
      `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px; background: #f5f5f5;">
          <div style="max-width: 500px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #16a34a;">Email Delivery Working ✓</h2>
            <p>Hi <strong>${employee.first_name}</strong>,</p>
            <p>This is a test email from Continuum HR platform.</p>
            <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Provider</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${process.env.EMAIL_PROVIDER || 'sendgrid'}</strong></td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">Sent at</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${new Date().toISOString()}</strong></td></tr>
              <tr><td style="padding: 8px; border-bottom: 1px solid #eee; color: #666;">From</td><td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>${process.env.SENDGRID_FROM_EMAIL || process.env.SMTP_FROM || 'noreply@continuum.hr'}</strong></td></tr>
            </table>
            <p style="color: #16a34a; font-weight: 600;">If you received this, email delivery is configured correctly.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="font-size: 12px; color: #999; text-align: center;">Continuum HR Platform — Test Email</p>
          </div>
        </body>
        </html>
      `,
      { category: 'test' }
    );

    return NextResponse.json({
      success: result.success,
      transport: result.transport || null,
      messageId: result.messageId || null,
      error: result.error || null,
      sent_to: employee.email,
    });
  } catch (error) {
    console.error('[TestEmail] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
