# L5-DEEP — Chunk 02: Employee HR Flows (Exhaustive)

> Companion to [`../02-employee-hr-flows-L5.md`](../02-employee-hr-flows-L5.md)

---

## DEEP-02-001 — Invite accept view (complete UI tree)

```
InviteAcceptTokenView
├── loading → Skeleton + "Validating invitation..."
├── error → Alert variant destructive + title Invalid Invitation
├── success → CheckCircle + "Account created" + redirect countdown 2s
└── form
    ├── companyName display (Building2 icon)
    ├── email (read-only)
    ├── firstName (pre-filled if inviteData)
    ├── lastName (pre-filled)
    ├── password Input type password
    ├── confirmPassword
    └── Submit button "Accept invitation"
```

**ARIA:** form aria-labelledby="invite-title"  
**Focus trap:** none — single page  
**Mobile:** full-width inputs, min tap 44px

---

## DEEP-02-002 — POST /api/invite/accept (server)

**File:** `web/app/api/invite/accept/route.ts`

| Field | Validation |
|-------|------------|
| token | uuid, not expired, not consumed |
| password | min 8 |
| confirmPassword | must match password |

**Success response fields:**

```json
{
  "success": true,
  "needsCompanySetup": false,
  "needsEmployeeOnboarding": true,
  "employeeId": "uuid",
  "primaryRole": "employee"
}
```

**Errors:**

| HTTP | error |
|------|-------|
| 400 | Invalid or expired invitation |
| 400 | Passwords do not match |
| 409 | Invitation already accepted |

---

## DEEP-02-003 — Leave balance calculation L5

**Function:** `calculateLeaveDays(start, end, is_half_day)`

| Input | Output |
|-------|--------|
| same day, half_day true | 0.5 |
| same day, half_day false | 1 |
| Mon–Fri range | working days per company calendar |
| spans holiday | exclude holidays from step 9 config |

**Year:** `getLeaveBalanceYear(startDate)` — fiscal year from company leave_year_start

---

## DEEP-02-004 — LeaveRequest row on submit

| Column | Value |
|--------|-------|
| id | uuid |
| employee_id | ctx.employeeId |
| company_id | ctx.orgId |
| leave_type | UPPERCASE sanitized |
| start_date | Date |
| end_date | Date |
| total_days | calculated |
| reason | sanitized |
| status | pending (or approved if auto-approve) |
| approver_id | from resolveLeaveApprovers |
| is_half_day | boolean |
| attachment_url | optional |

---

## DEEP-02-005 — Auto-approve path (AI step 10)

When `ai.enabled` and days <= `autoApproveMaxDays` and confidence >= threshold:

- status = approved at insert time
- skip pending notification to manager OR send FYI only — match existing prod smoke behavior
- audit must record auto_approve reason

---

## DEEP-02-006 — Attendance GET response enhancement

**Existing keys preserved:** records, summary, etc.

**Add when `?today=1`:**

```json
{
  "today": {
    "dateKey": "2026-06-13",
    "check_in": "2026-06-13T04:30:00.000Z",
    "check_out": null,
    "status": "present",
    "hours": null,
    "is_wfh": false
  }
}
```

---

## DEEP-02-007 — dispatchNotification implementation sketch

```typescript
export async function dispatchNotification(input: DispatchInput) {
  const results = { email: 'skipped' as const, in_app: 'skipped' as const, whatsapp: 'skipped' as const };
  if (input.channels.includes('email')) {
    try { await sendEmailForEvent(input); results.email = 'sent'; } catch { results.email = 'failed'; }
  }
  if (input.channels.includes('in_app')) {
    try { await createInAppNotification(input); results.in_app = 'sent'; } catch { results.in_app = 'failed'; }
  }
  if (input.channels.includes('whatsapp')) {
    results.whatsapp = 'skipped'; // Chunk 05 wires sendTemplateMessage
  }
  return results;
}
```

---

## DEEP-02-008 — Prod smoke credential matrix

| Role | Env var pattern | Portal |
|------|-----------------|--------|
| admin | SMOKE_ADMIN_EMAIL | /admin |
| manager | created by smoke | /manager |
| employee | created by smoke | /employee |

**Never commit real passwords** — smoke generates random suffix per run

---

## DEEP-02-009 — Employee onboarding redirect chain

| Condition | Redirect |
|-----------|----------|
| welcome_pending | /employee/onboarding/welcome |
| onboarding fields incomplete | /employee/onboarding |
| complete | /employee/dashboard |

Middleware M4 in Chunk 01 must align

---

## DEEP-02-010 — Full error strings from attendance route

| Exact string | HTTP |
|--------------|------|
| Already checked in today. | 400 |
| WFH check-in is disabled by company policy. | 400 |
| You have not checked in today. | 400 |
| Invalid action | 400 |
| Rate limit exceeded. Try again later. | 429 |

---

## DEEP-02-011 — Tests C02-T26 – C02-T50

| ID | Description |
|----|-------------|
| C02-T26 | invite wrong password match client-side |
| C02-T27 | invite accept creates session cookie |
| C02-T28 | leave submit attachment_url optional omit |
| C02-T29 | approve reject reason max 500 |
| C02-T30 | manager AI recommendation present |
| C02-T31 | employee view own leave history only |
| C02-T32 | hr approve_any on stranger report |
| C02-T33 | clock out computes hours > 0 |
| C02-T34 | late status after grace cutoff |
| C02-T35 | payslip empty state UI |
| C02-T36 | profile PUT without phone ok |
| C02-T37 | emergency contact all three required |
| C02-T38 | normalizePhone lib unit 20 vectors |
| C02-T39 | revoke link on phone change mock |
| C02-T40 | dispatch skip whatsapp always chunk02 |
| C02-T41 | smoke manager escalate path |
| C02-T42 | smoke admin reject balance |
| C02-T43 | smoke auto-approve probe |
| C02-T44 | smoke payslip bytes > 4000 |
| C02-T45 | constraint engine 400 passthrough |
| C02-T46 | overlapping half day edge |
| C02-T47 | leave type case insensitive input |
| C02-T48 | rate limit approve 429 |
| C02-T49 | notice period employee blocked |
| C02-T50 | G1 three consecutive PASS artifacts |
