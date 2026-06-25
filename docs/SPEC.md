# SPEC

Master product specification index for Continuum enterprise operations.

## Product Scope

- Zero UI (assistant + messaging-first execution)
- Enterprise multi-role admin platform
- Module lifecycle (provision, cap, enable, operate, audit)
- Super-admin governance and subscription-driven entitlement

## Behavioral Source of Truth

- `enterprise_real_journey_scenarios.md` defines expected behavior across:
  - Leave-only mode
  - Two-modules-enabled mode
  - All-modules-enabled mode
  - Role hierarchy variants (admin/hr/manager/employee, super-admin)
  - Web-only, Zero UI-only, and mixed channel continuity

## System Invariants

- Every action must map to role permission + module entitlement.
- Disabled modules must be blocked consistently across nav, middleware, API, and assistant.
- Sensitive operations require authenticated identity and auditable mutation path.
- Defaults must fail safe on uncertain auth/entitlement state.

## Primary Linked Specs

- `zero_ui_agentic_architecture.md` — Zero UI agent design, orchestration, scenarios, stack
- `enterprise_real_journey_scenarios.md` — enterprise journey contract
- `prd.md`
- `trd.md`
- `backend_schema.md`
- `app_flow.md`
- `rbac_permission_matrix.md`
- `testing.md`
- `security&compliance.md`
- `operational_runbooks.md`
