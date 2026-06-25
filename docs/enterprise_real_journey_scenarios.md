# Enterprise Real Journey Scenarios

This document defines end-to-end behavior for all enterprise usage modes, with special focus on Zero UI and module-based rollout.

## 1) Scenario Dimensions

Every user journey is derived from these dimensions:

- Enabled modules set (example: leave only, leave+attendance, all)
- Company hierarchy model (admin/hr/manager/employee variations)
- Channel (web portal, assistant widget, WhatsApp/Zero UI)
- Company lifecycle stage (new onboarding, live operations, expansion, renewal)
- Plan and entitlement status (free/starter/growth/enterprise)
- Data readiness state (configured, partially configured, invalid)
- Security state (MFA/session healthy, token expired, policy violation)
- Incident state (service degraded, external connector down, DB latency high)

## 2) Core Scenario Families

### A. Module Entitlement Scenarios

#### A1. Leave only enabled
- Visible menus: leave, profile, limited essentials.
- Hidden/disabled menus: payroll, performance, travel, recruitment, documents (unless mandatory by policy).
- Assistant allowed intents: apply leave, leave balance, leave status, leave approvals (if role permits).
- Assistant blocked intents: payroll and unrelated module actions return module-disabled guidance.
- Setup wizard: only leave-critical and company basics steps remain active.

#### A2. Leave + one additional module enabled
- Navigation and assistant dynamically include only enabled second module.
- Role permissions are intersected with enabled modules.
- Cross-module dependencies are validated before exposing actions.

#### A3. All modules enabled
- Full navigation and assistant catalog available.
- Setup hub checks each module readiness checklist.
- Analytics and observability include module-level adoption and reliability metrics.

### B. Role/Hierarchy Scenarios

#### B1. Admin + HR + Employee (no manager layer)
- Leave approvals route through HR/admin fallback chain.
- Team-scoped views are replaced by org-scoped or direct-report alternatives.

#### B2. Admin + HR + Manager + Employee
- Multi-level approval chain uses manager-first then HR/escalation.
- Manager gets team-only data boundaries by default.

#### B3. Super-admin governed tenant
- Super-admin controls module cap, plan assignment, and provisioning.
- Tenant admin can configure only within granted cap and policy constraints.

### C. Channel Scenarios (Zero UI Priority)

#### C1. Web-first tenant
- All critical actions available via portal.
- Assistant acts as guided command layer inside portal.

#### C2. Zero UI active tenant
- Phone-verified identity links to employee account.
- Day-to-day actions run over messaging channel through same backend services.
- Any sensitive action requires confirmation and audit trail.

#### C3. Mixed channel continuity
- User starts on web, resumes on messaging, and vice versa without state loss.
- Session and conversation continuity must remain consistent.

## 3) Enterprise Journey Timeline

### Stage 0: Provisioning
- Super-admin creates company.
- Plan and module cap assigned.
- Owner/admin credentials and access policy established.

### Stage 1: Foundation onboarding
- Company profile, org structure, leave policies, quota rules.
- Channel policy: opt-in, phone verification, retention settings.

### Stage 2: Operational go-live
- Leave requests/approvals fully operational.
- Audit logging, notifications, and rate limits active.

### Stage 3: Expansion
- New module purchase/enablement.
- Readiness checks required before module activation.

### Stage 4: Maturity
- Multi-module optimization, analytics, automation, compliance reporting.

## 4) Required UI Behavior Rules

- Only show buttons and pages the user can execute now.
- Disabled modules must show clear reasons and next action.
- Every primary CTA maps to one backend permission + module entitlement.
- Role changes and module toggles must update UI and assistant capabilities immediately.
- Empty states must be operational, not decorative (with setup links and remediation).

## 5) Required Backend Behavior Rules

- All mutations use service-layer guards: auth, role, permission, module, company state.
- Fail-safe defaults: deny on uncertain entitlement, never allow on stale state.
- Idempotency keys for all critical operations.
- Unified audit trail across web and Zero UI channels.
- Consistent error contract for UI and assistant.

## 6) “Should Not Break” Release Gates

- Build, typecheck, and route resolution are clean.
- Core journeys pass: sign-in, onboarding, leave apply, leave approve, sign-out.
- Module gating consistency: nav + middleware + API + assistant.
- Security baseline: no hard-coded secrets, safe redirects, session symmetry.
- Observability baseline: traces, alerts, SLOs, incident runbooks.

## 7) Scenario Matrix Strategy (Covers Every Combination)

Full combinatorial testing is huge. Use pairwise + risk-based expansion:

- Baseline set:
  - Leave-only tenant, 3-role hierarchy, web-only
  - Leave-only tenant, 4-role hierarchy, Zero UI enabled
  - Leave+payroll tenant, manager present
  - All-modules tenant, enterprise plan, full hierarchy
- Expansion set:
  - Module toggle mid-session
  - Plan downgrade and cap enforcement
  - Channel switch during in-progress workflow
  - Service degradation with fallback messaging

## 8) Commercial Flow Scenarios

- Super-admin-led enterprise sale:
  - Provision -> configure -> pilot -> production -> expansion.
- Self-serve growth sale:
  - Plan selection -> payment -> cap update -> guided enablement.
- Upgrade scenarios:
  - Add payroll/performance after leave stabilization.
- Downgrade scenarios:
  - Keep data, restrict actions, preserve audit history.

## 9) Canonical Acceptance Criteria

- Leave-only mode works end-to-end for all active roles.
- Any disabled module is non-operable from UI, API, and assistant.
- All enabled modules expose coherent pages, buttons, and assistant intents.
- Hierarchy changes immediately affect approval routing and visibility boundaries.
- Zero UI and web produce equivalent business outcomes and audit evidence.
