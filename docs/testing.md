# Testing

Testing strategy to guarantee no user-facing breakage under module/role/channel combinations.

## Required Test Layers

- Unit tests for guard logic (auth, permissions, module checks).
- API integration tests for tenant isolation and role boundaries.
- Scenario tests for leave-only, two-modules-enabled, and all-modules-enabled.
- Auth/session safety tests (safe redirects, refresh lifecycle, sign-out cleanup).
- Security tests (document upload validation, forbidden diagnostic routes, secret scanning).

## Scenario Matrix (Minimum Baseline)

1. Leave-only tenant, admin/hr/employee, web channel.
2. Leave-only tenant, admin/hr/manager/employee, web + assistant.
3. Leave + payroll tenant with manager approvals.
4. All modules enabled tenant with full hierarchy.
5. Module toggled off mid-session (must fail safe).
6. Plan downgrade with module-cap clamp (must preserve data, restrict operations).

Automated coverage added: `web/tests/enterprise-scenario-matrix.test.ts`.

Current covered IDs:

- S1-S6: module combinations, disabled payroll fail-closed behavior, and mid-session recomputation.
- R1-R2: HR/admin fallback approval permission and manager team-approval permission.
- C1-C3: web assistant server draft, WhatsApp headless draft, and shared `AssistantConversation` persistence model.

## Non-Breaking Release Gates

- `npm run build`
- `npx tsc --noEmit --pretty false`
- `npm test` (or approved gated suite)
- `npm run lint` once the existing lint backlog is cleared
- `npm audit --omit=dev --audit-level=moderate` (or approved threshold)

## Critical Pass Criteria

- Sign-in, onboarding, leave apply, leave approve, sign-out pass.
- Disabled modules cannot be executed from UI, API, middleware, assistant.
- Manager default visibility remains team-scoped unless elevated permission exists.
- Zero UI actions and web actions produce equivalent business outcomes and audit entries.
