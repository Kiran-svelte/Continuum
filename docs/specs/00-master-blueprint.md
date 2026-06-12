# CONTINUUM HRMS — COMPLETE PRODUCT SPECIFICATION

## MASTER BLUEPRINT (Level 1–2)

> **Document ID**: SPEC-MASTER-001
> **Version**: 1.0.0
> **Date**: 2026-05-29
> **Author**: Product Owner
> **Status**: `in-review`

---

> [!IMPORTANT]
> This is the COMPLETE product specification for Continuum HRMS.
> If it is not in this document, it does not exist.
> If it is not specified, the developer will not implement it.
> No guessing. No assumptions. No "common sense."

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# WHAT "READY" REALLY MEANS
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

> [!CAUTION]
> "Ready" is not a feeling. It is not "mostly done." It is not "good enough to start."
> **"Ready" is a binary gate.** A feature either passes every check below, or it does not exist for the developer.
> A developer who starts work on a spec that has not passed this gate is building on sand.

---

## The Hospital Analogy — Applied

The construction worker (developer) does not break ground until the **architect's blueprint is complete, stamped, and approved**. Not 80% complete. Not "we'll figure out the plumbing later." Complete.

In a real hospital build:
- The architect does not say "build the ICU, we'll decide where the power outlets go after the walls are up."
- The interior designer does not say "the chairs will be… something comfortable."
- The equipment supplier does not say "the ECG machine will have, you know, the usual stuff."

**Every outlet is on the blueprint. Every chair color is in the purchase order. Every ECG wire length is in the spec.**

That is what "ready" means here.

---

## Continuum Is Ready When — The 15 Truth Statements

> These are not checklists. These are **observable, outcome-based conditions**.
> Each one is binary: either it is true right now, or it is not.
> If even one is false, the product is not ready — regardless of how many features are built.

---

### People Operations

**1. A company can onboard, invite their first employee, and process their first leave request — without anyone at Continuum touching a database.**

The onboarding wizard collects company details, leave policies, and approval chains. The admin invites employees. Employees accept and complete their profiles. A leave request is submitted, routed to the correct approver, and resolved — all without a support ticket or manual data fix.

**2. An employee can complete every daily HR task from Continuum — without opening WhatsApp, Excel, email, or a physical form.**

Check leave balance → apply leave → mark attendance → view payslip → submit reimbursement → download payslip PDF. Every action has a direct path. Nothing requires leaving the product.

**3. When an employee submits a leave request, it reaches the right approver automatically — not because HR forwarded it.**

The approval chain is configured by the admin. The workflow engine routes it. The approver gets a notification in-app and by email. HR is not in the middle of every approval. This scales from 10 employees to 1,000.

---

### Managers & HR

**4. A manager can see who on their team is absent today in under 30 seconds — without asking HR.**

The manager dashboard shows today's team attendance and pending leave requests at a glance. No filtering, no report generation, no waiting. It is on the screen when they open the portal.

**5. An HR manager can identify which employee's leave request has been pending for more than 48 hours — in under 2 minutes.**

The escalation view flags SLA breaches. HR does not need to sort through 200 requests. The system surfaces what needs attention.

**6. A company admin can change a leave policy, an approval chain, or a salary component — without raising a support ticket or touching code.**

Policy settings, approval hierarchy configuration, salary structure — all editable through the Admin portal UI. When settings change, the system reflects them immediately for new transactions. Existing transactions follow the policy that was active when they were created.

---

### Payroll & Compliance

**7. Payroll runs at month-end without HR manually calculating PF, ESI, professional tax, TDS, or Loss-of-Pay.**

The payroll engine reads attendance, leave data, salary structures, and statutory rates. It generates payslips with all deductions calculated. HR reviews, approves, and marks as processed. No Excel. No calculator. No compliance error from a manual typo.

**8. Every statutory compliance document — PF challan, ESI report, Form 16 — can be exported without manual data preparation.**

The data is already structured correctly in the database. Export means clicking a button, not building a spreadsheet.

**9. An audit trail exists for every important action — and HR can prove to a regulator what happened, who did it, and when.**

Leave approvals, salary changes, policy updates, employee terminations — every event is in the tamper-proof audit log with the actor's identity, timestamp, before/after values, and an integrity hash. The chain cannot be silently modified.

---

### System Resilience

**10. If a third-party integration (email, Razorpay, Appwrite, Pusher) goes down, core HR workflows do not break.**

Leave requests can still be submitted. Attendance can still be marked. Payroll data is still accessible. The failed integration is surfaced as a degraded state — not a blank screen or a 500 error.

**11. When a module is disabled for a company, nothing in that module is accessible — not the page, not the API, not the data — for any user in that company.**

The nav item disappears. The route redirects to `/module-disabled`. The API returns 403. There is no way for a user to reach module-gated content through URL manipulation, API calls, or browser history.

**12. An employee from Company A cannot see, access, or infer any data from Company B — even if they know the URL structure.**

Every API query is scoped by `org_id`. Every session is tied to exactly one company. There is no shared state between tenants. Cross-tenant access returns 403, not empty data.

---

### Growth & Business

**13. A company that outgrows their plan sees a clear upgrade path — and upgrading takes under 5 minutes with no data migration.**

When an admin tries to enable a module beyond their plan cap, they see the upgrade prompt with the pricing and the one-click upgrade flow. After payment, the module is available immediately. No redeployment. No support ticket.

**14. Continuum can show a company admin exactly which modules are being used, by how many people, and how often — so they can justify the subscription internally.**

Usage data is visible in the admin dashboard. "Your team submitted 47 leave requests this month. 12 payroll runs were processed. 8 employees completed their performance reviews." Numbers that make the product's value undeniable to the decision-maker who signs the invoice.

**15. A new engineer can read this specification and build any feature in it — without asking a single question about what it should do.**

If this document is complete and approved, it is the source of truth. The engineer reads. The engineer builds. The product owner reviews. No re-discovery. No rework from missing requirements.

---

> [!IMPORTANT]
> These 15 statements are the **north star** for every sprint, every feature, every fix.
> Before shipping anything, ask: does this bring us closer to all 15 being true, or farther away?
> If it makes even one statement false, do not ship it.

---

## Definition of Ready (DoR) — Spec Must Pass Before Dev Starts

> A spec is **Ready** when a developer can pick it up, read it end-to-end, and build the entire feature **without asking a single question.**
> If the developer has to ask even one question, the spec is **not ready.**

### Checklist — A spec is Ready when ALL of the following are true:

#### Level 1 — Identity (The Building)
- [ ] Feature Name, ID, Module, Priority, Target Release are filled in
- [ ] Business justification is written — the "why" is clear and measurable
- [ ] Success metric is specific and measurable (not "users will like it")
- [ ] All out-of-scope items are explicitly listed
- [ ] All dependencies (modules, APIs, infrastructure) are identified with their status

#### Level 2 — Access (The Keys to Each Room)
- [ ] Every role that can access this feature is listed (`super_admin`, `admin`, `hr`, `director`, `manager`, `team_lead`, `employee`)
- [ ] Every role that **cannot** access is also explicit (not left blank — explicitly ❌)
- [ ] Every permission code required is listed with its scope (`self` / `team` / `department` / `company` / `platform`)
- [ ] Data visibility boundaries are defined per role with the exact DB filter logic
- [ ] Module gating is specified: which slug, which plan, what happens when disabled

#### Level 3 — Pages & Components (The Rooms and Their Furniture)
- [ ] Every page this feature adds or modifies is listed with its route path
- [ ] Every page has a breadcrumb, HTML title, and meta description
- [ ] Every navigation change is specified (which portal, which group, which position, which icon)
- [ ] Every component on every page is inventoried and numbered
- [ ] The ASCII wireframe or layout description is present for every page

#### Level 4 — Exact Specifications (The Measurements on Every Piece of Furniture)
- [ ] Every component has: background token, border token, radius token, shadow token, padding, margin, font token, text color token, icon (name + size + color)
- [ ] Every content field specifies: exact static text OR dynamic source (API endpoint + field name)
- [ ] Every interaction specifies: trigger → action → feedback → duration
- [ ] Every responsive breakpoint is covered (desktop ≥1024px, tablet 768–1023px, mobile <768px)
- [ ] Every page state is covered: **loading** (skeleton specs), **empty** (illustration + exact copy + CTA), **error** (type of error + exact copy + recovery action), **success** (toast copy + duration + position), **partial** (one section fails, what happens to the rest)
- [ ] Every form has: field label (exact text), type, required/optional, default value, placeholder (exact text), width
- [ ] Every validation rule has: condition + exact error message + when it triggers (on blur / on change / on submit)
- [ ] Every form action button has: exact label, variant, position, behavior on click, behavior while submitting
- [ ] Every data table has: column headers (exact), field keys, sortable flag, default sort, width, alignment, truncation rule
- [ ] Every table row action has: icon, label, visible-when condition, permission required, confirmation dialog (exact copy)
- [ ] Every status badge has: status value → badge variant → exact label → color token
- [ ] Every filter has: label, type, options, default, and "clear" target

#### Level 5 — Internal Sub-Components (The Circuit Boards)
- [ ] Every new Prisma model is fully specified: all fields, types, constraints, relations, indexes, `@@map` name
- [ ] Every enum is listed with all possible values
- [ ] Every modified model lists: field name, change type (ADD/MODIFY/DROP), before value, after value
- [ ] Migration is named, reversibility confirmed, backfill assessed, rollback command written
- [ ] Every API endpoint has: method, path, file path, auth guard, module guard, permission guard, rate limit, idempotency requirement
- [ ] Every API has its complete Zod validation schema written out
- [ ] Every API success response shape is documented with exact field names and types
- [ ] Every API error response is documented: status code, error code, when it fires, exact response body
- [ ] Every business rule is numbered (BR-001, BR-002…) with logic, formula, and an example
- [ ] Every notification has: trigger event, channel(s), recipient(s), exact subject line, exact body text, CTA label, CTA URL, timing
- [ ] Every audit event is listed: `action_type`, `entity_type`, logged fields, severity
- [ ] Every cache entry has: key pattern, TTL, invalidation trigger, reason for TTL choice
- [ ] Every edge case is numbered (EC-001…) with its exact expected behavior
- [ ] Testing checklist covers: happy path, error path, edge cases — for unit, integration, and E2E

#### Sign-Off
- [ ] PO has signed and dated the spec
- [ ] At least one senior engineer has reviewed and signed
- [ ] Status is changed from `draft` to `approved`

> [!WARNING]
> **A developer who starts work before the spec reaches `approved` owns the rework cost.**
> **A PO who approves an incomplete spec owns the rework cost.**
> Both signatures are required. Both parties are accountable.

---

## Definition of Done (DoD) — Feature Must Pass Before Calling It Shipped

> A feature is **Done** when it would not embarrass you at 3am on a Saturday in production.
> Not "it works on my machine." Not "it works for the happy path." Done means:

### Technical Done

| Gate | What It Means |
|---|---|
| **Tests pass** | Unit tests, integration tests, E2E tests — all green. No skipped tests for "I'll fix later." |
| **Coverage** | ≥80% business logic, 100% auth/payment/security paths. |
| **TypeScript** | Zero `any`. Zero type errors. `tsc --noEmit` exits 0. |
| **Lint** | ESLint exits 0. No disabled lint rules without a comment explaining why. |
| **Build** | `next build` exits 0. No build warnings promoted to errors. |
| **No regressions** | All pre-existing tests still pass. Nothing silently broke. |
| **Migration safe** | Migration runs cleanly on a fresh DB, on a populated DB, and rolls back cleanly. |
| **No N+1 queries** | Every new DB query reviewed. ORM relationships confirmed as eager (not lazy) where needed. |
| **Slow query check** | `EXPLAIN ANALYZE` run on every non-trivial query. No query >100ms in dev. |

### Product Done

| Gate | What It Means |
|---|---|
| **Every state renders** | Loading state renders correctly. Empty state renders correctly. Error state renders correctly. Partial failure renders correctly. Success renders correctly. |
| **Every role tested** | The feature was manually tested under every role that has access to it. Not just the happy role. |
| **Every permission enforced** | Roles that should NOT have access cannot access it — tested by logging in as that role and trying. |
| **Module gating works** | With the module disabled, the route redirects to `/module-disabled`. The nav item disappears. The API returns 403. |
| **Responsive** | Tested at desktop (1440px), tablet (768px), and mobile (375px). Nothing is broken or overflowing. |
| **Dark and light theme** | Tested in both themes. No hardcoded colors. No elements invisible in either theme. |
| **Keyboard navigation** | All interactive elements are reachable via Tab. Modals trap focus. Escape closes modals. |
| **Screen reader** | All form fields have labels. All images have alt text. All status badges have aria-labels. |
| **Exact copy matches spec** | Every button label, every error message, every toast text, every empty state copy — exact match to the spec. Not paraphrased. |

### Security Done

| Gate | What It Means |
|---|---|
| **Auth on every route** | Every new API route calls `getAuthEmployee()`. No route is accidentally public. |
| **Permission on every mutation** | Every POST/PUT/PATCH/DELETE calls `requirePermissionGuard()`. |
| **Org isolation** | Every query is scoped by `org_id`. Tested by attempting cross-tenant data access. |
| **Input sanitized** | All user input validated with Zod at the API boundary. No raw user strings injected into HTML. |
| **No secrets in logs** | Every `console.log` / `logger.info` reviewed. No passwords, tokens, PII in any log statement. |
| **Audit trail written** | Every create/update/delete creates an `AuditLog` entry with the correct fields. |

### Observability Done

| Gate | What It Means |
|---|---|
| **Errors tracked** | All new error paths flow to Sentry with enough context to debug. |
| **Logs written** | Key lifecycle events are logged at the correct level (info for normal ops, warn for degraded, error for failures). |
| **Analytics events** | All analytics events specified in the spec are implemented and fire correctly. |

---

## The Two-Clock Model

> There are **two clocks** in product development. Confusing them causes most project failures.

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   SPEC CLOCK                        BUILD CLOCK                 │
│   (PO's responsibility)             (Developer's responsibility) │
│                                                                 │
│   Starts: PO receives request       Starts: Spec reaches        │
│   Ends:   Spec is Approved          "Approved" status           │
│                                     Ends: Feature is Done       │
│                                                                 │
│   ❌ Dev cannot start               ✅ Dev can start only        │
│      while spec clock               when spec clock             │
│      is ticking                     has stopped                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**The spec clock and the build clock never run simultaneously.**

When both clocks run simultaneously:
- Developer starts building based on assumptions
- PO changes the spec mid-build
- Developer's work is partially or fully invalidated
- Rework happens
- Timeline slips
- Blame is assigned to the wrong person

**The fix is simple: let the spec clock finish before starting the build clock.**

---

## What "Ready" Is NOT

| ❌ This is NOT Ready | Why It Fails |
|---|---|
| "The wireframes are done" | Wireframes show layout. They don't specify field validation, error states, API contracts, business rules, or edge cases. |
| "We discussed it in a meeting" | Discussions are not specs. Discussions fade. Specs are permanent. |
| "It's obvious what it should do" | Nothing is obvious. "Obvious" is the #1 source of rework. |
| "It's similar to the existing feature" | "Similar" means different. Every difference must be specified. |
| "We'll figure it out as we go" | This is called "discovery in production." It is expensive and embarrassing. |
| "The Jira ticket has the details" | Jira tickets are task trackers, not specs. A ticket says WHAT. A spec says EXACTLY HOW. |
| "The designs are in Figma" | Figma shows pixels. It doesn't specify API contracts, Zod schemas, Prisma migrations, business rules, or error messages. |
| "It's 90% spec'd" | 90% spec'd = 0% ready. The missing 10% is always the hardest part — edge cases, error states, permissions — and the developer will fill those gaps with guesses. |
| "We'll add the details during dev" | This shifts the spec responsibility to the developer, who is not the Product Owner and does not know the business intent. |

---

## The Cost of Not Being Ready

> Every hour of missing spec creates 3–10 hours of developer rework.

| Stage Where Gap Is Found | Cost Multiplier | Example |
|---|---|---|
| In the spec (before dev starts) | **1×** | PO adds a missing validation rule to the spec doc. 5 minutes. |
| During development | **5×** | Developer built the wrong behavior, must rewrite the component. 2–4 hours. |
| In code review | **8×** | Reviewer finds the spec doesn't match. Dev cycles, re-review. 1 day. |
| In QA | **15×** | QA finds a missing state. Dev fix, new QA cycle, PM review. 2–3 days. |
| In production | **50×** | Customer reports wrong behavior. Hot-fix, incident review, customer trust impact. 1–2 weeks. |

**The spec is the cheapest place to fix a mistake. Write it right, once.**

---

## Summary: The Ready Gate in One Sentence

> **A spec is Ready when a developer — with no prior context, no access to Slack, and no ability to ask questions — can read it and build the feature exactly as the Product Owner imagined it, in every state, for every role, in every browser, on every device, at 3am, alone.**

If that sentence makes you uncomfortable about your current spec, that discomfort is correct. Go complete the spec.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LEVEL 1: THE BUILDING — What Is Continuum?
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 1.1 Product Identity

| Field | Value |
|---|---|
| **Product Name** | Continuum |
| **Tagline** | "HR that runs itself" |
| **Category** | B2B SaaS — Human Resource Management System (HRMS) |
| **Primary Market** | India (SMBs and mid-market, 10–2000 employees) |
| **Secondary Market** | Global companies with India operations |
| **Platform** | Web application (desktop-first, mobile-responsive) |
| **URL** | Custom domain per deployment (white-label ready) |
| **Tech Stack** | Next.js 15 (App Router) + React 19 + TypeScript + Tailwind CSS v4 + Prisma 7 + Neon PostgreSQL |

## 1.2 How We Make Money

### Revenue Model: Per-Employee-Per-Month (PEPM) SaaS Subscription

| Plan | Price (INR/employee/month) | Module Cap | Target Customer |
|---|---|---|---|
| **Free** | ₹0 | 5 mandatory modules only | Startups < 10 employees, trial |
| **Starter** | ₹49 | 6 modules (5 mandatory + 1 optional) | Small businesses 10–50 employees |
| **Growth** | ₹149 | All 15 modules | Mid-market 50–500 employees |
| **Enterprise** | ₹299+ (custom pricing) | All 15 modules + dedicated support + SLA | 500+ employees |

### Revenue Drivers

| Driver | Mechanism |
|---|---|
| **Module upsell** | Free → Starter → Growth as companies need Payroll, Performance, Recruitment |
| **Seat expansion** | More employees = higher monthly revenue (automatic) |
| **Compliance lock-in** | India statutory compliance (PF, ESI, PT, TDS) creates switching cost |
| **AI premium** | AI-powered leave recommendations, smart scheduling — Growth+ only |
| **White-label** | Enterprise customers get branded instance |

### Billing Infrastructure

| Component | Implementation |
|---|---|
| Payment gateway | Razorpay (India primary) + Stripe (international) |
| Billing model | Monthly or annual (annual = 2 months free) |
| Trial period | 14-day free trial on Growth plan |
| Upgrade trigger | When user tries to enable a module beyond their plan cap |
| Downgrade handling | Disable modules exceeding new plan cap; data preserved but inaccessible |
| Invoice generation | Automated monthly, PDF via jsPDF |
| Subscription models | Prisma: `Subscription`, `Payment`, `PricingPlan` |

---

## 1.3 Who Uses Continuum (User Personas)

### Role Hierarchy

```
super_admin (Platform)
    └── admin (Company Owner)
            └── hr (HR Professional)
                    └── director (Department Head)
                            └── manager (Team Manager)
                                    └── team_lead (Team Lead)
                                            └── employee (Individual Contributor)
```

### Persona Details

| # | Role | Portal | Who They Are | Primary Goal | Key Frustration Without Continuum |
|---|---|---|---|---|---|
| 1 | `super_admin` | `/super-admin/*` | Platform operator (us) | Manage all companies, billing, platform health | No visibility into platform usage |
| 2 | `admin` | `/admin/*` | Company owner/founder | Set up company, policies, monitor business | Drowning in HR admin work |
| 3 | `hr` | `/hr/*` | HR manager/executive | Process leaves, payroll, compliance, onboarding | Manual Excel tracking, compliance risk |
| 4 | `director` | `/manager/*` | Department/division head | Oversee large teams, budgets, headcount | No department-level visibility |
| 5 | `manager` | `/manager/*` | Direct people manager | Approve requests, monitor team | Chasing emails for approvals |
| 6 | `team_lead` | `/manager/*` | Technical/functional lead | Light approval, team visibility | Can't see team status |
| 7 | `employee` | `/employee/*` | Individual contributor | Apply leave, check payslip, mark attendance | "How many leaves do I have?" |
| 8 | _(visitor)_ | `/` (marketing) | Prospective customer | Evaluate Continuum, sign up | — |

### Access Scope Per Role

| Role | Sees Data For | DB Filter |
|---|---|---|
| `super_admin` | All companies, all data | No filter (wildcard `*` permission) |
| `admin` | Own company, all employees | `WHERE org_id = currentUser.org_id` |
| `hr` | Own company, all employees | `WHERE org_id = currentUser.org_id` |
| `director` | Own company, own department + children | `WHERE department_id IN (own + child departments)` |
| `manager` | Self + direct/indirect reports (4 levels deep) | `getTeamMembers(managerId, depth=4)` |
| `team_lead` | Self + direct reports only | `getTeamMembers(managerId, depth=1)` |
| `employee` | Self only | `WHERE employee_id = currentUser.id` |

---

## 1.4 Multi-Tenancy Architecture

| Property | Value |
|---|---|
| **Isolation model** | Shared database, row-level isolation via `org_id` foreign key |
| **Tenant identifier** | `Company.id` (cuid), referenced as `org_id` on all tenant-scoped tables |
| **Enforcement** | Every query scoped by `org_id`; API guards: `requireCompanyAccess()`, `requireCompanyMembership()` |
| **Super admin bypass** | Super admins have `*` permission and cross-tenant read access |
| **Data deletion** | Soft-delete (`deleted_at` column) on Company, Employee, Document |
| **White-label** | Brand tokens in `lib/brand.ts` driven by env vars: product name, cookie prefix, JWT issuer, email sender name |

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# LEVEL 2: THE ROOMS — Modules, Portals, Pages, Routes
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## 2.1 Module Catalog (The 15 Rooms of the Hospital)

### Module Map

| ID | Slug | Name | Mandatory? | Dependencies | Plan Required | Prisma Models |
|---|---|---|---|---|---|---|
| CF-001 | `employees` | Employee Management | ✅ | — | Free | `Employee`, `CompanyRole`, `EmployeeMovement`, `EmployeeStatusHistory`, `OrganizationUnit`, `JobLevel` |
| CF-002 | `leave` | Leave Management (+ AI) | ✅ | employees | Free | `LeaveRequest`, `LeaveBalance`, `LeaveType`, `LeaveRule`, `LeaveEncashment`, `ConstraintPolicy` |
| CF-003 | `compliance` | Compliance & Audit | ✅ | employees | Free | `AuditLog`, `SettingsAuditLog` |
| CF-004 | `pf` | Provident Fund | ❌ | employees, compliance, payroll | Growth | `PayrollSlip` (PF fields), `PayrollConfig` (PF rates) |
| CF-005 | `attendance` | Attendance | ✅ | employees | Free | `Attendance`, `AttendanceRegularization`, `AttendancePolicy`, `Shift`, `EmployeeShift` |
| CF-006 | `payroll` | Payroll | ❌ | employees, compliance | Starter | `PayrollRun`, `PayrollSlip`, `SalaryStructure`, `SalaryComponent`, `SalaryRevision`, `PayrollConfig`, `PayrollAdvance` |
| CF-007 | `performance` | Performance Management | ❌ | employees | Growth | `Goal`, `ReviewCycle`, `ReviewTemplate`, `ReviewInstance`, `ReviewResponse`, `Competency` |
| CF-008 | `recruitment` | Recruitment / ATS | ❌ | — | Growth | `JobPosting`, `JobApplication`, `InterviewStage`, `Interview`, `OfferLetter` |
| CF-009 | `learning` | Learning Management (LMS) | ❌ | employees | Growth | `Course`, `CourseEnrollment`, `LearningPath` |
| CF-010 | `expenses` | Travel & Expense | ❌ | employees | Growth | `TravelRequest`, `Expense` |
| CF-011 | `reimbursements` | Reimbursements | ❌ | employees | Growth | (uses `Expense` with type=reimbursement) |
| CF-012 | `directory` | People Directory | ❌ | employees | Starter | `OrganizationUnit` (org chart) |
| CF-013 | `documents` | Document Management | ❌ | employees | Growth | `Document` |
| CF-014 | `exit` | Exit Management | ❌ | employees | Growth | `ExitChecklist`, `EmployeeMovement` (resignation type) |
| CF-015 | `analytics` | Analytics & Reports | ❌ | employees | Growth | (aggregation queries, no dedicated model) |

### Module Gating Mechanism

```
┌──────────────────────────────────────────────────────────────┐
│  Super Admin sets cap per company:                          │
│  PATCH /api/super-admin/companies/[id]/modules              │
│  → CompanySettings.hr_alerts.super_admin_cap = ["leave",    │
│    "attendance", "payroll", "performance"]                   │
├──────────────────────────────────────────────────────────────┤
│  Company Admin enables within cap:                          │
│  Company Settings → Modules page                            │
│  → CompanySettings.hr_alerts.enabled_modules = ["leave",    │
│    "attendance", "payroll"]                                  │
├──────────────────────────────────────────────────────────────┤
│  Three enforcement layers:                                  │
│  1. Middleware: portalPathModuleGate() checks cookie         │
│  2. API: assertModule(orgId, slug) on every module route     │
│  3. Nav: buildPortalNav() filters sidebar items              │
├──────────────────────────────────────────────────────────────┤
│  Disabled module → redirect to /module-disabled?module=X     │
└──────────────────────────────────────────────────────────────┘
```

---

## 2.2 Portal Architecture (The 5 Wings of the Hospital)

### Portal Overview

| Portal | URL Prefix | Layout | Target Role(s) | Purpose |
|---|---|---|---|---|
| **Super Admin** | `/super-admin/*` | Dedicated layout | `super_admin` | Platform management |
| **Admin** | `/admin/*` | `portal-layout` (sidebar + top-bar) | `admin` | Company setup & oversight |
| **HR** | `/hr/*` | `portal-layout` (sidebar + top-bar) | `hr` | Day-to-day HR operations |
| **Manager** | `/manager/*` | `portal-layout` (sidebar + top-bar) | `manager`, `director`, `team_lead` | Team management & approvals |
| **Employee** | `/employee/*` | `portal-layout` (sidebar + top-bar) | `employee` | Self-service |

### Portal Switching

- Users with multiple roles see a **Portal Switcher** in the top bar
- Switching changes the URL prefix and sidebar nav
- Session/JWT stays the same — portal is a view, not a re-auth
- Component: `portal-switcher.tsx`

---

## 2.3 Complete Route Registry (Every Room in Every Wing)

### Auth Routes (No Portal — Public)

| # | Route | Page Title | Auth? | Purpose |
|---|---|---|---|---|
| A-01 | `/sign-in` | Sign In — Continuum | ❌ | Email + password login |
| A-02 | `/sign-up` | Sign Up — Continuum | ❌ | Redirects to `/sign-in` (invite-only) |
| A-03 | `/forgot-password` | Forgot Password — Continuum | ❌ | Email input → OTP/reset link |
| A-04 | `/reset-password` | Reset Password — Continuum | ❌ | New password form |

### Onboarding Routes (Gated — Post-Auth)

| # | Route | Page Title | Auth? | Purpose |
|---|---|---|---|---|
| O-01 | `/onboarding` | Company Setup — Continuum | ✅ (admin) | Multi-step company onboarding wizard |
| O-02 | `/onboarding/employee` | Welcome — Continuum | ✅ (employee) | Employee profile completion |

### Invite Routes

| # | Route | Page Title | Auth? | Purpose |
|---|---|---|---|---|
| I-01 | `/invite/[token]` | Accept Invitation — Continuum | ❌ | Accept invite, set password, join company |

### Marketing Routes (Public)

| # | Route | Page Title | Auth? | Purpose |
|---|---|---|---|---|
| M-01 | `/` | Continuum — HR that runs itself | ❌ | Landing page / hero |
| M-02 | `/about` | About — Continuum | ❌ | Company info |
| M-03 | `/blog` | Blog — Continuum | ❌ | Content marketing |
| M-04 | `/careers` | Careers — Continuum | ❌ | Job listings (dogfooding) |
| M-05 | `/changelog` | Changelog — Continuum | ❌ | Product updates |
| M-06 | `/support` | Support — Continuum | ❌ | Help & contact |
| M-07 | `/help` | Help Center — Continuum | ❌ | Knowledge base |
| M-08 | `/terms` | Terms of Service — Continuum | ❌ | Legal |
| M-09 | `/privacy` | Privacy Policy — Continuum | ❌ | Legal |
| M-10 | `/cookies` | Cookie Policy — Continuum | ❌ | Legal |
| M-11 | `/status` | System Status — Continuum | ❌ | Uptime & incidents |

---

### Employee Portal — Complete Page Registry

| # | Route | Nav Label | Nav Icon | Nav Group | Module Gate | Permission | Page Title |
|---|---|---|---|---|---|---|---|
| E-01 | `/employee/dashboard` | Dashboard | `LayoutDashboard` | — | — | — | Dashboard — Continuum |
| E-02 | `/employee/request-leave` | Request Leave | `FilePlus` | — | `leave` | `leave.apply_own` | Request Leave — Continuum |
| E-03 | `/employee/leave-history` | Leave History | `CalendarDays` | — | `leave` | `leave.apply_own` | Leave History — Continuum |
| E-04 | `/employee/attendance` | Attendance | `Clock` | — | `attendance` | `attendance.mark_own` | Attendance — Continuum |
| E-05 | `/employee/directory` | Directory | `Building2` | — | `directory` | — | Directory — Continuum |
| E-06 | `/employee/performance` | Performance | `Target` | — | `performance` | `performance.set_own_goals` | Performance — Continuum |
| E-07 | `/employee/documents` | Documents | `FolderOpen` | — | `documents` | — | Documents — Continuum |
| E-08 | `/employee/payslips` | Payslips | `Banknote` | — | `payroll` | `payroll.view_own` | Payslips — Continuum |
| E-09 | `/employee/payroll-advances` | Payroll Advances | `Wallet` | — | `payroll` | `payroll.view_own` | Payroll Advances — Continuum |
| E-10 | `/employee/reimbursements` | Reimbursements | `Receipt` | — | `reimbursements` | `reimbursement.submit_own` | Reimbursements — Continuum |
| E-11 | `/employee/learning` | My Learning | `BookOpen` | — | `learning` | — | My Learning — Continuum |
| E-12 | `/employee/travel` | Travel & Expense | `Plane` | — | `expenses` | — | Travel & Expense — Continuum |
| E-13 | `/employee/exit-checklist` | Exit Checklist | `ClipboardList` | — | `exit` | — | Exit Checklist — Continuum |
| E-14 | `/employee/notifications` | Notifications | `Bell` | — | — | — | Notifications — Continuum |
| E-15 | `/employee/profile` | Profile | `User` | — | — | `employee.view_own` | My Profile — Continuum |
| E-16 | `/employee/settings` | Settings | `Settings` | — | — | — | Settings — Continuum |

---

### Manager Portal — Complete Page Registry

| # | Route | Nav Label | Nav Icon | Module Gate | Permission | Page Title |
|---|---|---|---|---|---|---|
| MG-01 | `/manager/dashboard` | Dashboard | `LayoutDashboard` | — | — | Manager Dashboard — Continuum |
| MG-02 | `/manager/request-leave` | Request Leave | `FilePlus` | `leave` | `leave.apply_own` | Request Leave — Continuum |
| MG-03 | `/manager/leave-requests` | Leave Requests | `Inbox` | `leave` | `leave.approve_team` | Leave Requests — Continuum |
| MG-04 | `/manager/team-calendar` | Team Calendar | `CalendarDays` | `leave` | `leave.view_team` | Team Calendar — Continuum |
| MG-05 | `/manager/approvals` | Approvals | `CheckSquare` | `leave\|expenses\|reimbursements` | (any approver perm) | Approvals — Continuum |
| MG-06 | `/manager/my-attendance` | My Attendance | `Clock` | `attendance` | `attendance.mark_own` | My Attendance — Continuum |
| MG-07 | `/manager/team-attendance` | Team Attendance | `Users` | `attendance` | `attendance.view_team` | Team Attendance — Continuum |
| MG-08 | `/manager/team` | Team | `Users` | `employees` | `employee.view_team` | My Team — Continuum |
| MG-09 | `/manager/directory` | Directory | `Building2` | `directory` | — | Directory — Continuum |
| MG-10 | `/manager/performance` | Performance | `Target` | `performance` | `performance.view_team_goals` | Team Performance — Continuum |
| MG-11 | `/manager/reimbursements` | Reimbursements | `Receipt` | `reimbursements` | `reimbursement.approve_team` | Reimbursements — Continuum |
| MG-12 | `/manager/payslips` | My Payslips | `Banknote` | `payroll` | `payroll.view_own` | My Payslips — Continuum |
| MG-13 | `/manager/payroll-advances` | Payroll Advances | `Wallet` | `payroll` | `payroll.view_own` | Payroll Advances — Continuum |
| MG-14 | `/manager/reports` | Reports | `BarChart3` | `analytics` | `reports.view_team` | Team Reports — Continuum |
| MG-15 | `/manager/notifications` | Notifications | `Bell` | — | — | Notifications — Continuum |
| MG-16 | `/manager/profile` | Profile | `User` | — | — | My Profile — Continuum |
| MG-17 | `/manager/settings` | Settings | `Settings` | — | — | Settings — Continuum |

---

### HR Portal — Complete Page Registry

| # | Route | Nav Label | Nav Icon | Nav Group | Module Gate | Permission | Page Title |
|---|---|---|---|---|---|---|---|
| HR-01 | `/hr/dashboard` | Dashboard | `LayoutDashboard` | Overview | — | — | HR Dashboard — Continuum |
| HR-02 | `/hr/leave-requests` | Leave Requests | `ClipboardList` | Leave | `leave` | `leave.approve_any` | Leave Requests — Continuum |
| HR-03 | `/hr/leave-calendar` | Leave Calendar | `CalendarCheck` | Leave | `leave` | `leave.view_all` | Leave Calendar — Continuum |
| HR-04 | `/hr/leave-balance` | Leave Balance | `Scale` | Leave | `leave` | `leave.view_all` | Leave Balances — Continuum |
| HR-05 | `/hr/leave-quotas` | Leave Quotas | `Sliders` | Leave | `leave` | `leave.adjust_balance` | Leave Quotas — Continuum |
| HR-06 | `/hr/leave-encashment` | Leave Encashment | `Banknote` | Leave | `leave` | `leave.encash` | Leave Encashment — Continuum |
| HR-07 | `/hr/holidays` | Holidays | `CalendarDays` | Leave | `leave` | `company.manage_policies` | Holiday Calendar — Continuum |
| HR-08 | `/hr/request-leave` | Request Leave | `FilePlus` | Leave | `leave` | `leave.apply_own` | Request Leave — Continuum |
| HR-09 | `/hr/my-attendance` | My Attendance | `Clock` | Attendance | `attendance` | `attendance.mark_own` | My Attendance — Continuum |
| HR-10 | `/hr/attendance` | Team Attendance | `Users` | Attendance | `attendance` | `attendance.view_all` | Attendance — Continuum |
| HR-11 | `/hr/shifts` | Shifts | `Timer` | Attendance | `attendance` | `attendance.override` | Shift Management — Continuum |
| HR-12 | `/hr/employees` | Employees | `Users` | People | `employees` | `employee.view_all` | Employee Directory — Continuum |
| HR-13 | `/hr/bulk-import` | Bulk Import | `Upload` | People | `employees` | `employee.onboard` | Bulk Import — Continuum |
| HR-14 | `/hr/organization` | Organization | `Building2` | People | `directory` | `employee.view_all` | Organization Chart — Continuum |
| HR-15 | `/hr/employee-movements` | Employee Movements | `ArrowRightLeft` | People | `employees` | `employee.edit_any` | Employee Movements — Continuum |
| HR-16 | `/hr/exit-checklist` | Exit Checklist | `ListChecks` | People | `exit` | `employee.terminate` | Exit Checklist — Continuum |
| HR-17 | `/hr/payroll` | Payroll | `Wallet` | Payroll | `payroll` | `payroll.generate` | Payroll — Continuum |
| HR-18 | `/hr/pf-reports` | PF Reports | `Landmark` | Payroll | `pf` | `payroll.view_all` | PF Reports — Continuum |
| HR-19 | `/hr/salary-structures` | Salary Structures | `IndianRupee` | Payroll | `payroll` | `payroll.view_all` | Salary Structures — Continuum |
| HR-20 | `/hr/salary-components` | Salary Components | `Layers` | Payroll | `payroll` | `payroll.view_all` | Salary Components — Continuum |
| HR-21 | `/hr/compensation` | Compensation | `DollarSign` | Payroll | `payroll` | `compensation.manage_cycles` | Compensation — Continuum |
| HR-22 | `/hr/reimbursements` | Reimbursements | `Receipt` | Payroll | `reimbursements` | `reimbursement.approve_any` | Reimbursements — Continuum |
| HR-23 | `/hr/payslips` | My Payslips | `Receipt` | Payroll | `payroll` | `payroll.view_own` | My Payslips — Continuum |
| HR-24 | `/hr/my-payroll-advances` | My Payroll Advances | `Wallet` | Payroll | `payroll` | `payroll.view_own` | My Payroll Advances — Continuum |
| HR-25 | `/hr/payroll-advances` | Advance Approvals | `Banknote` | Payroll | `payroll` | `payroll.approve` | Payroll Advance Approvals — Continuum |
| HR-26 | `/hr/performance` | Performance | `Target` | Performance | `performance` | `performance.manage_reviews` | Performance — Continuum |
| HR-27 | `/hr/goals` | Goals | `Crosshair` | Performance | `performance` | `performance.manage_goals` | Goals — Continuum |
| HR-28 | `/hr/reviews` | Reviews | `Star` | Performance | `performance` | `performance.manage_reviews` | Reviews — Continuum |
| HR-29 | `/hr/recruitment` | Recruitment | `UserPlus` | Recruitment | `recruitment` | `recruitment.view_all` | Recruitment — Continuum |
| HR-30 | `/hr/job-board` | Job Board | `Megaphone` | Recruitment | `recruitment` | `recruitment.create_posting` | Job Board — Continuum |
| HR-31 | `/hr/learning` | Learning | `BookOpen` | Learning | `learning` | `lms.manage_courses` | Learning — Continuum |
| HR-32 | `/hr/travel` | Travel & Expense | `Plane` | Travel | `expenses` | `travel.view_all` | Travel & Expense — Continuum |
| HR-33 | `/hr/approvals` | Approvals | `CheckSquare` | Workflow | `leave\|expenses\|reimbursements` | (any approver perm) | Approvals — Continuum |
| HR-34 | `/hr/approval-config` | Approval Config | `GitBranch` | Workflow | `leave` | `workflow.manage_templates` | Approval Config — Continuum |
| HR-35 | `/hr/escalation` | Escalation | `AlertTriangle` | Workflow | `leave` | `leave.approve_any` | Escalation — Continuum |
| HR-36 | `/hr/reports` | Reports | `BarChart3` | Reports | `analytics` | `reports.view_all` | Reports — Continuum |
| HR-37 | `/hr/report-builder` | Report Builder | `FileSpreadsheet` | Reports | `analytics` | `reports.export` | Report Builder — Continuum |
| HR-38 | `/hr/documents` | Documents | `FolderOpen` | Documents | `documents` | `employee.view_all` | Documents — Continuum |
| HR-39 | `/hr/policy-settings` | Policy Settings | `SlidersHorizontal` | Settings | — | `company.manage_policies` | Policy Settings — Continuum |
| HR-40 | `/hr/compliance` | Compliance | `Scale` | Settings | `compliance` | `audit.view_all` | Compliance — Continuum |
| HR-41 | `/hr/audit-logs` | Audit Logs | `Shield` | Settings | `compliance` | `audit.view_all` | Audit Logs — Continuum |
| HR-42 | `/hr/notifications` | Notifications | `Bell` | Settings | — | — | Notifications — Continuum |
| HR-43 | `/hr/profile` | Profile | `User` | Settings | — | — | My Profile — Continuum |
| HR-44 | `/hr/settings` | Settings | `Settings` | Settings | — | — | Settings — Continuum |

---

### Admin Portal — Complete Page Registry

| # | Route | Nav Label | Nav Icon | Module Gate | Permission | Page Title |
|---|---|---|---|---|---|---|
| AD-01 | `/admin/getting-started` | Getting Started | `Rocket` | — | — | Getting Started — Continuum |
| AD-02 | `/admin/dashboard` | Dashboard | `LayoutDashboard` | — | — | Admin Dashboard — Continuum |
| AD-03 | `/admin/setup-wizard` | Organization Setup | `Settings` | — | `company.edit_settings` | Organization Setup — Continuum |
| AD-04 | `/admin/startup-readiness` | Readiness | `ListChecks` | — | `company.view_settings` | Startup Readiness — Continuum |
| AD-05 | `/admin/company-settings?tab=approval-chains` | Approval Config | `GitBranch` | `leave` | `workflow.manage_templates` | Approval Config — Continuum |
| AD-06 | `/admin/leave-requests` | Leave Requests | `ClipboardList` | `leave` | `leave.approve_any` | Leave Requests — Continuum |
| AD-07 | `/admin/people` | People Ops | `Users` | `employees` | `employee.view_all` | People Ops — Continuum |
| AD-08 | `/admin/payroll` | Payroll | `Banknote` | `payroll` | `payroll.generate` | Payroll — Continuum |
| AD-09 | `/admin/payslips` | My Payslips | `Receipt` | `payroll` | `payroll.view_own` | My Payslips — Continuum |
| AD-10 | `/admin/my-payroll-advances` | My Payroll Advances | `Wallet` | `payroll` | `payroll.view_own` | My Payroll Advances — Continuum |
| AD-11 | `/admin/rbac` | RBAC & Permissions | `ShieldCheck` | — | `security.manage_roles` | RBAC — Continuum |
| AD-12 | `/admin/system-health` | System Health | `Activity` | — | `security.view_logs` | System Health — Continuum |
| AD-13 | `/admin/notifications` | Notifications | `Bell` | — | — | Notifications — Continuum |
| AD-14 | `/admin/profile` | Profile | `User` | — | — | My Profile — Continuum |
| AD-15 | `/admin/audit-logs` | Audit Logs | `Shield` | `compliance` | `audit.view_all` | Audit Logs — Continuum |
| AD-16 | `/admin/company-settings` | Settings | `Building2` | — | `company.edit_settings` | Company Settings — Continuum |
| AD-17 | `/admin/billing` | Billing | `CreditCard` | — | `company.manage_billing` | Billing — Continuum |

---

### Super Admin Portal — Complete Page Registry

| # | Route | Page Title | Purpose |
|---|---|---|---|
| SA-01 | `/super-admin/dashboard` | Platform Dashboard — Continuum | Platform metrics, company count, MRR |
| SA-02 | `/super-admin/companies` | Companies — Continuum | List all companies, manage |
| SA-03 | `/super-admin/companies/[id]` | Company Detail — Continuum | View/edit specific company |
| SA-04 | `/super-admin/companies/[id]/modules` | Module Management — Continuum | Set module cap for company |
| SA-05 | `/super-admin/users` | Platform Users — Continuum | All users across companies |
| SA-06 | `/super-admin/billing` | Platform Billing — Continuum | Revenue, subscriptions overview |
| SA-07 | `/super-admin/system` | System Health — Continuum | DB, Redis, queue health |
| SA-08 | `/super-admin/audit-logs` | Platform Audit Logs — Continuum | Cross-company audit trail |
| SA-09 | `/super-admin/settings` | Platform Settings — Continuum | Global platform config |
| SA-10 | `/super-admin/incidents` | Incidents — Continuum | System incidents management |

---

## 2.4 Complete Permission Matrix (76 Permission Codes)

### Permission Catalog by Module

| Module | Permission Code | Description | employee | team_lead | manager | director | hr | admin | super_admin |
|---|---|---|---|---|---|---|---|---|---|
| **Leave** | `leave.apply_own` | Apply for own leave | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `leave.approve_team` | Approve team leave | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `leave.approve_any` | Approve any leave | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `leave.view_team` | View team leave | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `leave.view_all` | View all leave | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `*` |
| | `leave.cancel_any` | Cancel any leave | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `leave.adjust_balance` | Adjust leave balance | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `leave.override` | Override leave policy | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `leave.encash` | Process encashment | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Attendance** | `attendance.mark_own` | Mark own attendance | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `attendance.view_team` | View team attendance | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `attendance.view_all` | View all attendance | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `*` |
| | `attendance.regularize` | Approve regularization | ❌ | ❌ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `attendance.override` | Override records | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Payroll** | `payroll.view_own` | View own payslip | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `payroll.view_all` | View all payroll | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `payroll.generate` | Generate payroll run | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `payroll.approve` | Approve payroll run | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `payroll.process` | Process payments | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| **Employee** | `employee.view_own` | View own profile | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `employee.view_team` | View team profiles | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `employee.view_all` | View all profiles | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `*` |
| | `employee.edit_any` | Edit any profile | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `employee.onboard` | Onboard employees | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `employee.terminate` | Terminate employees | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Company** | `company.view_settings` | View settings | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `*` |
| | `company.edit_settings` | Edit settings | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `company.manage_policies` | Manage policies | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `company.manage_billing` | Manage billing | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| **Reports** | `reports.view_team` | View team reports | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `reports.view_all` | View all reports | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ | `*` |
| | `reports.export` | Export reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Audit** | `audit.view_own` | View own audit | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `audit.view_all` | View all audit | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `audit.export` | Export audit logs | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Notifications** | `notifications.manage_templates` | Manage templates | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `notifications.configure` | Configure settings | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Security** | `security.manage_api_keys` | Manage API keys | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| | `security.view_logs` | View security logs | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| | `security.manage_roles` | Manage roles | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| **Performance** | `performance.set_own_goals` | Set own goals | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `performance.view_team_goals` | View team goals | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `performance.manage_goals` | Manage any goals | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `performance.manage_reviews` | Manage review cycles | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `performance.submit_review` | Submit reviews | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `performance.view_all` | View all performance | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Recruitment** | `recruitment.create_posting` | Create job postings | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `recruitment.manage_applications` | Manage applications | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `recruitment.schedule_interviews` | Schedule interviews | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `recruitment.submit_feedback` | Submit interview feedback | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `recruitment.manage_offers` | Manage offers | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `recruitment.view_all` | View all recruitment | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `recruitment.view_pipeline` | View pipeline | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `recruitment.manage_pipeline` | Advance/reject candidates | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `recruitment.create_offer` | Create offer letters | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Workflow** | `workflow.manage_templates` | Manage templates | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `workflow.view_instances` | View instances | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `workflow.override` | Override decisions | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| **Reimbursement** | `reimbursement.submit_own` | Submit own | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `reimbursement.approve_team` | Approve team | ❌ | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `reimbursement.approve_any` | Approve any | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `reimbursement.view_all` | View all | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **LMS** | `lms.manage_courses` | Manage courses | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `lms.view_all_enrollments` | View all enrollments | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `lms.manage_enrollments` | Enroll employees | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `lms.publish_courses` | Publish courses | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `lms.view_reports` | View LMS reports | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| **Compensation** | `compensation.view_cycles` | View cycles | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `compensation.manage_cycles` | Manage cycles | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `compensation.approve` | Approve recommendations | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `compensation.finalize` | Finalize cycle | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| **Travel** | `travel.view_all` | View all travel | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `travel.approve` | Approve travel | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `travel.manage_policy` | Manage policy | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| **Expenses** | `expenses.view_all` | View all expenses | ✅* | ✅ | ✅ | ✅ | ✅ | ✅ | `*` |
| | `expenses.approve` | Approve expenses | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | `*` |
| | `expenses.manage_policy` | Manage policy | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | `*` |
| **Platform** | `platform.manage_companies` | Manage companies | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `*` |
| | `platform.manage_users` | Manage platform users | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `*` |
| | `platform.view_all_data` | View all data | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | `*` |

> *Note: `travel.view_all` and `expenses.view_all` for employees are filtered server-side to show own data only.*

---

## 2.5 Design System (The Paint, Materials, and Furniture Standards)

### Typography

| Token | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `text-display` | Inter | 2rem (32px) | 700 | Hero headings, marketing |
| `text-h1` | Inter | 1.5rem (24px) | 700 | Page titles |
| `text-h2` | Inter | 1.25rem (20px) | 600 | Section headings |
| `text-h3` | Inter | 1.125rem (18px) | 600 | Card titles |
| `text-h4` | Inter | 1rem (16px) | 600 | Sub-section headings |
| `text-body` | Inter | 0.9375rem (15px) | 400 | Body text |
| _(default)_ | Inter | 0.875rem (14px) | 400 | Small text, table cells |

### Color Tokens

| Token | Light Value | Dark Value | Usage |
|---|---|---|---|
| `--bg-base` | `#f8f8fa` | `#09090b` | Page background |
| `--bg-surface` | `#ffffff` | `#18181b` | Cards, panels |
| `--bg-surface-hover` | `#f4f4f5` | `#27272a` | Interactive surface hover |
| `--border-subtle` | `#e4e4e7` | `#27272a` | Default borders |
| `--border-strong` | `#a1a1aa` | `#52525b` | Emphasized borders |
| `--text-primary` | `#18181b` | `#fafafa` | Primary text |
| `--text-secondary` | `#52525b` | `#a1a1aa` | Supporting text |
| `--text-muted` | `#a1a1aa` | `#71717a` | Disabled/placeholder |
| `--accent-primary` | `hsl(210 100% 52%)` | `hsl(217 91% 60%)` | Primary buttons, links |
| `--accent-primary-hover` | _(+10% darker)_ | _(+10% lighter)_ | Button hover |
| `--accent-soft` | `hsl(210 100% 96%)` | `hsl(217 91% 15%)` | Soft accent backgrounds |
| `--status-success` | `hsl(142 71% 45%)` | `hsl(142 71% 45%)` | Success states, approved |
| `--status-warning` | `hsl(38 92% 50%)` | `hsl(38 92% 50%)` | Warning states, pending |
| `--status-danger` | `hsl(0 84% 60%)` | `hsl(0 84% 60%)` | Error/danger, rejected |

### Spacing & Radius

| Token | Value | Usage |
|---|---|---|
| `--radius-sm` | `0.625rem` (10px) | Small elements (badges, chips) |
| `--radius` | `0.875rem` (14px) | Default (cards, buttons, inputs) |
| `--radius-lg` | `1.125rem` (18px) | Large cards, modals |
| `--radius-xl` | `1.5rem` (24px) | Hero sections |

### Elevation (Shadows)

| Token | Value | Usage |
|---|---|---|
| `--shadow-xs` | `0 1px 2px 0 rgb(0 0 0 / 0.03)` | Subtle lift |
| `--shadow-sm` | `0 1px 2px 0 rgb(0 0 0 / 0.05)` | Cards |
| `--shadow-md` | `0 4px 6px -1px rgb(0 0 0 / 0.1)` | Dropdowns |
| `--shadow-lg` | `0 10px 15px -3px rgb(0 0 0 / 0.1)` | Modals |
| `--shadow-bento` | _(compound shadow)_ | Bento grid cards |

### Motion

| Token | Value | Usage |
|---|---|---|
| `--motion-fast` | `150ms` | Hover transitions, button press |
| `--motion-normal` | `220ms` | State changes, tab switches |
| `--motion-slow` | `360ms` | Modal open/close, page transitions |
| `prefers-reduced-motion` | Disables all transitions | Accessibility |

### Theme

| Property | Value |
|---|---|
| Default theme | `dark` |
| Storage key | `continuum-theme` |
| Toggle mechanism | `.dark` class on `<html>` via `next-themes` `ThemeProvider` |
| Available themes | `light`, `dark`, `system` |

---

## 2.6 Global Infrastructure (The Plumbing, Wiring, and Safety Systems)

### Authentication Flow

```
1. User visits /sign-in
2. Enters email + password
3. POST /api/auth/sign-in
   → bcrypt.compare(password, stored_hash)
   → Generate access JWT (short-lived, jose library)
   → Generate refresh token (stored hashed in RefreshToken table)
   → Create Session record
   → Set cookies:
      - continuum-session (httpOnly, SameSite=Lax)
      - continuum-refresh (httpOnly, restricted to /api/auth)
      - continuum-role (hint for UI routing)
      - continuum-roles (JSON array)
      - continuum-onboarding-completed
      - continuum-employee-onboarding-completed
      - continuum-enabled-modules (comma-separated)
4. Redirect to portal based on primary_role
```

### Middleware Pipeline (20 layers, runs on every request)

```
Request →
  1. Static file bypass (skip middleware for /_next, /favicon.ico)
  2. Canonical domain redirect (Vercel preview → custom domain)
  3. IP blocklist check (static + dynamic auto-block)
  4. SQLi/XSS threat scanning (pattern matching on URL + body)
  5. Path traversal protection (../ detection)
  6. Sign-up redirect (→ /sign-in, invite-only)
  7. Security headers injection (CSP, HSTS, X-Frame-Options, etc.)
  8. Request ID generation (X-Request-Id header)
  9. CORS handling (explicit origin allowlist, never wildcard)
  10. Body size limits (1MB JSON, 12MB multipart)
  11. Rate limiting (in-memory, per-IP: 5/min auth, 30/min default)
  12. Already-authenticated redirect (auth pages → portal)
  13. Public route passthrough (/sign-in, /about, /status, etc.)
  14. Cron route CRON_SECRET validation (constant-time compare)
  15. Company onboarding gate (→ /onboarding if not completed)
  16. Employee onboarding gate (→ /onboarding/employee if not completed)
  17. HR portal setup gate
  18. Module path guard (enabled-modules cookie → route access)
  19. Portal role enforcement (JWT verify + role-based portal access)
  20. Sensitive route structured logging
→ Response
```

### API Pattern (Every API Route)

```typescript
// Every API route handler follows this pattern:
export async function POST(req: NextRequest) {
  // 1. Auth guard
  const employee = await getAuthEmployee(req);
  // 2. Module guard
  await assertModule(employee.org_id, 'leave');
  // 3. Permission guard
  requirePermissionGuard(employee, 'leave.apply_own');
  // 4. Parse + validate body with Zod
  const body = createLeaveSchema.parse(await req.json());
  // 5. Business logic
  const result = await leaveService.create(body, employee);
  // 6. Audit log
  await createAuditLog({ ... });
  // 7. Domain event
  await publishEvent('leave.created', { ... });
  // 8. Response
  return NextResponse.json({ data: result }, { status: 201 });
}
```

### Error Response Shape (All APIs)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "field": "email", "message": "Invalid email format" }],
    "requestId": "req_abc123"
  }
}
```

### Notification System

| Channel | Implementation | When Used |
|---|---|---|
| In-app | `Notification` model + Pusher realtime | All events |
| Email | Nodemailer + `NotificationTemplate` | Leave approvals, payroll ready, invites |
| Push (future) | — | Not implemented yet |

### Audit System (Tamper-Proof)

| Property | Value |
|---|---|
| Model | `AuditLog` |
| Integrity | `integrity_hash` (SHA-256 of current record) + `prev_hash` (hash of previous record) |
| Immutability | Chain of hashes — any modification breaks the chain |
| Retention | Never deleted; `deleted_at` not applicable |
| PII rule | Never log passwords, tokens, full bank numbers |

### File Storage

| Property | Value |
|---|---|
| Provider | Appwrite (project `6a0c1929002c719bd1be`) |
| Endpoint | `https://fra.cloud.appwrite.io/v1` |
| Bucket | `6a0c19a90004bdd511a1` |
| Client | `web/lib/appwrite/storage.ts` |
| Max file size | 12MB (enforced in middleware + Appwrite) |
| Allowed types | PDF, JPG, PNG, DOCX (validated via magic bytes, not extension) |

### Caching

| Component | Provider | Usage |
|---|---|---|
| Rate limiting | In-memory (middleware) + Upstash Redis | Request throttling |
| Session data | Upstash Redis | Distributed session store |
| Permission cache | Upstash Redis (5 min TTL) | Avoid DB lookups per request |
| Circuit breaker | `lib/circuit-breaker.ts` | External service protection |

### Monitoring & Observability

| Component | Tool | Details |
|---|---|---|
| Error tracking | Sentry (`@sentry/nextjs`) | All unhandled errors + performance traces |
| Logging | Winston + Logtail + Loki | Structured JSON, log levels, field redaction |
| Metrics | Prometheus (prom-client) | Request latency, error rate, DB pool util |
| Health checks | `/api/health` (liveness), `/api/health/ready` (readiness) | DB, Redis, Appwrite connectivity |
| Uptime | `SystemIncident`, `UptimeRecord` models | Public status page at `/status` |

---

## 2.7 API Route Registry (62 Domains)

| Domain | Route Prefix | Module | Key Operations |
|---|---|---|---|
| `auth` | `/api/auth/*` | Core | sign-in, sign-up, sign-out, refresh, me, change-password |
| `admin` | `/api/admin/*` | Core | Company admin operations |
| `employees` | `/api/employees/*` | CF-001 | CRUD, search, bulk operations |
| `employee` | `/api/employee/*` | CF-001 | Single employee operations |
| `leaves` | `/api/leaves/*` | CF-002 | Apply, approve, reject, balance, history |
| `attendance` | `/api/attendance/*` | CF-005 | Mark, regularize, reports |
| `shifts` | `/api/shifts/*` | CF-005 | Shift CRUD, assignment |
| `payroll` | `/api/payroll/*` | CF-006 | Runs, slips, config |
| `salary-structures` | `/api/salary-structures/*` | CF-006 | Structure CRUD |
| `salary-components` | `/api/salary-components/*` | CF-006 | Component CRUD |
| `salary-revisions` | `/api/salary-revisions/*` | CF-006 | Revision history |
| `payroll-advances` | `/api/payroll-advances/*` | CF-006 | Advance requests |
| `goals` | `/api/goals/*` | CF-007 | Goal CRUD, hierarchy |
| `review-cycles` | `/api/review-cycles/*` | CF-007 | Cycle management |
| `review-instances` | `/api/review-instances/*` | CF-007 | Individual reviews |
| `job-postings` | `/api/job-postings/*` | CF-008 | Posting CRUD |
| `job-applications` | `/api/job-applications/*` | CF-008 | Application pipeline |
| `interviews` | `/api/interviews/*` | CF-008 | Schedule, feedback |
| `offer-letters` | `/api/offer-letters/*` | CF-008 | Offer generation |
| `courses` | `/api/courses/*` | CF-009 | Course CRUD |
| `course-enrollments` | `/api/course-enrollments/*` | CF-009 | Enrollment management |
| `travel-requests` | `/api/travel-requests/*` | CF-010 | Travel CRUD |
| `expenses` | `/api/expenses/*` | CF-010/011 | Expense CRUD |
| `reimbursements` | `/api/reimbursements/*` | CF-011 | Reimbursement CRUD |
| `directory` | `/api/directory/*` | CF-012 | People search, org chart |
| `documents` | `/api/documents/*` | CF-013 | Upload, verify, list |
| `exit-checklist` | `/api/exit-checklist/*` | CF-014 | Checklist CRUD |
| `employee-movements` | `/api/employee-movements/*` | CF-001 | Transfer, promotion |
| `reports` | `/api/reports/*` | CF-015 | Report generation |
| `company` | `/api/company/*` | Core | Company settings, policies |
| `settings` | `/api/settings/*` | Core | User + company settings |
| `permissions` | `/api/permissions/*` | Core | RBAC management |
| `approval-hierarchy` | `/api/approval-hierarchy/*` | Core | Approval chain config |
| `workflows` | `/api/workflows/*` | Core | Workflow engine |
| `notifications` | `/api/notifications/*` | Core | Notification CRUD, prefs |
| `audit-logs` | `/api/audit-logs/*` | CF-003 | Audit log queries |
| `compliance` | `/api/compliance/*` | CF-003 | Compliance checks |
| `holidays` | `/api/holidays/*` | CF-002 | Holiday CRUD |
| `invite` | `/api/invite/*` | Core | Send/accept invitations |
| `onboarding` | `/api/onboarding/*` | Core | Onboarding steps |
| `profile` | `/api/profile/*` | Core | Profile update |
| `upload` | `/api/upload/*` | Core | File upload to Appwrite |
| `email` | `/api/email/*` | Core | Email sending |
| `search` | `/api/search/*` | Core | Global search |
| `payments` | `/api/payments/*` | Core | Razorpay/Stripe webhooks |
| `webhooks` | `/api/webhooks/*` | Core | External webhook handlers |
| `super-admin` | `/api/super-admin/*` | Platform | Platform admin operations |
| `health` | `/api/health/*` | Core | Liveness + readiness |
| `status` | `/api/status/*` | Core | Public status |
| `system` | `/api/system/*` | Core | System diagnostics |
| `security` | `/api/security/*` | Core | API keys, security logs |
| `cron` | `/api/cron/*` | Core | Scheduled jobs |
| `ai` | `/api/ai/*` | Core | AI assistant, leave recommendations |
| `hr` | `/api/hr/*` | Core | HR-specific aggregations |
| `manager` | `/api/manager/*` | Core | Manager-specific views |
| `compensation` | `/api/compensation/*` | CF-006 | Compensation cycles |
| `enterprise` | `/api/enterprise/*` | Core | Enterprise features |
| `internal` | `/api/internal/*` | Core | Internal service calls |
| `ops` | `/api/ops/*` | Core | Operations tooling |
| `tutorial` | `/api/tutorial/*` | Core | Onboarding tutorials |
| `job-levels` | `/api/job-levels/*` | CF-001 | Job level hierarchy |
| `test-neon` | `/api/test-neon/*` | Dev | DB connectivity test (dev only) |

---

## 2.8 Shared UI Components (The Standard Furniture)

| Component | File | Props | Used For |
|---|---|---|---|
| `PageHeader` | `components/layouts/page-header.tsx` | `title, subtitle, children (action slot)` | Top of every portal page |
| `PortalLayout` | `components/portal-layout.tsx` | `children, sidebar, topbar` | All portal pages |
| `SidebarNav` | `components/layouts/sidebar-nav.tsx` | `items: NavItem[]` | Portal sidebar |
| `PortalSwitcher` | `components/portal-switcher.tsx` | `currentRole, availableRoles` | Role/portal switching |
| `NotificationBell` | `components/layouts/notification-bell.tsx` | `count` | Top bar notification icon |
| `GlobalSearch` | `components/layouts/global-search-page.tsx` | — | ⌘K command palette |
| `ThemeToggle` | `components/layouts/theme-toggle.tsx` | — | Light/dark toggle |
| `GlassPanel` | `components/layouts/glass-panel.tsx` | `children` | Glassmorphism container |
| `Button` | `components/ui/button.tsx` | `variant, size, disabled, loading` | All buttons |
| `Input` | `components/ui/input.tsx` | `type, placeholder, error` | Form inputs |
| `Textarea` | `components/ui/textarea.tsx` | `rows, maxLength` | Multi-line input |
| `Select` | `components/ui/select.tsx` (Radix) | `options, value, onChange` | Dropdowns |
| `Modal` | `components/ui/modal.tsx` (Radix Dialog) | `isOpen, onClose, title, size` | Overlays |
| `Card` | `components/ui/card.tsx` | `className` | Content containers |
| `Badge` | `components/ui/badge.tsx` | `variant (success/warning/danger/info)` | Status indicators |
| `Tabs` | `components/ui/tabs.tsx` (Radix) | `items, activeTab` | Tab navigation |
| `Avatar` | `components/ui/avatar.tsx` (Radix) | `src, fallback, size` | User photos |
| `Progress` | `components/ui/progress.tsx` | `value, max` | Progress bars |
| `Skeleton` | `components/ui/skeleton.tsx` | `className` | Loading states |
| `ErrorBoundary` | `components/ui/error-boundary.tsx` | `fallback` | Error isolation |
| `Loading` | `components/ui/loading.tsx` | `size` | Spinner/loader |
| `Toaster` | Sonner | — | Global toast notifications |
| `CommandK` | `components/ui/command-k.tsx` | — | ⌘K search modal |
| `SaveButton` | `components/ui/save-button.tsx` | `isSaving, isValid` | Form save with state |
| `OptimisticButton` | `components/ui/optimistic-button.tsx` | — | Optimistic UI updates |
| `AppLoading` | `components/ui/app-loading.tsx` | — | Full-page loader |
| `AdaptiveField` | `components/ui/adaptive-field.tsx` | — | Responsive form fields |

---

## 2.9 Document Index — Module Specs (Level 3–5)

> Each module gets its own complete Level 3–5 specification document.

| # | Document | Module(s) | Status |
|---|---|---|---|
| 01 | `01-global-systems.md` | Auth, Onboarding, Billing, Notifications, Audit | `pending` |
| 02 | `02-employee-management.md` | CF-001 Employees + CF-012 Directory | `pending` |
| 03 | `03-leave-management.md` | CF-002 Leave | `pending` |
| 04 | `04-attendance.md` | CF-005 Attendance | `pending` |
| 05 | `05-payroll.md` | CF-006 Payroll + CF-004 PF | `pending` |
| 06 | `06-performance.md` | CF-007 Performance | `pending` |
| 07 | `07-recruitment.md` | CF-008 Recruitment | `pending` |
| 08 | `08-learning.md` | CF-009 LMS | `pending` |
| 09 | `09-travel-expense.md` | CF-010 Expenses + CF-011 Reimbursements | `pending` |
| 10 | `10-documents-exit.md` | CF-013 Documents + CF-014 Exit | `pending` |
| 11 | `11-analytics.md` | CF-015 Analytics | `pending` |
| 12 | `12-compliance.md` | CF-003 Compliance & Audit | `pending` |
| 13 | `13-marketing-site.md` | Public pages, landing, legal | `pending` |
| 14 | `14-super-admin.md` | Platform administration | `pending` |

---

> **End of Master Blueprint (Level 1–2)**
>
> Next: Each document above will contain the complete Level 3 (components), Level 4 (specifications), and Level 5 (internal sub-components) for its module(s).
