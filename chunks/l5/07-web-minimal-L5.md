# L5 — Chunk 07: Web Minimal Readiness Internals

> Parent: `../07-web-minimal-readiness.md`

---

## L5-07-001 — Admin route registry (every path + file)

| Route | File | Auth role | Zero UI role |
|-------|------|-----------|--------------|
| /admin/dashboard | web/app/admin/(main)/dashboard/page.tsx | admin | go-live home |
| /admin/getting-started | web/app/admin/(main)/getting-started/page.tsx | admin | checklist |
| /admin/company-settings | web/app/admin/(main)/company-settings/page.tsx | admin | approval chains |
| /admin/policy-settings | web/app/admin/(main)/policy-settings/page.tsx | admin | leave types |
| /admin/holidays | web/app/admin/(main)/holidays/page.tsx | admin | holidays |
| /admin/notifications | web/app/admin/(main)/notifications/page.tsx | admin | email fallback |
| /admin/people | web/app/admin/(main)/people/page.tsx | admin | roster |
| /admin/people/invite | web/app/admin/(main)/people/invite/page.tsx | admin | phone on invite |
| /admin/integrations/whatsapp | web/app/admin/integrations/whatsapp/page.tsx | admin/hr | **CREATE** WABA |
| /admin/audit-logs | web/app/admin/(main)/audit-logs/page.tsx | admin | channel filter |
| /admin/startup-readiness | web/app/admin/(main)/startup-readiness/page.tsx | admin | optional score |

---

## L5-07-002 — Employee portal fallback routes

| Route | File |
|-------|------|
| /employee/dashboard | web/app/employee/(main)/dashboard/page.tsx |
| /employee/request-leave | web/app/employee/(main)/request-leave/page.tsx (verify path) |
| /employee/leave-history | web/app/employee/(main)/leave-history/page.tsx |
| /employee/attendance | web/app/employee/(main)/attendance/page.tsx |
| /employee/payslips | web/app/employee/(main)/payslips/page.tsx |
| /employee/profile | web/app/employee/(main)/profile/page.tsx |
| /employee/profile/whatsapp | web/app/employee/profile/whatsapp/page.tsx **CREATE** |
| /manager/approvals | web/app/manager/(main)/approvals/page.tsx |

**Smoke script:** `web/scripts/fallback-routes-smoke.ts` — authenticate each role, GET each route, assert status 200, no Error boundary

---

## L5-07-003 — Profile phone UI component spec

**Insert into each profile page:**

```tsx
<div className="space-y-2">
  <label htmlFor="phone" className="text-sm font-medium text-[var(--foreground)]">
    Mobile number
  </label>
  <p className="text-xs text-[var(--muted-foreground)]">
    Used to verify WhatsApp HR. Must match your WhatsApp number.
  </p>
  <Input
    id="phone"
    name="phone"
    type="tel"
    autoComplete="tel"
    placeholder="+91 98765 43210"
    value={phone}
    onChange={(e) => setPhone(e.target.value)}
    className="border-[var(--border)]"
  />
  {phoneError && (
    <p className="text-xs text-[var(--destructive)]">{phoneError}</p>
  )}
</div>
```

**phoneError text:** "Enter a valid number with country code (e.g. +91 98765 43210)."

**On save:** PUT /api/profile with firstName, lastName, phone

---

## L5-07-004 — Invite phone field

**File:** web/app/admin/(main)/people/invite/page.tsx

**Add when `require_employee_phone`:**

```tsx
<Input
  label="Mobile (WhatsApp)"
  required={messagingPolicy.require_employee_phone}
  ...
/>
```

**POST /api/hr/invites body extension:**

```json
{ "email": "...", "firstName": "...", "lastName": "...", "role": "employee", "phone": "+919876543210" }
```

---

## L5-07-005 — portal_policy.messaging schema

**Extend backfill in web/lib/portal-policy-backfill.ts:**

```typescript
export interface MessagingPolicy {
  require_employee_phone: boolean;     // default false
  whatsapp_opt_in_required: boolean;   // default true
  chat_retention_days: number;         // default 90
}

export function backfillMessagingPolicy(raw: unknown): MessagingPolicy {
  return {
    require_employee_phone: asBoolean(obj.require_employee_phone, false),
    whatsapp_opt_in_required: asBoolean(obj.whatsapp_opt_in_required, true),
    chat_retention_days: asNumber(obj.chat_retention_days, 90, 30, 365),
  };
}
```

**Stored at:** `CompanySettings.portal_policy.messaging`

---

## L5-07-006 — WhatsApp admin page states

| state | badge class | primaryButton |
|-------|-------------|---------------|
| disconnected | text-muted-foreground ● Not connected | Connect WhatsApp Business |
| connecting | Loader2 animate-spin | disabled |
| connected | text-green-600 ● Connected | Send test message |
| error | text-destructive ● Error | Reconnect |

**Feature flag guard:**

```typescript
import { notFound } from 'next/navigation';
if (process.env.NEXT_PUBLIC_WHATSAPP_ENABLED !== 'true') notFound();
```

---

## L5-07-007 — Link from web flow

**POST /api/channel/verify/link-from-web**

**Auth:** session required

**Response:**

```json
{ "token": "uuid", "expiresAt": "ISO", "whatsappUrl": "https://wa.me/919515951642?text=LINK%20{token}" }
```

**Webhook handler:** if text matches `/^LINK\s+(\S+)/` → validate token → create ChannelIdentityLink without OTP

---

## L5-07-008 — 60-minute go-live script (minute-by-minute)

| Min | Actor | URL / API | Verify |
|-----|-------|-----------|--------|
| 0 | Admin | /sign-up company mode | account created |
| 2 | Admin | /onboarding step 1-13 | each POST 200 |
| 25 | Admin | finalize | onboarding_completed true |
| 27 | Admin | /admin/people/invite ×3 with phone | 200 |
| 35 | Employee | /invite/accept/[token] | active |
| 40 | Employee | /employee/profile phone save | E.164 in DB |
| 45 | Admin | /admin/integrations/whatsapp connect | status connected |
| 50 | Employee | WhatsApp "HELP" | menu reply |
| 55 | Employee | leave flow CONFIRM | LeaveRequest row |
| 60 | QA | audit log channel=whatsapp | row exists |

---

## L5-07-009 — Deep link URL builder

```typescript
export function buildPortalDeepLink(portalSlug: string, path: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL!.replace(/\/$/, '');
  return `${base}/${portalSlug}${path.startsWith('/') ? path : `/${path}`}`;
}
```

| Action | path arg |
|--------|----------|
| request leave | /request-leave |
| payslips | /payslips |
| attendance | /attendance |
| approvals | /approvals (manager portalSlug) |

---

## L5-07-010 — WM test catalog

| ID | Test |
|----|------|
| WM-01 | profile phone valid |
| WM-02 | profile phone invalid |
| WM-03 | invite phone required flag |
| WM-04 | whatsapp page 404 when flag off |
| WM-05 | whatsapp page 200 admin when flag on |
| WM-06 | employee blocked from admin whatsapp API |
| WM-07 | unauthenticated deep link → sign-in?returnUrl |
| WM-08 | phone change revokes link |

---

## L5-07-PART-B — Full admin route registry (30 routes)

| Route | File | Zero UI priority |
|-------|------|------------------|
| /admin/dashboard | dashboard/page.tsx | P1 |
| /admin/getting-started | getting-started/page.tsx | P1 |
| /admin/company-settings | company-settings/page.tsx | P1 |
| /admin/policy-settings | policy-settings/page.tsx | P1 |
| /admin/holidays | holidays/page.tsx | P2 |
| /admin/notifications | notifications/page.tsx | P2 |
| /admin/people | people/page.tsx | P1 |
| /admin/people/invite | people/invite/page.tsx | P1 |
| /admin/integrations/whatsapp | integrations/whatsapp/page.tsx | P1 CREATE |
| /admin/audit-logs | audit-logs/page.tsx | P2 |
| /admin/startup-readiness | startup-readiness/page.tsx | P3 |
| /admin/leave-requests | leave-requests/page.tsx | P2 fallback |
| /admin/payroll | payroll/page.tsx | P3 |
| /admin/profile | profile/page.tsx | P1 phone |
| /admin/login | login/page.tsx | auth |

**Out of Zero UI pre-flight scope:** billing, pf-reports, compliance deep config, rbac editor, shifts, salary-structures (must not 500 — smoke only)

---

## L5-07-PART-C — WhatsApp admin page wireframe (ASCII)

```text
+--------------------------------------------------+
| Integrations > WhatsApp Business                  |
+--------------------------------------------------+
| Status: ● Connected    +91 95159 51642           |
| Connected: 13 Jun 2026                            |
| [ ] Messaging enabled (kill switch)               |
|                                                   |
| [ Send test message ]  [ Disconnect ]             |
|                                                   |
| Employees linked: 12 / 45                           |
| Last error: —                                       |
|                                                   |
| ☐ I confirm I am authorized to connect...         |
| [ Connect WhatsApp Business ]  (if disconnected)  |
+--------------------------------------------------+
```

---

## L5-07-PART-D — Employee WhatsApp profile page

**Route:** `/employee/profile/whatsapp`

| State | UI |
|-------|-----|
| not linked | "Link WhatsApp" → POST link-from-web → QR/wa.me link |
| pending OTP | instructions + verify on WhatsApp |
| linked | ● Connected, phone masked, [Unlink] |
| revoked | Re-link CTA |

**Unlink:** POST /api/channel/verify/unlink → revoke link

---

## L5-07-PART-E — Audit log channel filter UI

**File:** admin/audit-logs/page.tsx

**Add filter dropdown:** Source = All | Web | WhatsApp | Assistant  
**Maps to audit newState.source / channel fields from L5-06-001

---

## L5-07-PART-F — Accessibility requirements

| Element | Requirement |
|---------|-------------|
| Phone input | aria-describedby helper text |
| WhatsApp connect | checkbox aria-required |
| Status badge | role=status |
| Kill switch | aria-label "Disable WhatsApp messaging" |

---

## L5-07-PART-G — Token CSS (no hardcoded colors)

| Element | Token |
|---------|-------|
| Connected badge | text-[var(--success)] or semantic green token |
| Error | text-[var(--destructive)] |
| Card border | border-[var(--border)] |
| Page bg | bg-[var(--background)] |

---

## L5-07-PART-H — Extended WM tests WM-09 – WM-18

| ID | Test |
|----|------|
| WM-09 | admin profile phone save |
| WM-10 | hr can access whatsapp page |
| WM-11 | manager blocked whatsapp admin |
| WM-12 | link-from-web token expiry |
| WM-13 | unlink revokes DB row |
| WM-14 | audit filter whatsapp |
| WM-15 | getting-started mentions WhatsApp |
| WM-16 | invite without phone when not required |
| WM-17 | deep link request-leave 200 |
| WM-18 | fallback-routes-smoke all PASS |
