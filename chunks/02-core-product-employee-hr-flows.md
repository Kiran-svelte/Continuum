# Chunk 02 — Core Product: Employee, Daily HR & Admin Flows (Full Specification)

> **Status:** `not_started` | **Gate:** `pending` | **Depends on:** Chunk 01 | **Est.:** 10–15 dev-days  
> **L5 (implement from):** [`l5/02-employee-hr-flows-L5.md`](./l5/02-employee-hr-flows-L5.md)

---

## L1 — Room purpose

**Room name:** Daily Operations Floor (employees, managers, HR)  
**Business outcome:** Every seat in a paying company can execute leave, attendance, and payslip actions via API with correct RBAC — the exact operations WhatsApp will invoke.  
**Revenue link:** Broken invite flow = seats never activate = no expansion. Broken leave = churn. Broken payslip = payroll module upsell fails.

---

## L2 — Components

| ID | Component | Primary user |
|----|-----------|--------------|
| C2-01 | Invite → accept → active | HR, new employee |
| C2-02 | Employee profile + phone | Employee, HR |
| C2-03 | Leave APIs (v1) | Employee, manager, HR |
| C2-04 | Attendance APIs (v1) | Employee |
| C2-05 | Payslip API (v1) | Employee |
| C2-06 | Notifications on decisions | System |
| C2-07 | HR admin operations | HR, admin |
| C2-08 | Prod smoke gate G1 | QA |

---

## C2-01 — Invite → Accept → Active

### HR invite page

| Property | Value |
|----------|-------|
| Route | `/admin/people/invite` |
| File | `web/app/admin/(main)/people/invite/page.tsx` |
| Layout parent | `web/app/admin/(main)/layout.tsx` |
| Permission required | HR/admin create user capability |

**Fields to add (Chunk 02 spec — not yet in codebase):**

| Field | Label | Type | Validation | Required when |
|-------|-------|------|------------|---------------|
| `email` | Work email | email | valid email, unique per company | always |
| `firstName` | First name | string | min 1 max 80 | always |
| `lastName` | Last name | string | min 1 max 80 | always |
| `role` | Role | select | enum: employee, manager, hr, admin | always |
| `managerId` | Reports to | select employee | UUID optional | employee/manager |
| `department` | Department | string | max 100 | optional |
| `phone` | Mobile (WhatsApp) | tel | E.164 after normalize | **required if** `portal_policy.messaging.require_employee_phone=true` |

**Submit API:**

| Property | Value |
|----------|-------|
| Endpoint | `POST /api/hr/invites` |
| File | `web/app/api/hr/invites/route.ts` |
| Creates | `UserInvite` or `EmployeeInvite` row + email |

**Success UI:** Toast "Invitation sent to {email}"; redirect or stay on page per existing pattern.

### Invite accept page

| Property | Value |
|----------|-------|
| Route | `/invite/accept/[token]` |
| Page | `web/app/invite/accept/[token]/page.tsx` |
| View | `web/components/pages/onboarding/invite-accept-token-view.tsx` |

**States:**

| State | UI | Elements |
|-------|-----|----------|
| `loading` | Center card | `Loader2` spinner, text "Validating invitation..." |
| `invalid` | Error card | `AlertCircle`, title "Invalid Invitation", `{error}` body, link "Go to Sign In" → `/sign-in` |
| `valid_form` | Form | password + confirmPassword, Building2 company name, role badge |
| `success` | Success | CheckCircle, auto-redirect 2s |

**Validate token API:**

| Method | GET `/api/invite/accept?token={token}` |
| Response valid | `{ valid: true, invite: { email, role, firstName, lastName, companyName, expiresAt } }` |
| Response invalid | `{ valid: false, error: "Invalid invitation" }` HTTP 400 |

**Accept API:**

| Method | POST `/api/invite/accept` |
| Body | `{ token, password, confirmPassword }` |
| Client validation | passwords match; password min 8 — error "Password must be at least 8 characters" |
| Server file | `web/app/api/invite/accept/route.ts` |

**Post-accept redirect logic (exact — lines 132–139):**

| Response field | Condition | Redirect |
|----------------|-----------|----------|
| `needsCompanySetup` | true | `/onboarding` |
| `needsEmployeeOnboarding` | true | `/employee/onboarding` |
| else | | `/employee/dashboard` |

**DB after accept:**

| Field | Value |
|-------|-------|
| `Employee.status` | `active` or `onboarding` per flow |
| `Employee.invite_accepted_at` | now |
| Leave balances | seeded per company LeaveType |

### HR approve registration (self-join flow)

| API | `POST /api/hr/approve-registration` |
| File | `web/app/api/hr/approve-registration/route.ts` |
| UI queue | HR employees page — Pending Registrations tab |

---

## C2-02 — Employee Profile & Phone

### Pages (all roles share pattern)

| Role | Route | File |
|------|-------|------|
| employee | `/employee/profile` | `web/app/employee/(main)/profile/page.tsx` |
| manager | `/manager/profile` | `web/app/manager/(main)/profile/page.tsx` |
| hr | `/hr/profile` | `web/app/hr/(main)/profile/page.tsx` |
| admin | `/admin/profile` | `web/app/admin/(main)/profile/page.tsx` |

### Profile API (authoritative)

**File:** `web/app/api/profile/route.ts`

**GET response shape:**

```json
{
  "success": true,
  "profile": {
    "id": "uuid",
    "email": "string",
    "first_name": "string",
    "last_name": "string",
    "phone": "string|null",
    "current_address": "string|null",
    "gender": "male|female|other|null",
    "department": "string|null",
    "designation": "string|null",
    "emergency_contact_name": "string|null",
    "emergency_contact_phone": "string|null",
    "emergency_contact_relationship": "string|null",
    "updated_at": "ISO8601"
  }
}
```

**PUT body (camelCase):**

| Field | Required | Validation | Error |
|-------|----------|------------|-------|
| `firstName` | yes | non-empty trim | "First name and last name are required." HTTP 400 |
| `lastName` | yes | non-empty trim | same |
| `phone` | no | normalize E.164 via `web/lib/phone/normalize.ts` (create) | "Enter a valid mobile number with country code." HTTP 400 |
| `currentAddress` | no | max 500 | |
| `department` | no | max 100 | |
| `gender` | no | male\|female\|other | null if invalid |

**On phone change:** call `revokeChannelLinksForEmployee(employeeId, 'phone_changed')` from Chunk 03.

**UI phone field spec (add to profile pages):**

| Property | Value |
|----------|-------|
| Label | "Mobile number (for WhatsApp HR)" |
| Placeholder | "+91 98765 43210" |
| Helper text | "Used to verify WhatsApp. Must match your WhatsApp number." |
| Input component | `Input` from `@/components/ui/input` |
| Token border | `var(--border)` |

---

## C2-03 — Leave APIs (v1 complete spec)

### POST /api/leaves/submit

**File:** `web/app/api/leaves/submit/route.ts`

**Auth:** `getAuthEmployee()` — JWT cookie/header  
**Permissions:** `requirePermissionGuard(employee, 'leave.apply_own')`  
**Module:** `requireModuleForOrg(employee.org_id, 'leave')`  
**Guard:** `requireNotInNoticePeriod(employee)` from `web/lib/notice-period-guard.ts`  
**Rate limit:** bucket `leaves/submit` via `checkApiRateLimit(employee.id, 'leaves/submit')`

**Zod schema (exact):**

```typescript
{
  leave_type: string min 1 max 20 → sanitized UPPERCASE
  start_date: string regex /^\d{4}-\d{2}-\d{2}$/
  end_date: string regex /^\d{4}-\d{2}-\d{2}$/
  reason: string min 1 max 1000 → sanitizeInput
  is_half_day: boolean optional default false
  attachment_url: string url optional
}
```

**Error responses:**

| Condition | HTTP | Body |
|-----------|------|------|
| Validation fail | 400 | `{ error: 'Validation failed', details: flatten }` |
| Rate limit | 429 | `{ error: 'Rate limit exceeded. Try again later.' }` |
| No permission | 403 | AuthError message |
| Module disabled | 403 | MODULE_DISABLED envelope |
| Insufficient balance | 400 | user-safe constraint message |
| Auth missing | 401 | AuthError |

**Success:** 201 with leave request id, status, days

**Side effects:** audit `LEAVE_SUBMIT`, email via `sendLeaveSubmissionEmail`, notification via `sendNotification`, Pusher event

### GET /api/leaves/balances

**File:** `web/app/api/leaves/balances/route.ts`  
**Permission:** own balances for employee; broader for HR per RBAC  
**Response fields per type:** `annual_entitlement`, `used_days`, `pending_days`, `remaining`, `carried_forward`

### GET /api/leaves/list

**File:** `web/app/api/leaves/list/route.ts`  
**Query params:** `status`, `limit`, `offset` (document in v1 API doc)

### POST /api/leaves/cancel/[requestId]

**File:** `web/app/api/leaves/cancel/[requestId]/route.ts`  
**Rule:** only own pending requests unless `leave.cancel_any`

### POST /api/leaves/approve/[requestId]

**File:** `web/app/api/leaves/approve/[requestId]/route.ts`  
**Permissions:** `leave.approve_team` or `leave.approve_any`  
**Side effects:** balance update, audit, `sendLeaveApprovalEmail`, notification

### POST /api/leaves/reject/[requestId]

**File:** `web/app/api/leaves/reject/[requestId]/route.ts`  
**Body:** `{ reason: string }` required

### GET /api/manager/pending-approvals

**File:** `web/app/api/manager/pending-approvals/route.ts`  
**Returns:** queue with constraint metadata (`aiRecommendation`, `confidence`) for prod smoke

### RBAC matrix (v1 leave — from `web/lib/rbac.ts`)

| Role | Default permissions include |
|------|----------------------------|
| employee | `leave.apply_own`, `attendance.mark_own` |
| team_lead | + `leave.approve_team`, `leave.view_team`, `attendance.view_team` |
| manager | + `attendance.regularize` |
| director | + `leave.view_all`, `attendance.view_all` |
| hr | + `leave.approve_any`, `leave.cancel_any`, `leave.adjust_balance`, `leave.encash`, `attendance.override` |
| admin | ALL_PERMISSION_CODES |

**Test file:** `web/tests/rbac-role-matrix.test.ts` — one case per row above

---

## C2-04 — Attendance APIs (v1)

### GET /api/attendance

**File:** `web/app/api/attendance/route.ts`  
**Module:** `assertModule(employee.org_id, 'attendance')`  
**Query:** `month` 1-12, `year`, `limit` default 31

**Enhancement for Zero UI (implement in Chunk 02):** add top-level `today` object:

```json
{
  "today": {
    "date": "2026-06-13",
    "status": "present|late|absent|not_marked",
    "check_in_at": "ISO8601|null",
    "check_out_at": "ISO8601|null",
    "is_wfh": false
  },
  "records": [],
  "summary": {}
}
```

### POST /api/attendance

**Body:**

```json
{ "action": "check_in" | "check_out", "is_wfh": boolean optional }
```

**Errors (exact strings in codebase):**

| Condition | HTTP | Message |
|-----------|------|---------|
| Invalid action | 400 | "Invalid action. Use check_in or check_out." |
| Already checked in | 400 | "Already checked in today." |
| WFH disabled | 400 | "WFH check-in is disabled by company policy." |
| Company missing | 400 | "Company configuration not found." |

**Permission:** implicit via auth employee; must have `attendance.mark_own` (add explicit guard if missing)

**Timezone:** `resolveOperationalTimezone(company.timezone)` — day bounds for "today"

---

## C2-05 — Payslip API (v1)

### GET /api/payroll/slips

**File:** `web/app/api/payroll/slips/route.ts`  
**Module:** payroll assert  
**Employee scope:** own slips only unless HR/admin

**Response (spec for assistant):**

```json
{
  "slips": [
    {
      "id": "uuid",
      "period_label": "April 2026",
      "period_month": 4,
      "period_year": 2026,
      "net_pay": 85000,
      "currency": "INR",
      "download_path": "/api/payroll/slips?runId=uuid&format=pdf"
    }
  ]
}
```

**Prod smoke reference:** PDF download 4432 bytes — `docs/proofs/prod-smoke-20260414-104845Z.md`

---

## C2-06 — Notifications

### Refactor target

**Create:** `web/lib/notifications/dispatch.ts`

```typescript
export type NotificationEvent =
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_escalated';

export async function dispatchNotification(input: {
  event: NotificationEvent;
  companyId: string;
  employeeId: string;
  channels: ('email' | 'in_app' | 'whatsapp')[];
  payload: Record<string, unknown>;
}): Promise<void>
```

**Migrate from:** direct calls in leave routes to `sendLeaveApprovalEmail`, `sendNotification`

**Rule:** email/in_app failure must NOT roll back leave transaction

**WhatsApp channel:** stub empty until Chunk 05 — interface must exist now

---

## C2-07 — HR Admin flows

| Action | Route / API | File |
|--------|-------------|------|
| Policy edit | `/admin/policy-settings` | `web/app/admin/(main)/policy-settings/page.tsx` |
| Holidays | `/admin/holidays` | `web/app/admin/(main)/holidays/page.tsx` |
| Approval chains | `/admin/company-settings?tab=approval-chains` | `web/app/admin/(main)/company-settings/page.tsx` |
| Balance adjust | `POST /api/hr/leave-balance-adjust` | `web/app/api/hr/leave-balance-adjust/route.ts` |
| Payroll generate | `POST /api/payroll/generate` | `web/app/api/payroll/generate/route.ts` |
| Payroll approve | `POST /api/payroll/approve` | `web/app/api/payroll/approve/route.ts` |
| Audit logs | `/admin/audit-logs` | `web/app/admin/(main)/audit-logs/page.tsx` |

**Policy change test:** edit leave type quota → submit leave → uses new quota (integration test)

**Audit:** all above write `AuditLog` via `web/lib/audit.ts` with `AUDIT_ACTIONS.*`

---

## C2-08 — Prod Smoke Gate G1

### Script

**File:** `web/scripts/prod-smoke-proof.ts`  
**Run:**

```powershell
cd web
$env:SMOKE_BASE_URL = "https://your-staging.vercel.app"
npx tsx scripts/prod-smoke-proof.ts
```

### Steps covered (must all PASS)

| Step name | HTTP expectation |
|-----------|------------------|
| Signup admin | 200 |
| Signin admin | 200 |
| Auth me admin | 200 |
| Complete onboarding | 200 |
| Invite manager, hr, employee | 200 |
| Accept invites | 200 |
| Update employee statuses | 200 |
| Upsert salary structures | 201 |
| Submit leave #1 | 201 |
| Manager approve leave #1 | 200 |
| Submit leave #2, escalate, admin reject | 200 |
| Submit leave #3, admin approve | 200 |
| Auto-approve probe | 201 |
| Generate payroll | 201 |
| Approve payroll | 200 |
| Payslip PDF download | bytes > 0 |

### G1 rule

**3 consecutive SUCCESS runs** → output to `docs/proofs/prod-smoke-preflight-run-{1|2|3}-{timestamp}.md`

---

## Documentation deliverable

**Create:** `web/docs/api/v1-zero-ui-leave.md` — every v1 leave endpoint with request/response/error tables

---

## Chunk 02 gate

| # | Check |
|---|-------|
| 1 | `invite-lifecycle.test.ts` PASS |
| 2 | `rbac-role-matrix.test.ts` PASS |
| 3 | Phone save on profile with E.164 |
| 4 | G1: 3× prod smoke SUCCESS |
| 5 | `v1-zero-ui-leave.md` exists |

---

## Files to create/modify

| Action | Path |
|--------|------|
| Create | `web/lib/phone/normalize.ts` |
| Create | `web/lib/notifications/dispatch.ts` |
| Create | `web/docs/api/v1-zero-ui-leave.md` |
| Create | `web/tests/rbac-role-matrix.test.ts` |
| Create | `web/tests/invite-lifecycle.test.ts` |
| Modify | `web/app/api/attendance/route.ts` (today summary) |
| Modify | `web/app/api/profile/route.ts` (phone validation) |
| Modify | `web/app/admin/(main)/people/invite/page.tsx` (phone field) |
