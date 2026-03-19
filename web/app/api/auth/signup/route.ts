import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { validatePassword } from '@/lib/password-validation';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { sendSignupConfirmationEmail } from '@/lib/email-service';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signup
 *
 * Public endpoint for user registration.
 * Creates user via Supabase Admin API (service role key),
 * bypassing any client-side "Enable Sign Up" restriction.
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'unknown';
    const rl = await checkApiRateLimit(`signup:${ip}`, 'auth');
    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Too many sign-up attempts. Please try again later.' },
        { status: 429, headers: getRateLimitHeaders(rl) },
      );
    }

    const body = await request.json();
    const { email, password, firstName } = body;

    // Validate required fields
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required.' },
        { status: 400 },
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email address.' },
        { status: 400 },
      );
    }

    // Validate password strength
    const pwResult = validatePassword(password);
    if (!pwResult.valid) {
      return NextResponse.json(
        { error: pwResult.errors[0] },
        { status: 400 },
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Authentication provider is not configured.' },
        { status: 500 },
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Create user via public sign-up flow so email confirmation behavior
    // follows Supabase project settings.
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/callback`,
      },
    });

    const user = data.user;

    if (error) {
      // Handle "already registered" case
      if (
        error.message?.includes('already been registered') ||
        error.message?.includes('already exists') ||
        error.message?.includes('duplicate')
      ) {
        return NextResponse.json(
          { error: 'This email is already registered. Please sign in instead.', code: 'USER_EXISTS' },
          { status: 409 },
        );
      }

      console.error('[AUTH SIGNUP] Supabase admin createUser error:', error.message);
      return NextResponse.json(
        { error: error.message || 'Registration failed. Please try again.' },
        { status: 400 },
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Registration failed. No user returned.' },
        { status: 500 },
      );
    }

    // Send signup confirmation email (fire-and-forget — don't block response)
    const displayName = firstName || email.split('@')[0] || 'there';
    sendSignupConfirmationEmail(email, displayName).catch((err) => {
      console.error('[AUTH SIGNUP] Failed to send confirmation email:', err);
    });

    return NextResponse.json({
      success: true,
      userId: user.id,
      email: user.email,
      emailConfirmationRequired: !data.session,
    });
  } catch (err) {
    console.error('[AUTH SIGNUP] Unexpected error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 },
    );
  }
}
