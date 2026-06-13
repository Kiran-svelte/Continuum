# Enterprise readiness — Sections 2 & 3 proof

**Skipped by design:** Section 1 (SendGrid/SPF, UptimeRobot, demo seed on staging, Neon restore doc) — owner-operated.

Run all commands from `web/`:

```powershell
cd d:\projects\Continuum\web
```

## Section 2 — Product holes

| Item | Status | Proof |
|------|--------|-------|
| Manager leave API uses `current_approver_id` + `canActOnLeaveRequest` | Done | `npx tsx --test tests/enterprise-readiness-sections-2-3.test.ts` |
| Salary structures UI uses `animate="visible"` (not invisible `show`) | Done | Same test file |
| Setup wizard distinguishes components vs per-employee CTC | Done | `setup-wizard-view.tsx` copy + getting-started checklist |
| CI runs static hardening tests (no DB required) | Done | `.github/workflows/web-ci.yml` step |
| Billing uses DB `PricingPlan` or preview mode | Done | `billing-view.tsx` + test |
| Delegation marked roadmap | Done | `workflow-explainer-panel.tsx` |

## Section 3 — Security and compliance

| Item | Status | Proof |
|------|--------|-------|
| Tenant isolation (SYS-09 contract) | Documented + tested | `tests/role-company-multi-tenant-verification.test.ts` |
| Email verification optional (documented) | Done | `docs/SECURITY_AND_COMPLIANCE.md` |
| Audit logs surfaced for admin | Done | Getting Started + security doc |
| India payroll disclaimer | Done | `PayrollComplianceDisclaimer` component |

## One-shot proof bundle

```powershell
npx tsx --test tests/enterprise-readiness-sections-2-3.test.ts
npx tsx --test tests/productization-hardening-integration.test.ts
npx tsx --test tests/release-gaps-proof.test.ts
npx tsx --test tests/role-company-multi-tenant-verification.test.ts
```

Expected: all exit `0`.

## Release hardening (sections 2–5)

See `docs/RELEASE_HARDENING_CHECKLIST.md` — sections 2–5 are satisfied by the tests above plus portal-policy backfill tests.

## Manual smoke (after deploy)

| Role | Check |
|------|--------|
| HR | `/hr/salary-structures` — table visible after add |
| Manager | Approve leave only when assigned approver |
| Admin | Getting Started shows “Per-employee salary structures” step |
