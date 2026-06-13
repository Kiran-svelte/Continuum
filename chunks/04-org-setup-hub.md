# C04 — Organization Setup Hub (Admin)

**Priority:** P1  
**Route:** `/admin/setup-wizard`  
**Lib:** `lib/onboarding/setup-hub-catalog.ts`, `setup-hub-progress.ts`

---

## User story

Admin configures org post-onboarding via Zoho-style hub cards (company profile, departments, leave policy, etc.) with DB-backed completion chips.

---

## Connections

- Nav: `portal-nav.ts` → Organization Setup
- Module gates per card (`moduleSlug`)
- Links to `/admin/company-settings`, `/hr/policy-settings`, etc.

---

## Defects

| ID | Issue |
|----|-------|
| C04-001 | Hub progress validators must match actual DB state (not hardcoded) |
| C04-002 | Duplicate wizard concepts: linear 6-step vs hub vs 13-step onboarding |

---

## Failure recovery

Card misreports complete → refresh progress API; validators re-query Prisma.

---

## Tests

`tests/setup-wizard-module-hub.test.ts`, `tests/admin-setup-module-experience.test.ts`
