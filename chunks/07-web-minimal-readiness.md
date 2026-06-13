# Chunk 07 — Web Minimal Readiness (Full Specification)

> **Status:** `not_started` | **Depends on:** Chunk 01 | **Est.:** 5 dev-days  
> **L5 (implement from):** [`l5/07-web-minimal-L5.md`](./l5/07-web-minimal-L5.md)  
> **Scope:** Setup portal + phone + WhatsApp shell — NOT full UI audit (48 issues out of scope)

---

## L1 — Room purpose

**Room name:** Reception Desk  
**Business outcome:** Admin configures company and connects WhatsApp; employees maintain phone numbers; chat deep links open working fallback pages.  
**Revenue link:** Zero UI still needs web for **first-time setup** — broken reception = WhatsApp never connected = feature never sold.

---

## Must ship vs explicit deferrals

| Must ship (this chunk) | Defer (UI backlog) |
|------------------------|-------------------|
| Auth routes stable | Design token migration all 14 pages |
| Onboarding completes | Empty states on learning/reimbursements |
| Phone on profile + invite | super-admin/users CRITICAL audit |
| WhatsApp settings page shell | Duplicate component refactors |
| Fallback routes HTTP 200 | Tutorial modals |
| Setup hub link to WhatsApp | Reports builder UX |

---

## C7-01 — Auth entry routes

### Sign-in

| Property | Value |
|----------|-------|
| Route | `/sign-in` |
| Component | `web/components/ui/modern-stunning-sign-in.tsx` |
| Post-login admin incomplete onboarding | `router.push('/onboarding')` |
| Post-login complete | role portal via auth-routing |

**Test:** `web/tests/auth-flow.test.ts` — must assert `/onboarding` not `/onboarding/company`

### Sign-up

| Route | `/sign-up` |
| View | `web/components/pages/auth/sign-up-view.tsx` |
| Company mode redirect | `/onboarding` line ~259 |

### Invite accept

| Route | `/invite/accept/[token]` |
| View | `web/components/pages/onboarding/invite-accept-token-view.tsx` |
| needsCompanySetup redirect | `/onboarding` (line 133–134) ✓ |

---

## C7-02 — Admin setup surfaces (exact pages)

| # | Route | Page file | Zero UI dependency |
|---|-------|-----------|-------------------|
| 1 | `/admin/dashboard` | `web/app/admin/(main)/dashboard/page.tsx` | go-live confirmation |
| 2 | `/admin/getting-started` | `web/app/admin/(main)/getting-started/page.tsx` | setup checklist |
| 3 | `/admin/company-settings` | `web/app/admin/(main)/company-settings/page.tsx` | approval chains tab |
| 4 | `/admin/policy-settings` | `web/app/admin/(main)/policy-settings/page.tsx` | leave types |
| 5 | `/admin/holidays` | `web/app/admin/(main)/holidays/page.tsx` | constraint dates |
| 6 | `/admin/notifications` | `web/app/admin/(main)/notifications/page.tsx` | email fallback |
| 7 | `/admin/people/invite` | `web/app/admin/(main)/people/invite/page.tsx` | phone on invite |
| 8 | `/admin/integrations/whatsapp` | **CREATE** | WABA connect |
| 9 | `/admin/startup-readiness` | `web/app/admin/(main)/startup-readiness/page.tsx` | optional scorecard |

### Setup hub catalog entry

**Modify:** `web/lib/onboarding/setup-hub-catalog.ts`

Add item:

```typescript
{
  key: 'whatsapp_connect',
  categoryKey: 'workflows',
  title: 'Connect WhatsApp Business',
  description: 'Let employees manage HR via WhatsApp messages',
  href: '/admin/integrations/whatsapp',
  required: false,
  gate: { featureFlag: 'NEXT_PUBLIC_WHATSAPP_ENABLED' },
}
```

---

## C7-03 — Employee phone UI (field-level)

### Profile pages (implement phone UI on all 4)

**Shared spec for phone input block:**

| Element | Spec |
|---------|------|
| Label | "Mobile number" |
| Sub-label | "For WhatsApp HR verification" |
| Input name | `phone` |
| Component | `Input` from `@/components/ui/input` |
| Border | `var(--border)` |
| Validation client-side | regex after normalize attempt |
| Error inline | "Enter a valid number with country code (e.g. +91 98765 43210)." |
| Save button | existing profile save → PUT `/api/profile` body `{ firstName, lastName, phone, ... }` |

**Files to modify:**

- `web/app/employee/(main)/profile/page.tsx`
- `web/app/manager/(main)/profile/page.tsx`
- `web/app/hr/(main)/profile/page.tsx`
- `web/app/admin/(main)/profile/page.tsx`

(If profiles share one component, modify shared component path discovered via import)

### HR invite phone field

**File:** `web/app/admin/(main)/people/invite/page.tsx`

| Field | Required when |
|-------|---------------|
| phone | `portal_policy.messaging.require_employee_phone === true` |

**API:** extend `POST /api/hr/invites` to accept `phone`, normalize, store on created Employee

---

## C7-04 — WhatsApp admin page shell

**Create:** `web/app/admin/integrations/whatsapp/page.tsx`

### Layout sections

| Section | Content |
|---------|---------|
| Header | H1 "WhatsApp Business" — font from `--font-sans`, color `var(--foreground)` |
| Status card | badge: disconnected\|connected\|error |
| Connected details | display phone, connected date, messaging enabled toggle |
| Actions | Connect / Disconnect / Send test message |
| Help link | Meta Business Help doc external link |

### Feature flag

```typescript
if (process.env.NEXT_PUBLIC_WHATSAPP_ENABLED !== 'true') {
  notFound();
}
```

### Nav entry

**Modify:** admin sidebar config (locate in layout or nav component under `web/app/admin/(main)/layout.tsx` or `web/lib/navigation/portal-nav.ts`)

Add item:

```typescript
{ label: 'WhatsApp', href: '/admin/integrations/whatsapp', icon: MessageCircle, roles: ['admin', 'hr'] }
```

---

## C7-05 — Link WhatsApp from web profile

**Create:** `web/app/employee/profile/whatsapp/page.tsx`  
**Route alias:** optional `/employee/profile/whatsapp`

### UI flow

| Step | UI |
|------|-----|
| 1 | Show company WhatsApp display number from GET `/api/admin/integrations/whatsapp` (employee-safe endpoint: display number only) |
| 2 | Button "Open WhatsApp" → `https://wa.me/{number}?text=LINK%20{oneTimeToken}` |
| 3 | Poll GET `/api/channel/verify/status` until linked |

**Create API:** `POST /api/channel/verify/link-from-web` — issues token bound to session employee, 10 min TTL

---

## C7-06 — Fallback deep links

### URLs assistant must generate

**Base:** `process.env.NEXT_PUBLIC_APP_URL` — no trailing slash

| Action | Path pattern |
|--------|--------------|
| Request leave | `/{portalSlug}/request-leave` |
| Leave history | `/{portalSlug}/leave-history` |
| Attendance | `/{portalSlug}/attendance` |
| Payslips | `/{portalSlug}/payslips` |
| Approvals (manager) | `/manager/approvals` |
| Profile | `/{portalSlug}/profile` |
| Module disabled | `/module-disabled?module={slug}` |

**portalSlug values:** from `resolvePortalSlugFromRole` — employee→`employee`, manager→`manager`, hr→`hr`, admin→`admin`

### Fallback route smoke

**Create:** `web/scripts/fallback-routes-smoke.ts`

For each role cookie session:

| Route | Expected HTTP |
|-------|---------------|
| employee routes above | 200 |
| unauthenticated | 302 to `/sign-in?returnUrl=...` |

---

## C7-07 — 60-minute go-live script

**Create:** `docs/runbooks/company-go-live-60min.md`

| Min | Actor | Action | Verify |
|-----|-------|--------|--------|
| 0–5 | Admin | Sign up at `/sign-up` | lands `/onboarding` |
| 5–25 | Admin | Complete 13 steps | `onboarding_completed=true` |
| 25–30 | Admin | Open `/admin/people/invite` | page loads |
| 30–40 | Admin | Invite 3 employees with phone | emails sent |
| 40–50 | Employees | Accept invite | active status |
| 50–55 | Admin | `/admin/integrations/whatsapp` connect | status connected |
| 55–60 | Employee | WhatsApp "HELP" | menu reply |

---

## C7-08 — Module disabled page

**Verify route exists:** `/module-disabled`  
**Query:** `?module=payroll`  
**Copy:** "The Payroll module isn't enabled. Contact your administrator."

---

## Chunk 07 gate

| # | Check |
|---|-------|
| 1 | Phone saves E.164 on all profile portals |
| 2 | Invite accepts optional/required phone per policy |
| 3 | WhatsApp page reachable when flag on |
| 4 | fallback-routes-smoke.ts PASS |
| 5 | go-live-60min.md dry-run once on staging |

---

## Files summary

| Action | Path |
|--------|------|
| Create | `web/app/admin/integrations/whatsapp/page.tsx` |
| Create | `web/app/employee/profile/whatsapp/page.tsx` |
| Create | `web/app/api/channel/verify/link-from-web/route.ts` |
| Create | `web/app/api/channel/verify/status/route.ts` |
| Create | `web/scripts/fallback-routes-smoke.ts` |
| Create | `docs/runbooks/company-go-live-60min.md` |
| Modify | profile pages (×4), invite page, setup-hub-catalog.ts, portal-nav |

---

## Appendix A — Admin company-settings tabs (reference for setup)

**File:** `web/app/admin/(main)/company-settings/page.tsx`

| Tab query | Purpose | Zero UI dependency |
|-----------|---------|-------------------|
| `?tab=general` | timezone, country, currency | attendance timezone |
| `?tab=approval-chains` | leave approvers | leave routing |
| `?tab=org-structure` | departments | display only in chat |
| `?tab=modules` | enabled modules (owner) | assertModule |

Admin must complete these **before** WhatsApp pilot if approval chain empty → chat leave submit assigns wrong approver

---

## Appendix B — Employee portal routes (fallback map)

| Route | Page file | Min content for smoke |
|-------|-----------|----------------------|
| `/employee/dashboard` | `web/app/employee/(main)/dashboard/page.tsx` | loads, shows balance widget or empty |
| `/employee/request-leave` | employee request leave page | form renders |
| `/employee/leave-history` | leave history page | table or empty state |
| `/employee/attendance` | attendance page | clock buttons or status |
| `/employee/payslips` | payslips page | list or empty |
| `/employee/profile` | profile page | phone field present |
| `/manager/approvals` | manager approvals | queue or empty |
| `/hr/dashboard` | hr dashboard | loads |

**Smoke does not require** pixel-perfect UI — only HTTP 200 + no uncaught error boundary

---

## Appendix C — WhatsApp admin page wireframe (text)

```text
┌────────────────────────────────────────────────────────────┐
│ WhatsApp Business                          [? Help]        │
├────────────────────────────────────────────────────────────┤
│ Status: ● Connected                                        │
│ Number: +91 95159 51642                                    │
│ Connected: 13 Jun 2026                                     │
│                                                            │
│ [x] Enable WhatsApp HR messaging for employees             │
│                                                            │
│ [ Send test message ]  [ Disconnect ]                      │
├────────────────────────────────────────────────────────────┤
│ How it works                                               │
│ 1. Employees verify their phone in profile or via chat   │
│ 2. They message this number on WhatsApp                    │
│ 3. They can request leave, clock in, get payslips        │
└────────────────────────────────────────────────────────────┘
```

**Disconnected state:** Status ● Not connected, primary button [ Connect WhatsApp Business ]

---

## Appendix D — portal_policy.messaging JSON schema

**Stored in:** `CompanySettings.portal_policy` (extend via backfill)

```typescript
interface MessagingPolicy {
  require_employee_phone: boolean;      // default false
  whatsapp_opt_in_required: boolean;    // default true
  chat_retention_days: number;          // default 90
  whatsapp_welcome_sent: boolean;       // internal
}
```

**Backfill file:** `web/lib/portal-policy-backfill.ts` — add `backfillMessagingPolicy()`

---

## Appendix E — Profile phone validation (lib spec)

**File:** `web/lib/phone/normalize.ts`

```typescript
export type NormalizeResult =
  | { ok: true; e164: string; countryCode: string; nationalNumber: string }
  | { ok: false; code: 'INVALID_PHONE'; message: string };

export function normalizePhone(input: string, defaultCountry = 'IN'): NormalizeResult
```

| Input example | Output e164 |
|---------------|-------------|
| `9876543210` + default IN | `+919876543210` |
| `+91 98765 43210` | `+919876543210` |
| `919876543210` | `+919876543210` |
| `abc` | INVALID_PHONE |

**Dependency:** `libphonenumber-js` (add to web/package.json if not present)

---

## Appendix F — Test cases (web minimal)

| ID | Scenario | Expected |
|----|----------|----------|
| WM-01 | Save profile phone valid | 200, DB updated |
| WM-02 | Save profile phone invalid | 400 INVALID_PHONE |
| WM-03 | Invite with phone required flag | 400 if missing |
| WM-04 | WhatsApp page flag off | 404 |
| WM-05 | WhatsApp page flag on admin | 200 |
| WM-06 | Employee cannot access admin whatsapp | 403 or redirect |
| WM-07 | Deep link unauthenticated | redirect sign-in with returnUrl |
| WM-08 | Phone change revokes link | link.revoked_at set |
