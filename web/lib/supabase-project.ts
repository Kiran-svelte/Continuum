import type { ComponentCheck } from './enterprise/health';

export interface SupabaseProjectConfig {
  url: string;
  anonKey: string;
  serviceRoleKey: string;
  projectRef: string | null;
}

function normalizeSupabaseUrl(value: string | undefined): string {
  const cleaned = (value || '').trim().replace(/\/+$/, '');
  if (!cleaned || cleaned.includes('replace-with')) return '';
  return cleaned;
}

function projectRefFromUrl(value: string): string | null {
  try {
    const hostname = new URL(value).hostname.toLowerCase();
    return hostname.endsWith('.supabase.co') ? hostname.split('.')[0] || null : null;
  } catch {
    return null;
  }
}

export function getSupabaseProjectConfig(env = process.env): SupabaseProjectConfig {
  const url = normalizeSupabaseUrl(env.NEXT_PUBLIC_SUPABASE_URL);
  return {
    url,
    anonKey: (env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim(),
    serviceRoleKey: (env.SUPABASE_SERVICE_ROLE_KEY || '').trim(),
    projectRef: projectRefFromUrl(url),
  };
}

export async function checkSupabaseProjectHealth(): Promise<ComponentCheck> {
  const start = Date.now();
  const config = getSupabaseProjectConfig();

  if (!config.url || !config.anonKey) {
    return {
      status: 'degraded',
      message: 'Supabase project URL or anon key not configured',
      latency: Date.now() - start,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(`${config.url}/auth/v1/health`, {
      signal: controller.signal,
      headers: {
        apikey: config.anonKey,
      },
    });
    clearTimeout(timeout);

    return {
      status: response.ok ? 'healthy' : 'degraded',
      message: response.ok
        ? 'Supabase Auth endpoint reachable'
        : `Supabase Auth endpoint returned ${response.status}`,
      latency: Date.now() - start,
      details: {
        projectRef: config.projectRef,
        serviceRoleConfigured: Boolean(config.serviceRoleKey),
      },
    };
  } catch (error) {
    return {
      status: 'degraded',
      message: `Supabase project check failed: ${error instanceof Error ? error.message : 'unknown error'}`,
      latency: Date.now() - start,
      details: {
        projectRef: config.projectRef,
        serviceRoleConfigured: Boolean(config.serviceRoleKey),
      },
    };
  }
}
