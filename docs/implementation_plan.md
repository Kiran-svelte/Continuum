# Implementation Plan

Sequenced implementation plan to satisfy `enterprise_real_journey_scenarios.md` with production-safe rollout.

## Phase 1: Build and Route Integrity

- Restore all live route imports to existing components.
- Remove malformed scripts from route trees.
- Ensure Prisma can be imported in tests without eager DB connect failure.
- Eliminate Next lockfile root ambiguity or configure `outputFileTracingRoot`.

Exit criteria:
- `npm run build` succeeds.
- `npx tsc --noEmit --pretty false` succeeds.

## Phase 2: Auth and Session Safety

- Canonicalize auth model and remove contradictory legacy flows.
- Enforce safe callback redirects.
- Use brand-based cookie constants universally.
- Ensure symmetric sign-in/refresh/sign-out/reset for all roles.

Exit criteria:
- Auth flow tests pass.
- No unauthenticated diagnostic/auth mutation routes remain.

## Phase 3: RBAC and Module Gates

- Enforce team-scope defaults for managers unless explicit elevated permission.
- Add missing module assertions to APIs.
- Require company context before tenant-scoped access.

Exit criteria:
- Module-gating and RBAC boundary tests pass.

## Phase 4: Document and Storage Hardening

- Strong file validation and safe storage semantics.
- Remove fake-success upload fallbacks.
- Private/signed-access strategy for sensitive documents.

Exit criteria:
- Security document/upload tests pass.

## Phase 5: Onboarding Contract Alignment

- One canonical onboarding source of truth (UI + API + docs).
- Validate required setup before onboarding completion.
- Align signup model to product strategy (invite-only vs public).

Exit criteria:
- Onboarding contract sync tests pass.

## Phase 6: Non-Functional Readiness

- Fix lint and hook warnings.
- Tighten CSP and middleware safety defaults.
- Address high/critical dependency vulnerabilities.
- Remove local-only debug telemetry from production paths.

Exit criteria:
- Lint/build/audit thresholds pass.

## Phase 7: CI Regression Gates

- CI must run: install, typecheck, tests, build, secret scan, audit.
- Add static checks for unsafe redirects, hardcoded secrets, cookie naming drift, and missing module guards.

Exit criteria:
- CI blocks regressions before merge.
