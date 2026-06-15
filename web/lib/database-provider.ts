export type DatabaseProvider = 'supabase' | 'neon' | 'postgres' | 'unknown';

type DatabaseEnv = Record<string, string | undefined> & Partial<Record<
  | 'DATABASE_URL'
  | 'DIRECT_URL'
  | 'SUPABASE_DATABASE_URL'
  | 'SUPABASE_DIRECT_URL'
  | 'POSTGRES_PRISMA_URL'
  | 'POSTGRES_URL_NON_POOLING'
  | 'NEON_DATABASE_URL'
  | 'NEON_DIRECT_URL',
  string
>>;

function normalizeEnvValue(value: string | undefined): string {
  const cleaned = (value || '').trim().replace(/^['"]|['"]$/g, '');
  if (!cleaned || cleaned.includes('${') || cleaned.includes('replace-with')) {
    return '';
  }
  return cleaned;
}

function firstConfigured(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    const cleaned = normalizeEnvValue(value);
    if (cleaned) return cleaned;
  }
  return undefined;
}

export function resolveDatabaseUrl(env: DatabaseEnv = process.env): string | undefined {
  return firstConfigured(
    env.DATABASE_URL,
    env.SUPABASE_DATABASE_URL,
    env.POSTGRES_PRISMA_URL,
    env.NEON_DATABASE_URL
  );
}

export function resolveDirectDatabaseUrl(env: DatabaseEnv = process.env): string | undefined {
  return firstConfigured(
    env.DIRECT_URL,
    env.SUPABASE_DIRECT_URL,
    env.POSTGRES_URL_NON_POOLING,
    env.NEON_DIRECT_URL
  );
}

export function detectDatabaseProvider(databaseUrl: string | undefined): DatabaseProvider {
  const value = normalizeEnvValue(databaseUrl);
  if (!value) return 'unknown';

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    const username = decodeURIComponent(url.username || '').toLowerCase();

    if (
      hostname.endsWith('.supabase.co') ||
      hostname.endsWith('.pooler.supabase.com') ||
      username.startsWith('postgres.')
    ) {
      return 'supabase';
    }

    if (hostname.endsWith('.neon.tech')) {
      return 'neon';
    }

    if (url.protocol.startsWith('postgres')) {
      return 'postgres';
    }
  } catch {
    return 'unknown';
  }

  return 'unknown';
}

export function getSupabaseProjectRefFromUrl(databaseUrl: string | undefined): string | null {
  const value = normalizeEnvValue(databaseUrl);
  if (!value) return null;

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    if (hostname.endsWith('.supabase.co')) {
      const labels = hostname.split('.');
      return labels[0] === 'db' ? labels[1] || null : labels[0] || null;
    }

    const username = decodeURIComponent(url.username || '');
    const [, projectRef] = username.match(/^postgres\.([a-z0-9]+)$/i) || [];
    return projectRef || null;
  } catch {
    return null;
  }
}

export function getDatabaseRuntimeInfo(env: DatabaseEnv = process.env) {
  const databaseUrl = resolveDatabaseUrl(env);
  const directUrl = resolveDirectDatabaseUrl(env);

  return {
    provider: detectDatabaseProvider(databaseUrl),
    hasDatabaseUrl: Boolean(databaseUrl),
    hasDirectUrl: Boolean(directUrl),
    supabaseProjectRef:
      getSupabaseProjectRefFromUrl(databaseUrl) || getSupabaseProjectRefFromUrl(directUrl),
  };
}
