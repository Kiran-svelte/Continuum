# Supabase Migration Readiness Proof - 2026-06-15

## Scope

Prepared Continuum `web/` to move the Prisma/Postgres runtime from Neon to Supabase project `tpffianqmjbaobelzlyw`.

## Completed

- Added Supabase-aware database URL resolution in `lib/database-provider.ts`.
- Updated Prisma client boot to resolve `SUPABASE_DATABASE_URL` / `SUPABASE_DIRECT_URL` aliases and to lazy-connect by default for serverless deployments.
- Replaced the old `/api/test-neon` route with super-admin protected `/api/test-supabase`.
- Removed tracked Neon Auth helper and Neon connection smoke script.
- Updated enterprise health checks to report Supabase project health instead of degrading on missing Neon Auth.
- Updated env templates to document Supabase pooler and direct URL split for project `tpffianqmjbaobelzlyw`.
- Added `scripts/migrate-postgres-to-supabase.ts` and npm script `db:migrate:supabase`.
- Added `scripts/test-supabase-connection.ts` and npm script `db:smoke:supabase`.
- Updated operations readiness wording from Neon to Supabase.
- Added `tests/supabase-migration-readiness.test.ts` to the node test manifest.

## Verification

| Command | Result |
| --- | --- |
| `curl https://mcp.supabase.com/mcp` | PASS: server reachable, unauthenticated status `401` |
| `npx tsx --test tests/supabase-migration-readiness.test.ts` | PASS |
| `npx tsc --noEmit --pretty false --incremental false` | PASS |
| `npx prisma validate` | PASS |
| `node scripts/run-node-tests.mjs` | PASS, `NODE_TEST_RUNNER_FAILED_FILES=[]` |
| `npx tsx scripts/migrate-postgres-to-supabase.ts` with fake source/target URLs | PASS dry-run, no database writes |
| `npm run build` | PASS |
| `git diff --check` | PASS, line-ending warnings only |

## Cutover Blocker

Live data copy and production env flip were not executed because the session does not have either:

- a Supabase Postgres direct/pooler connection string for project `tpffianqmjbaobelzlyw`, including the database password, or
- authenticated Supabase MCP access. `codex mcp login supabase` is blocked by Windows with `Access is denied` in this shell.

## Cutover Command

After MCP OAuth or Supabase DB URLs are available, run:

```powershell
$env:SOURCE_DATABASE_URL='<current Neon direct URL>'
$env:TARGET_DATABASE_URL='<Supabase direct URL for tpffianqmjbaobelzlyw>'
npm run db:migrate:supabase -- --execute --truncate-target
npm run db:smoke:supabase
```

Then set production `DATABASE_URL` to the Supabase pooler URL and `DIRECT_URL` to the Supabase direct URL on Vercel/Render, deploy, and verify:

```powershell
curl.exe https://continuum.support/api/health/ready
curl.exe https://continuum.support/api/health
```
