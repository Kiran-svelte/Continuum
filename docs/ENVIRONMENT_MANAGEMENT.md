# Environment Management

Continuum uses **Vercel** for hosting with environment-scoped variables.

## Environments

| Environment | Vercel | Purpose | URL pattern |
|-------------|--------|---------|-------------|
| **Development** | Local | Engineer machines | `http://localhost:3000` |
| **Preview** | Preview deployments | PR review | `*.vercel.app` |
| **Production** | Production | Live customers | `https://continuum.support` |

## Rules

1. **Never** use production `DATABASE_URL` on localhost.
2. **Never** commit `.env` — use `.env.example` as template only.
3. Production secrets live in **Vercel Production** scope only.
4. Preview may use Neon **branch** or separate database.
5. `NEXT_PUBLIC_*` vars are exposed to the browser — no secrets there except public DSNs.

## Required variables (all non-local)

See `web/.env.example` and `web/lib/env-check.ts` (`CRITICAL_VARS`).

Production must include at minimum:

- `DATABASE_URL`, `DIRECT_URL`
- `JWT_SECRET`, `SESSION_SECRET`, `CSRF_SECRET`
- `NEXT_PUBLIC_APP_URL=https://continuum.support`
- `APP_URL=https://continuum.support`

## Recommended production ops vars

- `BETTERSTACK_SOURCE_TOKEN` — logs
- `BETTERSTACK_UPTIME_API_TOKEN` — uptime API
- `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN` — errors
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` — distributed rate limits
- `CRON_SECRET` — secured cron routes

## Validation

At runtime, `validateEnv()` runs on server startup paths. Super-admin **Operations** page (`/super-admin/operations`) evaluates all 20 ops categories including environment separation when `VERCEL=1`.

## Promoting releases

1. Merge to `main` → CI passes (`.github/workflows/web-ci.yml`).
2. Vercel auto-deploys production OR manual promote.
3. Verify `/api/health` and `/super-admin/operations` scorecard.
4. Roll back via Vercel if readiness fails (see DISASTER_RECOVERY_PLAN.md).
