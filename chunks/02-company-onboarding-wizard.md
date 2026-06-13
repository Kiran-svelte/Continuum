# C02 — Company Admin Onboarding Wizard (13 steps)

**Priority:** P0  
**Routes:** `/onboarding`, `/onboarding/company`, `/onboarding/invite-team`  
**APIs:** `/api/onboarding/defaults`, `/step/[step]`, `/complete`, `/finalize`, `/progress`

---

## User story

New company admin completes a guided wizard: company basics → org structure → approval mapping → modules → roles → leave → attendance → holidays → AI → payroll → notifications → finalize. Progress persists across sessions; skipping allowed; finalize seeds tenant DB and marks `company.onboarding_completed`.

---

## How it connects

| Step | Data written | Used by |
|------|--------------|---------|
| 1 Company | `Company`, draft in `hr_alerts.onboarding_draft` | All modules |
| 2–4 Org/approvals/modules | `CompanySettings`, module slugs | C09 gating, C08 workflows |
| 5 Roles | `Role`, RBAC seeds | C10 invites, all portals |
| 6–7 Leave types/quotas | `LeaveType`, balances | C05 leave engine |
| 8 Attendance | Policy in settings | C06 attendance |
| 9 Holidays | `Holiday` | Leave + payroll |
| 10 AI | `hr_alerts` AI config | Leave auto-approve |
| 11 Payroll | Statutory defaults | C07 payroll |
| 12 Notifications | Email flags | Notification service |
| 13 Finalize | `onboarding_completed=true` | Middleware portal access |

**Depends on C01** for authenticated API calls.

---

## Current defects

| ID | Issue | Notes |
|----|-------|-------|
| C02-001 | Production showed **6-step legacy UI** vs 13-step local code | Deploy drift; ensure `main` has latest `onboarding-view.tsx` |
| C02-002 | Step numbering mismatch in `applyStepPayload` (steps 4–9 mapping) | Review normalizer vs UI step indices |
| C02-003 | `/api/onboarding/step/all` requires `org_id` | Fails if company missing — signup creates company so OK |
| C02-004 | Local draft in `localStorage` can desync from server draft | Merge strategy on load |
| C02-005 | `invite-team` page vs unified wizard | Two onboarding paths; consolidate or document |
| C02-006 | No optimistic UI on Neon cold start | 60s timeout exists; show retry CTA |

---

## Implementation plan

1. **C01 auth fix** (prerequisite).
2. Align step payload mapper indices with `onboarding-step-contract.ts` (audit each `targetStep` branch).
3. On 401/403 during `loadDefaults`, redirect sign-in with return URL.
4. Add server-side validation message passthrough to error banner (read `payload.error`).
5. E2E: extend `scripts/e2e-onboarding-stage-simulation.ts` for all 13 steps.
6. Deploy via Git merge to `main`.

---

## Failure modes & recovery

| Failure | Recovery |
|---------|----------|
| Step save 500 mid-wizard | Draft in `hr_alerts`; user refreshes; resume from `last_completed_step` |
| Finalize timeout (120s) | Idempotent complete route; retry finalize |
| Partial seed (leave types fail) | Transaction rollback in complete route; show error, support re-run |
| User closes browser | `localStorage` + server draft merge on return |

---

## Test plan

```bash
npm run test -- tests/onboarding-readiness.test.ts tests/flow-chunk-c4-org-onboarding.test.ts
npm run test -- tests/tenant-demo-onboarding-hardening.test.ts
node scripts/e2e-onboarding-stage-simulation.ts  # if DB available
```

---

## Remove / clean

- Stale `/api/onboarding/finalize` if UI only uses `/complete`
- `onboarding/company` + `invite-team` sub-routes if superseded by single wizard (or keep as deep links only)
