# L5-DEEP — Chunk 08: Testing & Gates (Exhaustive)

> Companion to [`../08-testing-gates-L5.md`](../08-testing-gates-L5.md)

---

## DEEP-08-001 — All gates summary card

| Gate | Name | Owner | Proof artifact |
|------|------|-------|----------------|
| G1 | Prod smoke ×3 | QA | PREFLIGHT_SMOKE_INDEX.md |
| G2 | Canonical onboarding | Eng | C01 tests + onboarding-data-map |
| G3 | Headless leave | Eng | g3-headless-leave-*.md |
| G4 | Assistant v1 | Eng | ZERO_UI_V1_ACTIONS.md + C04 tests |
| G5 | Phone verify | Eng | channel-verify.test.ts + staging demo |
| G6 | Meta WABA | DevOps/Product | meta-waba-ready.md |

---

## DEEP-08-002 — PREFLIGHT_SMOKE_INDEX.md template

```markdown
# Pre-Flight Smoke Index

| Run | Date | SHA | Base URL | Result | Proof file |
|-----|------|-----|----------|--------|------------|
| 1 | | | | SUCCESS | prod-smoke-preflight-run-1-....md |
| 2 | | | | SUCCESS | prod-smoke-preflight-run-2-....md |
| 3 | | | | SUCCESS | prod-smoke-preflight-run-3-....md |

**Gate G1:** PASS (all three SUCCESS)
```

---

## DEEP-08-003 — onboarding-gate-matrix.test.ts cases

| Case | Assert |
|------|--------|
| admin incomplete → /admin/dashboard redirect | middleware |
| admin incomplete → POST leave 403 | company-setup-guard |
| admin complete → POST leave 201 | happy |
| employee never hits company wizard | middleware |

---

## DEEP-08-004 — tenant-isolation.test.ts cases

- Company A employee cannot read Company B leave by ID  
- Service ctx orgId enforced on all queries  
- Channel link scoped to company_id

---

## DEEP-08-005 — channel-verify.test.ts (G5)

| ID | Description |
|----|-------------|
| CV-01 | start returns expiresInSeconds 600 |
| CV-02 | confirm valid creates link |
| CV-03 | wrong code increments attempts |
| CV-04 | expired challenge fails |
| CV-05 | phone change revokes old link |

---

## DEEP-08-006 — ADR-001 full outline (sections)

1. Title: Zero UI Channel Architecture  
2. Status: Proposed → Accepted on sign-off  
3. Context: WhatsApp-first HR, 215+ API routes, cookie assistant insufficient  
4. Decision: Service layer + ChannelIdentityLink + shared processAssistantTurn  
5. Consequences: +migration effort, +single brain maintenance, −duplicate logic  
6. Alternatives: separate bot microservice (rejected: duplicate RBAC); Playwright RPA (rejected: brittle)  
7. References: chunks/l5/*, ADR date, authors

---

## DEEP-08-007 — preflight-release-checklist.md items

- [ ] All G1–G6 proofs linked in sign-off  
- [ ] CI zero-ui-preflight.yml green on release branch  
- [ ] No WHATSAPP_BYPASS in prod env  
- [ ] Staging demo tenant go-live 60min completed  
- [ ] Runbooks reviewed by on-call  
- [ ] Legal privacy addendum live  
- [ ] Chunk 05 branch NOT merged pre-GO

---

## DEEP-08-008 — v1-zero-ui-catalog.md structure

```markdown
# Zero UI API Catalog v1

## Authentication
- Session cookie continuum-access
- Channel: ChannelIdentityLink + verified wa_id

## Operations
### leave.submit
...
### leave.approve
...
(repeat for all service operations)
```

---

## DEEP-08-009 — NO-GO blocker examples

| Blocker | Gate |
|---------|------|
| Prod smoke fail run 2 | G1 |
| forwardAuthenticatedApi still in request-leave.ts | G3/G4 |
| /onboarding/company renders wizard | G2 |
| meta template rejected | G6 |
| HEADLESS HE-03 fail | G3 |

---

## DEEP-08-010 — Post-GO monitoring (first 72h Chunk 05)

| Metric | Alert |
|--------|-------|
| wa_graph_error_rate | >2% |
| wa_inbound latency p99 | >4s |
| signature_fail | >0 prod |
| duplicate message processing | >0 |

---

## DEEP-08-011 — Tests manifest extended

| File | Min test count |
|------|----------------|
| channel-executor-headless.test.ts | 10 |
| continuum-assistant-v1-headless.test.ts | 15 |
| channel-verify.test.ts | 5 |
| security-channel.test.ts | 20 |
| onboarding-step-contract-sync.test.ts | 3 |
| rbac-role-matrix.test.ts | 7 roles snapshot |

---

## DEEP-08-012 — Sign-off meeting agenda (30 min)

1. Review G1–G6 proofs (10 min)  
2. Demo 60-min go-live recording (10 min)  
3. Open blockers (5 min)  
4. GO/NO-GO vote (5 min)

---

## DEEP-08-013 — R31 – R40 role matrix extension

| ID | Scenario |
|----|----------|
| R31 | admin disable leave module → assistant message |
| R32 | whatsapp HELP as manager |
| R33 | whatsapp STOP → no further replies |
| R34 | hr connect whatsapp |
| R35 | employee profile link token |
| R36 | concurrent approve leave race |
| R37 | idempotency 24h expiry new submit |
| R38 | audit export includes channel field |
| R39 | super_admin no assistant |
| R40 | full preflight CI on main green |
