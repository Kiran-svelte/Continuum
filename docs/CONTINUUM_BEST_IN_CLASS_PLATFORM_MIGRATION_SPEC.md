# Continuum Best-in-Class Platform Migration Spec

Status: approval required before implementation
Date: 2026-07-12
Scope: Continuum HRMS in `web/`

## 1. Executive Goal

Convert Continuum from a mostly page-driven HRMS with partial Zero UI and a limited assistant into a production-grade, intent-first, API-first, policy-governed, observable, multi-tenant HR operating system.

This is not a visual redesign only. Zero UI becomes the primary user interaction layer, but every product pillar must receive the matching production-grade equivalent:

| Pillar | Target approach | Meaning for Continuum |
| --- | --- | --- |
| UI | Zero UI | Chat, voice-ready, invisible actions, minimal navigation dependence |
| UX | Intent-first and anticipatory | System surfaces next best actions before users search |
| Backend | Headless and API-first | Every business capability is callable by UI, assistant, workflow, and integrations |
| Database | Multi-model ready | PostgreSQL remains source of truth, with Redis/search/conversation stores added behind adapters |
| Integration | Autonomous integration | Connectors, webhooks, tool registry, and mapping discovery |
| AI/ML | Composite AI | LLM conversation, rules/policy, deterministic tools, and ML signals |
| Security | Zero trust | Auth, RBAC, module gates, tenant scope, idempotency, audit, and verification on every action |
| DevOps | GitOps and continuous proof | CI, migrations, tests, canary, rollback, deploy provenance |
| Scalability | Event-driven first | Durable domain events, retries, dead-letter handling, background processors |
| Observability | Full-stack telemetry | Per-turn traces, tool latency, user-visible outcomes, metrics, logs |
| Data | Real-time data product layer | Domain-owned metrics and streams for HR, payroll, leave, attendance, learning |
| Testing | Shift-left plus production proof | Unit, integration, E2E, canary, smoke, health, audit verification |
| Compliance | Privacy by design | Consent, retention, subject access, audit exports, policy checks |
| Monetization | Usage and value metering | Usage records for AI turns, tool executions, workflows, API calls |

## 2. Current Surface Facts

Observed from the current checkout:

- `web/app/api` has about 275 route files.
- `web/app` has about 190 page files.
- Existing docs describe the target scope as 64 services, about 350 pages, about 500 API routes, and about 800 components.
- Existing assistant route: `web/app/api/ai/assistant/route.ts`.
- Existing assistant actions are limited mainly to leave request, leave approve, and leave reject flows.
- Existing assistant execution forwards authenticated POST requests and writes audit logs.
- Existing primitives include RBAC, auth guard, module gates, audit hash chain, workflow tables, notifications, API keys, usage records, metrics, health checks, Logtail/Sentry hooks, event bus stubs, and AI/ML helper engines.
- Existing event bus does not yet persist/process durable events; its emit/process paths are effectively stubs.
- Existing critical audit documents identify gaps in AI function calling, RBAC consistency, notifications, audit trails, payroll, performance, integrations, observability, and missing modules.

## 3. Non-Negotiable Product Rules

1. AI owns natural language only.
2. Tools own real actions.
3. Policy owns permissions.
4. Executor owns safe execution.
5. Verifier owns truth and missed-action checks.
6. Response composer owns useful, buyer-safe or employee-safe replies.
7. Humans own risky judgement.
8. Audit and monitoring must prove every action.
9. The assistant must never claim an action happened unless a tool committed and delivery/action proof exists.
10. Phrase workflows cannot be the primary behavior.
11. No route may bypass tenant scope, RBAC, module gates, or plan gates.
12. No production completion claim without tests, deploy, and live proof.

## 4. Impact Mapping and Gap Analysis

### 4.1 UI Pages

Touches:

- Employee, manager, HR, admin, super-admin, support, onboarding, invite, search, notifications, settings, dashboards, approval pages, leave, attendance, payroll, learning, performance, travel, reimbursements, compliance, audit logs, reports.

Exists:

- Many page surfaces already exist, including role dashboards, search pages, notification pages, settings pages, system health, RBAC, module readiness, audit logs, and core HR workflow pages.

Modify:

- Add a role-aware conversational command layer to each portal layout.
- Add compact intent surfaces to dashboards: pending actions, recommended actions, blockers, confirmations, escalation alerts.
- Add "explain this" and "act on this" affordances to high-value records without turning every page into a chat screen.
- Convert search pages from navigation search only into intent search: "approve Rahul's leave", "show payroll blockers", "who missed attendance this week".
- Add loading, pending, failed, needs-confirmation, and verified states for assistant actions.

Create:

- Unified `Agent Console` page for employees/managers/HR/admin.
- `Intent Inbox` for actions waiting on confirmation, human review, or verifier failure.
- `Automation History` page for executed tool runs and proof.
- `AI Policy Settings` pages for company admins.
- `Tool Registry` and `Connector Health` pages for admins/super-admins.

### 4.2 Navigation

Exists:

- `web/lib/navigation/portal-nav.ts`.
- Module path gating via middleware module path maps.

Modify:

- Keep navigation available, but demote it from primary workflow dependency.
- Add assistant entry points and intent shortcuts to each portal.
- Route assistant-generated links only through the existing navigation catalog to avoid hallucinated URLs.
- Add module-aware action availability to navigation metadata.

Create:

- Action catalog metadata: route, permission, module, required plan, supported actor roles, confirmation level.
- A navigation-to-tool resolver so each page can expose supported actions to the assistant.

### 4.3 Dashboard Widgets

Exists:

- Role dashboard views and HR metrics endpoints exist.

Modify:

- Add next-best-action widgets: approvals due, missing employee data, payroll blockers, attendance anomalies, onboarding blockers, compliance deadlines.
- Add "why this is shown" explanations from rules/ML outputs.
- Add per-widget action buttons backed by tool definitions, not inline custom logic.

Create:

- Company-wide `Agentic Readiness` dashboard.
- `AI Action SLA` dashboard: tool latency, verifier failures, pending human approvals.
- `Automation ROI` dashboard: workflows completed, manual steps avoided, time saved, usage cost.

### 4.4 Backend APIs

Exists:

- Large REST API surface already exists.
- Assistant route exists.
- AI helper routes exist for smart leave, coaching, attrition, query.
- Workflow routes exist.

Modify:

- Normalize every business route behind a typed service/tool contract.
- Add consistent `requireApiPermission`, tenant scope, module gate, plan gate, Zod validation, idempotency, optimistic locking, audit, event emission, and telemetry to action routes.
- Replace assistant direct route assumptions with a tool registry and executor.
- Ensure API responses return structured outcome proof: `committed`, `entityId`, `auditId`, `eventId`, `deliveryIds`, `verificationStatus`.

Create:

- `POST /api/agent/chat`: primary conversational turn endpoint.
- `POST /api/agent/voice`: voice-ready transcript endpoint, initially text-only adapter-compatible.
- `GET /api/agent/tools`: available tools for actor/company.
- `POST /api/agent/actions/draft`: create a pending action draft.
- `POST /api/agent/actions/[id]/confirm`: confirm and execute a draft.
- `POST /api/agent/actions/[id]/cancel`: cancel a draft.
- `GET /api/agent/actions`: pending, failed, executed action history.
- `POST /api/agent/verifications/[id]/retry`: retry verifier on committed actions.
- `GET /api/admin/ai/policies`: company AI policy.
- `PATCH /api/admin/ai/policies`: update policy.
- `GET /api/admin/ai/tools`: tool registry and health.
- `PATCH /api/admin/ai/tools/[slug]`: enable, disable, require approval, or change limits.
- `GET /api/admin/ai/audit`: agentic audit trail.
- `GET /api/admin/integrations/connectors`: connector catalog.
- `POST /api/admin/integrations/connectors/[slug]/connect`: start connector setup.
- `GET /api/admin/integrations/connectors/[slug]/health`: connector health.
- `POST /api/events/process`: durable event processor for cron/worker.

### 4.5 Database

Exists:

- PostgreSQL via Prisma.
- `Company`, `Employee`, `Notification`, `NotificationTemplate`, `NotificationPreference`, `AuditLog`, `CompanySettings`, `UsageRecord`, `ApiKey`, `WorkflowTemplate`, `WorkflowStep`, `WorkflowInstance`, `WorkflowAction`.

Modify:

- Extend existing usage records for AI turns, tool calls, workflow executions, connector calls.
- Extend audit action taxonomy for agentic planning, tool execution, verification, and human override.
- Make domain events durable in Prisma instead of stubbed in code.
- Add indexes on company, actor, status, created date, and idempotency keys for all agentic tables.

Create:

- `AiCompanyPolicy`: enabled channels, allowed tools, autonomy levels, approval thresholds, risky-action rules.
- `AiConversation`: tenant-scoped conversation/session.
- `AiMessage`: user/assistant/tool/verifier messages, channel metadata, redacted content support.
- `AiIntent`: extracted intent, confidence, domain, entities, ambiguity, chosen plan.
- `AiActionDraft`: pending tool action requiring confirmation or approval.
- `AiToolDefinition`: canonical tool catalog.
- `AiToolInvocation`: tool execution record with request/response hashes, status, latency, idempotency key.
- `AiVerification`: verifier result, missed-action checks, truth proof, failure reason.
- `AiHumanReview`: review queue for risky or low-confidence actions.
- `AiSafetyEvent`: policy denials, hallucination prevention, verifier mismatches.
- `DomainEvent`: persistent event stream with retry count, backoff, status, dead-letter reason.
- `IntegrationConnector`: connector definitions.
- `IntegrationAccount`: tenant connector credentials metadata, encrypted secret reference only.
- `IntegrationWebhookEndpoint`: inbound/outbound webhook configs.
- `SearchIndexJob`: search/index refresh queue.
- `TelemetryTrace`: agentic turn trace correlation when external tracing is unavailable.
- `BillingMeter`: normalized usage/value metering by company.

### 4.6 Admin Panels

Exists:

- Admin settings, RBAC, policy settings, system health, startup readiness, module readiness, audit logs, super-admin company/module/subscription pages.

Modify:

- Add AI policy controls to admin settings.
- Add module-specific autonomy settings, for example leave can auto-draft but payroll requires human review.
- Add connector health and credential status without exposing secrets.
- Add action replay/retry controls for failed safe actions.
- Add human review assignment and SLA views.

Create:

- `AI Governance` admin area.
- `Tool Registry` admin area.
- `Verifier Failures` admin area.
- `Connector Catalog` and `Connector Health` admin areas.
- `Usage and Value Metering` admin/super-admin views.

### 4.7 Notifications

Exists:

- Notification models, notification routes, preferences, email bridge, Pusher-related real-time support, WhatsApp webhook route.

Modify:

- Every tool outcome that affects a user must create exactly one durable notification/event per intended recipient.
- Add channel proof fields: in-app row id, email provider id, WhatsApp provider id, push id.
- Use notification preferences and urgency rules.
- Link notifications to actions, workflow instances, and audit logs.

Create:

- Agentic notification templates: draft ready, confirmation required, action completed, action failed, human review needed, verifier mismatch, connector degraded.
- Retry/dead-letter monitor for notification delivery.

### 4.8 Logs, Audit, and Observability

Exists:

- Audit chain, admin health, metrics endpoint, Sentry/Logtail hooks, logger utilities, security events.

Modify:

- Add trace id propagation across assistant turn, policy check, tool execution, database write, notification, verifier, response.
- Add structured logs for AI intent, selected tool, policy decision, execution result, verifier result.
- Redact PII and sensitive payloads by default.
- Add metrics for turn latency, tool latency, failures, verifier mismatch, human review backlog, cost/usage.

Create:

- Agentic trace viewer in admin.
- Production smoke endpoint or script for assistant happy path and denied path.
- Alert thresholds for high verifier failure, tool failure, queue backlog, 5xx, and degraded connector.

### 4.9 Error Handling

Exists:

- Mixed route-level try/catch patterns.
- Error pages for some portals.

Modify:

- Standardize error envelopes: `code`, `message`, `retryable`, `traceId`, `nextAction`.
- User replies must distinguish "not allowed", "needs confirmation", "system failed", "tool committed but notification failed", and "verifier could not prove result".
- Add idempotent retry support for safe action execution.

Create:

- Central agentic error taxonomy.
- Dead-letter recovery flow for events and tool invocations.

### 4.10 Loading and Pending States

Exists:

- Loading pages exist for several portals.

Modify:

- Add streaming/pending state for assistant turns.
- Add action progress states: planning, needs info, needs confirmation, executing, verifying, notifying, done, failed.
- Persist pending action state so refresh/browser close does not lose a confirmation.

Create:

- Shared action status component for chat, dashboard widgets, and admin history.

### 4.11 User Permissions

Exists:

- RBAC has many permissions.
- Audit notes show inconsistent enforcement in some routes.

Modify:

- Every assistant tool maps to one or more existing permission codes.
- Tool access checks must combine user role, secondary roles, company id, module state, plan, action risk, and data ownership.
- Permission denials must be audit-logged.

Create:

- New permissions:
  - `ai.use_assistant`
  - `ai.execute_own_actions`
  - `ai.execute_team_actions`
  - `ai.review_actions`
  - `ai.configure_policy`
  - `ai.view_audit`
  - `ai.manage_tools`
  - `integrations.manage`
  - `integrations.view_health`
  - `usage.view_ai`

## 5. Target Architecture

### 5.1 Agentic Runtime

The runtime must be split into these units:

1. Channel adapter: web chat, future voice, WhatsApp, API.
2. Conversation store: messages, state, redaction, actor context.
3. Intent parser: LLM plus deterministic extractors.
4. Planner: maps intent to candidate tools and asks for missing fields.
5. Policy engine: checks permissions, modules, plans, risk, and company AI policy.
6. Tool registry: typed tool definitions with schemas, permissions, risk level, idempotency, verifier.
7. Executor: runs one approved tool with idempotency and transaction boundaries.
8. Verifier: proves the action really happened and detects missed actions.
9. Response composer: produces useful replies from verified truth only.
10. Telemetry/audit writer: records every step.

### 5.2 Tool Contract

Every tool must define:

- `slug`
- `domain`
- `description`
- `inputSchema`
- `outputSchema`
- `requiredPermissions`
- `requiredModules`
- `requiredPlanFeatures`
- `riskLevel`
- `confirmationPolicy`
- `idempotencyKeyTemplate`
- `execute`
- `verify`
- `composeSuccess`
- `composeFailure`

Initial tools:

- Leave: request leave, cancel own leave, approve leave, reject leave, explain balance, summarize approvals.
- Attendance: regularize attendance, explain anomalies, summarize team attendance.
- Payroll: explain payslip, run preflight, list blockers, generate draft payroll only with human approval.
- Employee: invite employee, update profile fields, explain onboarding blockers.
- Documents: request missing document, verify document collection status.
- Notifications: send/remind with proof.
- Search/reporting: answer from scoped data and link to source records.

### 5.3 Autonomy Levels

Each company and module can configure:

- Level 0: answer only.
- Level 1: draft actions only.
- Level 2: execute low-risk own actions after confirmation.
- Level 3: execute team/admin actions after confirmation and policy approval.
- Level 4: autonomous execution for allowlisted workflows with post-action notification.

Default:

- Employee self-service: Level 2 for low-risk actions.
- Manager approvals: Level 2 or 3 depending on company policy.
- Payroll, termination, compensation, access revocation: human review always required.

## 6. Phased Implementation Plan

### Phase A: Foundation and Guardrails

Goal: make existing assistant safe and platform-ready.

Deliverables:

- Add Prisma models for conversations, messages, intents, action drafts, tool invocations, verification, safety events, company AI policy, and durable domain events.
- Add tool contract types and registry.
- Migrate existing leave assistant actions into tools.
- Add policy engine and permission mapping.
- Add verifier for leave request/approval/rejection.
- Add audit and telemetry for each assistant turn.
- Add tests for tenant isolation, denial paths, verifier truth, and no false action claims.

Proof:

- `npm run typecheck`
- `npm test -- tests/*assistant* tests/*rbac* tests/*leave*`
- `npm run build`

### Phase B: Intent-First UX

Goal: make Zero UI useful across role portals without breaking existing pages.

Deliverables:

- Add portal assistant shell to employee, manager, HR, admin layouts.
- Add action status component and persistent pending action drawer.
- Add dashboard next-best-action widgets.
- Add intent search behavior to existing search pages.
- Add admin AI governance pages.

Proof:

- Playwright or static route coverage for portal shell.
- UI migration guard tests.
- Manual screenshot review for employee, manager, HR, admin dashboards.

### Phase C: Headless/API-First Service Normalization

Goal: ensure core capabilities are callable safely by UI, assistant, workflows, and integrations.

Deliverables:

- Wrap high-value actions in services/tools: leave, attendance regularization, reimbursements, onboarding, notifications, payroll preflight.
- Add standard route guard middleware/helper use.
- Add idempotency keys for all mutating tool actions.
- Add optimistic locking to critical updates.
- Add standardized outcome envelopes.

Proof:

- API integration tests across roles.
- Race-condition tests for approval/payroll-like updates.
- Route permission coverage test.

### Phase D: Durable Events and Notifications

Goal: replace stub event bus with production retryable side effects.

Deliverables:

- Implement `DomainEvent` persistence and processing.
- Add retry/backoff/dead-letter state.
- Move notification side effects to event handlers.
- Add notification proof records and admin dead-letter recovery.

Proof:

- Event processor tests.
- Notification delivery proof tests.
- Dead-letter retry smoke.

### Phase E: Integrations and Data Mesh

Goal: make integrations discoverable and operational.

Deliverables:

- Connector registry.
- Connector account health.
- Webhook endpoint management.
- API key usage audit.
- Search indexing jobs.
- Domain-owned metric APIs.

Proof:

- Connector health tests.
- Webhook HMAC tests.
- Usage record tests.

### Phase F: Observability, Compliance, Monetization

Goal: make production operation provable.

Deliverables:

- Trace propagation for assistant/tool/event flows.
- Admin trace viewer.
- Metrics and alerts for agentic flows.
- Retention and privacy controls for AI messages.
- Usage/value metering for AI turns and tool executions.
- Compliance reports for automated actions.

Proof:

- Metrics endpoint assertions.
- Audit chain verification.
- Privacy redaction tests.
- Usage metering tests.

### Phase G: Production Rollout

Goal: ship safely.

Deliverables:

- Feature flags by company/module.
- Canary enablement for one internal/test company.
- Production smoke scripts.
- Rollback plan.
- Deploy provenance report.

Proof:

- Local tests pass.
- Build passes.
- Migration deploy succeeds.
- Vercel production health checked.
- Render production health checked if API/backend target remains active.
- Live assistant can answer, draft, deny, execute, verify, and audit a safe test action.

## 7. Implementation Order

1. Add schema and generated client changes.
2. Add core agentic runtime types and registry.
3. Migrate current leave assistant into first-class tools.
4. Add policy/verifier/response-composer enforcement.
5. Add tests around "no proof, no claim".
6. Add portal shell and pending-action UX.
7. Add admin policy and audit views.
8. Make event bus durable.
9. Add integrations and usage metering.
10. Add production proof scripts and deploy.

## 8. Testing Matrix

Required before merge:

- Unit: parser, planner, policy, registry, executor, verifier, composer.
- Integration: assistant chat, action draft, confirm, cancel, verifier retry.
- API security: unauthenticated, wrong tenant, missing permission, disabled module, insufficient plan.
- Data isolation: two-company tests for messages, actions, tools, notifications, audit.
- Idempotency: duplicate confirm does not double-submit or double-notify.
- Race: two approvals on same record cannot both win.
- UX: pending action survives refresh.
- Observability: trace id appears in audit/tool/event logs.
- Compliance: redaction and retention behavior.
- Production smoke: safe test company action only.

## 9. Deployment and Commit Policy

Implementation cannot be committed or deployed until:

- This spec is explicitly approved.
- Dirty worktree ownership is resolved, since many files are already modified before this spec.
- Migration risk is reviewed.
- Local test/build proof passes.
- Production environment variables for AI, logging, Redis/search/connectors are checked.
- Deploy targets are re-verified immediately before deploy.

Commit strategy after approval:

- Commit 1: schema and generated Prisma/runtime types.
- Commit 2: agentic runtime, policy, tools, verifier.
- Commit 3: API routes and tests.
- Commit 4: UX shell and admin governance.
- Commit 5: events, notifications, telemetry, usage.
- Commit 6: production proof scripts/docs.

Deployment strategy:

- Deploy behind disabled-by-default feature flags.
- Enable for one internal/test company.
- Run live smoke.
- Expand per company after metrics and audit pass.

## 10. Approval Checkpoint

Approval requested for Phase A only as the first coding milestone:

- Schema additions for agentic runtime.
- Current leave assistant migrated to tool registry.
- Policy, executor, verifier, response composer enforcement.
- Tests for no false action claim, tenant isolation, permission denial, and idempotency.

After Phase A passes locally, request approval to continue to Phase B.
