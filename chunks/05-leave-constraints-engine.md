# C05 — Leave Management & Constraint Engine

**Priority:** P0  
**Web:** `/api/leaves/*`, constraint check routes  
**External:** Render `continuum-constraint-engine` (Python)

---

## User story

Employee submits leave; constraint engine evaluates RULE001–RULE013; manager/HR approves; balances update.

---

## Connections

- Onboarding seeds leave types + constraints (C02)
- Policy settings UI (C04)
- Cron: leave accrual, SLA breach, year-end carry forward

---

## Defects

| ID | Issue |
|----|-------|
| C05-001 | **Render Git deploy broken** — repo 404 from Render API |
| C05-002 | Engine URL/env must match production (`CONSTRAINT_ENGINE_URL`) |
| C05-003 | Fallback when engine down — must fail closed with clear UX |

---

## Failure recovery

Engine timeout → retry with backoff; queue manual HR review; alert via cron SLA.

---

## Tests

`tests/leave-engine-dynamic.test.ts`, `tests/leave-routing-and-constraint-url-regression.test.ts`
