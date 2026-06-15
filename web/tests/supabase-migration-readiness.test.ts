import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  detectDatabaseProvider,
  getDatabaseRuntimeInfo,
  getSupabaseProjectRefFromUrl,
  resolveDatabaseUrl,
  resolveDirectDatabaseUrl,
} from '../lib/database-provider';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(path: string) {
  return readFileSync(`${root}/${path}`, 'utf8');
}

describe('Supabase migration readiness', () => {
  it('detects Supabase direct and pooler database URLs', () => {
    const pooler =
      'postgresql://postgres.tpffianqmjbaobelzlyw:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true';
    const direct =
      'postgresql://postgres:secret@db.tpffianqmjbaobelzlyw.supabase.co:5432/postgres?sslmode=require';

    assert.equal(detectDatabaseProvider(pooler), 'supabase');
    assert.equal(detectDatabaseProvider(direct), 'supabase');
    assert.equal(getSupabaseProjectRefFromUrl(pooler), 'tpffianqmjbaobelzlyw');
    assert.equal(getSupabaseProjectRefFromUrl(direct), 'tpffianqmjbaobelzlyw');
  });

  it('prefers Supabase aliases when primary Prisma URLs are unset', () => {
    const env = {
      SUPABASE_DATABASE_URL:
        'postgresql://postgres.tpffianqmjbaobelzlyw:secret@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
      SUPABASE_DIRECT_URL:
        'postgresql://postgres:secret@db.tpffianqmjbaobelzlyw.supabase.co:5432/postgres',
    };

    assert.equal(resolveDatabaseUrl(env), env.SUPABASE_DATABASE_URL);
    assert.equal(resolveDirectDatabaseUrl(env), env.SUPABASE_DIRECT_URL);
    assert.deepEqual(getDatabaseRuntimeInfo(env), {
      provider: 'supabase',
      hasDatabaseUrl: true,
      hasDirectUrl: true,
      supabaseProjectRef: 'tpffianqmjbaobelzlyw',
    });
  });

  it('uses Supabase health and removes the old Neon test surface', () => {
    assert.equal(existsSync(`${root}/app/api/test-neon/route.ts`), false);
    assert.equal(existsSync(`${root}/lib/neon-auth.ts`), false);
    assert.equal(existsSync(`${root}/app/api/test-supabase/route.ts`), true);

    const health = read('lib/enterprise/health.ts');
    assert.match(health, /checkSupabaseProjectHealth/);
    assert.doesNotMatch(health, /neonAuth|checkNeonAuth|Neon Auth/);

    const route = read('app/api/test-supabase/route.ts');
    assert.match(route, /requireSuperAdmin/);
    assert.match(route, /getAuthEmployee/);
  });

  it('does not eagerly connect Prisma at module import by default', () => {
    const prisma = read('lib/prisma.ts');
    assert.match(prisma, /if \(process\.env\.PRISMA_EAGER_CONNECT === '1'\)/);
    assert.match(prisma, /prisma\.\$connect\(\)\.catch/);
  });

  it('documents the target Supabase project and pooler/direct split', () => {
    const envExample = read('.env.example');
    assert.match(envExample, /tpffianqmjbaobelzlyw/);
    assert.match(envExample, /pooler\.supabase\.com:6543/);
    assert.match(envExample, /db\.tpffianqmjbaobelzlyw\.supabase\.co:5432/);
    assert.doesNotMatch(envExample, /NEON_AUTH|NEON_JWKS|NEON_API_KEY/);

    const packageJson = read('package.json');
    assert.match(packageJson, /db:migrate:supabase/);
    assert.match(packageJson, /db:smoke:supabase/);
  });
});
