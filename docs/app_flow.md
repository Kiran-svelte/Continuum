# App Flow

End-to-end workflows across module enablement states, roles, and channels.

## Flow A: Leave-Only Enabled

- Super-admin provisions company with leave module enabled.
- Admin/HR complete leave policy setup (types, quotas, approvals, holidays).
- Employee applies leave (web or assistant).
- Manager/HR approves based on hierarchy.
- Audit + notifications generated.

Blocked behavior:
- Payroll/performance/travel/recruitment actions must return module-disabled responses.

## Flow B: Two Modules Enabled

- Tenant has leave + one additional module.
- Navigation, assistant intents, and API scope expose only those enabled capabilities.
- Cross-module dependencies validated before action execution.

## Flow C: All Modules Enabled

- Full role-specific navigation and assistant action surface.
- Setup hub tracks readiness per module.
- Operations and reporting span all active modules.

## Role Hierarchy Variants

- Admin + HR + Employee (no manager): approvals route via HR/admin fallback.
- Admin + HR + Manager + Employee: manager-first approval with escalation.
- Super-admin: governance-only role for provisioning, cap, and subscription control.

## Channel Continuity

- Web-first: full portal action path with assistant assist.
- Zero UI: verified channel identity executes same backend services.
- Mixed: in-progress user workflows retain consistent outcomes when switching channels.
