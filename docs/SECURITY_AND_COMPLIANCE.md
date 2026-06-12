# Security and Compliance (Continuum)

Customer-facing summary for pilots and enterprise evaluations. **Section 1 (email DNS, uptime monitors, Neon restore)** is operational — see the enterprise readiness guide; this document covers **Section 3** product/security contracts.

## Tenant isolation

- HR data is scoped by `company_id` / `org_id` on Prisma queries.
- APIs reject cross-tenant access unless the actor is `super_admin` with an explicit cross-company route.
- **Recurring test:** scenario **SYS-09** in `web/docs/ROLE_MODULE_SCENARIO_MATRIX.md`.
- **Automated proof:** `npx tsx --test tests/role-company-multi-tenant-verification.test.ts` (from `web/`).

## Email verification

| Policy (current default) | Behavior |
|--------------------------|----------|
| **Optional** | Users may use leave, payroll, and invites without verified email. Verification improves account recovery. |
| **Required** (future) | Block sensitive actions until `notification_preferences.auth.emailVerification.verified` is true. |

APIs: `/api/auth/email-verification/send`, `/status`, `/confirm`. State helpers: `web/lib/product-readiness.ts`.

To switch to **required**, add guards on leave submit and payroll generate and document the change in your customer security PDF.

## Audit logs

- Route: `/admin/audit-logs` (permission `audit.view`).
- API: `GET /api/audit-logs` with company scope.
- Health: `/api/admin/health` includes audit chain checks when compliance module is enabled.
- **Sales line:** “Administrative actions can be recorded in an immutable audit trail (enable compliance module for enterprise tenants).”

## India payroll

- Internal CTC breakdown, PF/ESI/PT/TDS-style calculations, payslip generation.
- **Not included:** statutory filings, Form 16 generation, government challan submission.
- In-app disclaimer: `PayrollComplianceDisclaimer` on HR payroll and salary structure pages.

## Delegation

- **Available:** per-employee approval chains, company approval matrix, manager/HR approver rules.
- **Roadmap:** time-bound delegation (e.g. “manager on leave → delegate to X”) — not fully implemented in `enterprise-approval-workflow.ts`.

## Related docs

| Topic | Path |
|--------|------|
| Release hardening (sections 2–5) | `docs/RELEASE_HARDENING_CHECKLIST.md` |
| Sections 2–3 proof commands | `docs/ENTERPRISE_READINESS_SECTIONS_2_3_PROOF.md` |
| Role scenario matrix | `web/docs/ROLE_MODULE_SCENARIO_MATRIX.md` |
