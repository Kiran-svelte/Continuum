# L5-DEEP — Chunk 01: Company Lifecycle (Exhaustive supplement)

> Companion to [`../01-company-lifecycle-L5.md`](../01-company-lifecycle-L5.md) — pushes Part-B toward 800+ combined lines

---

## DEEP-01-001 — Onboarding step titles and subtitles (UI copy)

| Step | Title | Subtitle |
|------|-------|----------|
| 1 | Company basics | Legal name, timezone, and working hours |
| 2 | Organization structure | Departments, locations, cost centers |
| 3 | Approval mapping | Who approves leave, expenses, and more |
| 4 | Active modules | Choose HR modules for your company |
| 5 | Role structure | Define roles and authority levels |
| 6 | Leave types | Configure leave policies |
| 7 | Role quotas | Annual leave quotas by role |
| 8 | Attendance rules | Check-in windows and WFH policy |
| 9 | Holidays | Company holiday calendar |
| 10 | AI & automation | Smart approvals and escalation |
| 11 | Payroll defaults | PF, ESI, TDS, pay day |
| 12 | Notifications | Email and alert preferences |
| 13 | Review & complete | Confirm and go live |

---

## DEEP-01-002 — Progress indicator UI

- Component: horizontal stepper or numbered circles  
- `currentStep / visibleSteps.length` in header  
- Completed steps: checkmark icon, `--success` token  
- Skipped steps: dashed circle, listed in review panel  
- Mobile: collapse to "Step {n} of {total}" text only

---

## DEEP-01-003 — localStorage draft recovery

**Key:** `continuum:onboarding:progress:v1`

**Shape:**

```json
{
  "version": 1,
  "lastStep": 3,
  "skippedSteps": [2],
  "draft": { "company": {}, "orgStructure": {} },
  "savedAt": "ISO8601"
}
```

**On load:** merge with GET step API response — server wins on conflict for completed steps

**Clear on:** finalize success

---

## DEEP-01-004 — join company signup mode

| Field | Required |
|-------|----------|
| joinCode | yes — 8 char company.join_code |

**POST signup mode=join:**

- Finds company by join_code  
- Creates employee with primary_role from invite policy or default employee  
- Does NOT create new Company row  
- Redirect: `/employee/onboarding` or dashboard

---

## DEEP-01-005 — Super admin company creation (out of Zero UI path)

Super admin uses `/super-admin/companies` — not onboarding wizard  
Zero UI pre-flight uses **admin signup → /onboarding** path only

---

## DEEP-01-006 — assertModule implementation reference

**File:** `web/lib/core-functions/assert-module.ts`

```typescript
export async function assertModule(orgId: string, slug: ModuleSlug): Promise<void> {
  const enabled = await getEnabledModules(orgId);
  if (!enabled.includes(slug)) {
    throw new ModuleDisabledError(slug);
  }
}
```

**moduleDisabledResponse:** HTTP 403, `{ error: { code: 'MODULE_DISABLED', message: '...', module: slug } }`

---

## DEEP-01-007 — Approval chain DB model (conceptual)

| Field | Example |
|-------|---------|
| workflow_type | leave |
| level | 1 |
| approver_role_slug | manager |
| auto_approve_after_hours | 48 |

**resolveLeaveApprovers order:** level 1 → level 2 → fallback manager_id

---

## DEEP-01-008 — Finalize transaction steps (completeOnboardingState)

1. Read onboarding_draft from CompanySettings.hr_alerts  
2. Upsert departments, locations, leave types, roles from draft  
3. Apply enabled_modules to CompanySettings  
4. Set Company.onboarding_completed = true, onboarding_step = 13  
5. Set admin employee department/designation/DOJ/manager if collected  
6. Seed default LeaveBalance rows for admin if applicable  
7. Create audit log  
8. Clear onboarding_draft or mark completed

---

## DEEP-01-009 — C01-T41 – C01-T60

| ID | Test |
|----|------|
| C01-T41 | skip step 2 still finalize ok |
| C01-T42 | back button preserves draft |
| C01-T43 | double finalize idempotent |
| C01-T44 | GET step returns merged company row |
| C01-T45 | invalid step 0 400 |
| C01-T46 | invalid step 14 400 |
| C01-T47 | org model full_hierarchy saved |
| C01-T48 | approval travel chain saved not used in v1 assistant |
| C01-T49 | module cap super_admin enforced step 4 |
| C01-T50 | role slug invalid regex 400 |
| C01-T51 | leave type encashment flags persist |
| C01-T52 | attendance workingDays weekend |
| C01-T53 | holiday disabled excluded from calc |
| C01-T54 | ai escalation rules array max 10 |
| C01-T55 | payroll pfCeiling boundary |
| C01-T56 | notifications all false ok |
| C01-T57 | middleware employee blocked from admin onboarding |
| C01-T58 | company-setup-guard on PATCH employee |
| C01-T59 | audit-module-guards zero FAIL |
| C01-T60 | G2 checklist all items |

---

## DEEP-01-010 — onboarding-data-map.md required sections

1. Step → table mapping (from L5-01-PART-H)  
2. Draft JSON schema full example  
3. Finalize order diagram  
4. Rollback procedure if finalize partial fail  
5. FAQ for support team
