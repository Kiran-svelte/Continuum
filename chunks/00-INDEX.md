# Continuum Enterprise Remediation — Chunk Index

**Audit date:** 2026-06-13  
**Scope:** `web/` canonical app root (AGENTS.md)  
**Goal:** Each chunk is independently implementable, testable, and deployable.

## Severity legend

| Tag | Meaning |
|-----|---------|
| P0 | Blocks signup/onboarding/production trust |
| P1 | Breaks a core HR workflow for tenants |
| P2 | Enterprise gap (compliance, observability, UX debt) |
| P3 | Cleanup / remove duplicate or dead code |

## Chunk map

| ID | File | Domain | Priority | Status |
|----|------|--------|----------|--------|
| C01 | [01-auth-session-rbac.md](./01-auth-session-rbac.md) | Auth, JWT, RBAC, middleware | P0 | **In progress** |
| C02 | [02-company-onboarding-wizard.md](./02-company-onboarding-wizard.md) | Admin 13-step onboarding | P0 | Planned |
| C03 | [03-employee-onboarding-welcome.md](./03-employee-onboarding-welcome.md) | Employee profile + welcome | P1 | Planned |
| C04 | [04-org-setup-hub.md](./04-org-setup-hub.md) | Admin setup wizard hub | P1 | Planned |
| C05 | [05-leave-constraints-engine.md](./05-leave-constraints-engine.md) | Leave + Render constraint engine | P0 | Planned |
| C06 | [06-attendance-shifts.md](./06-attendance-shifts.md) | Attendance, shifts, regularization | P1 | Planned |
| C07 | [07-payroll-compliance.md](./07-payroll-compliance.md) | Payroll, PF/ESI, payslips | P1 | Planned |
| C08 | [08-approvals-workflows.md](./08-approvals-workflows.md) | Multi-tier approvals | P1 | Planned |
| C09 | [09-module-gating-portals.md](./09-module-gating-portals.md) | CF-001..015, nav, portals | P0 | Planned |
| C10 | [10-invites-people-directory.md](./10-invites-people-directory.md) | Invites, bulk import, directory | P1 | Planned |
| C11 | [11-reports-audit-compliance.md](./11-reports-audit-compliance.md) | Reports, audit logs, compliance | P2 | Planned |
| C12 | [12-cron-ops-readiness.md](./12-cron-ops-readiness.md) | Cron jobs, ops readiness | P1 | Planned |
| C13 | [13-billing-payments.md](./13-billing-payments.md) | Razorpay/Cashfree, billing | P2 | Planned |
| C14 | [14-ui-design-system.md](./14-ui-design-system.md) | Tokens, theme, portal shell | P2 | Partial (PR11/12) |
| C15 | [15-dead-code-cleanup.md](./15-dead-code-cleanup.md) | Remove duplicates, legacy paths | P3 | Planned |

## Cross-cutting issues (all chunks)

1. **Dual auth stacks** — `continuum-access` JWT (live) vs `continuum-session` (legacy server actions). Causes "Not authenticated" on onboarding when JWT is valid. **Fix in C01.**
2. **Dirty local tree** — 500+ uncommitted files; merges blocked. Ship via focused PRs from clean paths.
3. **Render Git deploy** — API cannot fetch GitHub repo; constraint engine code updates require dashboard reconnect.
4. **Vercel CLI deploys** — `UNKNOWN` status; use Git → `main` deploys only.
5. **Missing `@/` imports on UX branch** — `lib/firebase`, `lib/firebase-admin` (optional legacy); verify before enabling Firebase paths.
6. **Mock/demo leakage** — Demo auth must stay non-production (`isDemoAuthEnabled()`); audit per C15.

## Implementation order (recommended)

1. C01 Auth fix → unblocks onboarding API + server actions  
2. C02 Onboarding wizard hardening → screenshot issue  
3. C05 Leave + constraint engine Render reconnect  
4. C09 Module gating alignment  
5. Remaining chunks by tenant impact  

## Verification contract (every chunk)

- `npm run test -- --test-name-pattern=<chunk>` where tests exist  
- `npm run build` in `web/`  
- Manual smoke on `continuum.support` for user-visible chunks  
- Git push to `main` → Vercel production deploy  
