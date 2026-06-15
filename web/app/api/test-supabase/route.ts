import { NextResponse } from 'next/server';
import { getDatabaseRuntimeInfo } from '@/lib/database-provider';
import { AuthError, getAuthEmployee, requireSuperAdmin } from '@/lib/auth-guard';
import { checkSupabaseProjectHealth, getSupabaseProjectConfig } from '@/lib/supabase-project';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const employee = await getAuthEmployee();
    requireSuperAdmin(employee);

    const config = getSupabaseProjectConfig();
    const health = await checkSupabaseProjectHealth();
    const database = getDatabaseRuntimeInfo();

    return NextResponse.json({
      configured: Boolean(config.url && config.anonKey),
      projectRef: config.projectRef,
      serviceRoleConfigured: Boolean(config.serviceRoleKey),
      database,
      health,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Supabase check failed' }, { status: 500 });
  }
}
