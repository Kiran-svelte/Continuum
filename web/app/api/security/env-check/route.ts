import { NextResponse } from 'next/server';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'CRON_SECRET',
] as const;

const OPTIONAL_ENV_VARS = [
  'CONSTRAINT_ENGINE_URL',
  'REDIS_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SENTRY_DSN',
  'VAULT_URL',
  'VAULT_TOKEN',
] as const;

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireRole(employee, 'admin');

    // F-4: Never expose actual values
    const required = REQUIRED_ENV_VARS.map((key) => ({
      key,
      set: !!process.env[key],
      required: true,
    }));

    const optional = OPTIONAL_ENV_VARS.map((key) => ({
      key,
      set: !!process.env[key],
      required: false,
    }));

    const allVars = [...required, ...optional];
    const missingRequired = required.filter((v) => !v.set);

    return NextResponse.json({
      healthy: missingRequired.length === 0,
      total: allVars.length,
      missing_required: missingRequired.length,
      variables: allVars,
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
