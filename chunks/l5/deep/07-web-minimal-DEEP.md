# L5-DEEP — Chunk 07: Web Minimal (Exhaustive)

> Companion to [`../07-web-minimal-L5.md`](../07-web-minimal-L5.md)

---

## DEEP-07-001 — Scope boundary (explicit OUT)

These admin surfaces are **smoke-only** (must load 200, not part of Zero UI UX audit):

- /admin/billing  
- /admin/compliance (deep)  
- /admin/rbac  
- /admin/shifts  
- /admin/salary-structures  
- /admin/salary-components  
- /admin/pf-reports  
- /admin/system-health  

---

## DEEP-07-002 — getting-started checklist items

| # | Item | Link | Auto-detect API |
|---|------|------|-----------------|
| 1 | Complete onboarding | /onboarding | company.onboarding_completed |
| 2 | Invite employees | /admin/people/invite | employee count > 1 |
| 3 | Add employee phones | /admin/people | phones populated |
| 4 | Connect WhatsApp | /admin/integrations/whatsapp | tenant config connected |
| 5 | Run test leave | /employee/request-leave | optional manual tick |

---

## DEEP-07-003 — people table phone column

**File:** `web/app/admin/(main)/people/people-table.tsx`

Add column:

| Column | Field | Empty display |
|--------|-------|---------------|
| Mobile | employee.phone | "—" with tooltip "Add for WhatsApp" |

**Row action:** Edit → modal with phone field

---

## DEEP-07-004 — notifications page WhatsApp note

Add info callout (not functional in Chunk 07):

```text
WhatsApp notifications are configured under Integrations → WhatsApp.
Email settings below apply to email channel only.
```

---

## DEEP-07-005 — fallback-routes-smoke.ts script spec

```typescript
const ROUTES_BY_ROLE = {
  admin: ['/admin/dashboard', '/admin/people', '/admin/integrations/whatsapp', ...],
  employee: ['/employee/dashboard', '/employee/profile', '/employee/profile/whatsapp', ...],
  manager: ['/manager/approvals', '/manager/profile', ...],
};

for (const [role, routes] of Object.entries(ROUTES_BY_ROLE)) {
  const cookie = await loginAs(role);
  for (const path of routes) {
    const res = await fetch(base + path, { headers: { cookie } });
    assert(res.status === 200, `${role} ${path} failed ${res.status}`);
  }
}
```

Exit code 0 only if all PASS

---

## DEEP-07-006 — sign-in returnUrl for deep links

WhatsApp messages include URLs like `{base}/employee/payslips`  
Unauthenticated → `/sign-in?returnUrl=/employee/payslips`  
After login → redirect returnUrl

**Middleware:** preserve query param through auth flow

---

## DEEP-07-007 — Profile pages to update (4 files)

- web/app/admin/(main)/profile/page.tsx  
- web/app/employee/(main)/profile/page.tsx  
- web/app/manager/(main)/profile/page.tsx  
- web/app/hr/(main)/profile/page.tsx  

All share phone field component — extract `ProfilePhoneField.tsx` in `web/components/profile/`

---

## DEEP-07-008 — WM-19 – WM-30

| ID | Test |
|----|------|
| WM-19 | ProfilePhoneField a11y |
| WM-20 | people table phone column render |
| WM-21 | getting-started auto tick onboarding |
| WM-22 | policy require_employee_phone invite validation |
| WM-23 | whatsapp page disconnect confirm modal |
| WM-24 | kill switch toggle PATCH API |
| WM-25 | employee whatsapp page linked state |
| WM-26 | wa.me link opens correct number |
| WM-27 | returnUrl after sign-in |
| WM-28 | admin smoke billing 200 |
| WM-29 | token CSS no hex hardcode grep |
| WM-30 | 60-min go-live script timed run |

---

## DEEP-07-009 — company-go-live-60min.md

Copy L5-07-008 table into `docs/runbooks/company-go-live-60min.md` with:

- Prerequisites (staging URL, Meta test app)  
- Rollback steps  
- Sign-off checkbox per minute

---

## DEEP-07-010 — File manifest Chunk 07

| Op | Path |
|----|------|
| CREATE | web/app/admin/integrations/whatsapp/page.tsx |
| CREATE | web/app/employee/profile/whatsapp/page.tsx |
| CREATE | web/components/profile/ProfilePhoneField.tsx |
| MODIFY | 4 profile pages |
| MODIFY | people/invite/page.tsx |
| MODIFY | people/people-table.tsx |
| MODIFY | web/lib/portal-policy-backfill.ts |
| CREATE | web/scripts/fallback-routes-smoke.ts |
| CREATE | docs/runbooks/company-go-live-60min.md |
