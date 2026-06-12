# Release Hardening Checklist

Use this checklist for production promotions involving auth, onboarding, invite, and settings APIs.

## 1) Pre-Deploy Checks

- [ ] Branch is green for targeted tests and lint in `web/`.
- [ ] No pending schema drift in Prisma (`pnpm db:migrate:status` or equivalent).
- [ ] Env vars for auth/email are present and validated in target environment.
- [ ] API contracts reviewed for `/api/auth/email-verification/*`, `/api/company/invite-user*`, `/api/onboarding/checklist`, `/api/settings/{integrations,alerts}`, `/api/health/ready`.
- [ ] Feature flags/defaults verified for tenant-safe behavior when optional fields are absent.

## 2) DB and Backfill Safety Checks

- [ ] Confirm no destructive migration is required for `portal_policy` JSON additions.
- [ ] Run additive backfill path by exercising read endpoints first (`GET` checklist/integrations/alerts) to validate legacy rows do not crash.
- [ ] Verify writes remain idempotent (re-applying same payload does not corrupt nested JSON).
- [ ] Spot-check legacy companies with partially populated `portal_policy` and employee `notification_preferences`.
- [ ] Confirm invite and verification token tables handle expired/used token paths without server errors.

## 3) Smoke Tests by Role

- [ ] **Admin**: can send verification link, manage invites (create/resend/revoke/edit), update onboarding checklist, integrations, alerts.
- [ ] **HR**: same allowed surfaces as admin for invite and settings routes.
- [ ] **Manager**: read-only access where expected (checklist/integrations/alerts reads), blocked from write-only admin/hr endpoints.
- [ ] **Employee**: denied access for company settings and invite admin routes.
- [ ] **Super admin**: cross-company guard behavior verified where explicitly allowed.

## 4) Observability and Alerts

- [ ] `/api/health/ready` returns `ready` in steady state and `not_ready` on forced DB failure.
- [ ] Alerting pipeline receives 4xx/5xx anomalies for invite and verification routes.
- [ ] Logs include actionable messages for invite email failures/timeouts.
- [ ] Dashboard tracks token failure classes (invalid/expired/used) and invite status transitions.

## 5) Rollback Criteria and Procedure

- [ ] Roll back if any auth flow regression blocks sign-in/invite acceptance for >5 minutes.
- [ ] Roll back if readiness check remains `not_ready` for 3 consecutive probes post-deploy.
- [ ] Roll back if API 5xx rate for hardened endpoints exceeds baseline by >2x for 10 minutes.
- [ ] Roll back if role boundary failures are observed (manager/employee can mutate admin/hr settings).
- [ ] On rollback, preserve data writes; only revert app deploy and re-run smoke tests.
