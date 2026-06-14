# L5 — Chunk 02: Employee & Daily HR Flows Internals

> Parent: `../02-core-product-employee-hr-flows.md`

---

## L5-02-001 — Invite accept page state machine

**File:** `web/components/pages/onboarding/invite-accept-token-view.tsx`

| State variable | Type | Values |
|----------------|------|--------|
| loading | boolean | true → false after validate |
| submitting | boolean | during POST accept |
| error | string \| null | user-facing |
| inviteData | InviteData \| null | from GET validate |
| success | boolean | after accept OK |
| password | string | user input |
| confirmPassword | string | user input |
| tokenState | valid \| expiring \| expired | computed from expiresAt |

**InviteData interface (lines 8-15):**

```typescript
{ email: string; role: string; firstName?: string; lastName?: string; companyName?: string; expiresAt: string }
```

**GET validate:** `/api/invite/accept?token={token}`

| Response | UI |
|----------|-----|
| !ok or !valid | error state, title "Invalid Invitation" |
| ok | show form with company name Building2 icon |

**Client validation before POST:**

| Rule | Exact error string |
|------|-------------------|
| password !== confirmPassword | "Passwords do not match" |
| password.length < 8 | "Password must be at least 8 characters" |

**POST accept body:**

```json
{ "token": "uuid", "password": "********", "confirmPassword": "********" }
```

**Redirect table (lines 132-139):**

| Response field | Router.push |
|----------------|-------------|
| needsCompanySetup | `/onboarding` |
| needsEmployeeOnboarding | `/employee/onboarding` |
| else | `/employee/dashboard` |

**Delay before redirect:** 2000ms after success

---

## L5-02-002 — Profile API complete spec

**File:** `web/app/api/profile/route.ts`

### GET /api/profile

| Auth | getAuthEmployee() |
| super_admin | returns synthetic profile, phone always null |
| employee | prisma.employee.findUnique select id, email, first_name, last_name, phone, current_address, gender, department, designation, emergency_* |

**404:** `{ error: 'Employee profile not found.' }`

### PUT /api/profile

**Body fields (camelCase):**

| Field | Maps to Employee column | Validation |
|-------|-------------------------|------------|
| firstName | first_name | required trim non-empty |
| lastName | last_name | required trim non-empty |
| phone | phone | optional, normalize E.164 via L5-02-003 |
| currentAddress | current_address | optional trim |
| department | department | optional trim |
| gender | gender | male/female/other or null |

**400:** `{ error: 'First name and last name are required.' }`

**On phone change:** invoke `revokeChannelLinksForEmployee(user.id, 'phone_changed')`

### POST /api/profile (emergency contact)

**Body:** emergencyContactName, emergencyContactPhone, emergencyContactRelationship — all required

**400:** `{ error: 'All emergency contact fields are required for add/update.' }`

**super_admin 400:** `{ error: 'Emergency contacts are not available for super admin accounts.' }`

---

## L5-02-003 — Phone normalize library

**Create:** `web/lib/phone/normalize.ts`

**Dependency:** `libphonenumber-js` — add to web/package.json if absent

```typescript
export type NormalizePhoneResult =
  | { ok: true; e164: string; countryCallingCode: string; nationalNumber: string }
  | { ok: false; code: 'INVALID_PHONE'; message: 'Enter a valid mobile number with country code.' };

export function normalizePhone(input: string, defaultRegion: 'IN' | string = 'IN'): NormalizePhoneResult;
```

**Test vectors:**

| Input | defaultRegion | e164 output |
|-------|---------------|-------------|
| 9876543210 | IN | +919876543210 |
| +91 98765 43210 | IN | +919876543210 |
| 919876543210 | IN | +919876543210 |
| +1 415 555 0100 | US | +14155550100 |
| abc | IN | INVALID_PHONE |

**Storage rule:** always store E.164 in `Employee.phone`

**WhatsApp wa_id rule:** Meta sends without + — strip + from e164 for external_id match

---

## L5-02-004 — POST /api/leaves/submit (full L5)

**File:** `web/app/api/leaves/submit/route.ts`

**Guards (order):**

1. getAuthEmployee()
2. checkApiRateLimit(employee.id, 'leaves/submit')
3. requirePermissionGuard(employee, 'leave.apply_own')
4. requireCompanyContext(employee)
5. requireModuleForOrg(employee.org_id, 'leave')
6. requireNotInNoticePeriod(employee)

**Zod leaveSubmitSchema (lines 29-36):**

```typescript
{
  leave_type: z.string().min(1).max(20),        // → sanitizeInput → UPPERCASE
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().min(1).max(1000),          // sanitizeInput
  is_half_day: z.boolean().optional().default(false),
  attachment_url: z.string().url().optional(),
}
```

**Processing:**

- validateLeaveDateRange → throws if invalid range
- calculateLeaveDays(start, end, is_half_day)
- getLeaveBalanceYear(startDate)
- upsert LeaveBalance if missing
- constraint engine via constraintEngineBreaker + resolveConstraintEngineUrl
- resolveLeaveApprovers for approver assignment
- create LeaveRequest row
- createAuditLog LEAVE_SUBMIT
- sendLeaveSubmissionEmail / sendNotification / sendPusherEvent if configured

**429:** `{ error: 'Rate limit exceeded. Try again later.' }`  
**400 validation:** `{ error: 'Validation failed', details: z.flatten() }`

**201 success fields (minimum):** id, status, total_days, leave_type, start_date, end_date

---

## L5-02-005 — POST /api/leaves/approve/[requestId]

**File:** `web/app/api/leaves/approve/[requestId]/route.ts`

**Rate limit bucket:** `leaves/approve`

**Body approvalSchema:**

```typescript
{
  action: 'approve' | 'reject',
  reason: z.string().min(1).max(500).optional()
}
```

**Authorization chain:**

1. requireModuleForOrg(org, 'leave')
2. canActOnLeaveRequest(employee, leaveRequest)
3. checkSequentialApproval for multi-level
4. canProcessLeaveApproval workflow state

**On approve:** updateLeaveBalanceWithConcurrencyCheck, recordApprovalStep, audit LEAVE_APPROVE, sendLeaveApprovalEmail, sendPusherEvent

**On reject:** balance restore, audit LEAVE_REJECT, sendLeaveRejectionEmail

**429:** `{ error: 'Rate limit exceeded' }`

---

## L5-02-006 — Attendance POST internals

**File:** `web/app/api/attendance/route.ts` lines 125-230

**Body parse:**

```typescript
const { action, is_wfh } = body;
// action required ∈ ['check_in', 'check_out']
```

**Company config resolution priority:**

1. CompanySettings.check_in_reminders JSON fields
2. Fallback Company.work_start, grace_period_minutes, half_day_hours

**check_in path:**

- If attendance?.check_in exists → 400 `"Already checked in today."`
- If is_wfh && !wfhAllowed → 400 `"WFH check-in is disabled by company policy."`
- status = now > graceCutoff ? 'late' : 'present'
- Creates/updates Attendance row with check_in timestamp

**check_out path:**

- Requires existing check_in
- Sets check_out, computes hours

**Timezone:** getDateKeyInTimeZone(now, companyTimezone) for day boundary

**L5 enhancement — GET today block:** add to response without breaking existing records/summary keys

---

## L5-02-007 — Full RBAC default permissions

**Source:** `web/lib/rbac.ts` DEFAULT_ROLE_PERMISSIONS

| Role | Permission codes (complete list from codebase) |
|------|-----------------------------------------------|
| employee | leave.apply_own, attendance.mark_own, payroll.view_own, employee.view_own, audit.view_own, reports (team scope none) |
| team_lead | employee perms + leave.approve_team, leave.view_team, attendance.view_team, employee.view_team, reports.view_team |
| manager | team_lead + attendance.regularize |
| director | manager + leave.view_all, attendance.view_all, employee.view_all, reports.view_all |
| hr | director subset + leave.approve_any, leave.cancel_any, leave.adjust_balance, leave.encash, attendance.override, payroll.view_all, payroll.generate, payroll.approve, employee.edit_any, employee.onboard, employee.terminate, audit.view_all |
| admin | ALL_PERMISSION_CODES (every code in PERMISSION_CATALOG) |
| super_admin | ['*'] |

**Assistant action mapping:**

| Action | Required permission |
|--------|---------------------|
| request_leave | leave.apply_own |
| approve_leave | leave.approve_team OR leave.approve_any |
| reject_leave | same |
| clock_in/out | attendance.mark_own |
| payslip | payroll.view_own (implicit own data) |
| check_balance | leave.apply_own (read own balances) |

---

## L5-02-008 — notifications/dispatch.ts

**Create:** `web/lib/notifications/dispatch.ts`

```typescript
export type NotificationChannel = 'email' | 'in_app' | 'whatsapp';
export type NotificationEvent =
  | 'leave_submitted'
  | 'leave_approved'
  | 'leave_rejected'
  | 'leave_escalated'
  | 'attendance_late';

export interface DispatchInput {
  event: NotificationEvent;
  companyId: string;
  recipientEmployeeId: string;
  actorEmployeeId?: string;
  channels: NotificationChannel[];
  payload: {
    leaveRequestId?: string;
    dates?: string;
    reason?: string;
    deepLink?: string;
  };
}

export async function dispatchNotification(input: DispatchInput): Promise<{
  email: 'sent' | 'skipped' | 'failed';
  in_app: 'sent' | 'skipped' | 'failed';
  whatsapp: 'sent' | 'skipped' | 'failed';
}>;
```

**whatsapp channel in Chunk 02:** always return `'skipped'` — wire in Chunk 05

---

## L5-02-009 — Prod smoke L5 step trace

**Script:** `web/scripts/prod-smoke-proof.ts`

**CookieJar class:** parses Set-Cookie for session continuity

**dateKey(offsetDays):** UTC YYYY-MM-DD for leave dates

**Key assertions from successful proof (`docs/proofs/prod-smoke-20260414-104845Z.md`):**

| Step | Detail to preserve |
|------|-------------------|
| Manager pending | aiRecommendation=APPROVE, confidence=1 |
| Leave #2 | manager escalate works |
| Leave #2 | admin reject restores balance |
| Auto-approve probe | status=approved at submit when probe mode on |
| Payslip | 4432 bytes PDF |

**G1 command loop:**

```powershell
cd web
$env:SMOKE_BASE_URL = "https://staging.example.com"
1..3 | ForEach-Object {
  npx tsx scripts/prod-smoke-proof.ts | Tee-Object -FilePath "../docs/proofs/prod-smoke-preflight-run-$_-$(Get-Date -Format o).md"
  Start-Sleep -Seconds 45
}
```

---

## L5-02-010 — Test catalog

| ID | Description |
|----|-------------|
| C02-T01 | invite create → accept → employee active |
| C02-T02 | profile PUT phone valid E.164 |
| C02-T03 | profile PUT phone invalid 400 |
| C02-T04 | leave submit happy path 201 |
| C02-T05 | leave submit no permission 403 |
| C02-T06 | approve non-report 403 |
| C02-T07 | attendance double check_in 400 |
| C02-T08 | payslip GET own only |
| C02-T09 | dispatchNotification email sent on approve |
| C02-T10 | prod smoke full PASS |

---

## L5-02-PART-B — Complete leave submit error catalog

**Source:** `web/app/api/leaves/submit/route.ts`

| # | HTTP | error string | Trigger |
|---|------|--------------|---------|
| E1 | 429 | Rate limit exceeded. Try again later. | rate limit |
| E2 | 400 | Validation failed | Zod |
| E3 | 403 | AuthError.message | permission |
| E4 | 400 | This leave type is not configured for your company | bad type |
| E5 | 400 | Insufficient leave balance | balance |
| E6 | 400 | You already have a {status} {type} request... | overlap |
| E7 | 400 | constraint message | engine |
| E8 | 500 | Internal server error | unhandled |

---

## L5-02-PART-C — Employee portal pages (field-level)

### request-leave page

| Field | API key | Validation |
|-------|---------|------------|
| Leave type | leave_type | required |
| Start date | start_date | YYYY-MM-DD |
| End date | end_date | >= start |
| Half day | is_half_day | boolean |
| Reason | reason | 1–1000 chars |
| Submit | POST /api/leaves/submit | |

### attendance page

| Button | Body | Error |
|--------|------|-------|
| Check in | `{ action: check_in, is_wfh? }` | Already checked in today. |
| Check out | `{ action: check_out }` | not checked in |

### profile page

| Field | PUT key | WhatsApp note |
|-------|---------|---------------|
| Phone | phone | E.164, revokes channel link on change |

---

## L5-02-PART-D — Extended tests C02-T11 – C02-T25

| ID | Test |
|----|------|
| C02-T11 | overlapping leave message |
| C02-T12 | insufficient balance |
| C02-T13 | WFH disabled policy |
| C02-T14 | sequential approval L2 |
| C02-T15 | reject restores balance |
| C02-T16 | payslip 403 other user |
| C02-T17 | invite expired token |
| C02-T18 | constraint engine open breaker |
| C02-T19 | half day day count |
| C02-T20 | dispatchNotification skipped whatsapp |
| C02-T21 | rate limit 429 submit |
| C02-T22 | notice period block |
| C02-T23 | manager pending AI badge |
| C02-T24 | cancel own pending |
| C02-T25 | prod smoke G1 ×3 |
