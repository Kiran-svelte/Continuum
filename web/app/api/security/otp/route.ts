import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthEmployee, AuthError } from '@/lib/auth-guard';
import { generateOTP, verifyOTP, isOTPRequired, type OTPAction } from '@/lib/otp-service';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { sendOTPEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

const generateSchema = z.object({
  action: z.string().min(1).max(50),
});

const verifySchema = z.object({
  action: z.string().min(1).max(50),
  code: z.string().length(6),
});

// POST: Generate OTP
export async function POST(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const rateLimit = checkApiRateLimit(employee.id, 'security/otp');
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const parsed = generateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action } = parsed.data;

    if (!isOTPRequired(action)) {
      return NextResponse.json(
        { error: `Action '${action}' does not require OTP` },
        { status: 400 }
      );
    }

    const otp = await generateOTP(employee.id, employee.org_id, action as OTPAction);

    // Send OTP via email
    try {
      const employeeName = `${employee.first_name} ${employee.last_name}`;
      await sendOTPEmail(
        employee.email,
        employeeName,
        otp,
        action
      );
    } catch (emailError) {
      console.error('[OTP] Email send failed:', emailError);
      // Continue even if email fails - OTP is still valid
    }

    return NextResponse.json({
      message: 'OTP generated and sent to your email',
      action,
      // Only expose OTP in development for testing
      ...(process.env.NODE_ENV === 'development' ? { otp } : {}),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PUT: Verify OTP
export async function PUT(request: NextRequest) {
  try {
    const employee = await getAuthEmployee();

    const body = await request.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { action, code } = parsed.data;
    const valid = await verifyOTP(employee.id, employee.org_id, action as OTPAction, code);

    if (!valid) {
      return NextResponse.json({ error: 'Invalid or expired OTP' }, { status: 400 });
    }

    return NextResponse.json({ verified: true, action });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    const message =
      process.env.NODE_ENV === 'production' ? 'Internal server error' : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
