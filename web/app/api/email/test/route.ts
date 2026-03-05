import { NextRequest, NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/email/test
 * 
 * Send a test email to verify email configuration is working.
 * Body: { to: string }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const to = body.to;

    if (!to || typeof to !== 'string') {
      return NextResponse.json(
        { error: 'Email address required in body: { to: "email@example.com" }' },
        { status: 400 }
      );
    }

    const result = await sendEmail(
      to,
      'Continuum Email Test ✓',
      `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 20px;">
          <div style="max-width: 500px; margin: 0 auto; background: #f8fafc; border-radius: 8px; padding: 32px; text-align: center;">
            <h1 style="color: #16a34a; margin-bottom: 16px;">✓ Email Working!</h1>
            <p style="color: #444; font-size: 16px;">
              Your Continuum email configuration is properly set up.
            </p>
            <p style="color: #666; font-size: 14px; margin-top: 24px;">
              Sent at: ${new Date().toISOString()}
            </p>
          </div>
        </body>
        </html>
      `
    );

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent to ${to}`,
        messageId: result.messageId,
      });
    } else {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error,
          config: {
            hasGmailUser: !!process.env.GMAIL_USER,
            hasAppPassword: !!process.env.GMAIL_APP_PASSWORD,
            hasOAuth: !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN),
          }
        },
        { status: 500 }
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * GET /api/email/test
 * 
 * Check email configuration status
 */
export async function GET() {
  const hasGmailUser = !!process.env.GMAIL_USER;
  const hasAppPassword = !!process.env.GMAIL_APP_PASSWORD;
  const hasOAuth = !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN);

  return NextResponse.json({
    configured: (hasGmailUser && hasAppPassword) || hasOAuth,
    mode: hasOAuth ? 'oauth2' : (hasAppPassword ? 'app_password' : 'not_configured'),
    details: {
      hasGmailUser,
      hasAppPassword,
      hasOAuth,
    },
  });
}
