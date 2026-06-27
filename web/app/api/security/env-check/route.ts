import { NextResponse } from 'next/server';
import { getAuthEmployee, requireRole, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

const REQUIRED_ENV_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
  'NEXT_PUBLIC_APP_URL',
  'EMAIL_PROVIDER',
  'RESEND_API_KEY',
] as const;

const R2_STORAGE_ENV_VARS = [
  'UPLOAD_BUCKET',
  'UPLOAD_ACCESS_KEY',
  'UPLOAD_SECRET_KEY',
  'UPLOAD_ENDPOINT',
] as const;

const APPWRITE_STORAGE_ENV_VARS = [
  'APPWRITE_ENDPOINT',
  'APPWRITE_PROJECT_ID',
  'APPWRITE_STORAGE_BUCKET_ID',
  'APPWRITE_API_KEY',
] as const;

const OPTIONAL_ENV_VARS = [
  'CONSTRAINT_ENGINE_URL',
  'UPLOAD_REGION',
  'UPLOAD_PUBLIC_URL',
  'UPSTASH_REDIS_REST_URL',
  'UPSTASH_REDIS_REST_TOKEN',
  'REDIS_URL',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'CRON_SECRET',
  'CASHFREE_APP_ID',
  'CASHFREE_SECRET_KEY',
  'CASHFREE_WEBHOOK_SECRET',
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

    const storage = {
      configured:
        R2_STORAGE_ENV_VARS.every((key) => !!process.env[key]) ||
        APPWRITE_STORAGE_ENV_VARS.every((key) => !!process.env[key]),
      primary: R2_STORAGE_ENV_VARS.map((key) => ({ key, set: !!process.env[key] })),
      fallback: APPWRITE_STORAGE_ENV_VARS.map((key) => ({ key, set: !!process.env[key] })),
    };
    const allVars = [...required, ...optional];
    const missingRequired = required.filter((v) => !v.set);

    return NextResponse.json({
      healthy: missingRequired.length === 0 && storage.configured,
      total: allVars.length,
      missing_required: missingRequired.length + (storage.configured ? 0 : 1),
      variables: allVars,
      storage,
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
