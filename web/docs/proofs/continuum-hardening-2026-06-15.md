# Continuum Hardening Proof - 2026-06-15

## Scope

Release-hardening pass for the production-visible onboarding failure and adjacent backend UX/security gaps.

## Issues Found And Fixed

| Area | Issue / gap | Fix | User impact |
| --- | --- | --- | --- |
| Onboarding completion | `notificationTemplate.count()` ran inside the large onboarding transaction. If the transaction exceeded Prisma's default interactive timeout, setup failed at the Notifications step. | Moved notification template seed out of the transaction, made it best-effort, and set explicit transaction bounds for the critical onboarding write path. | Company setup can complete instead of failing on notification seeding latency. |
| Onboarding error UX | Unexpected Prisma/database failures were returned directly to the browser and shown in the wizard. | Added safe onboarding API error bodies and server-side structured logging. Updated the onboarding page to sanitize API and catch-path errors. | Users see retry-safe setup copy, not raw Prisma/SQL internals. |
| Adjacent setup endpoints | `/api/onboarding/step/*`, `/finalize`, `/defaults`, and `/holidays` had the same raw unexpected-error pattern. | Centralized onboarding error helpers and updated these endpoints. | Setup subflows stop leaking internal errors during profile/default/holiday/draft saves. |
| Sitewide API 500 leakage | Many API routes returned `{ error: message }` for unexpected status-500 failures. | Mechanically replaced the raw 500 return pattern with stable `Internal server error` responses. Auth, validation, and permission errors remain unchanged. | Reduces accidental exposure of database/provider internals across HR, payroll, reports, documents, notifications, search, and admin APIs. |
| Regression coverage | No preflight guard existed for this exact production failure. | Added `tests/onboarding-complete-production-hardening.test.ts` and `tests/api-safe-500-responses.test.ts` to `scripts/run-node-tests.mjs`. | The failure mode is now part of the normal release gate. |

## Verification

All commands passed locally from `D:\projects\Continuum\web`:

| Command | Result |
| --- | --- |
| `npx tsx --test tests/api-safe-500-responses.test.ts tests/onboarding-complete-production-hardening.test.ts` | PASS |
| `npx tsc --noEmit --pretty false --incremental false` | PASS |
| `node scripts/run-node-tests.mjs` | PASS, `NODE_TEST_RUNNER_FAILED_FILES=[]` |
| `npx prisma validate` | PASS |
| `npx tsx scripts/audit-module-guards.ts` | PASS, 15 routes checked |
| `npx tsx scripts/audit-tenant-scope.ts` | PASS, 11 files checked |
| `npm run build` | PASS, Next build compiled and generated 159 static pages |

## Residual Notes

- The broad raw-500 replacement intentionally does not change AuthError, validation, rate-limit, or permission messages.
- The preflight manifest still logs a non-fatal local Prisma connection warning from an assistant action test import when local Postgres is unavailable; the test runner exits green.
- Existing unrelated untracked workspace files were not staged or modified for this release.
