# Continuum — Epics → Features → Tasks Backlog (Status-Verified)

**Identifier:** `BACKLOG-20260709`
**Created:** 2026-07-09
**Supersedes (status claims only, not scope/spec detail):** `COMPLETE_SERVICES_SUMMARY.md`, `web/LOOP_STATE.json`, the unfinished `CWFREQ-20260630` requirements-matrix effort in `tasks/todo.md`
**Does NOT replace:** `chunks/l5/*-L5.md` + `chunks/l5/deep/*-DEEP.md` (field-level specs for the Zero-UI channel work), `docs/specs/00-master-blueprint.md` (route/permission registry, Definition of Ready/Done), `COMPLETE_SOLUTION_MAPPING.md` (per-service schema detail for SVC-001..008). Those remain the source for exact field names, Zod schemas, and wireframes. This document is the source for **current, verified status** and for the **enterprise/global-scale epics that no existing doc covers**.

---

## 0. Why this document exists — read this first

This repo already contains a large planning corpus: `chunks/` (Zero-UI pre-flight, 8 chunks + L5 + DEEP), `LOOP.md` (a "RALPH" autonomous loop targeting 64 services), `COMPLETE_SOLUTION_MAPPING.md` / `COMPLETE_SERVICES_SUMMARY.md` (a 64-service catalog), `CRITICAL_WORKFLOW_ISSUES_AUDIT.md`, and `tasks/todo.md` (a running log of prior remediation passes: `CBA-20260629`, `CWA-20260630`, `RALPH-20260630`, `CWFREQ-20260630`, `PRODERR-20260702`, `MAILFIX-20260702`, `SIGNINFIX-20260702`).

**These documents disagree with each other and with the live codebase, on the same day they were written:**

| Source | Claim | Verified reality (this pass, 2026-07-09) |
|---|---|---|
| `web/LOOP_STATE.json` | `"status": "COMPLETE"`, `"achieved": "All 64 services at >90% production-readiness"` | False. No MFA/SSO exist anywhere in code despite `SVC-036 Authentication (92%)` / `SVC-037 Authorization (92%)` claims. Sentry/Pusher/Redis/Razorpay are unset in production despite `SVC-025 Notifications (92%)` / infra claims. |
| Root `LOOP_STATE.json` (same loop, iteration 5) | `completed: 18`, `pending: 44` of 64 (28%) | More conservative than the "COMPLETE" file next to it, but still self-reported, not independently verified. |
| `web/COMPLETE_AUDIT.md` (2026-06-30) | `.env.prod` "IS COMMITTED TO GIT", JWT hardcoded default in use | Both **false as of this pass**: `.env.prod` has never been in git history (`git log --all` on the exact path returns zero commits); the JWT hardcoded fallback was removed in commit `3a2f9f1`. |
| `docs/OPERATIONS_READINESS_20.md` | `.github/workflows/web-ci.yml` exists (row 11, "CI/CD") | False — no `.github/workflows/` directory exists anywhere in the repo (only inside `node_modules` of dependencies). |
| `tasks/todo.md` (`SIGNINFIX-20260702`) | `GIT` and `DEPLOY` steps unchecked | Actually done — commit `3a2f9f1` is the current HEAD of `main`. The todo file just wasn't updated after the commit landed. |

**The lesson, and the rule this document follows:** no status in any pre-existing doc is trusted without independent verification against the current code (`grep`, `Read`, `git log`) in this pass. Where I could not independently verify a claim in the time available, it is marked `⬜ UNVERIFIED` rather than copied forward as done.

**Action recommended, not yet taken:** `web/LOOP_STATE.json`'s `"status": "COMPLETE"` claim should be deleted or annotated as false — leaving it in place risks a future session (human or agent) trusting it and skipping real verification.

### Status legend used throughout

| Marker | Meaning |
|---|---|
| ✅ DONE | Verified this pass: route/page/model exists, has real logic (not a stub), and I read the code directly. |
| 🟡 PARTIAL | Real implementation exists but has a specific, named gap (missing edge case, missing test coverage, external dependency unconfigured, etc.) |
| ⬜ NOT STARTED | No code found. Verified absent via direct grep/glob, not assumed. |
| 🔒 BLOCKED | Cannot be completed by writing code alone — needs a vendor account/credential, a legal/compliance decision, or a business/pricing decision only the founder can make. |
| ⬜ UNVERIFIED | An existing doc claims this is done; I did not have time to independently verify it this pass. Treat as unknown, not as done. |

---

## PART A — Existing Product Epics (CF-000 … CF-017)

These map to the module catalog already defined in `docs/specs/00-master-blueprint.md` §2.1 (CF-001..CF-015), plus two epics that catalog omits (Identity/Auth, Platform/Billing) and one that consolidates cross-cutting comms. SVC-IDs in brackets cross-reference `web/LOOP_STATE.json`'s taxonomy so this document and the old one can be reconciled by ID.

### EPIC CF-000 — Identity, Auth & RBAC
*[SVC-036 Authentication, SVC-037 Authorization/RBAC, SVC-012 RBAC, SVC-051 User Provisioning]*

**Feature: Credential auth (sign-in/sign-up/sessions)**
- ✅ JWT sign-in/sign-out, cookie-based sessions — `web/app/api/auth/signin/route.ts`, `web/lib/auth-service.ts`
- ✅ JWT signing secret resolution hardened (no insecure hardcoded fallback) — `web/lib/auth-secret.ts`, fixed in commit `3a2f9f1` (2026-07-09 verified)
- ✅ Refresh token flow reuses the same hardened secret resolver (verified — `web/app/api/auth/refresh/route.ts` → `auth-service.ts` → `getAuthSecretKey()`, not the dangling `JWT_REFRESH_SECRET`)
- ✅ Password reset flow with `PasswordResetToken` model, working email delivery — fixed commit `716e2a1`
- 🟡 Self-serve company sign-up: fully built (`/api/auth/signup` → `/onboarding` 13-step wizard → `createCompanyAndEmployee`) but gated off by default in production (`NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` unset → defaults false, shows "Invitation Required" screen). Not a bug — a deliberate product decision (commit `a52320c`) — but it means the self-serve path is **currently untested against real traffic**.
- ⬜ **MFA / 2FA / TOTP** — confirmed absent via grep across `lib/` and `app/api/auth/`. Zero implementation.
- ⬜ **SSO / SAML / OIDC / SCIM** — confirmed absent via grep for `saml|sso|oauth2|scim` across the whole `web/` tree (only unrelated hits: Supabase OAuth callback, a marketing page, a schema field named `sso` that's unused). Directly contradicts the Enterprise plan's advertised "SSO integration" (`web/lib/billing/plans.ts:108`).

**Feature: RBAC / Company Roles**
- ✅ `CompanyRole` / `CompanyRolePermission` / `RoleTemplate` — real per-company custom roles, not a fixed enum. Verified in `prisma/schema.prisma`.
- ✅ 76-permission catalog per `docs/specs/00-master-blueprint.md` §2.4, enforced via `requirePermissionGuard()` — spot-checked in `web/app/api/bulk-operations/route.ts` and others.
- ⬜ UNVERIFIED: whether every one of the 272 API routes actually calls the guard consistently (RALPH's own todo admits this was only spot-audited, not exhaustively proven — see `CWA-20260630-RBAC` marked done but with no enumerated route list as evidence).

**Feature: Multi-tenant isolation**
- ✅ Row-level `org_id`/`company_id` scoping is the documented and (spot-checked) actual pattern.
- 🟡 **Isolation is enforced per-route by convention, not structurally.** There is no Prisma middleware/extension that makes a missing `company_id` filter impossible — it relies on every route author remembering. This is the single highest-leverage security investment available (see EPIC-ENT-01).

**Tasks pending:**
1. ⬜ Build TOTP-based MFA (enrollment, backup codes, verification step in sign-in flow).
2. ⬜ Decide + integrate an SSO/SCIM provider (see EPIC-ENT-01 — recommend buying, not building).
3. ⬜ Build a Prisma Client Extension that auto-injects tenant scoping, closing the "convention not constraint" gap.
4. 🔒 Decide whether self-serve sign-up should be turned on, and if so, load-test the onboarding wizard first.

---

### EPIC CF-001 — Employee Management
*[SVC-001 Employee Lifecycle, SVC-011 Org Structure, SVC-017/018/020 Employee Portal & Profile]*

- ✅ Employee directory, org chart, profile, movements — real Prisma-backed pages per `COMPLETE_AUDIT.md` Audit 4/5, spot-checked.
- ✅ Bulk import (`/api/hr/bulk-import`), bulk operations (`/api/bulk-operations` — real `BulkJob` model, RBAC-gated, verified this pass).
- 🟡 `BulkJob` model has `queued/processing/done/failed` states suggesting an async worker, but the route I read processes inline in the request — ⬜ UNVERIFIED whether a background worker actually advances `processing → done`, or whether jobs get created and then never move past `queued` for anything beyond small synchronous batches.
- ✅ Employee status history, exit checklist enforcement before "exited" status (per commit `5ae0af1` message, ⬜ UNVERIFIED directly this pass).

**Tasks pending:**
1. ⬜ Verify/build the actual async processor for `BulkJob` (currently looks synchronous-in-request, which will time out on large imports — a real problem at 1M-employee scale).
2. ⬜ Load-test bulk import at 10k+ row CSVs (relevant directly to the "100+ companies, 1M+ employees" target).

---

### EPIC CF-002 — Leave Management
*[SVC-002 Leave & Absence]*

- ✅ Leave types, requests, approvals, encashment, carry-forward, accrual cron (`/api/cron/leave-accrual`, `/api/cron/year-end-carry-forward` — both scheduled in `vercel.json`, verified).
- ✅ Constraint-engine integration for AI-assisted approval (`web/lib/leave-workflow.ts`, external Render service) with a documented fallback mode (`CONSTRAINT_ENGINE_FALLBACK_MODE` env var).
- ✅ Leave SLA breach cron now scheduled (`/api/cron/leave-sla-breach`, 09:00 daily) — was unscheduled per `COMPLETE_AUDIT.md`, confirmed fixed in current `vercel.json`.
- 🟡 Constraint-engine call: ⬜ UNVERIFIED whether the request to the external Render service carries any authentication (shared secret, mTLS) — if it's an unauthenticated plain HTTP(S) call, that's a gap for EPIC-ENT-01.

**Tasks pending:**
1. ⬜ Verify/add authentication on the constraint-engine HTTP call (currently looks like a bare URL fetch — `CONSTRAINT_ENGINE_URL` with no visible signing).
2. ⬜ UNVERIFIED: leave-balance race-condition fix claimed done in `CWA-20260630-CONCURRENCY` — re-verify under concurrent load before trusting at scale.

---

### EPIC CF-003 — Compliance & Audit
*[SVC-016 Compliance Tracking, SVC-038 Audit Logging, SVC-039 Data Encryption, SVC-041 Retention, SVC-042 GDPR]*

- ✅ **Tamper-evident audit log** — `AuditLog` model has `integrity_hash` + `prev_hash` (hash-chained), scoped by `company_id`. This is genuinely strong and ahead of most competitors at this stage. Verified in schema.
- ✅ `SettingsAuditLog` for configuration changes, separately modeled.
- ✅ Data export capability exists — `web/lib/compliance/data-export.ts`, `/api/employee/export` route, referenced in the operations-readiness catalog as GDPR-adjacent evidence.
- ⬜ UNVERIFIED: whether data export covers *all* PII tables or a curated subset — the master-blueprint's DoD requires this to be provably complete, which needs a table-by-table audit, not assumed from the file's existence.
- ⬜ **Retention-policy automation** (auto-purge past `dataRetentionYears` per plan tier from `lib/billing/plans.ts`) — no cron or job found enforcing this. The plan tiers *advertise* different retention windows (1/3/7/custom years) but nothing appears to enforce deletion at the boundary.

**Tasks pending:**
1. ⬜ Table-by-table PII inventory cross-checked against the data-export function.
2. ⬜ Build the retention-enforcement job (cron) that actually deletes/archives data past the plan's advertised retention window — currently the pricing page promises something the backend doesn't enforce.
3. 🔒 SOC2 Type II: requires an external auditor engagement (e.g., Vanta/Drata for evidence automation) — business decision, not code.

---

### EPIC CF-004 — Provident Fund (PF) / Statutory (India)
*[part of SVC-004 Payroll, SVC-030 Payroll Engine]*

- ✅ PF/ESI/PT/TDS fields exist on `PayrollSlip`/`PayrollConfig`, Form 16 route added (`RALPH-20260630-PAYROLL-FORM16`, verified present in current route list per `tasks/todo.md` build proof).
- 🟡 Per `tasks/todo.md` itself (batch 3, honest note): "real bank acknowledgement, official TRACES/digital-signature filing, and CTC restructuring remain open" — i.e., PF/TDS *calculation* exists, but *regulatory filing/submission* integration does not. This is India-specific compliance debt, separate from the "worldwide" ask (see EPIC-ENT-11).

**Tasks pending:**
1. ⬜ TRACES/digital-signature filing integration (India statutory requirement, currently manual).
2. ⬜ Bank acknowledgment reconciliation for PF/TDS remittance.

---

### EPIC CF-005 — Attendance & Time Tracking
*[SVC-003]*

- ✅ Shifts, shift assignment, regularization, monthly reports — routes hardened with module+permission guards per `RALPH-20260630-SVC003` batch (verified: `/api/shifts`, `/api/attendance/shifts`, `/api/attendance/shifts/assign`, `/api/attendance/reports/monthly` all exist).
- ⬜ **Biometric / raw-punch ingestion** — explicitly still open per the loop's own honest note ("biometric/raw-punch ingestion and overtime workflows remain open," `tasks/todo.md` RALPH Review section). Not started.
- ⬜ **Overtime workflows** — same note; `Overtime` model/route was added per `RALPH-20260630-019` but marked incomplete for the workflow (approval chain, payroll integration) layer.

**Tasks pending:**
1. ⬜ Biometric/raw-punch device ingestion pipeline (needed at any real multi-hundred-employee-per-site company).
2. ⬜ Complete overtime approval → payroll integration loop.

---

### EPIC CF-006 — Payroll & Compensation
*[SVC-004, SVC-006, SVC-021, SVC-030, SVC-034]*

- ✅ Payroll run/slip generation, salary structures/components, salary revisions, payroll advances, loans — real models and routes, spot-checked (`web/app/api/payroll/generate/route.ts` etc.)
- ✅ Payslip PDF via jsPDF, Form 16 route.
- 🟡 **Razorpay billing SDK integrated in code but credentials unset in production** (confirmed directly this pass: `RAZORPAY_KEY_ID` NOT SET in `.env.prod`). Payroll-advance repayment / any Razorpay-mediated money movement will crash at SDK init in production right now.
- ⬜ Payroll run at real scale (1000s of employees, one run) — no load-test evidence found.

**Tasks pending:**
1. 🔒 Provision Razorpay production credentials (India) — vendor account action, not code.
2. 🔒 Provision Stripe (or Paddle/Chargebee) for international billing — Razorpay does not serve most of "worldwide." This is a **concrete, currently-missing capability** for the stated 100+ companies/worldwide goal, not just a config gap.
3. ⬜ Load-test payroll generation for a single company at 5,000+ employees.

---

### EPIC CF-007 — Performance Management
*[SVC-005, SVC-024]*

- ✅ Goals, review cycles/templates/instances, competencies — real pages/routes confirmed via `COMPLETE_AUDIT.md` Audit 4 (`/hr/performance`, `/hr/goals`, `/hr/reviews` all `[LOADS OK]` with real API dependencies) and my own read of `performance-view.tsx`.
- ⬜ UNVERIFIED: performance-analytics API (`RALPH-20260630-021`) — claimed but not independently re-verified this pass.

---

### EPIC CF-008 — Recruitment / ATS
*[SVC-008]*

- ✅ Real module confirmed this pass: `web/lib/recruitment/`, `/hr/recruitment` page, `recruitment-view.tsx`, `recruitment-pipeline` report route all exist (direct glob/grep this session — this directly corrects any assumption that recruitment is a stub).
- ⬜ UNVERIFIED: job-board/external posting integration (Indeed/LinkedIn) — `BLOCKED_SERVICES.md` referenced in `LOOP.md` template mentions "Indeed API returns 403" as an example blocker, but the actual file doesn't exist in this repo, so this may be aspirational/never attempted.

---

### EPIC CF-009 — Learning & Development (LMS)
*[SVC-009]*

- ✅ Courses, enrollments, learning paths — confirmed via `learning-view.tsx` (employee + HR), real routes per audit.

---

### EPIC CF-010 / CF-011 — Travel, Expense & Reimbursements
*[SVC-032, SVC-033, SVC-022]*

- ✅ Travel/expense request pages and reimbursement approval flow — confirmed present (`travel-view.tsx`, `reimbursements` routes, `[id]` action route).
- ✅ Reimbursements integrated into payroll generation per commit `5ae0af1` message — ⬜ UNVERIFIED directly this pass, worth a spot-check before relying on it.

---

### EPIC CF-012 — People Directory
*[part of SVC-011]*

- ✅ Org chart, directory pages for employee/manager/HR portals — confirmed via master-blueprint route registry + audit.

---

### EPIC CF-013 — Document Management
*[SVC-014, SVC-020]*

- ✅ Document upload/storage pages exist.
- ⬜ **File storage backend is unclear/degraded**: `COMPLETE_AUDIT.md` found Appwrite configured with empty credentials (disabled) and no S3/alternate configured — "DEAD — not configured." ⬜ UNVERIFIED whether this has been fixed since; not touched by any of the four post-audit commits.

**Tasks pending:**
1. 🔒 Decide and provision a real file-storage backend (S3/R2/Appwrite with real credentials) — currently document upload likely fails or silently no-ops in production.

---

### EPIC CF-014 — Exit Management
*[part of SVC-001]*

- ✅ Exit checklist model + enforcement before employee status → "exited," per commit message and `exit-checklist-view.tsx` (employee + HR) confirmed present.

---

### EPIC CF-015 — Analytics & Reports
*[SVC-010, SVC-043..048, SVC-059, SVC-060]*

- ✅ Workforce planning, succession, attrition AI, headcount/attrition/diversity analytics APIs, custom report builder — routes confirmed present via audit + my own reads (`workforce-planning`, `succession`, `report-builder` all real).
- ⬜ UNVERIFIED: whether these dashboards will hold up querying live Postgres at 1M-employee scale, or whether they need a read-replica/warehouse (see EPIC-ENT-05). Recharts dashboards hitting the OLTP database directly is a common failure mode at this scale.

---

### EPIC CF-016 — Platform Administration (Super Admin, Billing, Module Gates)
*[SVC-049, SVC-050, SVC-051]*

- ✅ Company CRUD, module-cap enforcement (`assertModule`, `portalPathModuleGate`, nav filtering — three-layer enforcement per master-blueprint §2.1, spot-checked), super-admin dashboard.
- ✅ Pricing plans defined (`lib/billing/plans.ts`) — Free/Starter/Growth/Enterprise, per-employee-per-month.
- ⬜ **Usage-based billing / metering** — confirmed absent. Current model is pure PEPM tier caps, no per-API-call or per-workflow metering infrastructure (see EPIC-ENT-12).
- 🟡 `ApiKey` Prisma model exists (`company_id`, `key_hash`, `permissions` JSON) but **zero API routes actually validate against it** — confirmed via grep (`apiKey|ApiKey` across `app/api` matches only one unrelated file using an external `HOLIDAY_API_KEY` env var). The schema for a public/partner API exists; the enforcement layer does not.

**Tasks pending:**
1. ⬜ Build API-key authentication middleware that actually checks `ApiKey.key_hash` (see EPIC-ENT-02 — this is pure code, no vendor needed, high leverage).
2. 🔒 Decide on usage-based/hybrid pricing model (business decision) before building metering.

---

### EPIC CF-017 — Notifications & Communication
*[SVC-025, SVC-026, SVC-027, SVC-056, SVC-057, SVC-058]*

- ✅ Email delivery — fixed and verified live in production (`716e2a1`, `MAILFIX-20260702` proof in `docs/activity.md`: Resend accepted mail, `PasswordResetToken` row created, Vercel logs confirmed).
- ⬜ **Real-time (Pusher) — dead in production.** Confirmed directly this pass: `PUSHER_APP_ID` NOT SET. The notification bell and any live-update UI silently do nothing.
- ⬜ **WhatsApp integration** — the loop's own honest self-assessment: "70% — external dep." Inbound webhook route exists (`/api/webhooks/whatsapp`) but the Zero-UI channel work in `chunks/` (ADR-001, chunks 03/04/05) shows `chunk_05: blocked_until_gates` and gates G1–G6 all pending — i.e., WhatsApp-as-a-channel is **architecturally planned in detail but not built**.
- ✅ AI assistant (`web/lib/continuum-assistant/*`, `/api/ai/assistant`) — real OpenAI integration, key present in production.

**Tasks pending:**
1. 🔒 Provision Pusher production credentials (or replace with a self-hosted alternative — see EPIC-ENT-06) — vendor account, but cheap/fast.
2. ⬜ Resume Chunk 03 (API channel-ready) → Chunk 05 (WhatsApp) per the existing, already-detailed `chunks/` plan — this is the single most mature piece of forward planning in the repo and should be executed, not redone.

---

## PART B — Enterprise & Global-Scale Transformation Epics (ENT-01 … ENT-14)

None of the existing planning docs (`chunks/`, `COMPLETE_SOLUTION_MAPPING.md`, master-blueprint) cover these. They map to the 14-pillar "Zero UI Equivalent" table from this conversation, reframed for what's actually appropriate for an HR/payroll compliance product — full literal "Zero UI" (chat/voice-only, no dashboards) is flagged as a trap below, not a goal, because HR/payroll actions need reviewable, auditable, explicit-consent UI surfaces for legal reasons; the assistant should sit *alongside* the existing portal UI, not replace it.

### EPIC ENT-01 — Zero Trust Security

**Feature: Enterprise SSO/SCIM**
- ⬜ Not started. Recommendation: **buy, don't build.** Hand-rolled SAML signature validation is a recurring source of critical auth-bypass CVEs industry-wide. Use WorkOS AuthKit, Auth0, or Ory — all specialize in "bolt enterprise SSO/SCIM onto an existing app" and are far cheaper than the engineering + security-review cost of building SAML in-house.
- Tasks: 🔒 pick a vendor (business decision) → ⬜ integrate as an additional auth provider alongside existing JWT sessions → ⬜ SCIM provisioning/deprovisioning webhook.

**Feature: MFA / TOTP**
- ⬜ Not started, but this one **is safe to build in-house** (much lower risk surface than SAML). `otplib`/`speakeasy` + encrypted secret storage (the repo already has `node-vault` installed per `package.json`, unclear if wired up — ⬜ UNVERIFIED).
- Tasks: ⬜ TOTP enrollment + backup codes → ⬜ verification step in sign-in → ⬜ recovery flow.

**Feature: Service-to-service auth**
- ⬜ The call from `web` to the external constraint-engine (Render) has no confirmed signing/auth (see EPIC CF-002). Tasks: ⬜ add HMAC-signed requests or mTLS between the two services.

**Feature: Structural tenant isolation**
- 🟡 Currently convention-based (every route must remember `company_id`). Tasks: ⬜ build a Prisma Client Extension / middleware that makes cross-tenant queries structurally impossible rather than hoping every one of 272 routes got it right. **This is the highest-leverage single security task available** — one file change protects all future routes, not just an audit of existing ones.

---

### EPIC ENT-02 — Public API & Headless Platform

- 🟡 `ApiKey` model exists, zero enforcement (see EPIC CF-016). Tasks: ⬜ build key-auth middleware → ⬜ per-key rate limits (distinct from per-IP) → ⬜ scoped permissions from the `permissions` JSON field → ⬜ OpenAPI spec for the existing 272 routes (or a curated public subset) → ⬜ versioning (`/api/v1/...`).
- ⬜ Outbound webhooks (event notifications to external systems) — confirmed absent. Only inbound webhooks exist (`/api/webhooks/{razorpay,cashfree,whatsapp}` — all *receive*, none *send*). Tasks: ⬜ define an event catalog (`employee.created`, `leave.approved`, etc.) → ⬜ webhook subscription model + delivery-with-retry worker.

---

### EPIC ENT-03 — Composite AI/ML Platform

- ✅ Foundation exists: OpenAI-backed assistant, `lib/ai/attrition`, `lib/ai/coaching`, external constraint-engine (rules-based leave evaluation).
- ⬜ Not formalized as a layered architecture. Recommendation, not yet built: (1) rules/constraint engine stays authoritative for anything touching money or legal compliance — LLM never makes the final call on payroll or statutory decisions; (2) classical ML (attrition, anomaly detection) productionized with a real retraining pipeline, not a one-off script; (3) LLM layer strictly for drafting/summarizing/conversational Q&A, always requiring human confirmation before an irreversible action (payroll run, termination, bulk change).
- Tasks: ⬜ document and enforce the guardrail above in the assistant's execution layer (`AssistantExecutionContext` per ADR-001 already provides a natural seam for this) → ⬜ productionize the attrition model's retraining/monitoring.

---

### EPIC ENT-04 — Conversational & Anticipatory UX

- ✅ Real groundwork already exists and is well-planned: `chunks/` ADR-001 zero-UI channel architecture, `AssistantExecutionContext`, `ChannelIdentityLink`, a frozen v1 action catalog (A1–A10 in `chunks/00-INDEX.md`) covering leave/attendance/payslip.
- ⬜ Status per the chunk system's own tracking: **all 8 chunks `not_started`**, gates G1–G6 all pending. This is the most mature unbuilt plan in the repo — resuming it is higher-leverage than inventing a new conversational-UX epic from scratch.
- **Recommendation on "Zero UI":** do not replace the dashboard UI. HR/payroll actions need a reviewable screen and audit trail for legal reasons (a WhatsApp message approving someone's termination with no other record is a liability, not a feature). Build the assistant as an *additional* channel for the ~10 read/write actions in the frozen v1 catalog, not a UI replacement.
- Tasks: ⬜ execute Chunks 01–02 (company/employee lifecycle hardening — prerequisite gates) → ⬜ Chunk 03 (channel identity) → ⬜ Chunk 06 (security, can run in parallel) → ⬜ G1–G6 proof gates → ⬜ Chunk 05 (WhatsApp, blocked until gates pass).
- ⬜ "Anticipatory" next-best-action surface (e.g., "3 leave requests pending, Priya's overtime is at 120%") — not built. Tasks: ⬜ a proactive-insights service on top of the existing attrition/analytics models, surfaced on manager/HR dashboards.

---

### EPIC ENT-05 — Data Layer Scale-Out

- 🟡 Redis (Upstash) is wired in code (`lib/redis.ts`) but **credentials unset in production** — confirmed this pass. Rate limiting and idempotency keys fall back to in-memory, meaning they reset on every serverless cold start and don't share state across instances. This is a real problem at "100+ companies" scale where multiple instances run concurrently.
- ⬜ No search index (Elasticsearch/OpenSearch/Meilisearch) — employee/document search likely runs as Postgres `LIKE` queries today (⬜ UNVERIFIED, worth checking `app/api/search/route.ts` before scaling).
- ⬜ No analytics/read-replica separation — Recharts dashboards (EPIC CF-015) likely query the same OLTP Postgres instance used for transactional writes. At 1M employees this will contend with live traffic.
- Tasks: 🔒 provision Upstash Redis credentials (cheap, fast) → ⬜ add a search index for directory/document search if volume warrants it → ⬜ add a read replica or a periodic CDC-to-warehouse pipeline (ClickHouse, or even a Neon read replica) before dashboards get slow.
- **Do not build full "polyglot persistence" (Postgres + Mongo + Elasticsearch + Redis) as a blanket goal** — Mongo specifically is not justified at this scale; Postgres JSONB covers unstructured/conversational data fine until proven otherwise. Add tools when a specific query pattern proves Postgres insufficient, not preemptively.

---

### EPIC ENT-06 — Event-Driven Async Processing

- ⬜ `BulkJob` model exists with `queued/processing/done/failed` states (see EPIC CF-001) but the route I read processes inline — ⬜ UNVERIFIED whether anything actually advances a job asynchronously.
- ⬜ No message queue / event bus of any kind.
- **Recommendation: do not stand up Kafka.** It's a real operational burden this team's current size doesn't need. Vercel's serverless model pairs much better with a managed queue like Inngest, Trigger.dev, or Upstash QStash — same "event-driven decoupling" benefit, none of the cluster-ops cost.
- Tasks: ⬜ pick a managed queue → ⬜ move `BulkJob` processing off the request thread → ⬜ move notification fan-out (email/webhook delivery once built) onto the same queue for retry/backoff behavior.

---

### EPIC ENT-07 — GitOps & Progressive Delivery

- ✅ **`.github/workflows/web-ci.yml` added (2026-07-09)** — typecheck, lint, test, and a production build job, gated on the first three passing. Closes the gap that `docs/OPERATIONS_READINESS_20.md` and a commit message both falsely claimed was already closed. Verified before committing: `npx tsc --noEmit` clean, full test suite 400/400 passing, `next build` succeeds with dummy env vars and no live database (Next.js auto-opts every `cookies()`-using authenticated page out of static generation, so no build-time Prisma calls occur — confirmed empirically, not assumed).
- ⬜ In doing so, found and fixed 10 pre-existing failing tests across 7 files (real drift between `portal-nav.ts` and `middleware-module-paths.ts` module gating for 27 routes, a raw-error-message 500 response, and several UI-migration-guard violations reverted to native HTML controls) — see `docs/activity.md` 2026-07-09 entry for the full list. The suite was not actually green before this session despite several prior remediation passes.
- ✅ Vercel preview deployments happen automatically per-PR (platform default, not something to build).
- ⬜ No feature-flag system beyond the existing module-enable/disable toggle (`CompanySettings` JSON) — that's a per-tenant feature gate, not a progressive-rollout flag (percentage rollout, canary cohort).
- ⬜ No automated rollback-on-error-rate — requires Sentry to be live first (see EPIC-ENT-08).
- Tasks: 🔒 add branch protection requiring the new workflow to pass (repo settings, not code — needs a maintainer with admin access) → ⬜ a lightweight progressive-rollout flag (can extend the existing `CompanySettings`/module-gate pattern rather than adopting a new vendor).

---

### EPIC ENT-08 — Full-Stack Observability

- 🟡 Sentry SDK installed, `global-error.tsx` wired, but **`SENTRY_DSN` unset in production** — confirmed this pass. Every production error, including the exact "Core Exception" crash the June audit found, is currently invisible.
- ✅ Winston + Better Stack transport code exists (`lib/enterprise/logger.ts`); ⬜ UNVERIFIED whether `BETTERSTACK_SOURCE_TOKEN` is actually set (not checked directly, flagged in `docs/OPERATIONS_READINESS_20.md` as "✅ Telemetry token on Vercel" — unverified claim, not independently confirmed this pass).
- ⬜ No distributed tracing beyond what Sentry's default instrumentation provides.
- Tasks: 🔒 create a Sentry account / set the DSN (cheap, ~10-minute task, already coded for) → ⬜ verify Better Stack token is actually set (or set it) → ⬜ add business-metric dashboards (payroll-run duration, leave-approval SLA breach rate) beyond uptime/error monitoring.

---

### EPIC ENT-09 — Production-Grade Testing & Chaos Engineering

- ✅ Real test suite exists (`tests/`, ~45 files per June audit, plus focused regression suites added in every remediation pass since — `auth-flow.test.ts`, `mailfix-20260702.test.ts`, etc.)
- ⬜ `npm run lint` fails repo-wide on pre-existing lint debt (confirmed in `tasks/todo.md` — `RALPH-20260630-FULL-LINT` still unchecked). Individual new files pass lint in isolation; the full repo does not.
- ⬜ No chaos/fault-injection testing. The email-provider crash that caused "Core Exception" in production (per `COMPLETE_AUDIT.md`) is exactly the class of failure chaos testing catches before a real user does — inject a forced failure into the email/constraint-engine call path and assert graceful degradation, don't wait for it to happen live again.
- ⬜ No synthetic canary tests running against production continuously.
- Tasks: ⬜ close repo-wide lint debt → ⬜ add fault-injection tests for the two external dependencies (email provider, constraint engine) that have already caused a real production incident → ⬜ a synthetic canary hitting `/api/health` + one authenticated smoke path every few minutes (ties into EPIC-ENT-08's alerting).

---

### EPIC ENT-10 — Continuous Compliance & Data Residency

- ✅ Audit-log foundation is strong (tamper-evident, see EPIC CF-003).
- ⬜ No data-residency strategy. Single Neon region (`sin1`/Singapore per `vercel.json`). A genuine "worldwide" customer base means EU customers' data legally needing to stay in the EU (GDPR), India's DPDP Act 2023 having its own residency expectations, etc. This is not solvable by adding more code to the existing single-region deployment — it requires a regional-cluster strategy (separate DB/app deployment per region with a routing layer) or an explicit, documented risk acceptance for now.
- 🔒 SOC2 Type II requires an external auditor — business/budget decision, not an engineering task.
- Tasks: ⬜ decide (business decision, not code) which regions to actually support at launch vs. defer → ⬜ if EU/multi-region is committed to, design the per-region deployment topology before selling into those markets → 🔒 engage a SOC2 auditor / evidence-automation vendor (Vanta/Drata) once ready to sell to enterprises that require it.

---

### EPIC ENT-11 — Global Payroll & Multi-Country Compliance

- ✅ India statutory payroll (PF/ESI/PT/TDS) is real and reasonably complete (see EPIC CF-004/CF-006), modulo the filing-integration gap already noted.
- ⬜ **Zero other countries' statutory payroll rules exist** — confirmed via schema review (no US FICA/941, no UK PAYE/NI, no EU-country-specific fields).
- **This is the single largest, most legally-loaded item in the entire "worldwide" ask, and it is not primarily an engineering problem.** Statutory payroll compliance differs by country and changes with local law; companies like Deel, Remote, and Papaya Global exist *only* to solve this, as their entire business. Building full worldwide statutory payroll in-house is a multi-year undertaking with real legal liability if done wrong (wrong tax withholding is not a bug, it's a compliance violation with fines).
- **Recommendation:** don't build this yourself for v1 of "worldwide." Either (a) scope "worldwide" to country-agnostic core HR (leave/attendance/directory/performance — genuinely fine to run in any country) while payroll stays India-first, or (b) partner with an existing EOR/global-payroll API (Deel API, Remote API, Papaya Global) for non-India payroll rather than re-deriving each country's statutory rules from scratch.
- Tasks: 🔒 business decision on the above two options → if (b), ⬜ integrate the chosen EOR partner's API as a payroll backend for non-India employees.

---

### EPIC ENT-12 — Usage-Based & International Monetization

- ✅ Current model: PEPM (per-employee-per-month) tiers with Razorpay (India). This is what HR buyers actually expect and budget for — Workday, BambooHR, Keka all charge PEPM, not metered.
- ⬜ No usage metering infrastructure of any kind.
- 🔒 **Recommendation, needs a business decision, not just code:** keep PEPM as the base (predictable, matches buyer expectations) and add metered pricing only for genuinely variable-cost add-ons — AI assistant queries, extra document storage, WhatsApp/SMS notification volume. Full usage-based replacement of PEPM is a business-model change, not an engineering one, and most HR buyers would resist it.
- ⬜ **Razorpay-only billing cannot serve "worldwide."** International customers need a merchant-of-record that isn't India-specific — Stripe (or Paddle/Chargebee, which additionally act as merchant of record and can reduce your VAT/sales-tax compliance burden internationally).
- Tasks: 🔒 decide the hybrid pricing model → ⬜ integrate Stripe Billing (or Paddle/Chargebee) for international customers alongside existing Razorpay for India → ⬜ build metering only for the specific variable-cost add-ons decided above.

---

### EPIC ENT-13 — Multi-Tenant Scale Hardening (100+ companies / 1M+ employees)

- ✅ Multi-tenancy model is real and sound in principle (shared DB, `org_id` row scoping).
- ⬜ **Not verified at target scale.** Concerns to close before claiming "ready for 1M employees":
  - Row-count growth on `AuditLog`/`Attendance` for a single large tenant (a company with 50k–100k employees generates enormous daily-attendance and audit rows over years) — no partitioning strategy found (by `company_id` or by date range).
  - Neon connection pooling limits under concurrent load from many tenants simultaneously.
  - `BulkJob`/import processing likely synchronous-in-request (see EPIC CF-001/ENT-06) — will time out at real scale.
- Tasks: ⬜ add Postgres table partitioning (by `company_id` or date range) for the highest-growth tables before onboarding any single very-large tenant → ⬜ verify Neon plan's connection-pool ceiling against expected concurrent-tenant load → ⬜ resolve the async-job gap from ENT-06 before large-scale bulk imports are attempted.

---

### EPIC ENT-14 — Self-Serve Growth Motion

- ✅ The mechanism is fully built (see EPIC CF-000): signup → onboarding wizard → tenant creation → join code.
- ⬜ It is gated off by policy (`NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` defaults false) and **has never been exercised against real production traffic** since it's invitation-only today.
- Tasks: 🔒 decide whether to turn self-serve on (business decision — changes the sales motion from invite/sales-assisted to PLG) → if yes, ⬜ load-test the 13-step onboarding wizard end-to-end → ⬜ add abuse/spam protection appropriate for a public signup surface (currently rate-limited by IP per `checkApiRateLimit`, ⬜ UNVERIFIED whether that's sufficient against a real signup-spam attempt).

---

## PART C — What's pure-code (I can do it) vs. what's blocked on you

**Pure code, no new account/credential/legal decision needed — safe to start immediately:**
1. Real CI workflow file (`.github/workflows/web-ci.yml`) — ENT-07
2. TOTP-based MFA — ENT-01
3. API-key authentication middleware for the existing unused `ApiKey` model — ENT-02
4. Prisma tenant-isolation extension (structural, not conventional) — ENT-01
5. Repo-wide lint-debt cleanup — ENT-09
6. `BulkJob` async-processing verification/fix — CF-001 / ENT-06

**Blocked on you — I cannot complete these no matter how long any loop runs, because they require an account signup, a payment, a legal engagement, or a decision only you can make:**
- Sentry DSN, Upstash Redis, Pusher, Razorpay credentials (all: create account → paste key into Vercel)
- SSO/SCIM vendor choice + contract (WorkOS/Auth0/Ory)
- Stripe/Paddle/Chargebee for international billing
- SOC2 auditor engagement
- Multi-country payroll strategy (build vs. partner with an EOR)
- Self-serve-on vs. invite-only business decision
- Data-residency/region commitment for GDPR-sensitive markets
- Usage-based vs. PEPM pricing model decision

---

## PART D — On `/ultrareview` and `/loop`

`/ultrareview` launches a paid, multi-agent cloud review of the current diff — it's user-triggered from your side (`/code-review ultra`), I can't invoke it myself. Worth running once the Part C pure-code items below land as a real diff.

The repo's own `LOOP.md` ("RALPH") already defines an autonomous-loop pattern with an exit condition ("all 64 services ≥90%") — and its own state file just proved why an *unverified* self-graded exit condition is dangerous (`web/LOOP_STATE.json` says "COMPLETE" and it demonstrably isn't). I'm not going to re-run that pattern blind. Instead: I'll work through the Part C pure-code list now, with the same test → typecheck → build → commit discipline the repo's other remediation passes used, and record honest progress in `docs/activity.md` and `tasks/todo.md` as I go — the established convention here, not a new one.
