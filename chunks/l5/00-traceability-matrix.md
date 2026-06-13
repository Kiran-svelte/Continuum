# L5 — Traceability Matrix (Requirements → Code → Tests → Gates)

> Parent: `../00-INDEX.md` — **Level 5 cross-chunk index**

---

## How to use this matrix

Every row is traceable: **Requirement ID → Implementation file → Test ID → Gate**

If a row has no test ID, the requirement is **not shippable**.

---

## Business requirements → chunks

| Req ID | Business requirement | Revenue impact | Chunk | Gate |
|--------|---------------------|----------------|-------|------|
| BR-01 | Admin completes setup without support | Activation / first invoice | 01 | G2 |
| BR-02 | Employee active with phone on file | Seat billing | 02, 07 | G5 |
| BR-03 | Leave works headless | Zero UI core | 02, 03, 04 | G3, G4 |
| BR-04 | Module disabled = hard stop | Upsell integrity | 01 | G2 |
| BR-05 | WhatsApp connect + verify | Zero UI GTM | 05, 07 | G6 |
| BR-06 | Audit every chat action | Enterprise trust | 06 | sign-off |
| BR-07 | Prod smoke 3× | No refund fires | 02, 08 | G1 |

---

## v1 actions traceability (A1–A10)

| Action | Permission | Service file | HTTP legacy | Test | Gate |
|--------|------------|--------------|-------------|------|------|
| A1 request leave | leave.apply_own | leave-submit.ts | POST /api/leaves/submit | C04-T01, C04-T08 | G3, G4 |
| A2 balance | leave.apply_own | leave-balances.ts | GET /api/leaves/balances | C04-T06 | G4 |
| A3 list leaves | leave.apply_own | leave-list.ts | GET /api/leaves/list | C04-T06 | G4 |
| A4 cancel | leave.apply_own | leave-cancel.ts | POST cancel | C04-T06 | G4 |
| A5 pending | approve_team/any | pending-approvals.ts | GET manager/pending | R12 | G4 |
| A6 approve/reject | approve_team/any | leave-approve.ts | POST approve | HE-02, R4 | G3 |
| A7 clock | attendance.mark_own | attendance-clock.ts | POST /api/attendance | C02-T07 | G4 |
| A8 today status | attendance.mark_own | attendance-today.ts | GET /api/attendance | C04-T06 | G4 |
| A9 payslip | payroll.view_own | payslip-latest.ts | GET payroll/slips | R9 | G4 |
| A10 insights | read-only | insights/* | N/A | tier1-tier2 tests | G4 |

---

## Auth & identity traceability

| Component | File | Constant/field | Test |
|-----------|------|----------------|------|
| JWT cookie | web/lib/jwt-service.ts | continuum-access | auth-flow |
| Auth employee | web/lib/auth-guard.ts | AuthEmployee | all API tests |
| Channel link | prisma ChannelIdentityLink | external_id | CV-01, WA-05 |
| OTP challenge | prisma ChannelVerificationChallenge | code_hash | CV-02, CV-03 |
| Tenant config | prisma WhatsAppTenantConfig | phone_number_id | WA-01, WA-02 |

---

## Onboarding step traceability

| Step | Contract schema | Step API | UI component | Test |
|------|-----------------|----------|--------------|------|
| 1 | companySchema | POST step/1 | onboarding-view company section | C01-T02 |
| 2 | orgStructureSchema | POST step/2 | OrgStructureStep | |
| 3 | approvalChainsSchema | POST step/3 | ApprovalMappingStep | C01-T10 |
| 4 | modulesSchema | POST step/4 | ModuleEnablementStep | module-gating |
| 5 | roles schema | POST step/5 | RoleStructure UI | |
| 6 | leaveTypes | POST step/6 | Leave types UI | |
| 7 | roleQuotas | POST step/7 | Quotas UI | |
| 8 | attendanceSchema | POST step/8 | Attendance UI | |
| 9 | holidays | POST step/9 | Holidays UI | |
| 10 | aiSchema | POST step/10 | AI UI | smoke aiRecommendation |
| 11 | payrollSchema | POST step/11 | Payroll UI | smoke payroll |
| 12 | notificationsSchema | POST step/12 | Notifications UI | |
| 13 | completed | finalize | Complete button | C01-T04-05 |

---

## Gate dependency graph

```text
G2 (onboarding) ──┬──> G1 (smoke) ──> G6 (meta) ──> Chunk 05
G3 (headless)  ───┤
G4 (assistant) ───┤
G5 (phone)     ───┘
Chunk 06 (security) ──> sign-off ──> Chunk 05
Chunk 07 (web minimal) ──> G5, G6 UI
```

---

## File creation order (developer sequence)

| Order | File | Chunk |
|-------|------|-------|
| 1 | web/lib/company-setup-guard.ts | 01 |
| 2 | web/lib/phone/normalize.ts | 02, 03 |
| 3 | web/lib/services/*.ts (9 files) | 03 |
| 4 | prisma migration channel tables | 03 |
| 5 | web/lib/channel/*.ts | 03 |
| 6 | web/lib/continuum-assistant/engine/process-turn.ts | 04 |
| 7 | web/lib/continuum-assistant/state/conversation-store.ts | 04 |
| 8 | web/lib/notifications/dispatch.ts | 02 |
| 9 | web/app/admin/integrations/whatsapp/page.tsx | 07 |
| 10 | web/app/api/webhooks/whatsapp/route.ts | 05 (post-GO) |

---

## L5 document index

| L5 file | Lines target | Content |
|---------|--------------|---------|
| l5/01-company-lifecycle-L5.md | 350+ | onboarding steps, JWT, middleware |
| l5/02-employee-hr-flows-L5.md | 300+ | invite, leave, attendance, RBAC |
| l5/03-api-channel-ready-L5.md | 300+ | prisma, services, G3 |
| l5/04-assistant-expansion-L5.md | 250+ | orchestrator, intents, widget |
| l5/05-whatsapp-meta-L5.md | 250+ | webhook, graph API, bot copy |
| l5/06-security-ops-L5.md | 200+ | audit, logging, SEV |
| l5/07-web-minimal-L5.md | 200+ | admin routes, phone UI |
| l5/08-testing-gates-L5.md | 250+ | CI, sign-off, proofs |
| l5/00-traceability-matrix.md | this file | cross-chunk |

**Updated targets (Level 5 depth):** each chunk area = **main L5 + `l5/deep/*-DEEP.md`** → **800+ combined lines**; implement from both.

---

## L5-00-PART-B — API route inventory (Zero UI relevant)

| Method | Path | Chunk | Module guard |
|--------|------|-------|--------------|
| POST | /api/auth/signup | 01 | — |
| POST | /api/onboarding/step/[n] | 01 | — |
| POST | /api/onboarding/finalize | 01 | — |
| POST | /api/hr/invites | 01,02 | employee |
| GET | /api/invite/accept | 02 | — |
| POST | /api/invite/accept | 02 | — |
| GET/PUT | /api/profile | 02,07 | employee |
| POST | /api/leaves/submit | 02,03 | leave |
| POST | /api/leaves/approve/[id] | 02,03 | leave |
| POST | /api/attendance | 02,03 | attendance |
| GET | /api/attendance | 02,03 | attendance |
| POST | /api/ai/assistant | 04 | — |
| POST | /api/channel/verify/start | 03,07 | — |
| POST | /api/channel/verify/confirm | 03,05 | — |
| GET/POST | /api/webhooks/whatsapp | 05 | — |
| POST | /api/admin/integrations/whatsapp/connect | 05,07 | company |
| GET | /api/admin/integrations/whatsapp | 05,07 | company |

---

## L5-00-PART-C — Prisma models (channel program)

| Model | Chunk | Purpose |
|-------|-------|---------|
| ChannelIdentityLink | 03 | wa_id ↔ employee |
| ChannelVerificationChallenge | 03 | OTP hash |
| WhatsAppTenantConfig | 03,05 | WABA tokens |
| IdempotencyRecord | 03 | dedupe actions |
| AssistantConversation | 04 | server draft |
| AssistantMessageRecord | 04,06 | history + retention |
| ChannelBlocklist | 06 | block abusive wa_ids |

---

## L5-00-PART-D — Environment variable traceability

| Variable | Chunk | Secret |
|----------|-------|--------|
| WHATSAPP_APP_SECRET | 05 | yes |
| WHATSAPP_VERIFY_TOKEN | 05 | yes |
| WHATSAPP_TOKEN_ENCRYPTION_KEY | 03 | yes |
| WHATSAPP_BYPASS_SIGNATURE | 05 | no (dev only true) |
| NEXT_PUBLIC_WHATSAPP_ENABLED | 07 | no |
| CRON_SECRET | 06 | yes |
| NEXT_PUBLIC_APP_URL | all | no |

---

## L5-00-PART-E — Test ID master index

| Prefix | Count | Gate |
|--------|-------|------|
| C01-T* | 40 | G2 |
| C02-T* | 25 | G1 |
| C03/he HE-* | 10 | G3 |
| C04-T* | 20 | G4 |
| WA-* | 25 | G6 |
| SEC-* | 20 | sign-off |
| WM-* | 18 | G5,G6 |
| R* | 30 | manual |

---

## L5-00-PART-F — Dependency critical path (days)

```text
Day 1-5:   Chunk 01 (onboarding gate)
Day 3-8:   Chunk 02 (parallel after day 3)
Day 6-10:  Chunk 03 (services)
Day 8-12:  Chunk 04 (assistant)
Day 6-9:   Chunk 06 (parallel)
Day 5-7:   Chunk 07 (parallel)
Day 12-14: Chunk 08 (sign-off)
Day 15+:   Chunk 05 (post-GO only)
```

---

## Definition of done (entire pre-flight program)

All must be true:

1. All gates G1–G6 PASS with committed proof artifacts
2. All test IDs in matrices PASS in CI
3. All L5 documents reviewed by Product Owner
4. ZERO_UI_PREFLIGHT_SIGNOFF.md signed GO
5. No `forwardAuthenticatedApi` in assistant hot path
6. No active UI at `/onboarding/company`
7. Chunk 05 branch not started until #4
