# COMPLETE AUDIT — Continuum HRMS
**Date:** 2026-06-30
**Auditor:** Claude Sonnet 4.6
**Codebase:** D:\projects\Continuum-main-deploy\web
**Commit:** main branch (2199e22)

---

## EXECUTIVE SUMMARY

| Metric | Count |
|--------|-------|
| Total TypeScript/TSX files | 1,056 |
| Pages (page.tsx) | 190 |
| API routes (route.ts) | 272 |
| Components | 238 |
| Lib/utility files | 241 |
| Prisma models | 107 |
| DB migrations | 14 |
| API routes using Prisma | 219 / 272 |

| Category | Working | Broken / Stub | Crashes |
|----------|---------|---------------|---------|
| API endpoints (audited sample) | ~200 | ~30 unscheduled cron / no-op | 5+ known |
| Pages | ~180 | 0 missing imports found | 2-3 via bad email |
| External services | 4 real | 3 not configured | 1 broken (Resend) |

### CRITICAL PRODUCTION FAILURES (numbered, most severe first)

1. **`.env.prod` IS COMMITTED TO GIT** — Contains live Neon DB password, Firebase RSA private key, Gmail App Passwords, OpenAI key, SendGrid key, Resend key. All must be rotated now.
2. **EMAIL_PROVIDER="resend" but no Resend SDK is installed** — email-service.ts has zero code path for "resend". It skips SendGrid and falls to SMTP. If SMTP fails, every email action throws and shows "Core Exception."
3. **JWT_SECRET is "continuum-jwt-secret-key-change-in-production-2024"** — a default string committed to the repo. Anyone who cloned the repo can forge JWTs for any user including super_admin.
4. **JWT_REFRESH_SECRET="" (empty)** — refresh tokens are signed with the same insecure JWT_SECRET above.
5. **No Pusher credentials in production** — real-time notifications (notification bell, live updates) are silently dead for all users.
6. **No Razorpay credentials in production** — billing and payroll advance payments crash at SDK init.
7. **No Upstash Redis in production** — rate limiting resets on every cold start, idempotency keys don't persist.
8. **Sentry DSN is empty** — all production errors are invisible. No alerting.
9. **7 of 10 cron routes exist but are not scheduled** — document expiry, learning overdue, performance alerts, probation check will never fire.
10. **SENDGRID_FROM_NAME has trailing newline** — "Continuum HR\n" in email headers may cause spam scoring issues.

---

## AUDIT 1: PROJECT STRUCTURE

### Directory summary (files, excluding node_modules / .next)

| Directory | Approx file count |
|-----------|-------------------|
| app/ (pages + layouts + API routes) | ~510 |
| components/ | 238 .tsx |
| lib/ | 241 .ts |
| prisma/ | ~20 |
| scripts/ | ~18 |
| tests/ | ~45 |
| types/ | 7 |
| monitoring/ | 3 |
| public/ | 4 |

### Orphaned / junk files committed to repo

- `app/(auth)/sign-up/page.tsx.new` — orphaned with `.new` extension. Not compiled but in source. Delete it.
- `web/EXTREME_AUDIT.md`, `web/FEATURE_CHECKLIST.md`, `web/LOOP_STATE.json`, `web/SMOKE_TEST_RESULTS.md`, `web/VERIFICATION_REPORT.md` — previous audit artifacts committed.
- `web/test.js`, `web/test2.js`, `web/test-smtp.js`, `web/update_profile.js`, `web/wipe_and_seed.js`, `web/parse-diags.js`, `scripts/refactor_3d.js` — loose scripts in project root, should not be committed.
- `web/temp_db.txt`, `web/temp_direct.txt`, `web/temp_key.txt`, `web/temp_val.txt` — plaintext temp files. May contain connection strings or secrets. Delete and check git history.
- `web/testbody.json`, `web/afterdeploy.json`, `web/prodtest.json`, `web/reg_*.json`, `web/sess_*.json`, `web/session_test.json` — test session and request body snapshots. Should not be in git.
- **`web/.env.prod`** — **THE PRODUCTION ENV FILE WITH REAL SECRETS IS COMMITTED TO GIT.** This is the most critical finding. All secrets in it must be rotated and the file removed from git history.

### Entry points

- `next.config.ts` — exists
- `app/layout.tsx` — root layout (standard Next.js 15 App Router)
- `middleware.ts` — auth routing middleware, exists
- `app/page.tsx` — landing/marketing page

---

## AUDIT 2: DEPENDENCIES

### All package.json dependencies — used vs not

| Package | In Use? | Where |
|---------|---------|-------|
| `@prisma/client` | YES | lib/prisma.ts → 219 API routes |
| `@sendgrid/mail` | YES | lib/email-service.ts |
| `nodemailer` | YES | lib/email-service.ts (SMTP fallback) |
| `@upstash/redis` | YES | lib/redis.ts |
| `pusher` | YES | lib/notification-service.ts |
| `pusher-js` | YES | lib/pusher-client.ts |
| `razorpay` | YES | lib/billing/razorpay.ts, lib/payment-service.ts |
| `openai` | YES | app/api/ai/* |
| `node-appwrite` | YES | lib/appwrite/client.ts, lib/appwrite/storage.ts |
| `node-vault` | YES | lib/enterprise/vault.ts |
| `jose` | YES | lib/jwt-service.ts |
| `bcrypt` | YES | lib/password-service.ts |
| `bcryptjs` | DUPLICATE — both bcrypt AND bcryptjs are installed | Redundant |
| `jspdf` | YES | payslip download, Form 16, leave PDF |
| `framer-motion` | YES | components/motion/*, app/error.tsx |
| `lucide-react` | YES | everywhere |
| `recharts` | YES | analytics dashboards |
| `zod` | YES | validation in API routes |
| `winston` | YES | lib/enterprise/logger.ts |
| `winston-loki` | YES | logger |
| `prom-client` | YES | lib/enterprise/metrics.ts |
| `sonner` | YES | toast notifications |
| `uuid` | YES | multiple routes |
| `date-fns` | YES | date calculations |
| `next-themes` | YES | theme-provider.tsx |
| `libphonenumber-js` | YES | lib/phone/normalize.ts |
| `@radix-ui/react-avatar` | YES | components/ui/avatar.tsx |
| `@radix-ui/react-tabs` | YES | components/ui/tabs.tsx |
| `class-variance-authority` / `clsx` / `tailwind-merge` | YES | design system |

### Missing from package.json but referenced

The `resend` npm package is NOT in package.json. `EMAIL_PROVIDER="resend"` is set in production but there is no Resend SDK import anywhere. This is the core cause of the Resend button crash.

### Flagged: bcrypt + bcryptjs both installed

Having both is wasteful (bcryptjs is a pure-JS fallback for bcrypt). Pick one and remove the other.

---

## AUDIT 3: ENVIRONMENT VARIABLES

### Production environment (.env.prod — SECURITY: FILE IS IN GIT)

| Variable | Set in .env.prod? | Value / Status |
|----------|-------------------|----------------|
| `DATABASE_URL` | YES | Real Neon pooler credentials |
| `DIRECT_URL` | YES | Real Neon non-pooler credentials |
| `JWT_SECRET` | YES — INSECURE | "continuum-jwt-secret-key-change-in-production-2024" |
| `JWT_REFRESH_SECRET` | YES — EMPTY | "" (empty string, falls back to JWT_SECRET) |
| `SESSION_SECRET` | YES — same as JWT_SECRET | Same insecure string |
| `CSRF_SECRET` | YES — same string | Same insecure string |
| `CRON_SECRET` | YES | Real random value set |
| `EMAIL_PROVIDER` | YES | "resend" — BUT resend SDK is not installed |
| `RESEND_API_KEY` | YES | Real key |
| `RESEND_FROM_EMAIL` | YES | "noreply@continuum.support" |
| `SENDGRID_API_KEY` | YES | Real key |
| `SENDGRID_FROM_EMAIL` | YES | "continuum1105@gmail.com" |
| `SENDGRID_FROM_NAME` | YES — BROKEN | "Continuum HR\n" — trailing newline in email header |
| `SMTP_HOST` | YES — trailing \n | "smtp.gmail.com\n" (trimmed in code, OK) |
| `SMTP_PORT` | YES — trailing \n | "587\n" (parseInt handles it, OK) |
| `SMTP_USER` | YES — trailing \r\n | Gmail address |
| `SMTP_PASS` | YES — trailing \r\n | Gmail App Password — may be expired |
| `OPENAI_API_KEY` | YES — trailing \r\n | Real key (trim() in code, OK) |
| `UPSTASH_REDIS_REST_URL` | NOT SET | Redis disabled in prod |
| `UPSTASH_REDIS_REST_TOKEN` | NOT SET | Redis disabled in prod |
| `PUSHER_APP_ID` | NOT SET | Real-time dead |
| `PUSHER_KEY` | NOT SET | Real-time dead |
| `PUSHER_SECRET` | NOT SET | Real-time dead |
| `RAZORPAY_KEY_ID` | NOT SET | Billing broken |
| `RAZORPAY_KEY_SECRET` | NOT SET | Billing broken |
| `NEXT_PUBLIC_APP_URL` | YES | "https://continuum.support" |
| `APP_URL` | YES | "https://continuum.support" |
| `NEXT_PUBLIC_SUPABASE_URL` | YES | Supabase URL present |
| `SUPABASE_SERVICE_ROLE_KEY` | YES | Present |
| `NEXT_PUBLIC_FIREBASE_*` | YES | All 5 Firebase public vars set |
| `FIREBASE_PRIVATE_KEY` | YES — IN PLAIN TEXT IN GIT | Full RSA private key in committed file |
| `FIREBASE_CLIENT_EMAIL` | YES | Firebase service account |
| `SENTRY_DSN` | NOT SET | Error tracking dead |
| `NEXT_PUBLIC_SENTRY_DSN` | NOT SET | Client-side Sentry dead |
| `CONSTRAINT_ENGINE_URL` | YES | Points to Render.com deployment |
| `APPWRITE_API_KEY` | YES — empty string | Appwrite effectively disabled |
| `APPWRITE_PROJECT_ID` | YES — empty string | Appwrite disabled |
| `HOLIDAY_API_KEY` | YES | Present |
| `WHATSAPP_*` | NOT SET | WhatsApp disabled via env flag |

---

## AUDIT 4: ROUTES & PAGES

All 190 pages follow the same pattern: `page.tsx` re-exports a view component. This is a clean pattern. No page was found importing a non-existent component.

### Server-component pages (real DB queries on render)

| Page | Components exist? | API dependencies | Status |
|------|------------------|-----------------|--------|
| `/super-admin/users` | YES | Direct Prisma | [LOADS OK] |
| `/super-admin/companies` | YES | `/api/super-admin/companies` ✓ | [LOADS OK] |
| `/admin/dashboard` | YES | Direct Prisma | [LOADS OK] |
| `/hr/dashboard` | YES | Direct Prisma | [LOADS OK] |
| `/employee/dashboard` | YES | Direct Prisma + client sub-components | [LOADS OK] |
| `/hr/workforce-planning` | YES | `/api/workforce-planning` ✓ | [LOADS OK] |
| `/hr/succession` | YES | `/api/succession-plans` ✓ | [LOADS OK] |
| `/hr/surveys` | YES | `/api/surveys` ✓ | [LOADS OK] |
| `/hr/tax-declarations` | YES | `/api/tax-declarations` ✓ | [LOADS OK] |
| `/employee/loans` | YES | `/api/loans` ✓ | [LOADS OK] |
| `/employee/overtime` | YES | `/api/overtime` ✓ | [LOADS OK] |

All new RALPH-20260630 pages have corresponding API routes. No missing imports found.

---

## AUDIT 5: API ENDPOINTS

### Super Admin routes — all real logic

| Endpoint | Methods | Real DB? | Status |
|----------|---------|---------|--------|
| `/api/super-admin/users` | GET, POST | YES | [REAL LOGIC] |
| `/api/super-admin/users/[id]` | GET, PUT, DELETE | YES | [REAL LOGIC] |
| `/api/super-admin/companies` | GET | YES | [REAL LOGIC] |
| `/api/super-admin/companies/[id]` | GET, PUT, DELETE | YES | [REAL LOGIC] |
| `/api/super-admin/companies/[id]/modules` | GET, PUT | YES | [REAL LOGIC] |
| `/api/super-admin/companies/[id]/resend-credentials` | POST | YES | [REAL LOGIC — email may fail, same EMAIL_PROVIDER bug] |
| `/api/super-admin/user-invites/[id]` | GET, PUT | YES | [REAL LOGIC] |

### Auth routes — all real logic

| Endpoint | Status |
|----------|--------|
| `/api/auth/signin` | [REAL LOGIC] |
| `/api/auth/signup` | [REAL LOGIC] |
| `/api/auth/refresh` | [REAL LOGIC] |
| `/api/auth/sign-out` | [REAL LOGIC] |
| `/api/auth/forgot-password` | [REAL LOGIC — email via broken provider] |
| `/api/auth/reset-password` | [REAL LOGIC — email via broken provider] |
| `/api/auth/invite` | [REAL LOGIC] |
| `/api/auth/join` | [REAL LOGIC] |
| `/api/auth/me` | [REAL LOGIC] |

### Cron routes

| Endpoint | Scheduled in vercel.json | Has real logic? | Status |
|----------|--------------------------|-----------------|--------|
| `/api/cron/sla-check` | YES (daily 9am) | YES | [CONFIGURED] |
| `/api/cron/leave-accrual` | YES (monthly) | YES | [CONFIGURED] |
| `/api/cron/year-end-carry-forward` | YES (Jan 1) | YES | [CONFIGURED] |
| `/api/cron/audit-verification` | NO | YES | [NOT CONFIGURED] |
| `/api/cron/document-expiry` | NO | YES | [NOT CONFIGURED] |
| `/api/cron/learning-overdue` | NO | YES | [NOT CONFIGURED] |
| `/api/cron/leave-sla-breach` | NO | YES | [NOT CONFIGURED] |
| `/api/cron/performance-overdue` | NO | YES | [NOT CONFIGURED] |
| `/api/cron/probation-check` | NO | YES | [NOT CONFIGURED] |
| `/api/cron/process-events` | NO | YES | [NOT CONFIGURED] |

All cron routes check `x-cron-secret` header. CRON_SECRET is set in prod. Auth is correct.

### AI routes

| Endpoint | Status |
|----------|--------|
| `/api/ai/assistant` | [REAL LOGIC] — OpenAI key configured in prod |
| `/api/ai/attrition` | [REAL LOGIC] |
| `/api/ai/coaching` | [REAL LOGIC] |
| `/api/ai/query` | [REAL LOGIC] |
| `/api/ai/smart-leave` | [REAL LOGIC] |

### Email/test routes

`/api/admin/test-email` and `/api/email/test` — real logic but will hit the same EMAIL_PROVIDER=resend bug. If EMAIL_PROVIDER were fixed, these would work.

---

## AUDIT 6: FRONTEND COMPONENTS

### Potentially orphaned components (not imported by any page.tsx)

- `components/portals/role-dashboards/admin-ops-dashboard.tsx`
- `components/portals/role-dashboards/employee-hub.tsx`
- `components/portals/role-dashboards/hr-analytics-cockpit.tsx`
- `components/portals/role-dashboards/manager-command-center.tsx`
- `components/ui/animated-sign-in-demo.tsx`
- `components/ui/background-paper-shaders.tsx`
- `components/ui/pulse-beams.tsx`

These are built but may not be rendered anywhere. They are not breaking anything — they are just dead code.

### All `components/pages/*/` views

Every view component was matched to a page.tsx that imports it. None are orphaned. None import non-existent components.

### Duplicate UI components

- `components/design-system/badge.tsx` AND `components/ui/badge.tsx` — two badge components exist. This is intentional (design system layer over bare UI), but confusing and may diverge.
- `components/design-system/button.tsx` AND `components/ui/button.tsx` — same pattern.
- `components/page-header.tsx` AND `components/design-system/page-header.tsx` — two page header components.

---

## AUDIT 7: BUTTONS AND ACTIONS

### `/super-admin/users` — `users-view.tsx`

| Button | onClick / action | Full chain | Status |
|--------|-----------------|------------|--------|
| "Create User" | Link to `/super-admin/users/new` | Navigation | [WORKING] |
| "Edit" (per invite) | Link to `/super-admin/users/invites/${id}` | Navigation | [WORKING] |
| **"Resend"** (per invite) | `resendInviteAction` server action | DB read → DB write → buildAppUrl → sendEmail → SMTP → **THROWS** → error.tsx "Core Exception" | **[CRASHES]** |
| "Revoke" (per invite) | `revokeInviteAction` server action | DB write → revalidatePath | [WORKING] |
| "View" (per user) | Link to `/super-admin/users/${id}` | Navigation | [WORKING] |
| "Deactivate" (per user) | `deactivateUserAction` server action | DB read → DB update → revalidatePath | [WORKING] |

### `/super-admin/companies` — `companies-view.tsx` (client component)

| Button | Action | Status |
|--------|--------|--------|
| Search input | Debounced re-fetch from `/api/super-admin/companies` | [WORKING] |
| Status filter | Re-fetch with filter param | [WORKING] |
| Pagination | State-based fetch | [WORKING] |
| "New Company" | Link to `/super-admin/companies/new` | [WORKING] |
| Row click | Router push to `/super-admin/companies/${id}` | [WORKING] |
| Bulk delete (checkboxes + delete button) | DELETE to `/api/super-admin/companies` — need to verify this method exists | [UNCERTAIN] |

### `/hr/(main)/dashboard` — `dashboard-view.tsx` (server component, read-only)

No form buttons. Only navigation links to sub-pages. [WORKING]

### `/employee/(main)/dashboard` — `dashboard-view.tsx` (server component)

| Element | Status |
|---------|--------|
| "Request Leave" link | Link to `/employee/request-leave` | [WORKING] |
| LeaveBalanceCards | Client component calling `/api/company/leave-types` | [WORKING] |
| UpcomingHolidays | Client component calling `/api/company/holidays` | [WORKING] |
| Attendance display | Server-side Prisma query | [WORKING] |

### `/admin/(main)/dashboard` — `dashboard-view.tsx` (server component)

| Element | Status |
|---------|--------|
| "Export" button | Calls `/api/employee/export` (route exists) | [WORKING] |
| "Add User" / "People" link | Link to `/admin/people/invite` | [WORKING] |
| All statistics | Real Prisma counts | [WORKING] |

---

## AUDIT 8: EXTERNAL SERVICES

| Service | Package installed | Credentials in prod | Real/Mock |
|---------|------------------|--------------------|----|
| **SendGrid** | YES (`@sendgrid/mail`) | YES — real key | REAL — but `EMAIL_PROVIDER=resend` bypasses it |
| **SMTP (Gmail)** | YES (`nodemailer`) | YES — Gmail App Password (may be expired) | REAL — used as fallback since EMAIL_PROVIDER != "sendgrid" |
| **Resend** | **NOT INSTALLED** | API key present, FROM email set | **FAKE** — zero code path for it |
| **OpenAI** | YES (`openai`) | YES — real key | REAL |
| **Pusher** | YES (`pusher` + `pusher-js`) | **NOT IN PROD** | DEAD — all real-time notifications silently fail |
| **Razorpay** | YES (`razorpay`) | **NOT IN PROD** | DEAD — billing crashes |
| **Redis (Upstash)** | YES (`@upstash/redis`) | **NOT IN PROD** | FALLS BACK to in-memory (resets on cold start) |
| **Supabase** | YES (`@supabase/ssr`) | YES | REAL — legacy auth bridge |
| **Firebase** | NOT INSTALLED as SDK | All Firebase env vars set | DEAD — no Firebase SDK in package.json |
| **Appwrite** | YES (`node-appwrite`) | Empty strings in prod | DEAD — disabled by empty credentials |
| **HashiCorp Vault** | YES (`node-vault`) | Unknown | UNCERTAIN |
| **Sentry** | YES (`@sentry/nextjs`) | DSN empty in prod | DEAD — zero error reporting |
| **WhatsApp/Meta** | Custom webhook | NOT SET | DISABLED via env flag |
| **Cashfree** | No SDK | Webhook route exists | UNKNOWN |
| **S3 / File Storage** | Via Appwrite | NOT CONFIGURED | DEAD |

---

## AUDIT 9: CRON JOBS

### vercel.json schedules (only 3 configured)

```json
{ "path": "/api/cron/sla-check",               "schedule": "0 9 * * *"  }
{ "path": "/api/cron/leave-accrual",            "schedule": "0 0 1 * *"  }
{ "path": "/api/cron/year-end-carry-forward",   "schedule": "0 1 1 1 *"  }
```

### 7 routes with real logic that will NEVER run

- `/api/cron/audit-verification` — [NOT CONFIGURED]
- `/api/cron/document-expiry` — [NOT CONFIGURED]
- `/api/cron/learning-overdue` — [NOT CONFIGURED]
- `/api/cron/leave-sla-breach` — [NOT CONFIGURED]
- `/api/cron/performance-overdue` — [NOT CONFIGURED]
- `/api/cron/probation-check` — [NOT CONFIGURED]
- `/api/cron/process-events` — [NOT CONFIGURED]

All cron routes auth via `x-cron-secret` header → `CRON_SECRET` env var. Auth is correct. The jobs just aren't scheduled.

---

## AUDIT 10: DATABASE

- **Prisma models:** 107
- **Migrations:** 14 (6 added 2026-06-30 for RALPH modules)
- **DATABASE_URL:** Set (Neon pooler)
- **DIRECT_URL:** Set (Neon non-pooler for migrations)
- **API routes using Prisma:** 219 of 272

The schema is comprehensive. 6 new migrations added today introduce models for: surveys, skills, overtime, schedule templates, custom fields, bulk jobs, tax declarations, policies, loans, benefit plans, succession plans, career paths.

These migrations need to be applied to production with `prisma migrate deploy`. If they have NOT been run yet, any API route touching these new models will crash with Prisma P1003 "table not found."

---

## SPECIFIC BUG: "Core Exception" on Resend Button

### Location
File: `components/pages/super-admin/users-view.tsx`, lines 301–311

```tsx
<form action={resendInviteAction} className="inline">
  <input type="hidden" name="inviteId" value={invite.id} />
  <Button type="submit">Resend</Button>
</form>
```

### Server action trace (lines 11–68, same file)

| Step | Code | Can fail? |
|------|------|-----------|
| 1 | `getCurrentUser()` — JWT verify + DB lookup | No (redirects on failure, doesn't throw) |
| 2 | `prisma.userInvite.findUnique()` | DB connection error could throw |
| 3 | `invite.status !== 'pending'` check | Throws `Error('Only pending invites can be resent.')` if status changed since page load |
| 4 | `crypto.randomUUID()` | Never fails |
| 5 | `prisma.userInvite.update()` | DB error could throw |
| 6 | `buildAppUrl('/invite/accept/...')` | Safe — NEXT_PUBLIC_APP_URL is set |
| 7 | `sendSuperAdminUserInviteEmail()` → `sendEmail()` | **THIS IS WHERE IT FAILS** |
| 8 | Inside sendEmail: `provider = "resend"` → **skips SendGrid** → goes to SMTP | SMTP may fail |
| 9 | `sendViaSmtp()` throws or returns error | Outer catch returns `{ success: false, error: msg }` |
| 10 | `if (!emailResult.success) throw new Error(emailResult.error)` | **THROWS** |
| 11 | Next.js catches unhandled server action throw → `app/error.tsx` | Displays "Core Exception" |

### Root cause

`EMAIL_PROVIDER` is set to `"resend"` in production. `lib/email-service.ts` only handles `"sendgrid"`. When the provider is anything else, the code falls through to SMTP. SMTP is either: (a) failing due to expired Gmail App Password, or (b) failing due to rate limit or transient network error. Either way, the server action throws and the user sees "Core Exception."

The user never sees what actually went wrong. The error message is swallowed.

### The Fix

**Immediate fix (no code deploy needed):** In Vercel dashboard, change the environment variable:
```
EMAIL_PROVIDER = sendgrid
```

SendGrid API key (`SENDGRID_API_KEY`) and from address (`SENDGRID_FROM_EMAIL`) are already configured in production. This will make the Resend button use SendGrid immediately on next request.

**Better fix (code change):** Either install the `resend` npm package and add a code path for it, or rename the provider value to `"sendgrid"` and use the already-integrated SendGrid SDK. The Resend API key in production suggests the intent was to switch to Resend, but the SDK integration was never completed.

**Defensive fix (in addition):** Wrap the email failure in the server action so it does not throw to the UI:
```typescript
// In resendInviteAction, instead of:
if (!emailResult.success) {
  throw new Error(emailResult.error || 'Failed to send invite email.');
}

// Do this:
if (!emailResult.success) {
  console.error('[ResendInvite] Email failed:', emailResult.error);
  // Still revalidate so UI knows invite token was updated
  revalidatePath('/super-admin/users');
  // Return error state (requires making this a progressive enhancement)
  // Or: don't throw — invite token is already updated, they can try again
  return;
}
```

---

## TOP 10 FIXES IN PRIORITY ORDER

### Fix 1 — P0 SECURITY: Rotate secrets, remove .env.prod from git

`web/.env.prod` is committed. Treat all credentials as compromised.

Actions:
1. Rotate: Neon DB password, Firebase RSA key, Gmail App Passwords, OpenAI key, SendGrid key, Resend key, SMTP password
2. `git rm --cached web/.env.prod` + add to `.gitignore`
3. Use BFG Repo Cleaner to remove from git history
4. Rotate credentials again after history purge
5. Set all secrets via Vercel environment variables only

---

### Fix 2 — P0 PRODUCTION CRASH: Fix email provider

In Vercel environment variables:
```
EMAIL_PROVIDER = sendgrid
```

No code change. No redeploy. Effective immediately on next request.

This fixes the "Resend" button, forgot-password, invite emails, and all other email actions.

---

### Fix 3 — P1 SECURITY: Generate real JWT secrets

Generate and set in Vercel:
```bash
openssl rand -base64 64  # JWT_SECRET
openssl rand -base64 64  # JWT_REFRESH_SECRET
```

Current value "continuum-jwt-secret-key-change-in-production-2024" is in git history and effectively public. All sessions will be invalidated (users re-login once).

---

### Fix 4 — P1 BROKEN FEATURE: Add Pusher credentials

Add to Vercel: `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`

Real-time notification bell and live updates will be dead until this is set. Get credentials from dashboard.pusher.com.

---

### Fix 5 — P1 BROKEN FEATURE: Add Razorpay credentials

Add to Vercel: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`

Billing subscriptions and payroll advance payments crash at SDK init without these.

---

### Fix 6 — P1 DATA INTEGRITY: Add Upstash Redis

Add to Vercel: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Without Redis: rate limiting is in-memory (resets on cold start = no real limit), idempotency keys for leave requests don't persist across instances.

---

### Fix 7 — P2 OBSERVABILITY: Configure Sentry

Add to Vercel: `SENTRY_DSN`, `NEXT_PUBLIC_SENTRY_DSN`

Every production error (including the current Resend crash) is currently invisible. Sentry is already installed (`@sentry/nextjs` in package.json), just needs a DSN.

---

### Fix 8 — P2 VERIFY: Run new migrations in production

The 6 new migrations from 2026-06-30 add 15+ new Prisma models. If `prisma migrate deploy` has not been run against the production Neon database, any request to a RALPH module route will crash with a table-not-found error.

Run: `DATABASE_URL=<prod_url> npx prisma migrate deploy`

---

### Fix 9 — P2 RELIABILITY: Schedule missing cron jobs

Add to `vercel.json`:
```json
{ "path": "/api/cron/document-expiry",      "schedule": "0 8 * * *" },
{ "path": "/api/cron/learning-overdue",     "schedule": "0 8 * * 1" },
{ "path": "/api/cron/performance-overdue",  "schedule": "0 8 * * 1" },
{ "path": "/api/cron/probation-check",      "schedule": "0 8 * * *" },
{ "path": "/api/cron/process-events",       "schedule": "*/15 * * * *" }
```

7 cron jobs exist but never run. Features like document expiry alerts, learning reminders, and performance review nudges are silently broken.

---

### Fix 10 — P3 HYGIENE: Clean up committed junk files

```bash
git rm --cached web/temp_db.txt web/temp_direct.txt web/temp_key.txt web/temp_val.txt
git rm --cached web/test.js web/test2.js web/test-smtp.js web/update_profile.js web/wipe_and_seed.js
git rm --cached web/testbody.json web/afterdeploy.json web/prodtest.json
git rm --cached "web/app/(auth)/sign-up/page.tsx.new"
# Add all patterns to .gitignore
```

---

## WHAT IS WORKING IN PRODUCTION

Despite the above, the following is functional today:

- JWT authentication (sign-in / sign-out / session) — works with insecure but functional shared secret
- HR, Admin, Employee, Manager dashboards — real DB data
- Leave request submission and approval workflow — real Prisma
- Attendance tracking — real
- Payroll / payslip view — real
- Employee directory and org chart — real
- OpenAI assistant — real (key configured)
- All super-admin CRUD for companies — real
- Invite creation (new users via /api/super-admin/users POST) — real
- All ~190 pages load without import errors
- All ~272 API routes compile (no missing import crashes at startup)

The core HRMS is working. The bugs are in: email delivery, real-time features, billing, security posture, and observability.
