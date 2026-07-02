# PRODERR-20260702 Remediation Report

Date: 2026-07-02
Scope: production console/API failures reported from `https://continuum.support`.

## Summary

Fixed the reported CSP, missing icon, public auth probing, forgot-password, super-admin company/user, resend-credentials, auth refresh, auth callback, password audit, public diagnostics, and production schema drift issues.

## File-by-File Changes

- `web/middleware.ts`, `web/next.config.ts`, `web/lib/production-security/security-headers.ts`
  - Added exact Cloudflare Insights script/connect origins to CSP.
  - Kept the policy strict; no wildcard script source was added.

- `web/public/icon.svg`, `web/public/icon.png`, `web/public/apple-icon.png`, `web/public/apple-touch-icon.png`, `web/public/favicon.ico`, `web/public/favicon-32.png`, `web/public/og-image.png`
  - Added real public assets so browser icon and manifest requests stop returning 404.

- `web/public/manifest.json`, `web/app/layout.tsx`
  - Aligned manifest and metadata icon paths to the real files.

- `web/components/auth/auth-provider.tsx`
  - Skips auth bootstrap on public/auth pages like `/sign-in` and `/forgot-password`.
  - Keeps auth bootstrap active for protected portal routes.

- `web/lib/client-auth.ts`
  - Retries `/api/auth/me` with `/api/auth/refresh` on 401.
  - Clears auth cookies through `/api/auth/sign-out` and `DELETE /api/auth/session` when refresh cannot recover the session.

- `web/app/api/auth/refresh/route.ts`
  - Clears cookies and returns `requiresReauth: true` on missing/failed refresh token.

- `web/app/api/auth/callback/route.ts`
  - Replaced forwarded-host redirect construction with `normalizeSafeRedirectTarget` and `buildAppUrl`.

- `web/app/api/auth/forgot-password/route.ts`, `web/app/(auth)/forgot-password/page.tsx`
  - Forgot-password now returns neutral production responses even when email delivery fails.
  - Non-production still exposes diagnostic `reset_link`, delivery, and email error fields.

- `web/app/api/auth/reset-password/route.ts`
  - Supports token-only reset clients by resolving the email from the reset token record.
  - Keeps DB one-time tokens as the primary path and supports the signed reset-token helper as compatibility fallback.

- `web/app/api/auth/password-change/route.ts`
  - Uses the authenticated session actor instead of trusting a request-body email.
  - Revokes all employee refresh tokens after password-change audit logging.

- `web/app/api/auth/me/route.ts`
  - Adds a normalized `roles` list and `email_verification` state used by sign-in routing.

- `web/app/api/auth/signin/route.ts`, `web/components/ui/modern-stunning-sign-in.tsx`
  - Main sign-in API can safely fall back to super-admin verification after employee auth fails.
  - Sign-in component keeps the shared post-login route resolver and explicit onboarding path handling.

- `web/app/api/test-neon/route.ts`
  - Restricted Neon diagnostics to authenticated super-admin users.

- `web/lib/super-admin-audit.ts`
  - Added platform-safe best-effort audit helper for super-admin actions.
  - Prevents writing `SuperAdmin.id` into `AuditLog.actor_id`, which references `Employee.id`.

- `web/app/api/super-admin/companies/route.ts`
  - Hardened pagination/status validation, duplicate handling, owner input normalization, join-code generation, and audit response.

- `web/app/api/super-admin/users/route.ts`
  - Hardened invite creation and list responses.
  - Email delivery is now reported as `email.sent` instead of converting the whole request into a 500.

- `web/app/api/super-admin/companies/[id]/route.ts`
  - Removed writes to unsupported `Company.domain`.
  - Added safer audit handling and explicit response fields.

- `web/app/api/super-admin/companies/[id]/modules/route.ts`
- `web/app/api/super-admin/companies/[id]/subscription/route.ts`
- `web/app/api/super-admin/companies/[id]/resend-credentials/route.ts`
  - Replaced direct audit writes with platform-safe audit helper.
  - Resend credentials now separates password reset success from audit/email secondary failures.

- `web/components/pages/super-admin/companies-id-view.tsx`
  - Shows clear resend-credentials feedback when email delivery fails after password regeneration.

- `web/prisma/migrations/20260613_zero_ui_channel_identity/migration.sql`
  - Fixed production migration drift by using `TEXT DEFAULT gen_random_uuid()::text` for app IDs instead of `UUID` columns.

- `web/prisma/migrations/20260613165000_company_roles/migration.sql`
  - Added an idempotent compatibility block for older `CompanyRole` and `CompanyRolePermission` table shapes.

- `web/prisma/migrations/20260701120000_invite_module_cap/migration.sql`
  - Added/committed the missing `UserInvite.module_cap` migration required by deployed code.

- `web/tests/proderr-20260702.test.ts`
  - Added regression coverage for CSP, icon files, auth-provider public-page behavior, forgot-password neutrality, reset-password token-only support, super-admin audit safety, and migration coverage.

- `tasks/todo.md`, `docs/activity.md`
  - Recorded impact mapping, gap analysis, complete spec, prompt/action trail, and proof.

## Proof

- TypeScript: `npx tsc --noEmit --pretty false --incremental false` passed.
- Regression tests: `npx tsx --test tests/proderr-20260702.test.ts tests/auth-flow.test.ts tests/critical-workflow-stabilization.test.ts` passed 43/43.
- Production build: `npm run build` passed after Prisma generation and Next.js build generated 194 static pages.
- Production DB migrations:
  - `npx prisma migrate status --schema prisma/schema.prisma` initially found nine pending migrations.
  - Resolved failed zero-step baseline `0_init` as applied.
  - Corrected and resolved failed channel identity/company roles migrations.
  - `npx prisma migrate deploy --schema prisma/schema.prisma` completed successfully.
  - Final `npx prisma migrate status --schema prisma/schema.prisma` reported `Database schema is up to date!`

## Deployment Status

Pending at report creation. Commit, push, Vercel deploy, Render deploy, and live smoke verification are the remaining steps.

## MAILFIX-20260702 Addendum

Root cause: `/forgot-password` could show the correct anti-enumeration success screen while production failed before actual mail delivery because the production database was missing the `PasswordResetToken` table.

Files changed:

- `web/prisma/migrations/20260702162000_password_reset_token/migration.sql`
  - Adds the durable reset-token table, unique token-hash index, and lookup/expiry indexes.
- `web/lib/email-service.ts`
  - Normalizes mail-related environment values before use.
  - Keeps Resend as primary and hardens SendGrid/SMTP fallback paths against escaped newline characters in env values.
- `web/tests/mailfix-20260702.test.ts`
  - Verifies the migration creates `PasswordResetToken`.
  - Verifies mail env values are sanitized.
  - Verifies forgot-password stores the reset token before calling mail delivery.
- `tasks/todo.md`, `docs/activity.md`, `REPORT.md`
  - Records impact mapping, gap analysis, complete spec, and proof for the mail-delivery incident.

Proof completed before commit/deploy:

- Production migration applied successfully with `npx prisma migrate deploy --schema prisma\schema.prisma`.
- Production database now contains `PasswordResetToken`.
- Live `/api/auth/forgot-password` for the known super-admin account returned neutral success, created an unused token row, and Vercel logs showed Resend accepted the security email.
- `npx tsx --test tests\mailfix-20260702.test.ts tests\proderr-20260702.test.ts tests\auth-flow.test.ts` passed 40/40.
- `npx tsc --noEmit --pretty false --incremental false` passed.
- `npm run build` passed after the mail transport hardening patch.

Deployment proof:

- Commit `716e2a1` (`Fix password reset email delivery`) pushed to GitHub `main`.
- Vercel deployment `dpl_24GeZmQge2m3NwtLco88aRkJUngm` is Ready and aliased to `https://continuum.support`.
- Render deployment `dep-d938oamq1p3s73ecnqhg` is live on commit `716e2a1`.
- `curl.exe -i https://continuum.support/api/health` returned HTTP 200. Database, constraint engine, vault, redis, email, memory, and disk checks were healthy; Neon Auth remains degraded because it is not configured.
- Live `/api/auth/forgot-password` for the known super-admin account returned neutral success and created a fresh unused `PasswordResetToken` at `2026-07-02T16:07:54.616Z`.
- Vercel logs for the same request show `Sent via Resend` for the security email and no 500 logs in the request window.
- Resend reports `continuum.support` as a verified domain with sending enabled. DKIM is present. DMARC exists with `p=none`.

## SIGNINFIX-20260702 Addendum

Root cause: the deployed `/api/auth/signin` path was still using strict auth-secret consistency logic. Production has `JWT_SECRET`, `SESSION_SECRET`, and `CSRF_SECRET` all configured, but they are different values. The route crashed with `AuthSecretError` before completing authentication.

Files changed:

- `web/lib/auth-secret.ts`
  - Uses stable JWT signing secret precedence: `JWT_SECRET`, then `SESSION_SECRET`, then `CSRF_SECRET`.
  - Throws only when no usable signing secret exists.
  - Allows session and CSRF secrets to remain separate from JWT signing.
- `web/tests/auth-flow.test.ts`
  - Adds regression coverage that mismatched JWT/session/CSRF secrets do not crash JWT signing.
- `tasks/todo.md`, `docs/activity.md`, `REPORT.md`
  - Records impact mapping, gap analysis, complete spec, and proof for the sign-in production incident.

Proof before commit/deploy:

- Vercel logs showed `/api/auth/signin` 500 caused by `AuthSecretError`.
- `npx tsx --test tests\auth-flow.test.ts tests\proderr-20260702.test.ts tests\mailfix-20260702.test.ts` passed 41/41.
- `npx tsc --noEmit --pretty false --incremental false` passed.
- `npm run build` passed.
