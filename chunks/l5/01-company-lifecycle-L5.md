# L5 — Chunk 01: Company Lifecycle Internals

> Parent: `../01-core-product-company-lifecycle.md`  
> Spec level: **5 only** — implement exactly; zero inference

---

## L5-01-001 — JWT & session contract (all Chunk 01 APIs)

| Property | Value |
|----------|-------|
| Cookie name | `continuum-access` (`ACCESS_COOKIE_NAME` in `web/lib/jwt-service.ts:17`) |
| Header alt | `Authorization: Bearer {accessToken}` via `extractAccessToken()` |
| Employee type | `AuthEmployee` in `web/lib/auth-guard.ts:30-46` |
| Required for onboarding step save | permission `employee.onboard` (`requirePermissionGuard(employee, 'employee.onboard')` in step route line 64) |
| Company context | `employee.org_id` must be non-null string |

**Auth failure responses (exact):**

| Condition | HTTP | Body shape |
|-----------|------|------------|
| No token | 401 | `{ error: string }` via AuthError |
| Wrong permission | 403 | AuthError message |
| No org_id | 400 | `{ error: 'Company not found for user' }` (step GET line 76) |

---

## L5-01-002 — POST /api/auth/signup (company registration)

**File:** `web/app/api/auth/signup/route.ts`

**Request body (camelCase — verify in route):**

| Field | Type | Required | Validation |
|-------|------|----------|------------|
| email | string | yes | email format, unique globally on Employee.email |
| password | string | yes | min 8 chars |
| firstName | string | yes | trim non-empty |
| lastName | string | yes | trim non-empty |
| mode | string | yes | `company` or `join` |
| companyName | string | if mode=company | min 1 |
| industry | string | optional | |
| companySize | string | optional | maps to Company.size |
| timezone | string | optional | default Asia/Kolkata |

**Post-insert Company row (Prisma `Company` model lines 110-134):**

| Column | Type | Value on create |
|--------|------|-----------------|
| id | String @id | uuid v4 |
| name | String | companyName |
| onboarding_completed | Boolean | **false** |
| onboarding_step | Int | 0 |
| join_code | String? @unique | 8-char generated |
| timezone | String | default Asia/Kolkata |
| work_start | String | default 09:00 |
| work_end | String | default 18:00 |
| work_days | Json | [1,2,3,4,5] |
| grace_period_minutes | Int | 15 |
| half_day_hours | Float | 4 |
| leave_year_start | String | 01-01 |
| probation_period_days | Int | 180 |
| notice_period_days | Int | 90 |
| sla_hours | Int | 48 |
| country_code | String | IN default |

**Post-insert Employee (admin):**

| Column | Value |
|--------|-------|
| primary_role | admin |
| org_id | company.id |
| status | active |
| phone | null (until profile/invite) |

**Client redirect after success:** `web/components/pages/auth/sign-up-view.tsx` → `router.push('/onboarding')`

---

## L5-01-003 — Onboarding wizard UI machine

**View file:** `web/components/pages/onboarding/onboarding-view.tsx`

| Constant | Line | Value | Must match |
|----------|------|-------|------------|
| TOTAL_STEPS | ~136 | 13 | `TOTAL_ONBOARDING_STEPS` in contract |
| REQUEST_TIMEOUT_MS | ~138 | 60000 | step POST client timeout |
| FINALIZE_REQUEST_TIMEOUT_MS | ~139 | 120000 | finalize timeout |
| ONBOARDING_PROGRESS_STORAGE_KEY | ~140 | continuum:onboarding:progress:v1 | localStorage draft |

**Footer buttons (every step):**

| Button | Component | Icon | Disabled when |
|--------|-----------|------|---------------|
| Back | Button variant outline | ArrowLeft | step === first visible step |
| Skip | Button variant ghost | SkipForward | never (marks skippedSteps[]) |
| Next / Save | Button variant default | ArrowRight | submitting === true |
| Complete (step 13) | Button primary | CheckCircle2 | submitting |

**Visible step calculation:** `filterOnboardingSteps(enabledSlugs)` from `web/lib/onboarding-step-contract.ts:54-64`

**MePayload type (lines 142-149):**

```typescript
{
  primary_role?: string | null;
  secondary_roles?: string[] | null;
  org_id?: string | null;
  company?: { onboarding_completed?: boolean } | null;
  employee_onboarding_completed?: boolean;
  employee_welcome_pending?: boolean;
}
```

**Guard on load:** if `company.onboarding_completed === true` → redirect to portal via `getDefaultPortalForRoles`

---

## L5-01-004 — POST /api/onboarding/step/[step] (every step)

**File:** `web/app/api/onboarding/step/[step]/route.ts`

**Common pre-checks (all steps):**

1. `getAuthEmployee()`
2. `requirePermissionGuard(employee, 'employee.onboard')`
3. `checkApiRateLimit(employee.id, 'general')` → 429 `{ error: 'Rate limit exceeded. Try again later.' }`
4. `companyId = employee.org_id` → 400 if missing
5. `company.onboarding_completed === true` → **409** `{ error: 'Onboarding is already completed for this company' }`
6. `parseOnboardingStep(stepParam)` → 400 if not 1..13

**Draft storage location:**

| Store | Path in JSON |
|-------|--------------|
| Table | CompanySettings |
| Column | hr_alerts |
| Key | onboarding_draft |
| Shape | `{ last_completed_step?: number, updated_at?: string, steps?: Record<string, unknown> }` |

---

### Step 1 POST body — companySchema

**Zod (`web/lib/onboarding-step-contract.ts:108-121`):**

| Field | Zod | UI draft key |
|-------|-----|--------------|
| companyName | string max 200 optional | company.name |
| industry | string max 100 optional | company.industry |
| employeeCount | string max 50 optional | company.size |
| country | string max 5 optional | |
| timezone | string max 80 optional | company.timezone |
| slaHours | int 1-336 optional | company.slaHours |
| negativeBal | boolean optional | company.negativeBalance |
| probationDays | int 0-730 optional | company.probationDays |
| workStart | string optional | company.workStart |
| workEnd | string optional | company.workEnd |
| gracePeriodMinutes | int 0-120 optional | company.gracePeriodMinutes |
| halfDayHours | number 1-12 optional | company.halfDayHours |

**Example POST body:**

```json
{
  "companyName": "Acme Pvt Ltd",
  "timezone": "Asia/Kolkata",
  "workStart": "09:00",
  "workEnd": "18:00",
  "gracePeriodMinutes": 15,
  "slaHours": 48,
  "negativeBal": false,
  "probationDays": 180
}
```

**Success response:** `{ success: true, step: 1, last_completed_step: 1 }` (verify in route)

---

### Step 2 POST body — orgStructureSchema

| Path | Fields |
|------|--------|
| orgStructure.departments[] | id max 40, name 1-100, code 1-16, headRole max 40 |
| orgStructure.locations[] | id, name, city max 100, country max 100 |
| orgStructure.costCenters[] | id, name, code max 16 |
| orgStructure.orgModel | enum flat \| two_tier \| full_hierarchy |

**UI component:** `OrgStructureStep` from `web/app/onboarding/onboarding-org-steps.tsx`

---

### Step 3 POST body — approvalChainsSchema

| Field per chain | Type |
|-----------------|------|
| workflowType | enum leave \| expense \| payroll_advance \| travel |
| level1Role | string 1-40 |
| level2Role | string 1-40 |
| autoApproveAfterHours | int 0-720 |

**Zero UI dependency:** `workflowType: 'leave'` chain drives `resolveLeaveApprovers` / sequential approval

---

### Step 4 POST body — modulesSchema

| Field | Type |
|-------|------|
| enabledModules | string[] max 40 each — must be subset of `MODULE_SLUGS` in catalog |

**Default if skipped at finalize:** `DEFAULT_ENABLED_SLUGS` = leave, attendance, payroll, documents

---

### Step 5 POST body

| Field | Zod |
|-------|-----|
| roles | array min 1 of roleSchema |
| capabilityOwners.peopleOperationsOwner | enum admin\|hr\|director\|manager\|team_lead\|employee |

**roleSchema fields:** name 1-80, slug regex `^[a-z_]+$`, authority_level 1-20, can_approve_leaves bool, can_create_users bool

---

### Step 6 POST body

| Field | Zod |
|-------|-----|
| leaveTypes | array min 1 of leaveTypeSchema |

**leaveTypeSchema:** code 1-20, name 1-120, days 0-365, carry_forward bool, max_carry_forward 0-365, encashment_enabled bool, encashment_max_days 0-365, paid bool

---

### Step 7 POST body

| Field | Zod |
|-------|-----|
| roleQuotas | array optional of { role_slug 1-40, leave_type_code 1-20, annual_quota 0-365 } |

---

### Step 8 POST body — attendanceSchema (full)

| Field | Range |
|-------|-------|
| enabled | bool |
| workHoursPerDay | 1-24 |
| checkInWindowStart | string HH:mm |
| checkInWindowEnd | string |
| checkOutWindowStart | string |
| checkOutWindowEnd | string |
| gracePeriodMinutes | 0-120 |
| lateMarksToHalfDay | 1-12 |
| wfhAllowed | bool → feeds attendance POST is_wfh guard |
| geoFencingEnabled | bool |
| photoVerificationEnabled | bool |
| workingDays | int[] 0-6 |

---

### Step 9 POST body

| Field | Zod |
|-------|-----|
| holidays | array optional { name 1-200, date YYYY-MM-DD, enabled bool, custom bool } |

---

### Step 10 POST body — aiSchema (full)

| Field | Range |
|-------|-------|
| enabled | bool |
| confidenceThreshold | 0-1 |
| autoApproveMaxDays | 0-30 |
| requireTeamCoverage | bool |
| minTeamCoverage | 0-100 |
| autoEscalateTimeoutHours | 1-168 |
| escalationRules | array { condition 1-300, escalateTo 1-80, priority 1-100 } |

---

### Step 11 POST body — payrollSchema (full)

| Field | Range |
|-------|-------|
| pfEnabled | bool |
| pfCeiling | 0-1000000 |
| esiEnabled | bool |
| esiCeiling | 0-1000000 |
| ptEnabled | bool |
| ptState | max 60 |
| tdsEnabled | bool |
| defaultTaxRegime | old \| new |
| lopCalculationMethod | calendar_days \| working_days |
| salaryPayDay | int 1-28 |
| payrollCurrency | max 8 |

---

### Step 12 POST body — notificationsSchema

| Field | bool |
|-------|------|
| emailNotifications | |
| managerAlerts | |
| dailyDigest | |
| slaAlerts | |

---

### Step 13 POST body

```json
{ "completed": true }
```

Schema: `z.object({ completed: z.boolean().optional() }).passthrough()`

**Triggers:** call to finalize pipeline — see L5-01-005

---

## L5-01-005 — POST /api/onboarding/finalize

**File:** `web/app/api/onboarding/finalize/route.ts`

**Permission:** `employee.onboard`  
**Transaction:** `completeOnboardingState(tx, companyId, employee.id)` from `web/lib/onboarding/server.ts`  
**maxWait:** 30000ms, **timeout:** 90000ms

**Pre-finalize employee field check (lines 59-74):**

| Missing field | HTTP | Response |
|---------------|------|----------|
| employee.department | 400 | `{ error: 'Cannot finalize onboarding - missing required fields', missing_fields: ['employee.department', ...] }` |
| employee.designation | 400 | same |
| employee.date_of_joining | 400 | same |
| employee.manager_id | 400 | same |

**Success side effects:**

1. `Company.onboarding_completed = true`
2. Audit `AUDIT_ACTIONS` onboarding complete
3. Optional `sendWelcomeEmail` if company email settings allow

**Post-success client:** onboarding-view calls finalize then `router.replace(getDefaultPortalForRoles(...))`

---

## L5-01-006 — Middleware onboarding gate

**File:** `web/middleware.ts`

| # | Condition | Redirect target |
|---|-----------|-----------------|
| M1 | authenticated + admin/hr + !onboarding_completed + path not /onboarding, /api, auth | `/onboarding` |
| M2 | employee on /onboarding company wizard | `/employee/onboarding` |
| M3 | employee onboarding incomplete | `/employee/onboarding` |
| M4 | pathname `/onboarding/company` | **308 → `/onboarding`** (implement) |

**New API guard file:** `web/lib/company-setup-guard.ts`

```typescript
export function assertCompanySetupComplete(company: { onboarding_completed: boolean }): void {
  if (!company.onboarding_completed) {
    throw new AuthError('Complete company setup before using HR features.', 403);
  }
}
```

**Apply to HTTP methods:** POST, PUT, PATCH, DELETE on `/api/leaves/*`, `/api/attendance/*`, `/api/payroll/*`, `/api/hr/*` (exclude onboarding, auth, invite accept)

**403 body for chat/API clients:**

```json
{ "error": { "code": "COMPANY_SETUP_INCOMPLETE", "message": "Complete company setup before using HR features." } }
```

---

## L5-01-007 — Legacy route elimination

**File to replace:** `web/app/onboarding/company/page.tsx`

**Implementation (exact):**

```tsx
import { redirect } from 'next/navigation';
export default function LegacyCompanyOnboardingRedirect() {
  redirect('/onboarding');
}
```

**Tests that reference legacy (update to expect redirect):**

- `web/tests/issues-11-37-regression.test.ts`
- `web/tests/tenant-demo-onboarding-hardening.test.ts`
- `web/tests/ui21-redesign-migration-guard.test.ts`

**CI forbidden pattern:** `router.push('/onboarding/company')` in `web/app` and `web/components`

---

## L5-01-008 — Module gating L5

**Catalog slugs (`web/lib/core-functions/catalog.ts`):** employees, leave, compliance, pf, attendance, payroll, performance, recruitment, learning, expenses, reimbursements, directory, documents, exit, analytics

**Mandatory (cannot disable):** employees, leave, compliance, attendance

**assertModule return when disabled:**

HTTP 403, body from `moduleDisabledResponse(slug)` — code MODULE_DISABLED

**audit-module-guards.ts output columns:** route_file, http_method, path, required_module, has_guard, line_number

---

## L5-01-009 — Approval chain L5

**Submit path:** `web/app/api/leaves/submit/route.ts` calls `resolveLeaveApprovers`  
**Approve path:** `web/app/api/leaves/approve/[requestId]/route.ts` uses:

- `canActOnLeaveRequest` from `web/lib/leave-approval-routing.ts`
- `checkSequentialApproval`, `recordApprovalStep` from `web/lib/sequential-approval.ts`

**approvalSchema on approve route:**

```typescript
{ action: 'approve' | 'reject', reason: string min 1 max 500 optional }
```

**Sequential approval:** multi-level chain from step 3 must gate approve until prior levels complete

---

## L5-01-010 — Test case catalog (Chunk 01)

| ID | Type | Steps | Expected |
|----|------|-------|----------|
| C01-T01 | unit | compare TOTAL_STEPS constants | equal 13 |
| C01-T02 | api | POST step 1 valid body | 200, draft saved |
| C01-T03 | api | POST step 1 after onboarding_completed | 409 |
| C01-T04 | api | POST finalize missing department | 400 missing_fields |
| C01-T05 | api | POST finalize complete | onboarding_completed true |
| C01-T06 | api | POST leaves/submit before onboarding done | 403 COMPANY_SETUP_INCOMPLETE |
| C01-T07 | e2e | signup → /onboarding | URL correct |
| C01-T08 | e2e | GET /onboarding/company | redirect /onboarding |
| C01-T09 | api | leave module disabled | 403 MODULE_DISABLED |
| C01-T10 | integ | submit leave uses step 3 approver | correct approver_id |

---

## L5-01-011 — File change manifest

| Op | Path | Reason |
|----|------|--------|
| MODIFY | web/app/onboarding/company/page.tsx | redirect only |
| MODIFY | web/middleware.ts | 308 legacy + document gates |
| CREATE | web/lib/company-setup-guard.ts | API gate |
| CREATE | web/scripts/audit-module-guards.ts | module audit |
| CREATE | web/tests/onboarding-step-contract-sync.test.ts | C01-T01 |
| CREATE | web/tests/onboarding-finalize-flag.test.ts | C01-T04-05 |
| CREATE | web/tests/leave-approval-chain-integration.test.ts | C01-T10 |
| CREATE | web/docs/onboarding-data-map.md | step→DB map |
| MODIFY | web/app/api/leaves/submit/route.ts | add company setup guard |
| MODIFY | web/app/api/attendance/route.ts | add company setup guard |

---

## L5-01-PART-B — Onboarding wizard UI field registry (Steps 1–13)

> Every input below must exist in `onboarding-view.tsx` or step sub-component.  
> **Token contract:** all colors/spacing from `web/app/globals.css` variables.

### Step 1 — Company Basics

| Field ID | Label | Input type | Placeholder | Required | Client validation error | Maps to POST key |
|----------|-------|------------|-------------|----------|-------------------------|------------------|
| company.name | Company name | text | Acme Pvt Ltd | yes (finalize) | "Company name is required" | companyName |
| company.industry | Industry | select/text | IT Services | no | max 100 chars | industry |
| company.size | Employee count | select | 51–200 | no | — | employeeCount |
| company.country | Country | select | IN | no | ISO max 5 | country |
| company.timezone | Timezone | select | Asia/Kolkata | yes | must be IANA | timezone |
| company.workStart | Work start | time | 09:00 | no | HH:mm | workStart |
| company.workEnd | Work end | time | 18:00 | no | HH:mm, after start | workEnd |
| company.gracePeriodMinutes | Grace period (min) | number | 15 | no | 0–120 | gracePeriodMinutes |
| company.halfDayHours | Half-day hours | number | 4 | no | 1–12 | halfDayHours |
| company.slaHours | Approval SLA (hours) | number | 48 | no | 1–336 | slaHours |
| company.negativeBalance | Allow negative balance | checkbox | — | no | — | negativeBal |
| company.probationDays | Probation (days) | number | 180 | no | 0–730 | probationDays |

**Step 1 footer actions:**

| Button | aria-label | onClick behavior | API |
|--------|------------|------------------|-----|
| Back | Go to previous step | disabled step 1 | — |
| Skip | Skip this step | push step to skippedSteps, advance | none (local only until Next) |
| Next | Save and continue | POST `/api/onboarding/step/1` | body = draft.company fields |

**Step 1 loading state:** `submitting === true` → disable Next, show Loader2 on button  
**Step 1 error toast:** API 400 → show `error` from JSON; 409 → "Setup already completed" + redirect portal  
**Step 1 success:** update localStorage `ONBOARDING_PROGRESS_STORAGE_KEY` with `{ lastStep: 1, draft: {...} }`

### Step 2 — Org Structure

| Sub-entity | Add button label | Row fields | Delete confirm |
|------------|------------------|------------|----------------|
| Department | Add department | name*, code*, headRole | "Remove department {name}?" |
| Location | Add location | name*, city, country | "Remove location {name}?" |
| Cost center | Add cost center | name*, code* | "Remove cost center {name}?" |
| Org model | radio group | flat / two_tier / full_hierarchy | — |

**Minimum for finalize:** at least 1 department with non-empty name  
**POST key:** entire `orgStructure` object per L5-01-004 step 2

### Step 3 — Approval Mapping

| Column | Control | Options |
|--------|---------|---------|
| Workflow type | select | leave, expense, payroll_advance, travel |
| Level 1 approver role | select from step 5 roles | slug values |
| Level 2 approver role | select optional | slug or empty |
| Auto-approve after (hours) | number | 0 = disabled |

**Zero UI critical row:** workflowType=`leave` — without this row, `resolveLeaveApprovers` falls back to manager_id only  
**UI validation:** level1Role required when chain row exists  
**Error if no leave chain at finalize:** warn banner "Leave approvals may use direct manager only"

### Step 4 — Active Modules

| UI element | Behavior |
|------------|----------|
| Module card grid | one card per `MODULE_SLUGS` entry from catalog |
| Toggle per module | enabledSlugs[] state |
| Mandatory badges | employees, leave, compliance, attendance — toggle disabled + tooltip "Required module" |
| Cap indicator | if super_admin_cap set, disable slugs outside cap |

**POST body:** `{ enabledModules: string[] }`  
**Skip default at finalize:** `DEFAULT_ENABLED_SLUGS`

### Step 5 — Role Structure

| Field per role row | Validation |
|--------------------|------------|
| name | 1–80 chars |
| slug | lowercase underscore regex |
| authority_level | 1–20 integer |
| can_approve_leaves | boolean |
| can_create_users | boolean |

**Capability owner select:** peopleOperationsOwner — default admin  
**Minimum:** 1 role with slug `employee`  
**Admin bootstrap role:** slug `admin` auto-created if missing in finalize

### Step 6 — Leave Types

| Column | Notes |
|--------|-------|
| code | UPPERCASE in DB (CL, SL, PL) |
| name | display name |
| days | annual entitlement default |
| paid | affects payroll LOP calc |
| carry_forward | bool |
| max_carry_forward | if carry_forward |

**Minimum:** 1 leave type  
**Module gate:** step hidden if leave module disabled in step 4

### Step 7 — Role Quotas

Optional array — empty allowed  
**Row:** role_slug + leave_type_code + annual_quota  
**Validation:** leave_type_code must exist in step 6

### Step 8 — Attendance Rules

| Field | Default | Zero UI impact |
|-------|---------|----------------|
| wfhAllowed | true | blocks WFH clock-in in assistant if false |
| gracePeriodMinutes | 15 | late vs present status |
| workingDays | [1,2,3,4,5] | Mon–Fri |
| geoFencingEnabled | false | future — not v1 WhatsApp |
| photoVerificationEnabled | false | future |

### Step 9 — Holidays

Calendar UI + manual add  
**Row:** name, date (YYYY-MM-DD), enabled, custom  
**Import CSV:** optional — not blocking Zero UI

### Step 10 — AI & Automation

| Field | Smoke test linkage |
|-------|-------------------|
| enabled | prod smoke aiRecommendation |
| confidenceThreshold | manager pending APPROVE confidence |
| autoApproveMaxDays | auto-approve probe in smoke |
| requireTeamCoverage | constraint engine input |

### Step 11 — Payroll Defaults

Required if payroll module enabled  
**Fields:** pfEnabled, esiEnabled, tdsEnabled, salaryPayDay, payrollCurrency  
**Smoke:** payslip PDF generation depends on step 11 + employee salary structure

### Step 12 — Notifications

Four booleans — emailNotifications, managerAlerts, dailyDigest, slaAlerts  
**Does not block Zero UI** — WhatsApp notifications are Chunk 05

### Step 13 — Finalize Setup

| UI | Copy |
|----|------|
| Summary panel | read-only recap of steps 1–12 completion ticks |
| Complete button | "Complete setup" |
| Pre-check callout | lists missing employee fields (department, designation, DOJ, manager) |

**On Complete click sequence:**

1. POST `/api/onboarding/step/13` with `{ completed: true }`
2. POST `/api/onboarding/finalize` (120s timeout)
3. On 200 → `router.replace(getDefaultPortalForRoles(...))`
4. On 400 missing_fields → scroll to employee profile section inline form

---

## L5-01-PART-C — GET /api/onboarding/step/[step] response shapes

**File:** `web/app/api/onboarding/step/[step]/route.ts` GET handler

| Step | Response.data keys (minimum) |
|------|------------------------------|
| ALL | `{ step, last_completed_step, draft }` |
| 1 | draft.company.* merged with Company row |
| 2 | draft.orgStructure |
| 3 | draft.approvalChains |
| 4 | draft.enabledModules |
| 5 | draft.roles, draft.capabilityOwners |
| 6 | draft.leaveTypes |
| 7 | draft.roleQuotas |
| 8 | draft.attendance |
| 9 | draft.holidays |
| 10 | draft.ai |
| 11 | draft.payroll |
| 12 | draft.notifications |

**401/403:** same as POST  
**Caching:** `Cache-Control: private, no-store`

---

## L5-01-PART-D — Sign-up page UI (`sign-up-view.tsx`)

| Field | name attr | autocomplete | Validation message |
|-------|-----------|--------------|-------------------|
| Email | email | email | "Enter a valid email" |
| Password | password | new-password | min 8 |
| Confirm password | confirmPassword | new-password | "Passwords do not match" |
| First name | firstName | given-name | required |
| Last name | lastName | family-name | required |
| Mode toggle | mode | — | company \| join |
| Company name | companyName | organization | required if company mode |
| Industry | industry | — | optional |
| Company size | companySize | — | optional |

**Submit button:** "Create account" — disabled while `isSubmitting`  
**API:** POST `/api/auth/signup`  
**Success redirect:** `/onboarding` (company) or join flow  
**Error 409 email exists:** "An account with this email already exists"

---

## L5-01-PART-E — Invite create API (admin during onboarding)

**POST /api/hr/invites**

| Field | Type | Required |
|-------|------|----------|
| email | string email | yes |
| firstName | string | yes |
| lastName | string | yes |
| role | UserRole slug | yes |
| department | string | optional |
| designation | string | optional |
| phone | E.164 string | optional (required if messagingPolicy.require_employee_phone) |

**Success 201:**

```json
{
  "inviteId": "uuid",
  "token": "uuid",
  "expiresAt": "ISO8601",
  "inviteUrl": "https://app/invite/accept/{token}"
}
```

**Errors:**

| HTTP | error string |
|------|--------------|
| 400 | Validation failed |
| 403 | Permission denied (need employee.onboard) |
| 409 | Active invite already exists for this email |

---

## L5-01-PART-F — Company setup guard route list (exhaustive)

**Apply `assertCompanySetupComplete` to these route files (POST/PUT/PATCH/DELETE only):**

| Path pattern | File |
|--------------|------|
| /api/leaves/submit | leaves/submit/route.ts |
| /api/leaves/approve/[requestId] | leaves/approve/[requestId]/route.ts |
| /api/leaves/cancel/[requestId] | if exists |
| /api/attendance | attendance/route.ts |
| /api/payroll/** | all mutating payroll routes |
| /api/hr/employees/** | mutating employee routes |
| /api/reimbursement/** | submit/approve |

**Excluded (always allowed mid-onboarding):**

| Path | Reason |
|------|--------|
| /api/onboarding/** | setup itself |
| /api/auth/** | authentication |
| /api/invite/** | invite accept |
| /api/profile | admin self profile for finalize fields |
| /api/super-admin/** | platform admin |

---

## L5-01-PART-G — Module guard audit expected output

**Script:** `web/scripts/audit-module-guards.ts`

**Output CSV columns:** route_file, http_method, path, required_module, has_assertModule, line_number, status

**PASS criteria:** zero rows with status=FAIL for routes tagged in `web/lib/core-functions/route-module-map.ts` (create if missing)

**Sample FAIL row:**

```csv
web/app/api/leaves/submit/route.ts,POST,/api/leaves/submit,leave,false,,FAIL
```

---

## L5-01-PART-H — Onboarding data map (step → DB tables)

| Step | Primary tables written at finalize | Draft storage key |
|------|-----------------------------------|-------------------|
| 1 | Company (name, timezone, work_*) | onboarding_draft.steps.1 |
| 2 | Department, Location, CostCenter | steps.2 |
| 3 | ApprovalChain / WorkflowConfig | steps.3 |
| 4 | CompanySettings.hr_alerts.enabled_modules | steps.4 |
| 5 | RoleDefinition rows | steps.5 |
| 6 | LeaveType rows | steps.6 |
| 7 | RoleLeaveQuota | steps.7 |
| 8 | CompanySettings.check_in_reminders JSON | steps.8 |
| 9 | Holiday rows | steps.9 |
| 10 | CompanySettings.ai_config JSON | steps.10 |
| 11 | CompanySettings.payroll_config JSON | steps.11 |
| 12 | CompanySettings.notification_prefs | steps.12 |
| 13 | Company.onboarding_completed=true | — |

**Document file:** `web/docs/onboarding-data-map.md` — must mirror this table + Prisma field names

---

## L5-01-PART-I — Extended test catalog (C01-T11 – C01-T40)

| ID | Given | When | Then |
|----|-------|------|------|
| C01-T11 | admin signed up | GET /onboarding/company | 308 Location /onboarding |
| C01-T12 | step 4 skip modules | finalize | DEFAULT_ENABLED_SLUGS applied |
| C01-T13 | leave module off in step 4 | UI step list | steps 6,7,9,10 hidden |
| C01-T14 | attendance module off | UI step list | step 8 hidden |
| C01-T15 | payroll module off | UI step list | step 11 hidden |
| C01-T16 | POST step 5 zero roles | | 400 validation |
| C01-T17 | POST step 6 zero leave types | | 400 validation |
| C01-T18 | rate limit exceeded | POST step/1 ×100 | 429 |
| C01-T19 | employee role token | POST step/1 | 403 employee.onboard |
| C01-T20 | draft in localStorage corrupt JSON | load wizard | reset draft, no crash |
| C01-T21 | step 3 leave chain manager | submit leave | approver matches chain level1 |
| C01-T22 | step 3 two-level chain | manager approve | status pending level2 |
| C01-T23 | step 3 two-level chain | level2 approve | status approved |
| C01-T24 | module leave disabled | POST /api/leaves/submit | 403 MODULE_DISABLED |
| C01-T25 | onboarding incomplete | POST /api/attendance check_in | 403 COMPANY_SETUP_INCOMPLETE |
| C01-T26 | signup join mode valid code | POST signup | joins existing company |
| C01-T27 | signup join invalid code | | 400 invalid join code |
| C01-T28 | finalize 90s timeout | slow DB mock | 504 or graceful error |
| C01-T29 | middleware admin incomplete | GET /admin/dashboard | redirect /onboarding |
| C01-T30 | middleware admin complete | GET /admin/dashboard | 200 |
| C01-T31 | ONBOARDING_STEP_MODULES sync test | compare contract vs UI filter | equal |
| C01-T32 | companySchema max lengths | POST oversized companyName | 400 |
| C01-T33 | approval chain autoApprove 0 | leave pending 48h | no auto approve |
| C01-T34 | audit log on finalize | complete onboarding | AUDIT onboarding action row |
| C01-T35 | welcome email flag off | finalize | no sendWelcomeEmail call |
| C01-T36 | welcome email flag on | finalize | sendWelcomeEmail once |
| C01-T37 | hr_alerts onboarding_draft | step 1 POST | draft persisted |
| C01-T38 | super_admin | POST onboarding step | 403 or N/A path |
| C01-T39 | two companies same admin email | signup | 409 |
| C01-T40 | join_code uniqueness | create 1000 companies | all join_codes unique |

---

## L5-01-PART-J — Middleware decision table (complete)

**File:** `web/middleware.ts` — extend with these rows:

| # | Path prefix | Role | onboarding_completed | employee_onboarding | Action |
|---|-------------|------|---------------------|---------------------|--------|
| M1 | /admin/* | admin/hr | false | — | redirect /onboarding |
| M2 | /onboarding | employee | — | incomplete | redirect /employee/onboarding |
| M3 | /onboarding/company | any | — | — | 308 → /onboarding |
| M4 | /employee/dashboard | employee | true | incomplete | redirect /employee/onboarding |
| M5 | /api/leaves/* POST | any | false | — | handled in route guard not middleware |
| M6 | /super-admin/* | super_admin | — | — | allow always |
| M7 | /sign-in, /sign-up | unauthenticated | — | — | allow |
| M8 | /invite/accept/* | unauthenticated | — | — | allow |

**Matcher config:** exclude `_next/static`, `_next/image`, `favicon.ico`, public assets

---

## L5-01-PART-K — Error message master list (Chunk 01)

| Code / context | HTTP | Exact user-facing string |
|----------------|------|--------------------------|
| AUTH_MISSING | 401 | Unauthorized |
| PERMISSION_DENIED | 403 | You do not have permission to perform this action |
| COMPANY_NOT_FOUND | 400 | Company not found for user |
| ONBOARDING_COMPLETE | 409 | Onboarding is already completed for this company |
| INVALID_STEP | 400 | Invalid onboarding step |
| VALIDATION_FAILED | 400 | Validation failed |
| RATE_LIMIT | 429 | Rate limit exceeded. Try again later. |
| COMPANY_SETUP_INCOMPLETE | 403 | Complete company setup before using HR features. |
| MODULE_DISABLED | 403 | (from moduleDisabledResponse) |
| FINALIZE_MISSING_FIELDS | 400 | Cannot finalize onboarding - missing required fields |
| EMAIL_EXISTS | 409 | An account with this email already exists |

---

## L5-01-PART-L — Work package breakdown (hours)

| WP | Title | Files | Est hours |
|----|-------|-------|-----------|
| WP01-1 | Legacy redirect + middleware | onboarding/company, middleware.ts | 4 |
| WP01-2 | company-setup-guard + route wiring | guard + 8 routes | 8 |
| WP01-3 | Module audit script + fixes | audit-module-guards.ts | 6 |
| WP01-4 | Onboarding tests C01-T01–20 | tests/* | 12 |
| WP01-5 | onboarding-data-map.md | docs | 4 |
| WP01-6 | Approval chain integration test | leave-approval-chain | 6 |
| WP01-7 | Sign-up regression | sign-up-view | 2 |
| WP01-8 | Finalize missing fields UX | onboarding-view step 13 | 4 |
| **Total** | | | **46h (~6 dev-days)** |
