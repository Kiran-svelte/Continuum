# Chunk 08 — Testing, Documentation & Go/No-Go Gates (Full Specification)

> **Status:** `not_started` | **Depends on:** Chunks 01–04, 06, 07 | **Est.:** 5 dev-days  
> **Output:** Signed `docs/proofs/ZERO_UI_PREFLIGHT_SIGNOFF.md` with GO decision  
> **L5 (implement from):** [`l5/08-testing-gates-L5.md`](./l5/08-testing-gates-L5.md)

---

## L1 — Room purpose

**Room name:** Final Inspection & Certificate of Occupancy  
**Business outcome:** Binary proof that pre-flight is complete before capital is spent on WhatsApp (Chunk 05).  
**Revenue link:** Shipping WhatsApp on a failing core = support costs exceed WhatsApp ARR.

---

## Master gates G1–G6 (inspection checklist)

### G1 — Prod smoke × 3

| Property | Value |
|----------|-------|
| Script | `web/scripts/prod-smoke-proof.ts` |
| Env | `SMOKE_BASE_URL=https://staging.continuum.example` |
| Output dir | `docs/proofs/` |

**Required files:**

```text
docs/proofs/PREFLIGHT_SMOKE_INDEX.md
docs/proofs/prod-smoke-preflight-run-1-{ISO8601}.md
docs/proofs/prod-smoke-preflight-run-2-{ISO8601}.md
docs/proofs/prod-smoke-preflight-run-3-{ISO8601}.md
```

**Each proof must contain:**

```markdown
## Summary
- Passed: N
- Failed: 0
- Result: SUCCESS
```

**Index file template:**

```markdown
# Pre-Flight Smoke Index
| Run | Date | Base URL | Result | File |
| 1 | ... | ... | SUCCESS | link |
| 2 | ... | ... | SUCCESS | link |
| 3 | ... | ... | SUCCESS | link |
Gate G1: PASS
```

**If any run fails:** fix in Chunk 01/02, reset counter to 0

---

### G2 — Canonical onboarding

| Test | File | Assert |
|------|------|--------|
| Step count sync | `web/tests/onboarding-step-contract-sync.test.ts` | TOTAL_STEPS === TOTAL_ONBOARDING_STEPS === 13 |
| Legacy redirect | manual or test | GET `/onboarding/company` → final URL `/onboarding` |
| Sign-up path | `web/tests/auth-flow.test.ts` | contains `router.push('/onboarding')` |
| No legacy push | grep CI | zero `router.push('/onboarding/company')` in `web/app` `web/components` |

---

### G3 — Headless executor

| Test | File |
|------|------|
| Leave submit + approve no cookie | `web/tests/channel-executor-headless.test.ts` |

**Required test cases:**

| ID | Description |
|----|-------------|
| HE-01 | submitLeaveService returns ok:true |
| HE-02 | approveLeaveService returns ok:true |
| HE-03 | employee cannot approve without permission |
| HE-04 | uses IdempotencyRecord on duplicate key |

---

### G4 — v1 assistant

| Doc | `web/docs/ZERO_UI_V1_ACTIONS.md` |
| Tests | `continuum-assistant-v1-headless.test.ts` PASS |
| | `continuum-assistant-state.test.ts` PASS |
| | `continuum-assistant-intents.test.ts` PASS |

**Doc must list actions A1–A10** (see 00-INDEX) with phrases, permissions, scripts

---

### G5 — Phone verification

| Test | `web/tests/channel-verify.test.ts` |
| Migration | ChannelIdentityLink table exists |

| ID | Scenario |
|----|----------|
| CV-01 | start creates challenge |
| CV-02 | confirm with valid code creates link |
| CV-03 | wrong code increments attempts |
| CV-04 | phone change revokes link |

---

### G6 — Meta WABA

**Create:** `docs/proofs/meta-waba-ready.md`

```markdown
# Meta WABA Readiness (no secrets)
- Date verified: YYYY-MM-DD
- App ID: 123456... (partial)
- Test phone_number_id: ...7708 (partial)
- Webhook URL configured: yes
- Test inbound message received: yes
- Test outbound message sent: yes
- Template continuum_verify_code status: approved|pending
Gate G6: PASS|FAIL
```

---

## Full test matrix (automated)

### Chunk 01 tests

| File | Tests |
|------|-------|
| onboarding-step-contract-sync.test.ts | step constants |
| onboarding-finalize-flag.test.ts | DB flag after finalize |
| onboarding-gate-matrix.test.ts | middleware redirects |
| module-gating.test.ts | assertModule 403 |
| leave-approval-chain-integration.test.ts | approver routing |

### Chunk 02 tests

| File | Tests |
|------|-------|
| invite-lifecycle.test.ts | invite→accept→active |
| rbac-role-matrix.test.ts | permission boundaries |
| idempotency-leave.test.ts | duplicate submit |

### Chunk 03 tests

| File | Tests |
|------|-------|
| channel-executor-headless.test.ts | G3 |
| tenant-isolation.test.ts | cross-company |
| channel-verify.test.ts | G5 |

### Chunk 04 tests

| File | Tests |
|------|-------|
| continuum-assistant-v1-headless.test.ts | A1–A9 |
| continuum-assistant-state.test.ts | server draft |
| continuum-assistant-intents.test.ts | routing |
| continuum-assistant-actions.test.ts | regression |
| continuum-assistant-tier1-tier2.test.ts | insights regression |

### Chunk 07 tests

| File | Tests |
|------|-------|
| fallback-routes-smoke.ts | script exit 0 |
| auth-flow.test.ts | auth paths |

### Run command

```powershell
cd web
node scripts/run-node-tests.mjs
npx tsx scripts/fallback-routes-smoke.ts
npx tsx scripts/audit-module-guards.ts
npx tsx scripts/audit-tenant-scope.ts
npm run build
```

All must exit 0

---

## Role matrix (manual QA script)

**Create:** `web/docs/test-plans/zero-ui-role-matrix.md`

| ID | Role | Action | Method | Expected |
|----|------|--------|--------|----------|
| R1 | employee | submit leave | headless service | ok |
| R2 | employee | approve leave | headless | 403 FORBIDDEN |
| R3 | employee | approve own leave | headless | 403 |
| R4 | manager | approve report leave | headless | ok |
| R5 | manager | approve non-report | headless | 403 |
| R6 | hr | approve any | headless | ok |
| R7 | employee co A | access co B resource | headless | 403 |
| R8 | employee | double clock in | API | 400 Already checked in |
| R9 | employee | other payslip | service | 403 |
| R10 | admin | GET whatsapp settings | API | no token in body |

QA sign initials on each row in release ticket

---

## CI pipeline spec

**Modify or create:** `.github/workflows/zero-ui-preflight.yml`

```yaml
name: Zero UI Pre-Flight
on:
  pull_request:
    paths: ['web/**']
  workflow_dispatch:

jobs:
  preflight:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: cd web && npm ci
      - run: cd web && npm run build
      - run: cd web && node scripts/run-node-tests.mjs
      - run: cd web && npx tsx scripts/audit-module-guards.ts
      - run: cd web && npx tsx scripts/audit-tenant-scope.ts
      - name: Ban cookie forward in assistant
        run: |
          cd web
          if rg "forwardAuthenticatedApi" lib/continuum-assistant/actions/request-leave.ts lib/continuum-assistant/actions/approve-leave.ts; then
            exit 1
          fi
      - name: Ban legacy onboarding push
        run: |
          cd web
          if rg "onboarding/company" app components --glob "!**/onboarding/company/**"; then
            exit 1
          fi
```

---

## Documentation deliverables (complete list)

| # | Document | Path | Owner |
|---|----------|------|-------|
| 1 | Master index | chunks/00-INDEX.md | Product |
| 2 | v1 actions spec | web/docs/ZERO_UI_V1_ACTIONS.md | Product |
| 3 | Leave API v1 | web/docs/api/v1-zero-ui-leave.md | Eng |
| 4 | API catalog | web/docs/api/v1-zero-ui-catalog.md | Eng |
| 5 | Onboarding data map | web/docs/onboarding-data-map.md | Eng |
| 6 | ADR channel architecture | docs/adr/ADR-001-zero-ui-channel-architecture.md | Eng |
| 7 | WhatsApp logging policy | web/docs/WHATSAPP_LOGGING_POLICY.md | Eng |
| 8 | WhatsApp ops runbook | docs/runbooks/whatsapp-operations.md | Ops |
| 9 | Release checklist | docs/runbooks/preflight-release-checklist.md | QA |
| 10 | Go-live 60 min | docs/runbooks/company-go-live-60min.md | CS |
| 11 | Role matrix | web/docs/test-plans/zero-ui-role-matrix.md | QA |

### ADR template

**Create:** `docs/adr/ADR-001-zero-ui-channel-architecture.md`

Sections: Context, Decision (service layer + channel identity + shared orchestrator), Consequences, Alternatives rejected (separate WhatsApp bot repo, cookie forwarding)

---

## Runbook: WhatsApp operations

**Create:** `docs/runbooks/whatsapp-operations.md`

| Section | Symptoms | Checks | Fix |
|---------|----------|--------|-----|
| 1 Webhook not receiving | Meta shows failed delivery | curl GET verify; Vercel logs | fix token/URL |
| 2 Invalid signature | 403 on POST | APP_SECRET; raw body | sync secret |
| 3 Token expired | send failures | admin UI status error | reconnect |
| 4 Employee not verified | "not registered" | Employee.phone; link table | HR update phone |
| 5 Duplicate replies | double bot messages | dedupe table | fix handler idempotency |
| 6 Template rejected | proactive fails | Meta template status | resubmit template |
| 7 Per-tenant debug | one company broken | WhatsAppTenantConfig row | reconnect/re-enable |

---

## Sign-off document

**Create:** `docs/proofs/ZERO_UI_PREFLIGHT_SIGNOFF.md`

```markdown
# Zero UI Pre-Flight Sign-Off

Date: ___________
Release branch: ___________
Staging URL: ___________

## Participants
| Role | Name | Signature |
| Product Owner | | |
| Engineering Lead | | |
| QA Lead | | |
| Ops | | |

## Gates
- [ ] G1 Prod smoke ×3 — links: run1, run2, run3
- [ ] G2 Canonical onboarding — test output attached
- [ ] G3 Headless executor — test output attached
- [ ] G4 v1 assistant doc + tests
- [ ] G5 Phone verify tests
- [ ] G6 Meta WABA proof

## Chunk completion
- [ ] 01 Company lifecycle
- [ ] 02 Employee / HR flows
- [ ] 03 Channel-ready API
- [ ] 04 Assistant expansion
- [ ] 06 Security / ops
- [ ] 07 Web minimal
- [ ] 08 Testing (this sign-off)

## CI evidence
- [ ] zero-ui-preflight.yml green on release SHA: ___________

## Decision (one only)
- [ ] **GO** — Authorize Chunk 05 WhatsApp implementation
- [ ] **NO-GO** — Blockers listed below

### Blockers (if NO-GO)
1.
2.

Signed: ___________  Date: ___________
```

---

## QA calendar (5 days)

| Day | Activities | Exit criteria |
|-----|------------|---------------|
| Mon | Run full automated suite; fix failures | all tests green |
| Tue | Prod smoke ×3 on staging | G1 PASS |
| Wed | Manual role matrix R1–R10 | doc signed |
| Thu | Documentation review; runbook walkthrough | 11 docs exist |
| Fri | Go/no-go meeting; sign-off file | GO or NO-GO |

---

## Post-GO entry criteria for Chunk 05

| # | Requirement |
|---|-------------|
| 1 | Signed GO on ZERO_UI_PREFLIGHT_SIGNOFF.md |
| 2 | Branch `feat/whatsapp-zero-ui` from release branch |
| 3 | Meta test credentials in Vercel preview env |
| 4 | NEXT_PUBLIC_WHATSAPP_ENABLED=true on preview |
| 5 | Chunk 05 implemented in order WP5.1 → WP5.10 |

---

## Post-WhatsApp MVP (after Chunk 05 gate)

Expand actions v1.1 module-by-module:

| Module | Actions to add |
|--------|----------------|
| attendance | regularization submit |
| reimbursements | submit claim |
| directory | team availability |
| profile | update phone via chat |

Each requires amendment to `ZERO_UI_V1_ACTIONS.md` + new ADR if architecture changes

---

## Chunk 08 gate (meta)

Pre-flight program complete when:

1. `ZERO_UI_PREFLIGHT_SIGNOFF.md` = GO
2. All G1–G6 checked
3. CI workflow green on tagged commit `preflight-v1.0.0`

**Only then open Chunk 05 work streams.**
