# RBAC Permission Matrix

Role-to-permission model with module-aware enforcement.

## Core Roles

- `super_admin`: platform governance (tenant provisioning, module cap, subscription control)
- `admin`: company-wide operational ownership
- `hr`: people operations and policy ownership
- `manager` / `team_lead`: team-scoped operational actions
- `employee`: self-service operations only

## Enforcement Rules

- Permissions alone are not enough; module entitlement must also pass.
- Tenant boundary must always be enforced by company context.
- Manager/team-lead default read scope must be team-only unless `employee.view_all` is granted.
- Super-admin must not bypass tenant-scoped business actions unless route is explicitly platform-level.

## Mandatory Permission + Module Pairing

- Leave actions require leave permissions and `leave` module enabled.
- Documents actions require document permissions and `documents` module enabled.
- Performance/review actions require performance permissions and `performance` module enabled.

## Validation Requirements

- Tests must verify:
  - unauthorized role rejection,
  - missing module rejection,
  - cross-company access rejection,
  - team-scope boundary for manager default list behavior.
