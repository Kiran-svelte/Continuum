# README Implementation Checklist (Layered)

## Layer 0: Platform Invariants (Must Never Break)
- Tenant isolation on every data query by company/org id.
- Immutable audit logs for all mutating actions.
- Server-side constraint validation for leave submit and approval.
- No cross-company access.
- No direct leave balance mutation without ledger update path.
- Security headers, rate limiting, auth guard for protected APIs.

## Layer 1: Onboarding Contract
- Company setup stores org profile, work schedule, SLA, probation, and leave-year settings.
- Leave types are selectable and fully configurable per company.
- Quotas, carry-forward, encashment, and paid/unpaid settings persist dynamically.
- Constraint rules are generated from selected leave types and saved as active rules.
- Public holidays and notification preferences are persisted.
- Constraint policy snapshot is created/updated.
- Onboarding completion marks company active and redirects to HR dashboard.

## Layer 2: Registration and Approval Contract
- New signups do not bypass email confirmation flow when enabled in auth provider.
- Direct employee joins are created in onboarding/pending status.
- HR/admin approval is required before activation.
- Pending registrations are visible in HR queue.

## Layer 3: Dynamic Leave Engine Contract
- Active leave types define all employee balances and policy checks.
- Constraint engine receives only company-configured leave types.
- Monthly quota and other per-type constraints follow company-defined values.
- Profile and request flows consume company leave types and not hardcoded defaults.

## Layer 4: Access, Dashboard, and Role Flows
- Only admin/hr can run onboarding completion.
- Employee/manager routes are role-scoped.
- Pending/onboarding users should not perform privileged setup actions.

## Layer 5: Operational Quality
- Build passes.
- Diagnostics tracked and reduced in chunks.
- Deployment health verified after each chunk.

## Current Chunk Status
- Completed in this chunk:
  - Dynamic leave-type upsert during onboarding completion.
  - Removed auto-activation behavior for direct joins.
  - Signup flow switched to Supabase signUp (email confirmation compatible).
  - Onboarding role guard: non admin/hr cannot complete setup.
  - Build passed locally.
- Next chunk candidates:
  - Accessibility and inline-style diagnostics batch.
  - Eslint type-hardening batch (unexpected any, unescaped entities, prefer-const).
  - Pending approval UX hard gate for onboarding-status employees.
