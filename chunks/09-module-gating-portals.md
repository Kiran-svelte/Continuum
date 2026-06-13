# C09 — Module Gating & Portals

**Priority:** P0  
**Catalog:** `lib/core-functions/catalog.ts` (CF-001..015)  
**Runtime:** `CompanySettings.hr_alerts.enabled_modules`, super_admin cap

---

## User story

Super admin caps modules; company admin enables subset; employees only see nav/API for enabled modules.

---

## Connections

- Every module-bound API calls `assertModule(orgId, slug)`
- Nav: `portal-nav.ts` + `enabledModules` from `/api/auth/me`
- Onboarding step 4 module picker

---

## Defects

| ID | Issue |
|----|-------|
| C09-001 | Nav shows routes user cannot API-access |
| C09-002 | Module cap vs enabled_modules drift |
| C09-003 | Payroll/compliance modules partially wired (PR14) |

---

## Failure recovery

Module disabled mid-session → 403 on API; nav refresh from `/api/auth/me`.

---

## Tests

`tests/core-functions-gating.test.ts`, `tests/module-runtime-gates.test.ts`, `tests/rbac-module-gating.test.ts`
