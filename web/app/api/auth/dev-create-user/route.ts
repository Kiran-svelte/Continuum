import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { checkApiRateLimit, getRateLimitHeaders } from '@/lib/api-rate-limit';
import { getSupabaseAdmin } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(8).max(200),
});

/**
 * Dev-only helper to create a Supabase user without triggering confirmation email.
 *
 * Why: If the Supabase project can't send emails (common when SMTP isn't configured),
 * `supabase.auth.signUp()` fails with "Error sending confirmation email".
 *
 * Requires: `SUPABASE_SERVICE_ROLE_KEY` configured.
 */
export async function POST(request: NextRequest) {
  // Allow in production only if explicitly enabled via env var
  if (process.env.NODE_ENV === 'production' && process.env.ENABLE_SIGNUP_FALLBACK !== 'true') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const ip = request.headers.get('x-forwarded-for') ?? 'unknown';
  const rateLimit = checkApiRateLimit(ip, 'auth');
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Rate limit exceeded. Try again later.' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const admin = getSupabaseAdmin();

    const { data, error } = await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });

    if (error) {
      const status = typeof error.status === 'number' ? error.status : 400;
      return NextResponse.json({ error: error.message }, { status });
    }

    return NextResponse.json({ success: true, user_id: data.user?.id ?? null });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user';

    if (message.includes('SUPABASE_SERVICE_ROLE_KEY is not configured')) {
      return NextResponse.json(
        {
          error:
            'Supabase email confirmation is failing and SUPABASE_SERVICE_ROLE_KEY is not configured. Add SUPABASE_SERVICE_ROLE_KEY to web/.env to enable dev signup fallback.',
        },
        { status: 501 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
