# Zero UI Pre-Flight — Master Specification Index

> **Plan ID:** `zero-ui-preflight-2026`  
> **Spec level:** 4 (chunk overview) + **5 (L5 internals — implement from L5)**  
> **L5 folder:** [`./l5/README.md`](./l5/README.md) — field-by-field specs; **if not in L5, do not build**  
> **Traceability:** [`./l5/00-traceability-matrix.md`](./l5/00-traceability-matrix.md)  
> **Authoritative app root:** `web/`  
> **Product thesis:** Continuum monetizes per-company HR subscriptions (modules + seats). Zero UI (WhatsApp) increases daily active usage → lower churn → higher expansion revenue (payroll, attendance modules). **If the hospital foundation is cracked, the WhatsApp ICU will kill patients.**

---

## How money connects to this pre-flight

| Revenue lever | What must work without browser | Chunk |
|---------------|-------------------------------|-------|
| **Tenant activation** | Admin completes onboarding in <60 min; no support DB fixes | 01 |
| **Seat expansion** | Invite → accept → active employee with phone on profile | 02, 07 |
| **Module upsell** | Disabled module = hard 403 API + hidden nav | 01 |
| **Daily engagement (Zero UI)** | Leave, attendance, payslip via headless executor | 02, 03, 04 |
| **Trust / compliance** | Audit log, tenant isolation, no PII leaks | 06 |
| **WhatsApp connect (future)** | Admin connects WABA; employee verifies phone | 05, 07 |

**Pricing implication:** Companies paying for "Leave + Attendance + Payroll" must get working APIs for those three before WhatsApp launch. Selling Zero UI on a broken payroll engine creates refunds, not ARR.

---

## Specification levels (Hospital Analogy mapped to Continuum)

| Level | Hospital | Continuum Zero UI pre-flight |
|-------|----------|------------------------------|
| **L1 Building** | "Build a hospital" | "Make Continuum trustworthy without a browser" |
| **L2 Rooms** | ICU, labs, patient rooms | Company lifecycle, employee lifecycle, channel API, assistant, WhatsApp, security, web setup, QA |
| **L3 Components** | Bed, ECG, WiFi | Onboarding wizard, leave submit API, channel identity table, webhook |
| **L4 Specs** | Bed: 200kg, white, 4 castors | `POST /api/leaves/submit` Zod schema, exact error strings, RBAC codes |
| **L5 Internals** | ECG battery 5000mAh | Prisma fields, JWT cookie name, idempotency key hash algorithm |

**Developer rule:** If a field, button, error code, or permission is not in **L5** (`chunks/l5/*-L5.md` + `chunks/l5/deep/*-DEEP.md`), **do not implement it**. Ask product owner to amend L5.

---

## Chunk map (overview + L5 internals)

| Chunk | Overview | **L5 (main + DEEP)** | Est. days |
|-------|----------|----------------------|-----------|
| 01 | [01](./01-core-product-company-lifecycle.md) | [L5](./l5/01-company-lifecycle-L5.md) · [DEEP](./l5/deep/01-company-lifecycle-DEEP.md) | 10–15 |
| 02 | [02](./02-core-product-employee-hr-flows.md) | [L5](./l5/02-employee-hr-flows-L5.md) · [DEEP](./l5/deep/02-employee-hr-flows-DEEP.md) | 10–15 |
| 03 | [03](./03-api-channel-ready.md) | [L5](./l5/03-api-channel-ready-L5.md) · [DEEP](./l5/deep/03-api-channel-ready-DEEP.md) | 8–10 |
| 04 | [04](./04-ai-assistant-expansion.md) | [L5](./l5/04-assistant-expansion-L5.md) · [DEEP](./l5/deep/04-assistant-expansion-DEEP.md) | 10–15 |
| 05 | [05](./05-whatsapp-meta-integration.md) | [L5](./l5/05-whatsapp-meta-L5.md) · [DEEP](./l5/deep/05-whatsapp-meta-DEEP.md) | 15–20 |
| 06 | [06](./06-security-compliance-ops.md) | [L5](./l5/06-security-ops-L5.md) · [DEEP](./l5/deep/06-security-ops-DEEP.md) | 5–8 |
| 07 | [07](./07-web-minimal-readiness.md) | [L5](./l5/07-web-minimal-L5.md) · [DEEP](./l5/deep/07-web-minimal-DEEP.md) | 5 |
| 08 | [08](./08-testing-documentation-gates.md) | [L5](./l5/08-testing-gates-L5.md) · [DEEP](./l5/deep/08-testing-gates-DEEP.md) | 5 |

**Cross-chunk traceability:** [l5/00-traceability-matrix.md](./l5/00-traceability-matrix.md)

---

## Chunk map (legacy table — dependencies)

| Chunk | File | L2 Room | Est. days | Depends on |
|-------|------|---------|-----------|------------|
| 01 | [01-core-product-company-lifecycle.md](./01-core-product-company-lifecycle.md) | Company setup wing | 10–15 | — |
| 02 | [02-core-product-employee-hr-flows.md](./02-core-product-employee-hr-flows.md) | Patient + staff daily ops | 10–15 | 01 |
| 03 | [03-api-channel-ready.md](./03-api-channel-ready.md) | Plumbing / identity | 8–10 | 01, 02 |
| 04 | [04-ai-assistant-expansion.md](./04-ai-assistant-expansion.md) | Nurse station (assistant) | 10–15 | 03 |
| 05 | [05-whatsapp-meta-integration.md](./05-whatsapp-meta-integration.md) | Ambulance entrance (WhatsApp) | 15–20 | 03, 04, gates |
| 06 | [06-security-compliance-ops.md](./06-security-compliance-ops.md) | Safety inspector | 5–8 | 03 |
| 07 | [07-web-minimal-readiness.md](./07-web-minimal-readiness.md) | Reception desk (setup UI) | 5 | 01 |
| 08 | [08-testing-documentation-gates.md](./08-testing-documentation-gates.md) | Final inspection | 5 | 01–04, 06 |

---

## Master go/no-go gates (binary — no "mostly")

| Gate | Condition | Proof artifact | Owner |
|------|-----------|----------------|-------|
| **G1** | `web/scripts/prod-smoke-proof.ts` → SUCCESS, **3 consecutive runs**, same staging URL | `docs/proofs/PREFLIGHT_SMOKE_INDEX.md` + 3 markdown proofs | QA |
| **G2** | Zero active wizard UI at `/onboarding/company`; all entry routes → `/onboarding` | Grep report + `onboarding-step-contract-sync.test.ts` | Eng |
| **G3** | `submitLeaveService(ctx)` + `approveLeaveService(ctx)` pass with **no HTTP cookie** | `tests/channel-executor-headless.test.ts` | Eng |
| **G4** | `web/docs/ZERO_UI_V1_ACTIONS.md` complete; all v1 headless tests green | Test output + doc PR | Product + Eng |
| **G5** | `ChannelIdentityLink` migrated; OTP verify API tested | `tests/channel-verify.test.ts` | Eng |
| **G6** | Meta test WABA sends/receives | `docs/proofs/meta-waba-ready.md` (no secrets) | Ops |

**Chunk 05 MUST NOT start until G1–G6 are all PASS.**

---

## v1 Zero UI action catalog (frozen)

| # | User phrase (examples) | Permission | Module | Service function | HTTP route (legacy) |
|---|------------------------|------------|--------|------------------|---------------------|
| A1 | "request sick leave", "apply leave" | `leave.apply_own` | `leave` | `submitLeaveService` | `POST /api/leaves/submit` |
| A2 | "my balance", "how many casual leaves" | `leave.apply_own` | `leave` | `getLeaveBalancesService` | `GET /api/leaves/balances` |
| A3 | "my leaves", "pending requests" | `leave.apply_own` | `leave` | `listOwnLeavesService` | `GET /api/leaves/list` |
| A4 | "cancel my leave" | `leave.apply_own` | `leave` | `cancelLeaveService` | `POST /api/leaves/cancel/[requestId]` |
| A5 | "pending approvals" | `leave.approve_team` OR `leave.approve_any` | `leave` | `listPendingApprovalsService` | `GET /api/manager/pending-approvals` |
| A6 | "approve leave", "reject leave" | `leave.approve_team` OR `leave.approve_any` | `leave` | `approveLeaveService` / `rejectLeaveService` | `POST /api/leaves/approve/[id]`, reject route |
| A7 | "clock in", "clock out" | `attendance.mark_own` | `attendance` | `clockAttendanceService` | `POST /api/attendance` |
| A8 | "am I checked in", "today attendance" | `attendance.mark_own` | `attendance` | `getTodayAttendanceService` | `GET /api/attendance` |
| A9 | "my payslip", "salary slip" | own data (employee) | `payroll` | `getLatestPayslipService` | `GET /api/payroll/slips` |
| A10 | "why can't I take leave", "best dates" | read-only | `leave` | insight handlers | N/A (read DB) |

**Out of v1 (explicit):** bulk approve, payroll run, invite user, settings change, reimbursement, regularization.

---

## Canonical repo surfaces (do not use `web/web/`)

| Domain | Primary files |
|--------|-----------------|
| Onboarding UI | `web/app/onboarding/page.tsx` → `web/components/pages/onboarding/onboarding-view.tsx` |
| Onboarding contract | `web/lib/onboarding-step-contract.ts` (`TOTAL_ONBOARDING_STEPS = 13`) |
| Legacy onboarding (remove) | `web/app/onboarding/company/page.tsx` |
| Auth sign-in | `web/components/ui/modern-stunning-sign-in.tsx` |
| Auth sign-up | `web/components/pages/auth/sign-up-view.tsx` |
| Invite accept | `web/app/invite/accept/[token]/page.tsx` → `invite-accept-token-view.tsx` |
| Middleware gates | `web/middleware.ts` |
| RBAC | `web/lib/rbac.ts` |
| Auth guard | `web/lib/auth-guard.ts` (`AuthEmployee`, `getAuthEmployee`) |
| JWT cookie | `web/lib/jwt-service.ts` (`ACCESS_COOKIE_NAME`) |
| Module assert | `web/lib/core-functions/assert-module.ts` |
| Module catalog | `web/lib/core-functions/catalog.ts` |
| Assistant | `web/lib/continuum-assistant/*`, `web/app/api/ai/assistant/route.ts` |
| Assistant widget | `web/components/assistant/continuum-assistant-widget.tsx` |
| Prod smoke | `web/scripts/prod-smoke-proof.ts` |
| Design tokens | `web/app/globals.css` |
| Prisma | `web/prisma/schema.prisma` |

---

## Zero UI Extreme (post pre-flight) — Master spec

**Canonical vision:** [`../docs/zero_ui.md`](../docs/zero_ui.md)  
**Traceability:** [`l5/09-zero-ui-extreme-traceability.md`](./l5/09-zero-ui-extreme-traceability.md)  
**Target:** 164 chat-addressable operations across CF-001..CF-015; proactive + autonomous modes.

| Phase | Chunk | Gate | Ops cumulative | Est. days |
|-------|-------|------|----------------|-----------|
| P1 | [09](./09-zero-ui-v2-orchestrator-complete.md) | ZUX-G1 | 40 | 12–15 |
| P2 | [10](./10-zero-ui-proactive-whatsapp.md) | ZUX-G2 | 55 | 10–12 |
| P3 | [11](./11-zero-ui-leave-attendance-extreme.md) | ZUX-G3 | 75 | 15–18 |
| P4 | [12](./12-zero-ui-payroll-expenses-extreme.md) | ZUX-G4 | 95 | 15–18 |
| P5 | [13](./13-zero-ui-people-directory-extreme.md) | ZUX-G5 | 115 | 12–15 |
| P6 | [14](./14-zero-ui-talent-modules-extreme.md) | ZUX-G6 | 140 | 15–20 |
| P7 | [15](./15-zero-ui-exit-compliance-analytics-extreme.md) | ZUX-G7 | 155 | 12–15 |
| P8 | [16](./16-zero-ui-autonomy-enterprise-gates.md) | ZUX-G8 (GA) | 164+ | 15–20 |

**Depends on:** Chunks 01–08 complete (G1–G6 PASS) + Chunk 05 WhatsApp live before P2 E2E.

---

## Execution sprints

| Sprint | Chunks | Deliverable |
|--------|--------|-------------|
| 1 | 01 WP1–WP2 | Canonical onboarding + gates |
| 2 | 01 WP3–WP4 + 07 WP7.1 | Settings persistence + module audit + auth stable |
| 3 | 02 WP2.1–2.4 | Employee lifecycle + v1 APIs documented |
| 4 | 02 WP2.5–2.7 + G1 | Notifications + prod smoke ×3 |
| 5 | 03 + 06 | Channel identity + security parallel |
| 6 | 04 + 07 | Assistant v1 + phone profile UI |
| 7 | 08 | Tests, runbooks, sign-off |
| 8+ | 05 | WhatsApp (post gates) |
| 9 | 09 | Orchestrator A1–A10 + server drafts |
| 10 | 10 | Proactive WhatsApp |
| 11–14 | 11–14 | Module extreme (leave → talent) |
| 15–16 | 15–16 | Compliance + autonomy GA |

---

## Status block (update per chunk)

```yaml
chunk_01: not_started
chunk_02: not_started
chunk_03: not_started
chunk_04: not_started
chunk_05: blocked_until_gates
chunk_06: not_started
chunk_07: not_started
chunk_08: not_started
chunk_09_zero_ui_v2: not_started
chunk_10_zero_ui_proactive: not_started
chunk_11_zero_ui_leave_attendance: not_started
chunk_12_zero_ui_payroll_expenses: not_started
chunk_13_zero_ui_people: not_started
chunk_14_zero_ui_talent: not_started
chunk_15_zero_ui_compliance: not_started
chunk_16_zero_ui_enterprise_ga: not_started
last_updated: 2026-06-15
```

---

## Governance cross-links

- [`docs/zero_ui.md`](../docs/zero_ui.md) — Zero UI Extreme master specification (164 ops, architecture, GA gates)
- `AGENTS.md` — `web/` authoritative; token-first UI; no mock prod data
- `docs/specs/00-master-blueprint.md` — 15 truth statements (web north star)
- `web/docs/CONTINUUM_GUIDE_ACTIONS.md` — current in-app assistant (superseded by `ZERO_UI_V1_ACTIONS.md` after Chunk 04)
