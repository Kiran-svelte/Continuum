# L5 — Chunk 08: Testing & Gates Internals

> Parent: `../08-testing-documentation-gates.md`

---

## L5-08-001 — Gate G1 proof file template

**Path:** `docs/proofs/prod-smoke-preflight-run-{N}-{ISO8601}.md`

```markdown
# Production Smoke Proof — Pre-Flight Run {N}

- Generated: {ISO8601}
- Base URL: {SMOKE_BASE_URL}
- Tenant seed: {seed}
- Git SHA: {sha}

## Step Outcomes
- [PASS] Signup admin (HTTP 200): ...
(copy all steps from script output)

## Summary
- Passed: {N}
- Failed: 0
- Result: SUCCESS

Gate G1 run {N}: PASS
```

**Index:** `docs/proofs/PREFLIGHT_SMOKE_INDEX.md` — table of 3 runs all SUCCESS

---

## L5-08-002 — Complete automated test manifest

| File | Chunk | Gate |
|------|-------|------|
| onboarding-step-contract-sync.test.ts | 01 | G2 |
| onboarding-finalize-flag.test.ts | 01 | G2 |
| onboarding-gate-matrix.test.ts | 01 | G2 |
| module-gating.test.ts | 01 | |
| leave-approval-chain-integration.test.ts | 01 | |
| invite-lifecycle.test.ts | 02 | |
| rbac-role-matrix.test.ts | 02 | |
| idempotency-leave.test.ts | 02 | |
| channel-executor-headless.test.ts | 03 | **G3** |
| tenant-isolation.test.ts | 03 | |
| channel-verify.test.ts | 03 | **G5** |
| continuum-assistant-v1-headless.test.ts | 04 | **G4** |
| continuum-assistant-state.test.ts | 04 | G4 |
| continuum-assistant-intents.test.ts | 04 | G4 |
| continuum-assistant-actions.test.ts | 04 | regression |
| auth-flow.test.ts | 07 | G2 |
| fallback-routes-smoke.ts | 07 | script |

**Run all:**

```powershell
cd web
node scripts/run-node-tests.mjs
npx tsx scripts/fallback-routes-smoke.ts
npx tsx scripts/audit-module-guards.ts
npx tsx scripts/audit-tenant-scope.ts
npm run build
```

---

## L5-08-003 — CI workflow (complete)

**File:** `.github/workflows/zero-ui-preflight.yml`

```yaml
name: Zero UI Pre-Flight
on:
  pull_request:
    paths: ['web/**', 'chunks/**', 'docs/proofs/**']
  workflow_dispatch:

jobs:
  preflight:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: web
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: npm
          cache-dependency-path: web/package-lock.json
      - run: npm ci
      - run: npm run build
      - run: node scripts/run-node-tests.mjs
      - name: Module guard audit
        run: npx tsx scripts/audit-module-guards.ts
      - name: Tenant scope audit
        run: npx tsx scripts/audit-tenant-scope.ts
      - name: Ban cookie forward in assistant
        run: |
          if rg "forwardAuthenticatedApi" lib/continuum-assistant/actions/request-leave.ts lib/continuum-assistant/actions/approve-leave.ts 2>/dev/null; then
            echo "forwardAuthenticatedApi still used"
            exit 1
          fi
      - name: Ban legacy onboarding push
        run: |
          if rg "router\.push\('/onboarding/company'\)" ../web/app ../web/components 2>/dev/null; then
            exit 1
          fi
```

---

## L5-08-004 — Role matrix R1-R15 (manual QA)

**File:** `web/docs/test-plans/zero-ui-role-matrix.md`

| ID | Role | Action | Method | Expected HTTP/result |
|----|------|--------|--------|---------------------|
| R1 | employee | submit leave | submitLeaveService | ok true |
| R2 | employee | approve leave | submitLeaveService | ok false 403 |
| R3 | employee | approve own leave | approveLeaveService | 403 |
| R4 | manager | approve report | approveLeaveService | ok true |
| R5 | manager | approve non-report | approveLeaveService | 403 |
| R6 | hr | approve any | approveLeaveService | ok true |
| R7 | employee coA | resource coB id | any service | 403 |
| R8 | employee | double clock in | clockAttendanceService | ALREADY_CLOCKED_IN |
| R9 | employee | other payslip | getLatestPayslipService | 403 |
| R10 | admin | GET whatsapp settings | HTTP GET | 200 no token field |
| R11 | employee | GET whatsapp admin API | HTTP GET | 403 |
| R12 | manager | pending approvals | listPendingApprovalsService | ok true |
| R13 | employee | check balance | getLeaveBalancesService | ok true |
| R14 | employee | module payroll off payslip | getLatestPayslipService | MODULE_DISABLED |
| R15 | whatsapp | full leave CONFIRM | e2e | LeaveRequest row |

---

## L5-08-005 — ADR-001 structure

**File:** `docs/adr/ADR-001-zero-ui-channel-architecture.md`

1. **Context** — Zero UI via WhatsApp; cookie auth insufficient
2. **Decision** — Service layer + ChannelIdentityLink + shared processAssistantTurn
3. **Consequences** — Positive: one brain two channels; Negative: migration effort
4. **Alternatives rejected** — Separate bot repo; HTTP cookie forward; RPA on web UI
5. **Status** — Accepted on sign-off date

---

## L5-08-006 — Runbook sections (whatsapp-operations.md)

1. Webhook not receiving — curl verify, Meta console, Vercel logs
2. Invalid signature — APP_SECRET, raw body, BYPASS false
3. Token expired — admin reconnect, decrypt test
4. Employee not verified — Employee.phone, link table, HR update
5. Duplicate replies — dedupe message.id
6. Template rejected — Meta Business Manager
7. Per-tenant debug — SQL queries on WhatsAppTenantConfig, ChannelIdentityLink, AuditLog

Each section: Symptoms → Checks (numbered) → Fix → Prevention

---

## L5-08-007 — ZERO_UI_PREFLIGHT_SIGNOFF.md

**Path:** `docs/proofs/ZERO_UI_PREFLIGHT_SIGNOFF.md`

Fields: Date, branch, staging URL, participants table, G1-G6 checkboxes with proof links, chunk completion checkboxes, CI SHA, GO/NO-GO single select, blockers list, signatures

**Rule:** Chunk 05 work MUST NOT merge until GO signed by Product + Eng Lead

---

## L5-08-008 — meta-waba-ready.md template

```markdown
# Meta WABA Readiness
Date: YYYY-MM-DD
App ID: 123456****** 
Test phone_number_id: 109052****** 
Webhook URL: https://staging.example.com/api/webhooks/whatsapp
Webhook verified: yes/no
Inbound test message id: wamid.xxx
Outbound test message id: wamid.yyy
Template continuum_verify_code: approved|pending|rejected
Gate G6: PASS|FAIL
NO SECRETS IN THIS FILE
```

---

## L5-08-009 — Documentation completeness checklist

| # | Doc path | Required before GO |
|---|----------|-------------------|
| 1 | chunks/00-INDEX.md | yes |
| 2 | chunks/l5/*.md (9 files) | yes |
| 3 | web/docs/ZERO_UI_V1_ACTIONS.md | yes G4 |
| 4 | web/docs/api/v1-zero-ui-leave.md | yes |
| 5 | web/docs/api/v1-zero-ui-catalog.md | yes |
| 6 | web/docs/onboarding-data-map.md | yes |
| 7 | docs/adr/ADR-001-zero-ui-channel-architecture.md | yes |
| 8 | web/docs/WHATSAPP_LOGGING_POLICY.md | yes |
| 9 | docs/runbooks/whatsapp-operations.md | yes |
| 10 | docs/runbooks/preflight-release-checklist.md | yes |
| 11 | docs/runbooks/company-go-live-60min.md | yes |
| 12 | web/docs/test-plans/zero-ui-role-matrix.md | yes |
| 13 | docs/proofs/ZERO_UI_PREFLIGHT_SIGNOFF.md | yes signed |

---

## L5-08-010 — QA calendar

| Day | Deliverable |
|-----|-------------|
| Mon | All automated tests green |
| Tue | G1 three smoke proofs |
| Wed | Role matrix signed |
| Thu | Docs review + runbook walkthrough |
| Fri | Sign-off meeting GO/NO-GO |

Post-GO: branch `feat/whatsapp-zero-ui`, implement Chunk 05 L5 file order

---

## L5-08-PART-B — Gate G2–G6 acceptance criteria (verbatim)

### G2 — Canonical onboarding

- [ ] TOTAL_ONBOARDING_STEPS === 13 in contract + UI  
- [ ] `/onboarding/company` → 308 `/onboarding`  
- [ ] C01-T01 through C01-T10 PASS  
- [ ] onboarding-data-map.md committed  

### G3 — Headless leave

- [ ] HE-01 through HE-04 PASS in CI  
- [ ] zero forwardAuthenticatedApi in assistant actions  
- [ ] channel-executor-headless.test.ts green  

### G4 — Assistant v1

- [ ] ZERO_UI_V1_ACTIONS.md complete A1–A10  
- [ ] C04-T01 through C04-T08 PASS  
- [ ] widget no sessionStorage draft  

### G5 — Phone verify

- [ ] normalizePhone unit tests PASS  
- [ ] channel-verify.test.ts CV-01–CV-05 PASS  
- [ ] profile phone E.164 in staging demo tenant  

### G6 — Meta WABA ready

- [ ] meta-waba-ready.md signed  
- [ ] webhook verified in Meta console  
- [ ] template continuum_verify_code approved  
- [ ] inbound + outbound test message ids recorded  

---

## L5-08-PART-C — ZERO_UI_PREFLIGHT_SIGNOFF.md full template

```markdown
# Zero UI Pre-Flight Sign-Off

**Date:** YYYY-MM-DD  
**Branch:** fix/ui-signup-invite-pr21  
**Staging URL:** https://...  
**Git SHA:** abc123  

## Participants

| Name | Role | Sign |
|------|------|------|
| | Product Owner | |
| | Engineering Lead | |
| | QA Lead | |

## Gates

| Gate | Status | Proof link |
|------|--------|------------|
| G1 Prod smoke ×3 | PASS/FAIL | docs/proofs/PREFLIGHT_SMOKE_INDEX.md |
| G2 Onboarding | | |
| G3 Headless | | |
| G4 Assistant | | |
| G5 Phone | | |
| G6 Meta WABA | | |

## Chunks complete

- [ ] 01 Company lifecycle
- [ ] 02 Employee HR
- [ ] 03 API channel
- [ ] 04 Assistant
- [ ] 06 Security
- [ ] 07 Web minimal
- [ ] 08 Testing

## Decision

- [ ] GO — Chunk 05 WhatsApp may begin
- [ ] NO-GO — Blockers:

## Blockers

1. 

**Signatures required before GO.**
```

---

## L5-08-PART-D — CI failure triage guide

| Failure | Owner | Fix |
|---------|-------|-----|
| audit-module-guards FAIL | Chunk 01 | add assertModule |
| forwardAuthenticatedApi grep | Chunk 03/04 | migrate to service |
| legacy onboarding push grep | Chunk 01 | remove router.push |
| build fail | any | fix TypeScript |
| HE-* fail | Chunk 03 | service layer bug |

---

## L5-08-PART-E — Manual QA session script (2h)

| Time | Activity |
|------|----------|
| 0:00 | Deploy staging from candidate SHA |
| 0:15 | Run prod-smoke once — must PASS |
| 0:45 | Role matrix R1–R15 spreadsheet |
| 1:00 | Admin 60-min go-live dry run (L5-07-008) |
| 1:30 | Docs review checklist L5-08-009 |
| 1:45 | Sign-off meeting |

---

## L5-08-PART-F — Extended role matrix R16 – R30

| ID | Role | Action | Expected |
|----|------|--------|----------|
| R16 | hr | adjust balance | ok (not in v1 assistant) |
| R17 | employee | list own leaves | ok |
| R18 | manager | list pending empty | ok empty array |
| R19 | admin | module cap enforced | 403 slugs outside cap |
| R20 | employee | clock out without in | NOT_CLOCKED_IN |
| R21 | whatsapp | idempotent leave | one row |
| R22 | whatsapp | unknown number | no PII leak other company |
| R23 | employee | channel verify wrong code | CODE_LOCKED after 3 |
| R24 | admin | kill switch | no execution |
| R25 | cron | purge old messages | count deleted logged |
| R26 | employee | assistant super_admin block | N/A |
| R27 | manager | approve escalated | ok at correct level |
| R28 | employee | cancel approved | 403 without cancel_any |
| R29 | api | company setup incomplete | 403 code |
| R30 | e2e | sign-off doc all gates PASS | GO |

---

## L5-08-PART-G — Documentation review rubric

Each doc scored 1–5:

| Score | Meaning |
|-------|---------|
| 5 | Implementable without questions |
| 4 | Minor clarifications |
| 3 | Gaps — must amend L5 before code |
| 1–2 | Reject — rewrite |

**Minimum average 4.0 across all L5 files for GO**
