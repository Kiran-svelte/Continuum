# Global Web Remediation Implementation Plan

Date: 2026-06-25
Branch: `codex/global-web-remediation`
Workspace: `D:\projects\Continuum-main-deploy`
App root: `D:\projects\Continuum-main-deploy\web`

## Docs reviewed

All current Markdown files under `docs/` were reviewed before implementation. Most are placeholder index documents. The substantive operating contract is `docs/enterprise_real_journey_scenarios.md`, reinforced by `docs/SPEC.md`.

Key requirements carried into this plan:

- Build, typecheck, and route resolution must be clean.
- Core journeys must pass: sign-in, onboarding, leave apply, leave approve, sign-out.
- Disabled modules must be non-operable from UI, API, middleware, and assistant surfaces.
- Managers must have team-only data boundaries by default.
- Every primary CTA must map to one backend permission and module entitlement.
- All mutations must use auth, role, permission, module, and company-state guards.
- Defaults must fail safe on uncertain entitlement or stale state.
- Hard-coded secrets, unsafe redirects, and asymmetric sessions are release blockers.
- Observability, SLOs, alerts, and incident runbooks are part of production readiness.

## Current blockers

- The docs folder itself is dirty: older tracked docs are deleted and a new untracked docs set exists.
- `main` was behind `origin/main` by 8 commits at audit time.
- `npm run build` fails because live routes import deleted components.
- `npx tsc --noEmit --pretty false` fails on missing modules.
- `npm test` fails with auth, RBAC, onboarding, UI guard, and module-gating failures.
- `npm run lint` fails.
- Production dependencies have high/critical audit findings.
- Deployment scripts contained live-looking secrets and have been moved to local-env-driven scripts as the first remediation step.

## Files to edit

### Release blockers

- `web/app/**/page.tsx`
- `web/components/pages/**`
- `web/components/portals/role-dashboards/*.tsx`
- `web/lib/prisma.ts`
- `web/package.json`
- `web/package-lock.json`
- `web/next.config.ts`

### Auth and session

- `web/lib/auth-service.ts`
- `web/lib/auth-guard.ts`
- `web/lib/client-auth.ts`
- `web/lib/session.ts`
- `web/lib/brand.ts`
- `web/lib/auth-routing.ts`
- `web/lib/post-sign-in-routing.ts`
- `web/lib/url-origin.ts`
- `web/components/sign-out-button.tsx`
- `web/components/ui/modern-stunning-sign-in.tsx`
- `web/app/api/auth/**/*.ts`
- `web/app/auth/callback/route.ts`
- `web/app/(auth)/error.tsx`
- `web/middleware.ts`

### RBAC, modules, tenant boundaries

- `web/app/api/employees/route.ts`
- `web/app/api/hr/organization/route.ts`
- `web/app/api/documents/route.ts`
- `web/app/api/documents/upload/route.ts`
- `web/app/api/review-cycles/route.ts`
- `web/app/api/test-neon/route.ts`
- `web/lib/core-functions/assert-module.ts`
- `web/lib/core-functions/guard-handler.ts`

### Onboarding

- `web/app/onboarding/page.tsx`
- `web/app/onboarding/onboarding-org-steps.tsx`
- `web/app/api/onboarding/step/[step]/route.ts`
- `web/app/api/onboarding/complete/route.ts`
- `web/app/actions/auth.ts`
- `web/components/pages/onboarding/onboarding-view.tsx`
- `docs/onboarding-data-map.md`

### Docs, deployment, and operations

- `set_vercel_env.ps1`
- `update_render_env.ps1`
- `docs/ENVIRONMENT_MANAGEMENT.md` or current equivalent docs if restored
- `docs/security&compliance.md`
- `docs/testing.md`
- `docs/devops.md`
- `docs/observability_catalog.md`

## Areas not to edit

- `web/node_modules/`
- `web/.next/`
- `.vercel/`
- Generated Prisma client output.
- Binary tools such as `cloudflared.exe`.
- `web/prisma/migrations/**` unless a deliberate schema migration is required.
- Existing user-created docs deletions/replacements unless the user asks to reconcile git history.

## Phase 0: Contain secrets and unsafe repo state

Status: in progress.

Tasks:

- Use branch `codex/global-web-remediation`.
- Replace deployment scripts with local-env-driven versions.
- Remove committed live-looking keys, private keys, DB URLs, and cron/API tokens.
- Run a secret scan.
- Document that exposed values must be rotated outside git.

Proof:

```powershell
rg -n "BEGIN PRIVATE KEY|SUPABASE_SERVICE_ROLE_KEY|postgresql://|CRON_SECRET|DATABASE_URL=|DIRECT_URL=|rnd_|GMAIL_APP_PASSWORD" -g "!node_modules" -g "!package-lock.json" .
```

Expected outcome:

- No live secret material remains in tracked source.

## Phase 1: Restore build and typecheck baseline

Tasks:

- Resolve every route import that points at a deleted component.
- Restore missing component files or move route imports to current canonical replacements.
- Remove malformed patch scripts from route folders.
- Make Prisma safe to import in tests and static checks without immediate DB connection.
- Fix Next root/lockfile ambiguity.

Proof:

```powershell
cd web
npx tsc --noEmit --pretty false
npm run build
```

Expected outcome:

- No module-not-found errors.
- Build reaches application compilation instead of route-import failure.

## Phase 2: Auth and session hardening

Tasks:

- Choose custom JWT as canonical auth unless product explicitly re-enables Supabase auth.
- Remove contradictory Supabase/Firebase/Neon auth leftovers from active flow.
- Fix `/api/auth/signout` typo to `/api/auth/sign-out`.
- Use `COOKIE_*` constants everywhere.
- Clear all auth/session/onboarding/module cookies on sign-out and refresh failure.
- Hash refresh tokens at rest.
- Add symmetric super-admin refresh, reset, and sign-out behavior.
- Use `normalizeSafeRedirectTarget` and `buildAppUrl` for every callback redirect.
- Remove or super-admin-protect `/api/test-neon`.
- Remove unauthenticated spoofable password-change audit logging.
- Harden forgot/reset password token lifecycle and canonical origin handling.
- Decide and enforce public signup versus invite-only signup.

Proof:

```powershell
cd web
npx tsx --test tests/auth-flow.test.ts
npx tsx --test tests/auth-actions-jwt.test.ts
npx tsc --noEmit --pretty false
```

Expected outcome:

- Safe redirects, session symmetry, and auth flow tests pass.

## Phase 3: RBAC, module gates, and tenant boundaries

Tasks:

- Implement `requireEmployeeListAccess`.
- Restrict manager employee listing to direct/allowed reports unless explicitly permitted.
- Add `directory`, `documents`, and `performance` module gates to APIs.
- Require company context before any `employee.org_id!` usage.
- Normalize super-admin checks through shared helpers.

Proof:

```powershell
cd web
npx tsx --test tests/module-api-gating.test.ts tests/rbac.test.ts
```

Expected outcome:

- Disabled modules and unauthorized roles cannot operate through direct APIs.

## Phase 4: Document storage and upload hardening

Tasks:

- Require MIME and extension to both pass.
- Add content-signature checks where practical.
- Remove base64 data URL fallback.
- Remove placeholder success uploads.
- Use private storage and signed download URLs.
- Move document metadata out of `name ||| JSON` through a deliberate schema change if needed.

Proof:

```powershell
cd web
npx tsx --test tests/security.test.ts
npx tsc --noEmit --pretty false
```

Expected outcome:

- HR documents are not stored as public URLs or fake successful placeholders.

## Phase 5: Onboarding and signup contract

Tasks:

- Make one canonical onboarding view.
- Create `docs/onboarding-data-map.md`.
- Make UI and `/api/onboarding/step/[step]` agree.
- Validate required drafts before `onboarding_completed = true`.
- Remove unused join-by-code path or re-enable intentionally.
- Align `/sign-up` route and `/api/auth/signup` with the chosen product model.

Proof:

```powershell
cd web
npx tsx --test tests/onboarding-step-contract-sync.test.ts
npm test
```

Expected outcome:

- Onboarding cannot be completed with missing required setup.

## Phase 6: Non-functional quality

Tasks:

- Replace deprecated `next lint` script.
- Fix lint failures and real hook warnings.
- Remove local debug telemetry.
- Remove mojibake from user-facing text.
- Tighten CSP and make config/middleware headers consistent.
- Patch high/critical dependency vulnerabilities.

Proof:

```powershell
cd web
npm run lint
npm audit --omit=dev --audit-level=moderate
npm run build
```

Expected outcome:

- Lint and dependency audit are useful release gates.

## Phase 7: CI and regression gates

Tasks:

- Ensure CI runs install, Prisma generate, lint, typecheck, tests, build, secret scan, and audit.
- Add static tests for no raw secrets, no unsafe callbacks, no public diagnostic routes, no raw refresh token storage, module gates, and no hard-coded cookie names.

Proof:

```powershell
cd web
npm ci --no-audit --no-fund
npm run lint
npx tsc --noEmit --pretty false
npm test
npm run build
```

Expected outcome:

- The same failure classes cannot silently re-enter.

## Phase 8: UI and journey smoke

Tasks:

- Verify role dashboards and restored pages render.
- Fix hard-coded colors and native controls flagged by UI migration tests.
- Smoke key routes: sign-in, forgot/reset password, onboarding, admin/hr/manager/employee dashboards, request leave, documents, reviews.

Proof:

```powershell
cd web
npx tsx --test tests/ui21-redesign-migration-guard.test.ts
npx tsx --test tests/production-readiness-static.test.ts
npm run build
```

Expected outcome:

- Core enterprise journey pages render and route correctly.

## Final doublecheck

```powershell
git status --short --branch
rg -n "BEGIN PRIVATE KEY|SUPABASE_SERVICE_ROLE_KEY|postgresql://|CRON_SECRET|DATABASE_URL=|DIRECT_URL=|rnd_|GMAIL_APP_PASSWORD" -g "!node_modules" -g "!package-lock.json" .

cd web
npm ci --no-audit --no-fund
npx prisma generate
npm run lint
npx tsc --noEmit --pretty false
npm test
npm audit --omit=dev --audit-level=moderate
npm run build
```

Completion means all final commands pass and the app satisfies the docs contract: clean build, safe auth/session, no hard-coded secrets, module-gated APIs, team-only manager boundaries, and coherent onboarding.
