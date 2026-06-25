# Documentation Readme

This folder is the source of truth for enterprise readiness, Zero UI behavior, and module-enabled product operation.

## Canonical Contract

- Primary behavioral contract: `enterprise_real_journey_scenarios.md`
- Zero UI agentic architecture: `zero_ui_agentic_architecture.md`
- System specification index: `SPEC.md`
- Active execution and remediation: `GLOBAL_WEB_REMEDIATION_IMPLEMENTATION_PLAN.md`

If any document conflicts with `enterprise_real_journey_scenarios.md`, follow the scenarios contract and update the conflicting document.

## Required Non-Breaking Product Guarantees

- Build, typecheck, and route resolution must pass.
- Core journeys must pass: sign-in, onboarding, leave apply, leave approve, sign-out.
- Disabled modules must be non-operable in UI, middleware, API, and assistant.
- Role boundaries must be enforced (manager team scope by default unless explicitly elevated).
- Auth/session flows must be symmetric and safe (safe redirects, cookie consistency, refresh lifecycle).

## Documentation Status Rules

- No placeholder-only docs for operational areas (`testing`, `security`, `devops`, `rbac`, `app_flow`).
- Every operational doc must include:
  - Purpose and scope
  - Owner and update cadence
  - Acceptance criteria
  - Verification command(s) or evidence

## Release Readiness Evidence

Before production release, update docs with proof from:

- `npm run build`
- `npx tsc --noEmit --pretty false`
- `npm test` (or agreed suite gate)
- Security/secret scan output
- Module-gating and role-boundary test output
