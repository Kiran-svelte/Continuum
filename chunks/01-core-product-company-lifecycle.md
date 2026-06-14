# Chunk 01 — Core Product: Company Lifecycle (Full Specification)

> **Status:** `not_started` | **Gate:** `pending` | **Depends on:** — | **Est.:** 10–15 dev-days  
> **Spec level:** 4 (this file) + **5 → [`l5/01-company-lifecycle-L5.md`](./l5/01-company-lifecycle-L5.md)** (implement from L5)

**Level 5 contains:** all 13 onboarding step Zod fields, POST bodies, JWT cookie `continuum-access`, finalize missing_fields, middleware gates, module audit, approval chain tests C01-T01..T10.

---

## L1 — Room purpose (Product Owner)

**Room name:** Company Setup Wing  
**Business outcome:** A paying admin customer can register, configure HR policy once, and never need Continuum support to touch Neon Postgres. This wing feeds every Zero UI conversation with correct leave types, approvers, holidays, and module flags.  
**Revenue risk if broken:** Onboarding abandonment → no activation → no invoice → WhatsApp pilot fails on empty policy.

---

## L2 — Components in this room

| Component ID | Name | User | Must work before Zero UI |
|--------------|------|------|--------------------------|
| C1-01 | Admin sign-up | New buyer | Yes |
| C1-02 | 13-step onboarding wizard | Company admin | Yes |
| C1-03 | Onboarding gate (middleware) | All roles | Yes |
| C1-04 | Company settings persistence | System | Yes |
| C1-05 | Module enablement + super-admin cap | Super admin + admin | Yes |
| C1-06 | Approval chain → leave routing | System | Yes |
| C1-07 | Legacy route elimination | System | Yes |

---

## C1-01 — Admin Sign-Up (Level 3–5)

### Page

| Property | Value |
|----------|-------|
| Route | `/sign-up` |
| File | `web/app/(auth)/sign-up/page.tsx` → renders `web/components/pages/auth/sign-up-view.tsx` |
| Auth required | No |
| Theme | Uses `var(--background)`, `var(--foreground)` via parent layout `web/app/layout.tsx` |

### UI components & states

| Element | Component | Token / class | Behavior |
|---------|-----------|---------------|----------|
| Mode toggle | Inline in sign-up-view | `btn`, `btn-primary` | Two modes: "Start a Company" / "Join a Company" |
| Email field | `Input` from `@/components/ui/input` | border `var(--border)` | Required, email format |
| Password field | `Input` type password | same | Min 8 chars (match invite accept rule) |
| Company name | Shown in "Start a Company" mode | — | Required for company mode |
| Industry, size, timezone | Select/Input | — | Collected on sign-up |
| Submit button | `Button` | primary token | Disabled while loading |
| Loading | Spinner | — | Blocks double submit |

### API on submit (company mode)

| Property | Value |
|----------|-------|
| Endpoint | `POST /api/auth/signup` |
| File | `web/app/api/auth/signup/route.ts` |
| Creates | `Company` row, `Employee` row (role `admin`), seeds leave types, constraint rules, leave balances |
| Post-success client redirect | **`router.push('/onboarding')`** — file: `sign-up-view.tsx` (~line 259) |

### Validation rules (client)

| Field | Rule | Error message (exact) |
|-------|------|-------------------------|
| email | non-empty, valid email | (inline validation in component) |
| password | min 8 | "Password must be at least 8 characters" |
| company name | non-empty in company mode | component-specific |

### Post-sign-up DB state (required)

| Table | Field | Expected value |
|-------|-------|----------------|
| `Company` | `onboarding_completed` | `false` |
| `Company` | `onboarding_step` | `0` or last saved step |
| `Company` | `join_code` | 8-char alphanumeric unique |
| `Employee` | `primary_role` | `admin` |
| `Employee` | `org_id` | new company id |
| `Employee` | `status` | active (admin) |

### Acceptance test

| Step | Action | Expected |
|------|--------|----------|
| T1-01 | POST signup company mode | HTTP 200/201 |
| T1-02 | Browser lands on URL | `/onboarding` not `/onboarding/company` |
| T1-03 | GET `/api/auth/me` | `company.onboarding_completed === false` |

---

## C1-02 — 13-Step Onboarding Wizard (Level 3–5)

### Page

| Property | Value |
|----------|-------|
| Route | `/onboarding` |
| Page file | `web/app/onboarding/page.tsx` (re-exports view) |
| View file | `web/components/pages/onboarding/onboarding-view.tsx` |
| Constant | `TOTAL_STEPS = 13` (line ~136) — **must equal** `TOTAL_ONBOARDING_STEPS` in `web/lib/onboarding-step-contract.ts` |
| Step filter | `filterOnboardingSteps(enabledSlugs)` — skips steps whose module not enabled |
| Local draft key | `continuum:onboarding:progress:v1` (localStorage) |
| Timeouts | Step save: 60s; finalize: 120s (`REQUEST_TIMEOUT_MS`, `FINALIZE_REQUEST_TIMEOUT_MS`) |

### Step map (authoritative — from `onboarding-step-contract.ts` header)

| Step # | Title | Module gate | Save API |
|--------|-------|-------------|----------|
| 1 | Company Basics | none | `POST /api/onboarding/step/1` |
| 2 | Org Structure | none | `POST /api/onboarding/step/2` |
| 3 | Approval Mapping | none | `POST /api/onboarding/step/3` |
| 4 | Active Modules | none | `POST /api/onboarding/step/4` |
| 5 | Role Structure | none | `POST /api/onboarding/step/5` |
| 6 | Leave Types | `leave` | `POST /api/onboarding/step/6` |
| 7 | Role Quotas | `leave` | `POST /api/onboarding/step/7` |
| 8 | Attendance Rules | `attendance` | `POST /api/onboarding/step/8` |
| 9 | Holidays | `leave` | `POST /api/onboarding/step/9` |
| 10 | AI & Automation | `leave` | `POST /api/onboarding/step/10` |
| 11 | Payroll Defaults | `payroll` | `POST /api/onboarding/step/11` |
| 12 | Notifications | none | `POST /api/onboarding/step/12` |
| 13 | Finalize Setup | none | `POST /api/onboarding/finalize` or `complete` |

**Route handler file:** `web/app/api/onboarding/step/[step]/route.ts`  
**Finalize files:** `web/app/api/onboarding/finalize/route.ts`, `web/app/api/onboarding/complete/route.ts`

---

### Step 1 — Company Basics (field-level spec)

**UI section in:** `onboarding-view.tsx` — `company` object in `LocalOnboardingProgressDraft`

| Field key (draft) | Label in UI | Type | Validation (Zod `companySchema`) | DB target |
|-------------------|-------------|------|----------------------------------|-----------|
| `name` | Company name | string | min 1 max 200 | `Company.name` |
| `industry` | Industry | string | max 100 | `Company.industry` |
| `size` | Employee count band | string | max 50 | `Company.size` |
| `timezone` | Timezone | string | max 80, default Asia/Kolkata | `Company.timezone` |
| `workStart` | Work start | HH:mm | optional string | `Company.work_start` |
| `workEnd` | Work end | HH:mm | optional | `Company.work_end` |
| `gracePeriodMinutes` | Grace period | int | 0–120 | `Company.grace_period_minutes` |
| `halfDayHours` | Half day hours | float | 1–12 | `Company.half_day_hours` |
| `slaHours` | Approval SLA | int | 1–336 | `Company.sla_hours` |
| `negativeBalance` | Allow negative balance | bool | optional | `Company.negative_balance` |
| `probationDays` | Probation days | int | 0–730 | `Company.probation_period_days` |
| `workDays` | Working days | int[] 0–6 | array | `Company.work_days` JSON |

**Buttons on step:**

| Button | Icon | Action | API call |
|--------|------|--------|----------|
| Back | `ArrowLeft` | Previous visible step | none |
| Skip | `SkipForward` | Mark step skipped, advance | optional save |
| Next | `ArrowRight` | Save step, advance | `POST /api/onboarding/step/1` |
| Save & exit | — | Persist draft | same |

**Error messages (network):** Uses `mapFetchErrorMessage` from `@/lib/fetch-with-timeout` — surface toast/banner in view.

---

### Step 2 — Org Structure

**Sub-components:** imported from `web/app/onboarding/onboarding-org-steps.tsx`

| Component | Type export | Default factory |
|-----------|-------------|-----------------|
| `OrgStructureStep` | `OrgStructure` | `createDefaultOrgStructure()` |

**Fields (typical):** departments, designations, units — persisted in step payload JSON under company settings / org tables per finalize logic.

---

### Step 3 — Approval Mapping

| Component | `ApprovalMappingStep` |
| Type | `ApprovalChain[]` via `createDefaultApprovalChains()` |
| Business rule | Each leave request must resolve approver from this chain (see C1-06) |

---

### Step 4 — Active Modules

| Component | `ModuleEnablementStep` |
| Type | `ModuleConfig[]` via `createDefaultModules()` |
| Catalog source | `web/lib/core-functions/catalog.ts` — slugs: `employees`, `leave`, `compliance`, `pf`, `attendance`, `payroll`, `performance`, `recruitment`, `learning`, `expenses`, `reimbursements`, `directory`, `documents`, `exit`, `analytics` |
| Default enabled | `DEFAULT_ENABLED_SLUGS`: leave, attendance, payroll, documents |
| DB target | `CompanySettings.hr_alerts.enabled_modules` (JSON) |

---

### Step 5 — Role Structure

**Draft type:** `RoleDraft[]`

| Field | Type | Validation (`roleSchema`) |
|-------|------|---------------------------|
| `name` | string | min 1 max 80 |
| `slug` | string | regex `^[a-z_]+$`, max 40 |
| `authority_level` | int | 1–20 |
| `can_create_users` | bool | optional |
| `can_approve_leaves` | bool | optional |

**Also:** `peopleOpsOwnerRole: OwnerRoleSlug` — enum admin|hr|director|manager|team_lead|employee

---

### Step 6 — Leave Types

**Draft type:** `LeaveTypeDraft[]`

| Field | Type | Validation (`leaveTypeSchema`) |
|-------|------|--------------------------------|
| `code` | string | min 1 max 20 → stored UPPERCASE on submit |
| `name` | string | min 1 max 120 |
| `days` | number | 0–365 |
| `carry_forward` | bool | optional |
| `max_carry_forward` | number | 0–365 |
| `encashment_enabled` | bool | optional |
| `encashment_max_days` | number | 0–365 |
| `paid` | bool | optional |
| `enabled` | bool | UI toggle |

**DB:** `LeaveType` rows per company

---

### Step 7 — Role Quotas

**Draft:** `roleQuotas: { role_slug, leave_type_code, annual_quota }[]`  
**Validation:** `roleQuotaSchema` — quota 0–365  
**DB:** used by `readRoleQuotaMap` in `web/lib/onboarding-runtime-config.ts`

---

### Step 8 — Attendance Rules

**Draft object:** `attendance` in local draft — see lines 88–101 of onboarding-view

| Field | Type | Validation (`attendanceSchema`) |
|-------|------|--------------------------------|
| `enabled` | bool | |
| `workHoursPerDay` | number | 1–24 |
| `checkInWindowStart/End` | string HH:mm | |
| `checkOutWindowStart/End` | string | |
| `gracePeriodMinutes` | int | 0–120 |
| `lateMarksToHalfDay` | int | 1–12 |
| `wfhAllowed` | bool | feeds attendance POST `is_wfh` guard |
| `geoFencingEnabled` | bool | |
| `photoVerificationEnabled` | bool | |
| `workingDays` | int[] | 0–6 |

**DB:** `CompanySettings.check_in_reminders`, `AttendancePolicy`, company fields

---

### Step 9 — Holidays

| Field | Validation (`holidaySchema`) |
|-------|------------------------------|
| `name` | min 1 max 200 |
| `date` | `YYYY-MM-DD` regex |
| `enabled` | optional bool |
| `custom` | optional bool |

**DB:** `PublicHoliday`  
**Also:** `web/app/api/onboarding/holidays/route.ts`

---

### Step 10 — AI & Automation

**Draft `ai` object:**

| Field | Type | Validation (`aiSchema`) |
|-------|------|-------------------------|
| `enabled` | bool | |
| `confidenceThreshold` | number | 0–1 |
| `autoApproveMaxDays` | number | 0–30 |
| `requireTeamCoverage` | bool | |
| `minTeamCoverage` | number | UI draft |
| `autoEscalateTimeoutHours` | number | |

**Business link:** Prod smoke expects `aiRecommendation=APPROVE` on manager pending view.

---

### Step 11 — Payroll Defaults

**Draft `payroll` object:** pfEnabled, pfCeiling, esiEnabled, esiCeiling, ptEnabled, ptState, tdsEnabled, defaultTaxRegime old|new, lopCalculationMethod, salaryPayDay, payrollCurrency

**DB:** `PayrollConfig`, salary-related seeds

---

### Step 12 — Notifications

**Draft `notifications`:**

| Field | bool |
|-------|------|
| `emailNotifications` | |
| `managerAlerts` | |
| `dailyDigest` | |
| `slaAlerts` | |

**DB:** `CompanySettings.email_notifications` JSON

---

### Step 13 — Finalize Setup

**Primary button label:** Complete setup / Finish (exact copy in view footer)  
**API:** `POST /api/onboarding/finalize` with `FINALIZE_REQUEST_TIMEOUT_MS = 120000`

**On success — required DB mutations:**

| Table.field | Value |
|-------------|-------|
| `Company.onboarding_completed` | `true` |
| `Company.onboarding_step` | `13` (or last) |
| `ConstraintPolicy` | active compiled rules (if finalize creates) |
| `CompanySettings` | all JSON blobs merged |

**Client redirect:** `router.replace(getDefaultPortalForRoles(...))` — file line ~286 in onboarding-view  
**Target portals:** admin → `/admin/dashboard` or HR portal per `web/lib/auth-routing.ts`

**Failure messages to handle:**

| Condition | User message |
|-----------|--------------|
| Network timeout | "Save timed out. Check connection and try again." |
| 401 | Redirect `/sign-in` |
| 403 | "You don't have permission to complete setup." |
| 500 | "Could not finalize setup. Contact support if this persists." |

---

## C1-03 — Onboarding Gate (Middleware)

### File

`web/middleware.ts` — sections ~596–665, ~742–747

### Rules (exact behavior spec)

| Condition | pathname | Action |
|-----------|----------|--------|
| Authenticated, company admin, `onboarding_completed=false` | any except `/onboarding`, `/api/*`, auth routes | **302 → `/onboarding`** |
| Authenticated, employee, employee onboarding incomplete | non-exempt routes | **302 → `/employee/onboarding`** |
| Employee/manager tries `/onboarding` company wizard | `/onboarding` | **302 → `/employee/onboarding`** |
| API routes | `/api/*` | **Must add** company setup guard for mutating HR APIs (see WP below) |

### Cookie involvement

Middleware may read role hint cookies — do not rely on cookies for API; use JWT via `ACCESS_COOKIE_NAME` from `web/lib/jwt-service.ts`.

### New API guard (implement)

**File to create:** `web/lib/company-setup-guard.ts`

```typescript
export function requireCompanySetupComplete(employee: AuthEmployee): void
// throws AuthError 403 { code: 'COMPANY_SETUP_INCOMPLETE', message: 'Complete company setup before using HR features.' }
```

**Apply to all POST/PUT/PATCH/DELETE under:**

- `web/app/api/leaves/**`
- `web/app/api/attendance/**`
- `web/app/api/payroll/**`
- `web/app/api/hr/**` (except approve-registration if needed)
- NOT applied to: `web/app/api/onboarding/**`, `web/app/api/auth/**`

---

## C1-07 — Legacy Route Elimination (CRITICAL)

### Problem

| Route | File | Issue |
|-------|------|-------|
| `/onboarding/company` | `web/app/onboarding/company/page.tsx` | Legacy 3-step wizard; bypasses 13-step contract |

### Fix specification

**Option A (mandatory implementation):**

Replace entire page content with server redirect:

```tsx
import { redirect } from 'next/navigation';
export default function LegacyOnboardingRedirect() {
  redirect('/onboarding');
}
```

**Middleware addition (belt and suspenders):**

```typescript
if (pathname === '/onboarding/company') {
  url.pathname = '/onboarding';
  return NextResponse.redirect(url, 308);
}
```

### Grep gate (CI)

```powershell
cd web
rg "onboarding/company" --glob "!node_modules" --glob "!.next"
```

**Allowed matches:** redirect page, tests asserting redirect, this spec, migration comments  
**Forbidden:** `router.push('/onboarding/company')` in any active route

### Invite accept (already correct)

File: `web/components/pages/onboarding/invite-accept-token-view.tsx` line 133–134:

```typescript
if (data.needsCompanySetup) {
  router.push('/onboarding');  // CORRECT — must stay
}
```

---

## C1-05 — Module Enablement (Level 5)

### Data model

**Table:** `CompanySettings`  
**Field:** `hr_alerts` JSON structure (resolved by `web/lib/core-functions/resolve.ts`):

| JSON key | Type | Purpose |
|----------|------|---------|
| `super_admin_cap` | `ModuleSlug[]` | Max modules tenant can enable |
| `enabled_modules` | `ModuleSlug[]` | Runtime enabled set |
| `module_features` | object | optional feature flags |

**Super admin API:** `PATCH /api/super-admin/companies/[id]/modules`  
**File:** `web/app/api/super-admin/companies/[id]/modules/route.ts`

### Runtime guard

**File:** `web/lib/core-functions/assert-module.ts`

```typescript
export async function assertModule(companyId: string, slug: ModuleSlug): Promise<NextResponse | null>
// Returns moduleDisabledResponse(slug) → 403 if disabled
```

### API audit — every route below MUST call assertModule / requireModuleForOrg

| API prefix | Module slug | Example file |
|------------|-------------|--------------|
| `/api/leaves/*` | `leave` | `web/app/api/leaves/submit/route.ts` uses `requireModuleForOrg` ✓ |
| `/api/attendance/*` | `attendance` | `web/app/api/attendance/route.ts` ✓ |
| `/api/payroll/*` | `payroll` | verify each route |
| `/api/reimbursements/*` | `reimbursements` | |
| `/api/travel-requests/*` | `expenses` | |
| `/api/job-postings/*` | `recruitment` | |

**Script to create:** `web/scripts/audit-module-guards.ts` — outputs CSV of route → guarded yes/no

### 403 response shape (exact)

From `web/lib/api-errors.ts` `moduleDisabledResponse`:

```json
{
  "error": {
    "code": "MODULE_DISABLED",
    "message": "The {moduleName} module is not enabled for your company.",
    "module": "leave"
  }
}
```

HTTP status: **403**

### Nav parity

**File:** `web/lib/navigation/portal-nav.ts`  
**Rule:** If module disabled, nav item hidden AND API 403 (AGENTS.md contract)

---

## C1-06 — Approval Chain → Leave Routing

### Current code

- Submit uses: `resolveLeaveApprovers` from `web/lib/leave-approval-routing.ts`
- Approve route: `web/app/api/leaves/approve/[requestId]/route.ts`
- Known gap: hierarchy creator-chain not fully integrated (see `docs/plan/20260422-prod-regression-hardfix/`)

### Required behavior

| Event | Rule |
|-------|------|
| Leave submitted | `LeaveRequest.approver_id` or approval chain level 1 assignee from step 3 config |
| Manager approves | Only if manager is in chain for that request |
| HR/admin | `leave.approve_any` bypasses team scope |
| Escalate | Manager escalate endpoint from prod smoke must still work |

### Test cases

**File:** `web/tests/leave-approval-chain-integration.test.ts`

| ID | Setup | Action | Expected |
|----|-------|--------|----------|
| AC-01 | Chain: employee → manager A | submit | pending approver = manager A |
| AC-02 | Employee under manager B | manager A approve | 403 |
| AC-03 | HR with approve_any | approve | 200 |
| AC-04 | Escalate | pending at HR | 200 |

---

## Work packages summary

| WP | Title | Files | Days |
|----|-------|-------|------|
| WP1.1 | Legacy redirect + grep gate | `onboarding/company/page.tsx`, `middleware.ts` | 1 |
| WP1.2 | Step constant sync test | `onboarding-step-contract.ts`, `onboarding-view.tsx`, test | 0.5 |
| WP1.3 | Company setup API guard | `company-setup-guard.ts`, all HR API routes | 2 |
| WP1.4 | Finalize flag test | `onboarding/finalize/route.ts`, test | 1 |
| WP1.5 | Module audit script | `audit-module-guards.ts` | 2 |
| WP1.6 | Approval chain integration | `leave-approval-routing.ts`, approve route, tests | 3 |
| WP1.7 | Onboarding data map doc | `web/docs/onboarding-data-map.md` | 1 |

---

## Chunk 01 gate checklist

| # | Check | Command / evidence |
|---|-------|-------------------|
| 1 | No legacy wizard | Manual GET `/onboarding/company` → 308/redirect to `/onboarding` |
| 2 | Step sync | `npx tsx --test tests/onboarding-step-contract-sync.test.ts` |
| 3 | Finalize flag | `tests/onboarding-finalize-flag.test.ts` |
| 4 | Module audit | `audit-module-guards.ts` → 0 unguarded v1 routes |
| 5 | Approval chain | `leave-approval-chain-integration.test.ts` pass |
| 6 | Sign-up lands `/onboarding` | `tests/auth-flow.test.ts` |

**Gate status:** all 6 must PASS before Chunk 02 starts.

---

## Handoff to Chunk 02

Chunk 02 assumes: `Company.onboarding_completed=true` writes reliable config; modules hard-gated; approval routing deterministic.
