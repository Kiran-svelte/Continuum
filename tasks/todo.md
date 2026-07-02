# Codebase Audit Todo

Audit identifier: `CBA-20260629`

## Initial Notes

- App root found: `web`
- Framework found: Next.js App Router
- README target found: root `README.md`
- `docs/activity.md` did not exist before this planning pass and has been created.
- `tasks/todo.md` did not exist before this planning pass and has been created.
- `html` folder was not found in this checkout; audit will verify whether deployment is Next/Vercel-only or whether an `html` deployment directory is missing.
- `desian` folder was not found in this checkout; if it appears later, it will be treated as read-only design inspiration.

## Todo

- [x] `CBA-20260629-PREP` - Inspect the repo shape, current git state, existing docs, and app framework before planning.
- [x] `CBA-20260629-PLAN` - Write this audit plan before changing product code or README audit content.
- [ ] `CBA-20260629-ACTIVITY` - Append each project action and every user prompt to `docs/activity.md`.
- [ ] `CBA-20260629-ROUTES` - Inventory every app route from `web/app/**/page.tsx`, layouts, route groups, dynamic segments, middleware redirects, and any legacy router/App entrypoints if present.
- [ ] `CBA-20260629-APIS` - Inventory every backend API endpoint from `web/app/api/**/route.ts`, including supported HTTP methods.
- [ ] `CBA-20260629-INTERACTIVE` - Find every frontend `<button>`, `<a>`, `Link`, form submit, and local UI Button usage with `onClick`, `onSubmit`, or `href`.
- [ ] `CBA-20260629-TRACE` - Trace each interactive element to the function that runs and the API endpoint it calls, where statically discoverable.
- [ ] `CBA-20260629-DEAD` - Flag dead buttons, empty handlers, undefined handlers, console-only handlers, broken links, missing API calls, and missing endpoints.
- [ ] `CBA-20260629-SKELETONS` - For each dead button/action, draft the simplest API call skeleton that matches the visible label and surrounding module intent.
- [ ] `CBA-20260629-BIZLOGIC` - Compare button labels against current API calls and flag mismatched business logic, including critical mismatches.
- [ ] `CBA-20260629-ZOMBIES` - Check every defined page route for a real component/file, broken imports, blank screens, or placeholder-only content.
- [ ] `CBA-20260629-FIXES` - Apply minimal fixes for confirmed dead buttons, broken routes, zombie pages, and mismatched API calls without changing working flows.
- [ ] `CBA-20260629-CRAWLER` - Add an automated Playwright browser test that visits every route, clicks every button, captures 404s, crashes, and success results.
- [ ] `CBA-20260629-CRAWL-RUN` - Run the route/button crawler and capture the results.
- [ ] `CBA-20260629-README` - Add a checklist-style audit report to `README.md` with routes, APIs, interactive elements, dependency map, zombie pages, dead button skeletons, and business logic mapping.
- [ ] `CBA-20260629-REPORT` - Create `REPORT.md` with a file-by-file summary of all fixes and generated artifacts.
- [ ] `CBA-20260629-MANUAL` - Generate `APP_MANUAL.md` in simple product-manager English covering pages, buttons, and main user flows.
- [ ] `CBA-20260629-VERIFY` - Run focused verification commands for the audit artifacts and, where practical, build/typecheck or static checks that expose broken imports.
- [ ] `CBA-20260629-GIT` - Review the diff, commit successful changes, and push to the current repository remote.

## Review

Pending. This section will be completed after the audit report is generated and verified.

## Critical Workflow Audit Todo

Audit identifier: `CWA-20260630`

Goal: implement and verify `CRITICAL_WORKFLOW_ISSUES_AUDIT.md`, especially Appendix A complete service inventory, without treating documentation-only edits as completion.

- [x] `CWA-20260630-REQS` - Extract every concrete blocker, service, test gate, and artifact from `CRITICAL_WORKFLOW_ISSUES_AUDIT.md`.
- [x] `CWA-20260630-STATE` - Compare the audit claims against current code for routes, APIs, schema, services, and existing tests before editing.
- [x] `CWA-20260630-CSP` - Fix CSP script policy safely and prove it with a browser or automated header/console check.
- [x] `CWA-20260630-ENV` - Complete environment validation and example documentation for critical runtime variables.
- [x] `CWA-20260630-CONSTRAINT` - Implement strict constraint-engine failover with local validation and tests.
- [x] `CWA-20260630-CONCURRENCY` - Fix leave-balance concurrency/double-spend risks with transaction-safe updates and race tests.
- [x] `CWA-20260630-BACKUP` - Add backup/DR service hooks, validation, and restore-proof documentation.
- [x] `CWA-20260630-RBAC` - Audit and close API permission gaps with regression tests.
- [x] `CWA-20260630-SERVICES` - Move Appendix A services toward functional implementation with verifiable vertical slices.
- [x] `CWA-20260630-PROOF` - Run the strongest available tests/build/proof scripts and record exact results.
- [x] `CWA-20260630-REPORT` - Update the audit/reporting docs with honest service-by-service proof status.
- [ ] `CWA-20260630-GIT` - Commit and push only after successful, evidence-backed changes.

### Critical Workflow Review

Batch 1 proof:

- `npx tsc --noEmit --pretty false --incremental false` passed on 2026-06-30.
- `npx tsx --test tests/critical-workflow-stabilization.test.ts` passed 6/6 on 2026-06-30.
- Appendix A is not yet 100%; remaining service inventory work continues under `CWA-20260630-RBAC`, `CWA-20260630-SERVICES`, and `CWA-20260630-PROOF`.

Batch 2 proof:

- `npx tsc --noEmit --pretty false --incremental false` passed on 2026-06-30.
- `npx tsx --test tests/critical-workflow-stabilization.test.ts tests/critical-workflow-rbac.test.ts tests/critical-workflow-services.test.ts tests/security-channel.test.ts tests/continuum-assistant-v1-headless.test.ts` passed 33/33 on 2026-06-30.
- `npm run build` passed on 2026-06-30 after Prisma import hardening.
- Added `CRITICAL_WORKFLOW_REMEDIATION_REPORT.md` with file-by-file remediation notes and honest Appendix A status.
- Important: the report does not claim Workday/SAP-class "100% enterprise complete"; it claims verified critical remediation and build-covered service surfaces.

Batch 3 proof:

- `CWA-20260630-PAYROLL-FORM16` added `web/app/api/payroll/form-16/route.ts` for payroll/tax Form 16 PDF generation.
- `npx tsc --noEmit --pretty false --incremental false` passed on 2026-06-30.
- `npx tsx --test tests/critical-workflow-stabilization.test.ts tests/critical-workflow-rbac.test.ts tests/critical-workflow-services.test.ts tests/security-channel.test.ts tests/continuum-assistant-v1-headless.test.ts` passed 34/34 on 2026-06-30.
- `npm run build` passed on 2026-06-30 with `/api/payroll/form-16` included in the generated route list.
- `npx eslint app/api/payroll/form-16/route.ts tests/critical-workflow-services.test.ts` passed on 2026-06-30.
- `npm run lint` failed repo-wide on existing lint debt outside this slice.
- SVC-004/SVC-031 are improved but not marked complete because real bank acknowledgement, official TRACES/digital-signature filing, and CTC restructuring remain open.

## RALPH Service Loop Todo

Loop identifier: `RALPH-20260630`

Goal: follow `LOOP.md` against `COMPLETE_SOLUTION_MAPPING.md`, `prompt.md`, `agents.md`, and `SOLUTION_INDEX.md` while recording honest proof for each service slice.

- [x] `RALPH-20260630-DOCS` - Read the named LOOP/source documents and confirm the 64-service target plus priority order.
- [x] `RALPH-20260630-STATE` - Confirm `LOOP_STATE.json` did not exist before this pass and create conservative service progress state.
- [x] `RALPH-20260630-SVC004-FORM16` - Implement the payroll Form 16 endpoint with tenant, module, permission, export-audit, and no-cache PDF controls.
- [x] `RALPH-20260630-SVC004-TEST` - Add and pass focused Form 16 regression coverage.
- [x] `RALPH-20260630-SVC004-BUILD` - Run the production build after the Form 16 slice.
- [x] `RALPH-20260630-SVC004-LINT` - Prove the new Form 16 files are lint-clean in isolation.
- [ ] `RALPH-20260630-FULL-LINT` - Close repo-wide legacy lint debt so `npm run lint` passes.
- [x] `RALPH-20260630-SVC004-GIT` - Commit and push only the Form 16/proof/documentation batch.
- [x] `RALPH-20260630-NEXT` - Continue to the next priority service gap after the scoped proof is pushed.
- [x] `RALPH-20260630-SVC003-SCAN` - Read SVC-003 requirements and current attendance, shifts, schema, and report routes.
- [x] `RALPH-20260630-SVC003-ROUTES` - Add documented attendance namespace routes for shifts, shift assignment, and monthly reports.
- [x] `RALPH-20260630-SVC003-RBAC` - Harden shift roster CRUD and assignment behind attendance module and permission guards.
- [x] `RALPH-20260630-SVC003-PROOF` - Run typecheck, focused tests, scoped ESLint, and production build for the attendance slice.
- [x] `RALPH-20260630-SVC003-GIT` - Commit and push only the attendance shift-roster/proof/documentation batch.
- [ ] `RALPH-20260630-SVC003-NEXT` - Continue to the next SVC-003 gap or next priority service after the scoped proof is pushed.

### RALPH Review

In progress. This loop is recording verified increments only; it is not marking all 64 services complete until each service reaches the stated proof gate. SVC-003 is closer, but biometric/raw-punch ingestion and overtime workflows remain open.

## Critical Workflow Functional Requirements Matrix Todo

Audit identifier: `CWFREQ-20260630`

Goal: create a separate Markdown requirements matrix for `CRITICAL_WORKFLOW_ISSUES_AUDIT.md` that explains, for every audit item, what pages, UX, routes, backend APIs, database/schema work, integrations, configuration, permissions, tests, proof, and rollout steps are required for the experience to feel fully functional.

Planned output file: `CRITICAL_WORKFLOW_FUNCTIONAL_REQUIREMENTS_MATRIX.md`

Important constraints:

- Do not change any files under `desian/` if that folder appears.
- Do not implement product code during this documentation pass.
- Keep every row tied to a stable `CWFREQ-20260630-*` identifier so future implementation can propagate the same identifier through impacted modules/pages.
- Every issue, section, service, module, and planned resolution must have a unique identifier; each affected page, UX surface, route, API, DB/schema object, background job, integration, config key, permission, audit log, and test/proof gate must repeat the same identifier so the implementation trail is traceable.
- Preserve the existing dirty worktree and avoid rewriting unrelated existing changes.
- Treat documentation as a requirements map only; do not mark any workflow as complete without live code/test/proof evidence.

## Todo

- [x] `CWFREQ-20260630-PREP` - Read `CRITICAL_WORKFLOW_ISSUES_AUDIT.md`, existing `tasks/todo.md`, existing `docs/activity.md`, and current git state before planning.
- [x] `CWFREQ-20260630-ACTIVITY` - Append this prompt and the planning action to `docs/activity.md`.
- [x] `CWFREQ-20260630-PLAN` - Add this verification-first plan before creating the new requirements matrix.
- [ ] `CWFREQ-20260630-EXTRACT` - Extract every source item from the audit: 20 numbered issues, priority fixes, testing requirements, compliance risks, 64-service enterprise breakdown, and Appendix A service inventory.
- [ ] `CWFREQ-20260630-DEDUPE` - Preserve and reconcile duplicate/misnumbered audit sections, including the repeated onboarding section and the expense/travel content nested under localization.
- [ ] `CWFREQ-20260630-SCAN` - Scan the current repo only as needed to ground the matrix in actual modules, routes, APIs, Prisma schema, services, tests, and config files.
- [ ] `CWFREQ-20260630-MATRIX` - Create `CRITICAL_WORKFLOW_FUNCTIONAL_REQUIREMENTS_MATRIX.md` with one section per audit issue and service.
- [ ] `CWFREQ-20260630-FIELDS` - For each item, document required pages/UX, navigation/routes, API/backend, DB/schema/data, background jobs, integrations/env vars, RBAC/audit/security, tests/proof, acceptance criteria, and implementation dependencies.
- [ ] `CWFREQ-20260630-IDPROP` - Add an identifier propagation table for every issue/service showing the exact affected modules/pages/routes/APIs/schema/tests that must carry the same unique identifier during implementation.
- [ ] `CWFREQ-20260630-APPENDIXA` - Add a complete Appendix A service crosswalk covering all 22 services and linking them to issue requirements.
- [ ] `CWFREQ-20260630-PROOFGATES` - Add proof gates for browser UX, route/API checks, DB migration checks, unit/integration/e2e tests, production smoke tests, and rollback/monitoring where relevant.
- [ ] `CWFREQ-20260630-VERIFY` - Verify the new matrix does not miss audit headings or Appendix A services by comparing source IDs/headings against the generated document.
- [ ] `CWFREQ-20260630-REVIEW` - Add a review summary here after the requirements matrix is created.
- [ ] `CWFREQ-20260630-GIT` - Review diff, commit, and push after the approved documentation work is complete and verified.

### Critical Workflow Functional Requirements Review

Pending user verification of this plan. No product code or final requirements matrix has been created yet.

## Production Console Error Remediation Todo

Audit identifier: `PRODERR-20260702`

Goal: fix the concrete production errors reported from `https://continuum.support`, prove them locally and on live deployment, then commit, push, and deploy.

### Impact Mapping

- `PRODERR-20260702-CSP` - CSP blocks Cloudflare Web Analytics beacon.
  - UI pages: every HTML page served by middleware and `next.config.ts` headers.
  - APIs/navigation/dashboard widgets: no route behavior change; only browser security headers.
  - Notification/logging/monitoring: Cloudflare analytics script and beacon delivery.
  - Permissions/loading states: none.
- `PRODERR-20260702-ICONS` - `/favicon.ico`, `/icon.svg`, `/icon.png`, and `/apple-icon.png` missing or mismatched.
  - UI pages: root layout metadata, browser tabs, install manifest, PWA icon downloads.
  - APIs/database/permissions: none.
  - Monitoring: browser console noise and manifest installability.
- `PRODERR-20260702-AUTHME` - public pages trigger `/api/auth/me` and produce expected but noisy 401s.
  - UI pages: public/auth pages under the root layout.
  - Navigation/dashboard widgets: auth context initialization only.
  - APIs: `/api/auth/me` remains protected; client provider should skip it on public pages.
  - Permissions/loading states: unauthenticated public pages should settle with no user and no blocking spinner.
- `PRODERR-20260702-FORGOT` - `/api/auth/forgot-password` can surface a 500 instead of a neutral password-reset response.
  - UI pages: `/forgot-password`, employee/hr settings reset actions.
  - APIs/database: `PasswordResetToken`, `Employee`, `SuperAdmin`, email transport.
  - Notifications/logs: password reset email, server error logs, anti-enumeration behavior.
  - Permissions: public endpoint by design.
- `PRODERR-20260702-SA-USERS` - `/api/super-admin/users` 500 must become deterministic and email failures must be non-fatal.
  - UI pages/admin panels: `/super-admin/users`, `/super-admin/users/new`.
  - APIs/database: `UserInvite`, `Employee`, `SuperAdmin`, optional `module_cap`.
  - Notifications/logs: invite email delivery and warning responses.
  - Permissions: super-admin-only access preserved.
- `PRODERR-20260702-SA-COMPANIES` - `/api/super-admin/companies` 500/409 needs clearer validation and stable responses.
  - UI pages/admin panels: `/super-admin/companies`, `/super-admin/companies/new`, company detail links.
  - APIs/database: `Company`, `Employee`, `CompanySettings`, onboarding fields, module caps.
  - Logs/error handling/loading states: creation/list errors should be actionable and non-crashy.
  - Permissions: super-admin-only access preserved.
- `PRODERR-20260702-RESEND` - `/api/super-admin/companies/[id]/resend-credentials` must not 500 after credentials are regenerated because secondary email/audit work failed.
  - UI pages/admin panels: `/super-admin/companies/[id]`.
  - APIs/database: owner `Employee` password fields and `AuditLog`.
  - Notifications/logs: credentials email delivery, audit trail best effort with explicit result.
  - Permissions: super-admin-only access preserved.
- `PRODERR-20260702-PROOF` - test, commit, push, deploy, and live smoke.
  - Deployment: Vercel project `web`, Render constraint-engine service.
  - Monitoring: `continuum.support` health, static assets, CSP header, and targeted API statuses.

### Gap Analysis

- `PRODERR-20260702-CSP`: CSP exists in both middleware and `next.config.ts`; modify both to allow Cloudflare beacon script/connect endpoints without adding broad wildcards.
- `PRODERR-20260702-ICONS`: metadata and manifest already reference icons; create matching public assets and align the apple icon URL.
- `PRODERR-20260702-AUTHME`: protected `/api/auth/me` exists and should stay protected; modify the client auth provider to skip public pages instead of weakening the API.
- `PRODERR-20260702-FORGOT`: route, DB model, and email helper exist; modify route to return neutral success on email delivery failures, add validation-specific 400s, and keep non-production diagnostics.
- `PRODERR-20260702-SA-USERS`: route and UI exist; modify response contract so email delivery is reported but not fatal, and add actionable logging/details without exposing secrets.
- `PRODERR-20260702-SA-COMPANIES`: route and UI exist; validate pagination inputs, improve duplicate and dependency errors, and avoid generic 500 for known request/data issues.
- `PRODERR-20260702-RESEND`: route exists; modify audit/email secondary effects to avoid converting an already-successful password reset into HTTP 500.
- `PRODERR-20260702-PROOF`: local typecheck exists; add focused regression tests/static checks, then deploy and verify live URLs.

### Complete Spec

- Security headers must remain strict: no wildcard script source, no `unsafe-eval` in production, and only the exact Cloudflare Insights origins required for the beacon.
- Public image assets must be real files under `web/public` so direct browser requests and manifest icon downloads do not 404.
- Public auth pages must not call protected auth APIs just to initialize global context; protected app pages still receive auth context normally.
- Forgot-password must always use anti-enumeration messaging in production. Unknown accounts, known accounts with successful email, and known accounts with failed email all return a neutral successful response; server logs record delivery failures.
- Non-production forgot-password can return `delivered`, `reset_link`, and `email_error` diagnostics for testing.
- Super-admin create/list APIs must preserve super-admin permission checks and multi-tenant data boundaries. Known validation/duplicate/dependency failures return 400/409 with user-safe messages; unexpected infrastructure errors log details and return a stable error body.
- Credential resend must regenerate the password atomically, attempt audit logging and email delivery, return explicit `audit.logged` and `email.sent` fields, and never expose temporary credentials in production when email succeeds.
- Proof must include TypeScript checks, focused node tests, production build, live asset/CSP checks after deployment, and deployment IDs/statuses for Vercel and Render.

### Todo

- [x] `PRODERR-20260702-PREP` - Inspect current git state, production build logs, failing files, and existing tests.
- [x] `PRODERR-20260702-ACTIVITY` - Append the user prompt and investigation actions to `docs/activity.md`.
- [x] `PRODERR-20260702-PLAN` - Add impact mapping, gap analysis, complete spec, and implementation checklist here before code edits.
- [x] `PRODERR-20260702-CSP` - Patch middleware and Next headers for Cloudflare Insights.
- [x] `PRODERR-20260702-ICONS` - Add real public icon assets and align metadata/manifest paths.
- [x] `PRODERR-20260702-AUTHME` - Prevent root auth provider from calling `/api/auth/me` on public pages.
- [x] `PRODERR-20260702-FORGOT` - Harden forgot-password route response/error handling.
- [x] `PRODERR-20260702-SA-USERS` - Harden super-admin user API email/error behavior.
- [x] `PRODERR-20260702-SA-COMPANIES` - Harden company API validation and known-error responses.
- [x] `PRODERR-20260702-RESEND` - Make resend credentials secondary audit/email failures non-fatal with explicit response fields.
- [x] `PRODERR-20260702-TESTS` - Add/update focused regression tests.
- [x] `PRODERR-20260702-REPORT` - Create `REPORT.md` with file-by-file changes and proof.
- [x] `PRODERR-20260702-VERIFY` - Run typecheck/tests/build and local/live smoke checks.
- [ ] `PRODERR-20260702-GIT` - Stage only scoped files, commit, push to `main`.
- [ ] `PRODERR-20260702-DEPLOY` - Deploy committed `main` to Vercel and Render, then record live proof.

### Production Console Error Review

Local and database proof completed on 2026-07-02:

- `npx tsc --noEmit --pretty false --incremental false` passed.
- `npx tsx --test tests/proderr-20260702.test.ts tests/auth-flow.test.ts tests/critical-workflow-stabilization.test.ts` passed 43/43.
- `npm run build` passed after rerunning with a longer timeout; the first attempt timed out before returning output.
- `npx prisma migrate status --schema prisma/schema.prisma` initially showed nine pending production migrations.
- `npx prisma migrate resolve --applied 0_init --schema prisma/schema.prisma` resolved a zero-step failed baseline that had failed because the schema already existed.
- `npx prisma migrate resolve --rolled-back 20260613_zero_ui_channel_identity --schema prisma/schema.prisma` and a narrow migration type fix resolved UUID/TEXT drift for channel tables.
- `npx prisma migrate resolve --rolled-back 20260613165000_company_roles --schema prisma/schema.prisma` and a narrow compatibility block resolved older `CompanyRolePermission` table shape drift.
- `npx prisma migrate deploy --schema prisma/schema.prisma` completed successfully.
- `npx prisma migrate status --schema prisma/schema.prisma` now reports: `Database schema is up to date!`
- Deployment proof is still pending until commit/push and Vercel/Render deploy verification finish.

## Password Reset Mail Delivery Remediation Todo

Audit identifier: `MAILFIX-20260702`

### Impact Mapping

- UI pages: `/forgot-password` success state can appear even when the server suppressed an infrastructure failure for anti-enumeration safety.
- APIs: `/api/auth/forgot-password` must create a durable one-time reset token and send the reset email without leaking whether the account exists.
- Database tables: `PasswordResetToken`, `Employee`, and `SuperAdmin`; token writes must exist before mail delivery is attempted.
- Notification systems: Resend primary transport plus SendGrid/SMTP fallbacks; provider acceptance must be visible in server logs.
- Logs/error handling/loading states: production must return neutral user-safe responses, while server logs distinguish token/database failure from provider delivery failure.
- User permissions: forgot-password remains a public endpoint by design; reset consumption remains token-protected.

### Gap Analysis

- `PasswordResetToken` existed in Prisma schema but did not exist in the production database; create a durable migration and apply it.
- Email transport existed, but environment values with escaped newline characters could break provider keys, sender names, or SMTP fallback credentials; sanitize env reads centrally.
- The forgot-password success page existed, but it only confirmed request acceptance, not actual mail delivery; verify the server-side provider log and token row.
- Existing tests covered neutral responses but not the production token table or transport env sanitation; add focused regression tests.

### Complete Spec

- Forgot-password must store a hashed, one-time, expiring reset token for known Employee and SuperAdmin accounts.
- The token table must be part of committed Prisma migrations so new environments cannot silently miss it.
- Mail provider credentials, from addresses, from names, and SMTP fallback credentials must be normalized before use.
- The production response must stay neutral to avoid account enumeration, but server logs must prove whether a reset mail was accepted by the provider.
- Proof must include migration deploy, recent token-row verification, provider acceptance log, typecheck, focused tests, production build, commit, push, and live deploy verification.

### Todo

- [x] `MAILFIX-20260702-LOGS` - Inspect live forgot-password logs and confirm the neutral success screen was hiding a server-side Prisma failure.
- [x] `MAILFIX-20260702-SCHEMA` - Compare Prisma models to production tables and identify the missing `PasswordResetToken` table.
- [x] `MAILFIX-20260702-MIGRATION` - Add and apply an idempotent production-safe migration for `PasswordResetToken`.
- [x] `MAILFIX-20260702-TRANSPORT` - Harden email transport env handling for Resend, SendGrid, and SMTP fallback paths.
- [x] `MAILFIX-20260702-TESTS` - Add focused regression tests for migration coverage, env sanitation, and token-before-mail behavior.
- [x] `MAILFIX-20260702-PRODDB` - Verify production DB now has `PasswordResetToken` and a live forgot-password call creates a fresh unused token.
- [x] `MAILFIX-20260702-PROVIDER` - Verify production logs show Resend accepted the reset email for the test account.
- [x] `MAILFIX-20260702-BUILD` - Re-run production build after the transport hardening patch.
- [ ] `MAILFIX-20260702-GIT` - Commit and push only the scoped mail-delivery batch.
- [ ] `MAILFIX-20260702-DEPLOY` - Redeploy from GitHub `main` and verify live forgot-password again.
