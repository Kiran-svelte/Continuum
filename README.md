# Continuum

# Continuum — Enterprise AI Leave Management System

> **Config-Driven • Multi-Tenant • India-Compliant • AI-Powered**
>
> A production-grade SaaS HR platform where company administrators configure leave policies, quotas, constraints, and organizational structure during onboarding — the system then auto-generates personalized dashboards, leave engines, approval workflows, and payroll calculations for every employee. No code changes. Zero manual wiring.

---

## Table of Contents

1. [System Architecture Overview](#1-system-architecture-overview)
2. [Role-Based Access & User Flows](#2-role-based-access--user-flows)
3. [Engine Configuration & How It Works](#3-engine-configuration--how-it-works)
4. [Backend Flow — How Everything Connects](#4-backend-flow--how-everything-connects)
5. [Database Schema & Data Ownership](#5-database-schema--data-ownership)
6. [State Machine Rules](#6-state-machine-rules)
7. [Hard Decisions](#7-hard-decisions)
8. [What Is Forbidden](#8-what-is-forbidden)
9. [Spec Invariants](#9-spec-invariants)
10. [Infrastructure Contract](#10-infrastructure-contract)
11. [Security Architecture](#11-security-architecture)
12. [Page-by-Page Feature Map](#12-page-by-page-feature-map)
13. [End-to-End Flows](#13-end-to-end-flows)
14. [Testing Strategy](#14-testing-strategy)
15. [Deployment](#15-deployment)
16. [Tech Stack](#16-tech-stack)
17. [Developer Guide — How Everything Works](#17-developer-guide--how-everything-works)

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTINUUM ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌──────────────┐    ┌────────────────────────────┐  │
│  │  Marketing   │    │  Auth Layer  │    │     Next.js 16 Frontend    │  │
│  │  Landing     │───▶│  Supabase    │───▶│  (App Router / RSC)        │  │
│  │  Page        │    │  + Middleware │    │                            │  │
│  └─────────────┘    └──────┬───────┘    │  ┌────────┐ ┌───────────┐  │  │
│                            │            │  │Employee│ │  HR       │  │  │
│                            │            │  │Portal  │ │  Portal   │  │  │
│                            │            │  └────────┘ └───────────┘  │  │
│                            │            │  ┌────────┐ ┌───────────┐  │  │
│                            │            │  │Manager │ │  Admin    │  │  │
│                            │            │  │Portal  │ │  Portal   │  │  │
│                            │            │  └────────┘ └───────────┘  │  │
│                            │            └────────────┬───────────────┘  │
│                            │                         │                  │
│                     ┌──────▼─────────────────────────▼───────────┐      │
│                     │          Next.js API Routes                │      │
│                     │   /api/leaves  /api/attendance  /api/hr    │      │
│                     │   /api/policies /api/payroll /api/reports  │      │
│                     │   /api/security /api/billing /api/cron     │      │
│                     └──────────┬──────────────┬─────────────────┘      │
│                                │              │                         │
│          ┌─────────────────────▼──┐    ┌──────▼────────────────┐       │
│          │    RBAC Engine         │    │  Constraint Policy    │       │
│          │    (lib/rbac.ts)       │    │  Engine               │       │
│          │    40+ permissions     │    │  (Python Flask 8001)  │       │
│          │    6 roles             │    │  13+ constraint rules │       │
│          │    Company-specific    │    │  Per-company config   │       │
│          └────────────────────────┘    └───────────────────────┘       │
│                                │              │                         │
│                     ┌──────────▼──────────────▼──────────────┐         │
│                     │        PostgreSQL (Supabase)            │         │
│                     │  32 models · Multi-tenant · ACID        │         │
│                     │  Integrity hash chains · Audit logs     │         │
│                     │  Ledger-based leave tracking            │         │
│                     └────────────────────────────────────────┘         │
│                                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ Email Service│  │ Pusher       │  │ Razorpay     │  │ Cron Jobs │  │
│  │ Gmail OAuth  │  │ Real-time    │  │ Billing      │  │ SLA/Accrual│  │
│  └──────────────┘  └──────────────┘  └──────────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### Service Map

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| **Web Frontend** | Next.js 16 (App Router, RSC) | 3000 | All UI portals + API routes |
| **Constraint Engine** | Python Flask | 8001 | Leave policy constraint evaluation |
| **Database** | PostgreSQL (Supabase) | 5432 | Primary data store, Row-Level Security |
| **Real-time** | Pusher | — | Live notifications, audit feed |
| **Email** | Gmail OAuth2 / SMTP | — | Transactional emails |
| **Payments** | Razorpay (India) / Stripe | — | Subscription billing |
| **Auth** | Supabase Auth | — | JWT + Session management |
| **Monitoring** | Prometheus + Grafana | 9090/3001 | Metrics & dashboards |
| **Cache** | Redis | 6379 | Session store, rate limiting |

---

## 2. Role-Based Access & User Flows

### 2.1 Role Hierarchy

```
┌─────────────────────────────────────────────────────┐
│                  ROLE HIERARCHY                      │
├─────────────────────────────────────────────────────┤
│                                                      │
│  admin ──────────────────────────────── ALL ACCESS   │
│    │                                                 │
│  hr ─────────────────────── Company-wide operations  │
│    │                                                 │
│  director ───────────────── Division-level oversight  │
│    │                                                 │
│  manager ────────────────── Department-level control  │
│    │                                                 │
│  team_lead ──────────────── Team-level approvals     │
│    │                                                 │
│  employee ───────────────── Self-service only        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### 2.2 Permission Modules (40+ Permission Codes)

| Module | Sample Permissions |
|--------|--------------------|
| **Leave** | `leave.apply_own`, `leave.approve_team`, `leave.approve_any`, `leave.view_team`, `leave.view_all`, `leave.cancel_any`, `leave.adjust_balance`, `leave.override`, `leave.encash` |
| **Attendance** | `attendance.mark_own`, `attendance.view_team`, `attendance.view_all`, `attendance.regularize`, `attendance.override` |
| **Payroll** | `payroll.view_own`, `payroll.view_all`, `payroll.generate`, `payroll.approve`, `payroll.process` |
| **Employee** | `employee.view_own`, `employee.view_team`, `employee.view_all`, `employee.edit_any`, `employee.onboard`, `employee.terminate` |
| **Company** | `company.view_settings`, `company.edit_settings`, `company.manage_policies`, `company.manage_billing` |
| **Reports** | `reports.view_team`, `reports.view_all`, `reports.export` |
| **Audit** | `audit.view_own`, `audit.view_all`, `audit.export` |
| **Notifications** | `notifications.manage_templates`, `notifications.configure` |

### 2.3 Multi-Role Support

Employees can hold **primary + secondary roles**. The `primary_role` determines which portal dashboard loads. Secondary roles grant additive permissions.

```typescript
// Resolution: getEffectiveRoles(employee)
// Returns: Set<UserRole> = { primary_role, ...secondary_roles[] }
// Permission check: getUserPermissions(empId, companyId) → company-specific or defaults
```

---

### 2.4 ADMIN Role (System Owner / Super Admin)

**Portal:** `/admin/*`
**What They See:** Full system control panel

#### 2.4.1 Policy Engine Control (CORE POWER)

| Feature | Description | Component/API |
|---------|-------------|---------------|
| Create leave policies | Define leave types with quotas, rules, carry-forward | `/hr/(main)/policy-settings/` |
| Policy versioning | Constraint policies stored with timestamps, immutable audit | `ConstraintPolicy` model |
| Set effective dates | `effective_from` / `effective_to` on rules | `LeaveRule.effective_from` |
| Accrual frequency | Monthly/quarterly/yearly accrual via cron | `/api/cron/` |
| Carry forward rules | Per leave type: `carry_forward`, `max_carry_forward` | `LeaveType` model |
| Encashment rules | `encashment_enabled`, `encashment_max_days`, per-day amount | `Company` + `LeaveEncashment` |
| Negative balance limit | `negative_balance` toggle per company | `Company.negative_balance` |
| Sandwich rule | `RULE008` — Weekend/holiday sandwich detection | Constraint Engine |
| Blackout dates | `RULE005` — Company-wide blackout periods | `LeaveRule.rule_type = "blackout"` |
| **Policy inheritance** | Org → Dept → Individual override via `applies_to_all` + `departments` JSON | `LeaveRule` config |
| **Policy simulation** | Join-date balance projection in smart defaults | `predictLeaveDuration()` |

#### 2.4.2 Organizational Structure Control

| Feature | API/Model |
|---------|-----------|
| Create departments | `OrganizationUnit` (type: `department`) |
| Create designations | `JobLevel` model |
| Reporting hierarchy | `ApprovalHierarchy` (4-level approval chain) |
| Approval workflow templates | `level1_approver` → `level4_approver` + `hr_partner` |
| Bulk upload employees | `/api/employee/join` |
| Holiday calendar | `PublicHoliday` + `CompanySettings.custom_holidays` |
| **Multi-location** | `country_code` on Company/Employee, location-wise rules |
| **Cost center mapping** | `OrganizationUnit.cost_center` |

#### 2.4.3 Governance & Compliance

| Feature | Implementation |
|---------|----------------|
| Immutable audit logs | SHA-256 integrity hash chain (`AuditLog.integrity_hash` → `prev_hash`) |
| Approval SLA reports | Cron: `/api/cron/sla-check` (hourly, auto-escalation) |
| Leave modification history | `AuditLog` entries for every state change |
| Lock past data | `deleted_at` soft delete pattern |
| Data export | GDPR Article 20: JSON/CSV via `lib/compliance/data-export.ts` |
| Backup & restore | Enterprise: `createFullBackup()`, `restoreFromBackup()`, 30-day retention |
| **Policy change impact** | Audit diffs: `previous_state` → `new_state` on every policy edit |
| **Who edited what** | `SettingsAuditLog` with `user_email`, `otp_verified`, timestamp |
| **Compliance report** | `generateComplianceReport(companyId)` — consent metrics, annual summary |

#### 2.4.4 System-Level Settings

| Feature | Implementation |
|---------|----------------|
| Email gateway config | Gmail OAuth2 + SMTP fallback (`lib/email-service.ts`) |
| Notification templates | `NotificationTemplate` per company per event per channel |
| RBAC editor | `Permission` + `RolePermission` tables, company-specific overrides |
| Session timeout | Supabase session refresh in middleware |
| OTP security | `lib/otp-service.ts` — 8 protected actions, SHA-256 hashed codes |

---

### 2.5 HR Role (Operational Controller)

**Portal:** `/hr/*` — 30+ pages
**What They See:** Full employee operations dashboard

#### 2.5.1 Employee Lifecycle

| Feature | Page/API | Details |
|---------|----------|---------|
| Onboard employee | `/hr/(main)/onboarding/` | Auto-config triggered: balances seeded, hierarchy set |
| Assign policy override | `/hr/(main)/policy-settings/` | Per-department or individual rule overrides |
| Change reporting manager | `/hr/(main)/employees/` | Updates `ApprovalHierarchy` chain |
| Change department | `/hr/(main)/employee-movements/` | `EmployeeMovement` with approval flow |
| Terminate employee | `/hr/(main)/exits/` | `ExitChecklist` (8-item checklist + custom items) |
| Notice period tracking | `Employee.notice_period_days`, `resignation_date`, `last_working_date` |
| **Probation auto-switch** | `Employee.probation_end_date`, `probation_confirmed` |
| **Status history** | `EmployeeStatusHistory` — tracks every state transition |

##### Employee Status State Machine

```
onboarding → probation → active → on_notice → exited
                  │          │         │
                  │          ├── suspended → active
                  │          └── resigned → on_notice → exited
                  └── terminated
```

#### 2.5.2 Leave Operations

| Feature | Implementation |
|---------|----------------|
| Approve/reject leave | `POST /api/leaves/approve/[requestId]` + `POST /api/leaves/reject/[requestId]` |
| Override leave balance | `POST /api/hr/adjust-balance` |
| Manual adjustment entry | Audit-logged balance adjustment with reason |
| Cancel approved leave | Status → `cancelled` with `cancel_reason` |
| Approve comp-off | `CMP` leave type approval |
| **Multi-level monitoring** | `ApprovalHierarchy` 4-level chain visible in dashboard |
| **Escalation** | Auto-escalate after SLA breach (configurable `sla_hours` per company) |
| **Bulk approval** | Batch operations via HR dashboard |
| **Conflict detection** | `RULE004` — max concurrent leave per department |

#### 2.5.3 Leave Ledger Management

The system uses **ledger-based leave tracking**, NOT a simple balance column.

```
┌──────────────────────────────────────────────────────────────────┐
│                    LEAVE LEDGER (Per Employee Per Year)           │
├──────────────────────────────────────────────────────────────────┤
│  Leave Type │ Annual │ Carried │ Used │ Pending │ Encashed │ Net │
│  CL         │ 12.00  │  2.00   │ 5.00 │  1.00   │  0.00    │ 8.0│
│  SL         │ 12.00  │  0.00   │ 3.00 │  0.00   │  0.00    │ 9.0│
│  PL         │ 15.00  │  5.00   │ 8.00 │  2.00   │  3.00    │ 7.0│
│  ML         │ 182.00 │  0.00   │ 0.00 │  0.00   │  0.00    │182 │
└──────────────────────────────────────────────────────────────────┘
Formula: remaining = annual_entitlement + carried_forward 
                   - used_days - pending_days - encashed_days
```

**What HR sees:**
- Full leave ledger per employee
- Accrual entries (cron-generated)
- Deduction entries (on approval)
- Manual edits (with audit trail)
- Carry forward entries (year-end)
- Leave trend per employee
- Balance projection
- **"Why is this balance?" breakdown** — every entry is traceable via `AuditLog`
- **Negative leave alert** — flagged when `negative_balance` is disabled but approaching zero
- **Leave abuse pattern detection** — via AI insights component

#### 2.5.4 HR Dashboard Intelligence

| Widget | Component | Data Source |
|--------|-----------|-------------|
| Team availability heatmap | `hr-smart-dashboard.tsx` | Attendance + Leave data |
| Monthly leave stats | `reports/route.ts` | Aggregated leave requests |
| Most absent employees | Reports API | Sorted by `used_days` |
| Upcoming long leave alerts | Dashboard | Future approved leaves > 5 days |
| Burnout indicator | `employee-wellness.tsx` | Flags if no leave in 90+ days |
| Attendance monitor | `AttendanceMonitor.tsx` | Real-time check-in status |
| Predictive analytics | `predictive-analytics.tsx` | ML-based leave prediction |

---

### 2.6 MANAGER Role (Team Operations)

**Portal:** `/manager/*`
**What They See:** Team-scoped operations

| Feature | Page | Details |
|---------|------|---------|
| Team dashboard | `/manager/(main)/dashboard/` | Team overview metrics |
| Approve team leaves | `/manager/(main)/approvals/` | Only direct reports + org unit members |
| Team attendance | `/manager/(main)/attendance/` | Real-time team check-in status |
| Team reports | `/manager/(main)/reports/` | Team leave/attendance analytics |
| Team management | `/manager/(main)/team/` | View team members, hierarchy |

**Access scope:** Determined by `isManagerOf()` — walks manager chain up to 4 levels. Also checks `isOrgUnitHead()` for org unit hierarchy.

---

### 2.7 EMPLOYEE Role (Self-Service Layer)

**Portal:** `/employee/*`
**What They See:** Personal dashboard + self-service tools

#### 2.7.1 Smart Leave Apply

| Feature | Implementation |
|---------|----------------|
| Choose leave type | Dynamic from company's `LeaveType` catalog |
| Real-time balance | `GET /api/leaves/balances` |
| Future balance prediction | `predictLeaveDuration()` in zero-decision engine |
| Upload attachment | Document upload for medical/other proof |
| Half-day / hourly leave | `is_half_day` flag on `LeaveRequest` |
| Overlapping warning | Constraint Engine `RULE009` — min gap check |
| Leave extension request | Modify existing approved leave |
| Leave withdrawal | Cancel pending request |
| **Auto-fill manager** | `getLeaveRequestDefaults()` — picks from approval hierarchy |
| **Policy summary** | Constraint rules displayed before submit |
| **Rule impact preview** | Server-side constraint validation with detailed feedback |

#### 2.7.2 Personal Dashboard

| Widget | Component |
|--------|-----------|
| Current leave balance | `employee-smart-dashboard.tsx` |
| Leave ledger history | `history/` page |
| Upcoming holidays | `PublicHoliday` API |
| Team leave calendar | `smart-leave-calendar.tsx` |
| Pending approvals | Leave requests in `pending` status |
| Leave trend graph | Recharts visualization |
| Wellness indicator | `employee-wellness.tsx` |

#### 2.7.3 Transparency & Audit

| Feature | Source |
|---------|--------|
| Who approved | `LeaveRequest.approved_by` |
| Approval timeline | `AuditLog` entries for request |
| Comments | `LeaveRequest.approver_comments` |
| Policy source | `ConstraintPolicy` linked to company |
| Accrual dates | `LeaveBalance` creation timestamps |

#### 2.7.4 Advanced Self-Service

| Feature | Page/Component |
|---------|----------------|
| Comp-off request | `CMP` leave type apply |
| Attendance regularization | `AttendanceRegularization` model |
| Work-from-home tracking | `Attendance.is_wfh` flag |
| Download leave summary PDF | Reports export |
| Calendar export | Holiday calendar integration |
| Personal documents | `/employee/(main)/documents/` |
| Profile management | `/employee/(main)/profile/` |

---

## 3. Engine Configuration & How It Works

### 3.1 The Config-Driven Philosophy

The entire system operates on a **zero-code configuration** principle:

```
COMPANY ADMIN SELECTS          →    SYSTEM AUTO-GENERATES
─────────────────────                ─────────────────────
Leave types (CL, SL, PL...)   →    Employee balances seeded
Quotas (12, 12, 15 days...)   →    Balance cards on dashboard
Constraint rules (13+ rules)  →    Validation on every leave request
Approval hierarchy             →    Workflow routing
Work schedule (9-6, Mon-Fri)  →    Attendance tracking config
Holiday calendar               →    Auto-exclude from working days
Email templates                →    Notification dispatch
Billing plan                   →    Feature gates
```

### 3.2 Onboarding Flow — The Genesis Event

```
┌─────────────────────────────────────────────────────────────────┐
│                   COMPANY ONBOARDING FLOW                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  Step 1: Company Registration                                    │
│  ├── Admin signs up via Supabase Auth                           │
│  ├── Company record created                                      │
│  └── Admin → Employee record (role: admin)                      │
│                                                                  │
│  Step 2: Company Settings (company-settings.tsx)                 │
│  ├── Company name, industry, size                               │
│  ├── Work schedule (start/end time, work days, timezone)        │
│  ├── Grace period, half-day hours                               │
│  ├── Leave year start date                                      │
│  ├── Probation period days                                      │
│  ├── Notice period days                                         │
│  └── SLA hours for approvals                                    │
│                                                                  │
│  Step 3: Leave Type Selection (leave-types-config.ts)           │
│  ├── Pick from 16+ predefined types (4 categories)             │
│  ├── Customize quotas per type                                  │
│  ├── Set carry-forward rules                                    │
│  ├── Enable/disable encashment                                  │
│  └── Gender-specific types auto-filtered                        │
│                                                                  │
│  Step 4: Constraint Rules (constraint-rules-selection.tsx)       │
│  ├── 13+ rules auto-generated from leave types                 │
│  ├── Toggle blocking vs warning                                 │
│  ├── Set priorities                                             │
│  └── Configure: sandwich, blackout, coverage, gap rules         │
│                                                                  │
│  Step 5: Holiday Settings (holiday-settings-onboarding.tsx)     │
│  ├── Auto-fetch country holidays (Calendarific API)             │
│  ├── Add custom company holidays                                │
│  └── Block specific dates                                       │
│                                                                  │
│  Step 6: Notification Settings                                   │
│  ├── Check-in/out reminder timings                              │
│  ├── Email notification toggles                                 │
│  └── HR alert preferences                                       │
│                                                                  │
│  Step 7: Complete → System Seeds                                 │
│  ├── ConstraintPolicy created with compiled rules               │
│  ├── RBAC permissions seeded for company                        │
│  ├── Default notification templates created                     │
│  ├── Company marked onboarding_completed = true                 │
│  └── Admin redirected to HR Dashboard                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 Constraint Policy Engine — The Brain

The constraint engine evaluates **every leave request** against the company's active rules.

#### Rule Catalog (13+ Rules)

| Rule ID | Name | Category | Blocking | Description |
|---------|------|----------|----------|-------------|
| RULE001 | Max Leave Duration | validation | Yes | Max consecutive days per leave type |
| RULE002 | Leave Balance Check | validation | Yes | Cannot exceed available balance |
| RULE003 | Min Team Coverage | business | Yes | ≥60% team must remain present |
| RULE004 | Max Concurrent Leave | business | Yes | Max 2 from same department |
| RULE005 | Blackout Period | business | Yes | Company-wide blocked dates (except emergency) |
| RULE006 | Advance Notice | validation | Warning | Min notice days per leave type |
| RULE007 | Consecutive Leave Limit | validation | Warning | Max consecutive days per type |
| RULE008 | Sandwich Rule | business | Yes | Weekends/holidays between leaves count as leave |
| RULE009 | Min Gap Between Leaves | business | Warning | 7-day minimum gap |
| RULE010 | Probation Restriction | compliance | Yes | 6-month probation check |
| RULE011 | Critical Project Freeze | business | Yes | No leave during critical periods |
| RULE012 | Document Requirement | compliance | Warning | Proof required >3 days or specific types |
| RULE013 | Monthly Quota | validation | Yes | Monthly leave quota limits |

#### Evaluation Flow

```
Leave Request Submitted
        │
        ▼
┌───────────────────────┐
│  Fetch Company Policy │
│  (ConstraintPolicy)   │
└───────────┬───────────┘
            │
            ▼
┌───────────────────────┐     ┌──────────────────────────┐
│  TypeScript Pre-Check │     │  Python Constraint Engine │
│  (API Route)          │────▶│  (Flask @ port 8001)     │
│  • Balance check      │     │  • Full 13-rule eval     │
│  • Basic validation   │     │  • Company-specific cfg  │
└───────────────────────┘     │  • PostgreSQL direct     │
                              └──────────┬───────────────┘
                                         │
                              ┌──────────▼───────────────┐
                              │  Result: Pass / Fail      │
                              │  • violations[]           │
                              │  • warnings[]             │
                              │  • rule_results{}         │
                              │  • confidence_score       │
                              └──────────┬───────────────┘
                                         │
                     ┌───────────────────┼───────────────────┐
                     │                   │                   │
              All Pass            Warnings Only          Blocking Fail
                     │                   │                   │
              Auto-approve or     AI recommends         Request rejected
              route to approver   with caveats          with reasons
```

### 3.4 Leave Type Catalog

| Code | Name | Default Quota | Carry Forward | Paid | Gender | Category |
|------|------|---------------|---------------|------|--------|----------|
| CL | Casual Leave | 12 | No | Yes | All | Common |
| SL | Sick Leave | 12 | No | Yes | All | Common |
| PL | Privilege Leave | 15 | Yes (max 15) | Yes | All | Common |
| EL | Earned Leave | 15 | Yes (max 30) | Yes | All | Common |
| AL | Annual Leave | 20 | Yes (max 10) | Yes | All | Common |
| ML | Maternity Leave | 182 | No | Yes | F only | Statutory |
| PTL | Paternity Leave | 15 | No | Yes | M only | Statutory |
| BL | Bereavement Leave | 5 | No | Yes | All | Statutory |
| MRL | Marriage Leave | 5 | No | Yes | All | Special |
| STL | Study Leave | 5 | No | Unpaid | All | Special |
| CMP | Comp Off | 0 | No | Yes | All | Special |
| WFH | Work From Home | 52 | No | Yes | All | Special |
| OD | On Duty | 30 | No | Yes | All | Special |
| VOL | Volunteer Leave | 3 | No | Yes | All | Special |
| LWP | Leave Without Pay | ∞ | No | No | All | Unpaid |
| SAB | Sabbatical | 180 | No | Unpaid | All | Unpaid |

---

## 4. Backend Flow — How Everything Connects

### 4.1 Request Lifecycle (Developer POV)

```
HTTP Request
    │
    ▼
┌─────────────────────────────────────────────────────┐
│  MIDDLEWARE (middleware.ts)                           │
│  1. Security headers (CSP, HSTS, X-Frame DENY)     │
│  2. Supabase session refresh                        │
│  3. Rate limiting (IP-based, per-route config)      │
│  4. Public route bypass                             │
│  5. Auth check → 401 for API / redirect for pages   │
│  6. Sensitive route logging                         │
└────────────────────┬────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────┐
│  API ROUTE HANDLER (app/api/*/route.ts)             │
│  1. Per-endpoint rate limit (checkApiRateLimit)     │
│  2. Auth guard (getAuthEmployee)                    │
│  3. Role check (requireRole/requirePermissionGuard) │
│  4. Company access check (requireCompanyAccess)     │
│  5. Input validation (Zod schemas via integrity/)   │
│  6. Input sanitization (XSS/SQL injection strip)    │
│  7. Business logic execution                        │
│  8. Audit log creation (SHA-256 chain)              │
│  9. Real-time event push (Pusher)                   │
│  10. Email notification dispatch                    │
│  11. Response with security headers                 │
└─────────────────────────────────────────────────────┘
```

### 4.2 Authentication Flow

```
┌────────────┐     ┌──────────────┐     ┌───────────────┐
│  User      │────▶│  Supabase    │────▶│  Middleware    │
│  Sign In   │     │  Auth        │     │  Session Mgmt  │
└────────────┘     └──────┬───────┘     └───────┬───────┘
                          │                     │
                          ▼                     ▼
                   ┌──────────────┐     ┌───────────────┐
                   │  JWT Token   │     │  getAuthEmp() │
                   │  + Refresh   │     │  Supabase →   │
                   │  in Cookies  │     │  Prisma lookup │
                   └──────────────┘     └───────┬───────┘
                                                │
                                                ▼
                                        ┌───────────────┐
                                        │  Employee     │
                                        │  + Role       │
                                        │  + Company    │
                                        │  + Permissions│
                                        └───────────────┘
```

### 4.3 Leave Submit → Approval Flow

```
┌──────────────┐
│ Employee     │     POST /api/leaves/submit
│ fills form   │─────────────────────────────────┐
└──────────────┘                                  │
                                                  ▼
                                    ┌─────────────────────────┐
                                    │ 1. Rate limit (5/min)   │
                                    │ 2. Auth + approved chk  │
                                    │ 3. Validate input       │
                                    │ 4. Fetch company policy │
                                    │ 5. Balance check        │
                                    │ 6. Constraint eval      │
                                    │    (Python engine)      │
                                    │ 7. AI recommendation    │
                                    └──────────┬──────────────┘
                                               │
                              ┌────────────────┼────────────────┐
                              │                │                │
                     Constraints Pass   Warnings Only    Constraints Fail
                              │                │                │
                              ▼                ▼                ▼
                    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
                    │ Create      │  │ Create       │  │ Return 400   │
                    │ LeaveRequest│  │ LeaveRequest │  │ with reasons │
                    │ status:     │  │ status:      │  │ + violations │
                    │ pending     │  │ escalated    │  └──────────────┘
                    └──────┬──────┘  └──────┬──────┘
                           │                │
                           ▼                ▼
                    ┌──────────────────────────────┐
                    │ Update LeaveBalance           │
                    │ pending_days += total_days    │
                    │ Create AuditLog               │
                    │ Send email to approver        │
                    │ Push real-time notification    │
                    └──────────────┬───────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │ Manager/HR sees in portal     │
                    │ POST /api/leaves/approve/[id] │
                    │ or /api/leaves/reject/[id]    │
                    └──────────────┬───────────────┘
                                   │
                              ┌────┴────┐
                              │         │
                         Approve    Reject
                              │         │
                              ▼         ▼
                    ┌────────────┐ ┌────────────┐
                    │ used_days  │ │ pending    │
                    │ += total   │ │ -= total   │
                    │ pending    │ │ status:    │
                    │ -= total   │ │ rejected   │
                    │ status:    │ │ Email sent │
                    │ approved   │ └────────────┘
                    │ Email sent │
                    └────────────┘
```

### 4.4 Payroll Calculation Flow (India-Compliant)

```
┌─────────────────────────────────────────────────────────────────┐
│                    PAYROLL RUN PIPELINE                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. HR generates PayrollRun (status: draft)                     │
│     │                                                            │
│  2. For each active employee:                                    │
│     ├── Fetch SalaryStructure (CTC, Basic, HRA, DA, SA)        │
│     ├── Fetch Attendance (present/absent/leave/late days)       │
│     ├── Calculate:                                               │
│     │   ├── PF: 12% employee + 12% employer (ceil ₹15,000)     │
│     │   │   └── Split: 8.33% EPS (max ₹1,250) + remainder PF  │
│     │   ├── ESI: 0.75% ee + 3.25% er (if gross ≤ ₹21,000)     │
│     │   ├── Professional Tax: State-wise slabs                  │
│     │   │   └── Maharashtra/Karnataka/Telangana/TN/WB/GJ/AP    │
│     │   ├── TDS: Old + New regime income tax                    │
│     │   └── LOP: (basic/working_days) × absent_days            │
│     └── Create PayrollSlip                                       │
│                                                                  │
│  3. PayrollRun status: draft → generated → under_review         │
│     → approved → processed → paid                               │
│                                                                  │
│  4. Aggregate totals (gross, deductions, net, PF, ESI, TDS)    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.5 Cron Jobs (Background Schedulers)

| Cron | Schedule | Purpose |
|------|----------|---------|
| `check-in-reminder` | Mon-Fri 9:10, 9:30, 10:10, 10:30 | Remind employees to check in |
| `check-out-reminder` | Daily at configured times | Remind employees to check out |
| `sla-check` | Hourly | Detect SLA breaches, auto-escalate to next approver |
| `hr-attendance-alert` | Daily | Alert HR about missing check-ins |
| `hr-notification` | Periodic | Dispatch batched HR notifications |
| `db-backup` | Daily 2 AM UTC | Application-level database backup |
| `trial-expiration` | Daily 9 AM | Handle trial expirations, send reminders |

---

## 5. Database Schema & Data Ownership

### 5.1 Entity Relationship Map (32 Models)

```
Company (tenant root)
├── Employee[] ──────────── LeaveRequest[]
│   ├── LeaveBalance[]      LeaveEncashment[]
│   ├── Attendance[]        AttendanceRegularization[]
│   ├── Document[]          Payroll[]
│   ├── EmployeeShift[]     PayrollSlip[]
│   ├── SalaryStructure     SalaryRevision[]
│   ├── Reimbursement[]     Notification[]
│   ├── ApprovalHierarchy   EmployeeStatusHistory[]
│   ├── EmployeeMovement[]  ExitChecklist
│   └── AuditLog[] (actor)
│
├── ConstraintPolicy[]
├── LeaveType[]
├── LeaveRule[]
├── Shift[]
├── SalaryComponent[]
├── NotificationTemplate[]
├── PayrollRun[]
├── CompanySettings
├── Subscription[]
├── UsageRecord[]
├── ApiKey[]
├── Payment[]
└── AuditLog[] (target_org)

OrganizationUnit (tree) ── Employee[]
JobLevel ─────────────── Employee[]
PublicHoliday (global)
Waitlist (pre-registration)
PricingPlan (platform)
Testimonial (marketing)
SystemIncident (monitoring)
UptimeRecord (monitoring)
PlatformStats (analytics)
OtpToken (security)
SettingsAuditLog (security)
NotificationPreference (per-employee)
```

### 5.2 Data Ownership Rules

| Rule | Enforcement |
|------|-------------|
| **Tenant Isolation** | Every query scoped by `company_id` / `org_id`. Middleware + auth guard enforce company match. |
| **Employee owns their data** | Profile, leave requests, attendance, documents — accessible via `emp_id` |
| **Company owns policies** | LeaveType, LeaveRule, ConstraintPolicy, CompanySettings — all company-scoped |
| **Audit logs are immutable** | No UPDATE/DELETE on `AuditLog`. SHA-256 chain integrity. |
| **Soft delete everywhere** | `deleted_at` field on: Employee, Company, LeaveType, LeaveRule, Shift, OrganizationUnit |
| **HR cannot access other companies** | `requireCompanyAccess()` validates `employee.org_id === targetCompany.id` |
| **Manager scope = direct reports only** | `isManagerOf()` walks chain max 4 levels. `getTeamMembers()` for org unit |
| **Employee sees only self** | `getAccessScope()` returns `"self"` for employee role |
| **Balance belongs to employee+year** | Unique constraint: `[emp_id, leave_type, year]` |
| **One active salary structure** | `SalaryStructure.emp_id` is unique |

---

## 6. State Machine Rules

### 6.1 Leave Request State Machine

```
                    ┌──────────┐
                    │  draft   │ (saved but not submitted)
                    └────┬─────┘
                         │ submit
                         ▼
                    ┌──────────┐
          ┌────────│ pending  │────────┐
          │        └────┬─────┘        │
          │ reject      │ approve      │ escalate
          ▼             ▼              ▼
    ┌──────────┐  ┌──────────┐  ┌──────────┐
    │ rejected │  │ approved │  │ escalated│
    └──────────┘  └────┬─────┘  └────┬─────┘
                       │              │ approve/reject
                       │ cancel       ├──────────────┐
                       ▼              ▼              ▼
                  ┌──────────┐  ┌──────────┐  ┌──────────┐
                  │cancelled │  │ approved │  │ rejected │
                  └──────────┘  └──────────┘  └──────────┘
```

**Invariants:**
- `pending` → `approved` | `rejected` | `escalated` | `cancelled`
- `escalated` → `approved` | `rejected`
- `approved` → `cancelled` (by HR/Admin only, with reason)
- `rejected` → TERMINAL (no comeback)
- `cancelled` → TERMINAL
- `draft` → `pending` (on submit)
- Balance adjustments: `pending_days` incremented on submit, decremented on approve/reject/cancel

### 6.2 Employee Status State Machine

```
  onboarding ──▶ probation ──▶ active ──▶ on_notice ──▶ exited
                     │           │  │         ▲
                     │           │  └─── resigned
                     │           │
                     │           └──▶ suspended ──▶ active
                     │
                     └──▶ terminated (TERMINAL)
```

**Invariants:**
- `terminated` and `exited` are TERMINAL states
- `suspended` can only return to `active`
- Every transition logged in `EmployeeStatusHistory`
- `probation_end_date` triggers auto-switch to `active` when `probation_confirmed = true`

### 6.3 Payroll Run State Machine

```
  draft → generated → under_review → approved → processed → paid
                                         │
                                         └──▶ rejected → draft (re-generate)
```

### 6.4 Onboarding State Machine

```
  not_started → in_progress → pending_approval → approved → completed
                                    │
                                    └──▶ rejected (back to not_started)
```

### 6.5 Document Verification State Machine

```
  pending → verified
  pending → rejected
  verified → expired (date-based)
```

---

## 7. Hard Decisions

These are architectural decisions that are **final** and should NEVER be reversed:

| # | Decision | Rationale |
|---|----------|-----------|
| **HD-1** | **Ledger-based leave tracking** over simple balance column | Financial-grade accuracy. Every credit/debit is traceable. No "magic" balance changes. |
| **HD-2** | **Config-driven, zero-code policies** | Admins configure once → system works forever. No developer needed for new company setup. |
| **HD-3** | **Immutable audit logs with SHA-256 hash chain** | Enterprise compliance requirement. Tampering is cryptographically detectable. |
| **HD-4** | **Server-side constraint validation ONLY** | Client-side can be bypassed. API route is the single source of truth. Frontend shows previews. |
| **HD-5** | **Multi-tenant in single database** | Row-level isolation via `company_id`/`org_id` scoping. Simpler operations than DB-per-tenant. |
| **HD-6** | **Supabase Auth (not custom JWT)** | Production-grade auth, session management, token rotation. Don't build auth from scratch. |
| **HD-7** | **Python for constraint engine, TypeScript for everything else** | Python excels at rule evaluation/ML. TypeScript for full-stack web. Clean service boundary. |
| **HD-8** | **Razorpay for India, Stripe for international** | PCI compliance delegated. UPI/netbanking support for Indian market. Stripe for global. |
| **HD-9** | **RBAC with company-specific overrides** | Default permissions per role + company can customize. Balances security with flexibility. |
| **HD-10** | **OTP for destructive operations** | Delete employee, change billing, modify leave types — all require OTP verification. Defense-in-depth. |
| **HD-11** | **Soft delete everywhere** | Never hard delete. `deleted_at` timestamp. Recoverable data. Audit trail preserved. |
| **HD-12** | **Approval hierarchy max 4 levels** | Beyond 4 levels creates bottlenecks. HR partner as escape valve. SLA-based auto-escalation. |

---

## 8. What Is Forbidden

**These must NEVER exist in the codebase:**

| # | Forbidden Action | Why |
|---|-----------------|-----|
| **F-1** | Direct balance column UPDATE without ledger entry | Destroys audit trail. Use adjustment entries only. |
| **F-2** | Hard DELETE on audit logs | Legal compliance violation. Audit logs are WORM (Write Once Read Many). |
| **F-3** | Client-side leave approval logic | Security disaster. All approval logic is server-side via API routes. |
| **F-4** | Secrets in source code | Use environment variables exclusively. `lib/otp-service.ts` hashes OTPs. |
| **F-5** | Cross-company data access | Every query MUST be scoped to `company_id`. No global queries without explicit admin check. |
| **F-6** | Plaintext password/OTP storage | All OTPs SHA-256 hashed. Passwords via Supabase (bcrypt). |
| **F-7** | Trust client-provided role/permissions | Role determined server-side from database, never from JWT claims or request body. |
| **F-8** | Skip rate limiting on any mutating endpoint | DoS protection is mandatory. Even internal endpoints use rate limits. |
| **F-9** | Modify approved leave without audit trail | Every state change MUST create AuditLog entry with actor, reason, timestamp. |
| **F-10** | Deploy without security headers | CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options are non-negotiable. |
| **F-11** | Allow negative leave balance when company disables it | `Company.negative_balance = false` → HARD reject if balance would go negative. |
| **F-12** | Skip constraint evaluation on leave submit | Even if constraint engine is down, fail CLOSED (reject), never fail OPEN. |
| **F-13** | Allow employee to approve their own leave | Self-approval check is mandatory in approval flow. |
| **F-14** | Expose internal error details in production | API errors return user-friendly messages. Stack traces only in dev. |

---

## 9. Spec Invariants

**Conditions that must ALWAYS be true, verified by tests:**

### 9.1 Data Integrity Invariants

```
INV-01: For any employee E and year Y:
  E.leave_balance[type].used_days 
    == SUM(approved_requests.total_days WHERE emp_id=E AND year=Y AND leave_type=type)

INV-02: For any LeaveRequest R:
  R.status IN {draft, pending, approved, rejected, cancelled, escalated}
  AND transitions follow state machine (§6.1)

INV-03: For any AuditLog A[n] where n > 0:
  A[n].prev_hash == A[n-1].integrity_hash
  (Hash chain integrity)

INV-04: For any Company C:
  ALL queries accessing C.employees MUST include WHERE org_id = C.id
  (Tenant isolation)

INV-05: For any LeaveBalance B:
  B.remaining = B.annual_entitlement + B.carried_forward 
              - B.used_days - B.pending_days - B.encashed_days
  AND B.remaining >= 0 (when Company.negative_balance = false)
```

### 9.2 Security Invariants

```
INV-06: Every API route that mutates data MUST create an AuditLog entry

INV-07: Every API route (except public) MUST call getAuthEmployee()

INV-08: Rate limit MUST be checked before any business logic

INV-09: OTP_REQUIRED_ACTIONS always require verified OTP within 5-minute window

INV-10: No response from any endpoint may contain: stack traces (prod), 
        raw SQL errors, environment variable values, or internal IP addresses
```

### 9.3 Business Logic Invariants

```
INV-11: Leave request submission MUST evaluate ALL active constraint rules
        Result: pass (submit) | warn (escalate) | fail (reject)

INV-12: Approval chain: direct_manager → org_unit_heads → HR
        Manager cannot approve without being in approval hierarchy

INV-13: SLA breach auto-escalation MUST trigger within 1 hour of breach

INV-14: Payroll calculations MUST match India statutory formulas:
        PF ceiling: ₹15,000 | ESI ceiling: ₹21,000 | PT: state-specific slabs

INV-15: Employee balance auto-seeding MUST happen on first balance query
        if company has configured leave types
```

---

## 10. Infrastructure Contract

### 10.1 Production Stack

| Layer | Technology | Why This | Alternatives Forbidden |
|-------|-----------|----------|----------------------|
| **Auth** | Supabase Auth | JWT + session + RLS, battle-tested | Custom JWT auth |
| **Database** | PostgreSQL (Supabase) | ACID, JSONB, RLS, PITR backups | MongoDB, MySQL |
| **Frontend** | Next.js 16 (App Router) | RSC, streaming, API routes | CRA, Vite SPA |
| **Styling** | Tailwind CSS 4 | Utility-first, tree-shakeable | CSS modules |
| **State** | React Server Components | No client state for data fetching | Redux, Zustand |
| **Real-time** | Pusher | WebSocket without infrastructure | Socket.io (self-hosted) |
| **Email** | Gmail OAuth2 + nodemailer | Reliable, audit trail, OAuth2 | SendGrid (cost) |
| **Payments (India)** | Razorpay | UPI, netbanking, PCI compliant | Custom payment |
| **Payments (Global)** | Stripe | International cards, subscriptions | Custom payment |
| **Constraint Engine** | Python Flask | Rule evaluation, ML-ready | Node.js (wrong tool) |
| **Monitoring** | Prometheus + Grafana | Open-source, extensible | DataDog (cost) |
| **Deployment** | Vercel (web) + Railway (Python) | Zero-config, auto-scaling | Self-hosted K8s |
| **Container** | Docker Compose | Local dev orchestration | — |

### 10.2 Required Environment Variables

```bash
# ━━━━━━ AUTH ━━━━━━
NEXT_PUBLIC_SUPABASE_URL=         # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role (server-only)

# ━━━━━━ DATABASE ━━━━━━
DATABASE_URL=                     # PostgreSQL connection (pooled)
DIRECT_URL=                       # PostgreSQL direct connection

# ━━━━━━ EMAIL ━━━━━━
GMAIL_CLIENT_ID=                  # Google OAuth2 client ID
GMAIL_CLIENT_SECRET=              # Google OAuth2 client secret
GMAIL_REFRESH_TOKEN=              # Gmail refresh token
GMAIL_USER=                       # Sender email address

# ━━━━━━ REAL-TIME ━━━━━━
PUSHER_APP_ID=
PUSHER_KEY=
NEXT_PUBLIC_PUSHER_KEY=
PUSHER_SECRET=
PUSHER_CLUSTER=

# ━━━━━━ PAYMENTS ━━━━━━
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# ━━━━━━ SECURITY ━━━━━━
CRON_SECRET=                      # Protects cron API endpoints
CSRF_SECRET=                      # CSRF token generation

# ━━━━━━ SERVICES ━━━━━━
CONSTRAINT_ENGINE_URL=            # Python engine (default: http://localhost:8001)
NEXT_PUBLIC_APP_URL=              # Public app URL
```

### 10.3 SLA Guarantees (By Plan)

| Metric | Free | Starter (₹2,499/mo) | Growth (₹5,999/mo) | Enterprise (₹14,999/mo) |
|--------|------|---------------------|--------------------|-----------------------|
| Uptime | 95% | 99% | 99.9% | 99.99% |
| Support | Community | Email (48h) | Priority (24h) | 24/7 Dedicated |
| Employees | 10 | 50 | 200 | Unlimited |
| HR Admins | 1 | 3 | 10 | Unlimited |
| API Rate | 30/min | 100/min | 500/min | Custom |
| Data Retention | 1 year | 3 years | 7 years | Custom |
| Backups | Daily | Daily + PITR | Real-time | Multi-AZ |

---

## 11. Security Architecture

### 11.1 Security Layers (Defense in Depth)

```
┌────────────────────────────────────────────────────────────┐
│  Layer 1: NETWORK                                          │
│  ├── HTTPS everywhere (TLS 1.2+)                          │
│  ├── Security headers (CSP, HSTS, X-Frame DENY)           │
│  ├── Rate limiting (per-IP, per-endpoint, per-user)        │
│  └── IP blocking (auto after 10 suspicious requests)       │
├────────────────────────────────────────────────────────────┤
│  Layer 2: AUTHENTICATION                                   │
│  ├── Supabase Auth (bcrypt password hashing)              │
│  ├── JWT + Refresh token rotation                          │
│  ├── Session management in middleware                      │
│  └── Account lockout (via rate limiting)                  │
├────────────────────────────────────────────────────────────┤
│  Layer 3: AUTHORIZATION                                    │
│  ├── RBAC engine (40+ permissions, 6 roles)               │
│  ├── Company-specific permission overrides                 │
│  ├── Manager hierarchy verification (4-level walk)        │
│  ├── Org unit head verification (recursive)               │
│  └── Access scope: self | team | company                   │
├────────────────────────────────────────────────────────────┤
│  Layer 4: INPUT VALIDATION                                 │
│  ├── Zod schema validation (typed, strict)                │
│  ├── HTML/XSS sanitization                                │
│  ├── SQL injection prevention (Prisma parameterized)      │
│  ├── File upload validation                               │
│  └── Email/Phone/ID format enforcement                    │
├────────────────────────────────────────────────────────────┤
│  Layer 5: DATA PROTECTION                                  │
│  ├── OTP for destructive operations (SHA-256, 10min exp)  │
│  ├── CSRF protection (HMAC token, 24h expiry)             │
│  ├── Tenant isolation (company_id scoping)                │
│  ├── Soft delete (never hard delete)                      │
│  └── GDPR compliance (consent, export, erasure)           │
├────────────────────────────────────────────────────────────┤
│  Layer 6: AUDIT & MONITORING                               │
│  ├── Immutable audit logs (SHA-256 hash chain)            │
│  ├── Security event logging (suspicious activity alerts)  │
│  ├── Sensitive route access logging                       │
│  ├── Real-time security alerts to HR/Admin                │
│  └── Settings change audit with OTP verification          │
└────────────────────────────────────────────────────────────┘
```

### 11.2 OTP-Protected Operations

These 8 actions ALWAYS require 6-digit OTP verification (SHA-256 hashed, 10-min expiry, max 3 attempts):

1. `settings_change` — Company settings modification
2. `delete_employee` — Employee termination/removal
3. `export_data` — GDPR data export
4. `billing_change` — Subscription/payment changes
5. `leave_type_create` — New leave type creation
6. `leave_type_delete` — Leave type deletion
7. `rule_change` — Constraint rule modification
8. `work_schedule_change` — Work schedule modification

---

## 12. Page-by-Page Feature Map

### 12.1 HR Portal Pages (`/hr/(main)/`)

| Page | Route | Key Features | Components/Buttons |
|------|-------|-------------|-------------------|
| **Dashboard** | `/hr/dashboard` | Overview metrics, team availability heatmap, pending actions, AI insights | Quick action cards, approval queue, attendance monitor, analytics charts |
| **Employees** | `/hr/employees` | Employee directory, search/filter, status badges | Add Employee, Import CSV, View Profile, Change Status, Bulk Actions |
| **Employee Detail** | `/hr/employee/[id]` | Full profile, leave ledger, attendance history, documents | Edit Profile, Change Manager, Change Dept, Adjust Balance, Terminate |
| **Employee Registrations** | `/hr/employee-registrations` | Pending approval queue | Approve, Reject (with reason), View Details |
| **Leave Requests** | `/hr/leave-requests` | All leave requests, filter by status/type/dept | Approve, Reject, Escalate, Bulk Approve, Export |
| **Leave Records** | `/hr/leave-records` | Historical leave data, analytics | Filter, Search, Export PDF/CSV |
| **Leave Encashment** | `/hr/leave-encashment` | Encashment requests, calculations | Approve, Calculate, Process Payment |
| **Approvals** | `/hr/approvals` | Pending approvals queue (SLA indicators) | Approve, Reject, Escalate, Comment |
| **Escalation** | `/hr/escalation` | Escalated requests (SLA breached) | Override Approve, Reassign, Emergency Approve |
| **Attendance** | `/hr/attendance` | Company-wide attendance, late/absent tracking | Mark Override, Send Reminder, Generate Report |
| **Policy Settings** | `/hr/policy-settings` | Constraint rules, leave types, quotas | Add Rule, Edit Rule, Toggle Active, Set Priority, OTP Required |
| **Holiday Settings** | `/hr/holiday-settings` | Calendar management, blocked dates | Add Holiday, Import Country Holidays, Block Dates |
| **Organization** | `/hr/organization` | Org tree, departments, teams | Add Unit, Edit Hierarchy, Set Head |
| **Job Levels** | `/hr/job-levels` | Job level configuration | Add Level, Set Rank, Configure Permissions |
| **Approval Hierarchies** | `/hr/approval-hierarchies` | Approval chain config per employee | Edit Chain, Set Levels, Assign HR Partner |
| **Employee Movements** | `/hr/employee-movements` | Transfers, promotions, role changes | Initiate Movement, Approve Transfer |
| **Payroll** | `/hr/payroll` | Payroll runs, slip generation | Generate Run, Approve, Process, Download Slips |
| **Salary Structures** | `/hr/salary-structures` | CTC breakdown, component config | Set Structure, Add Component, Revision History |
| **Reimbursements** | `/hr/reimbursements` | Expense claims, approval | Approve, Reject, Flag for Review |
| **Documents** | `/hr/documents` | Document management, verification | Verify, Reject, Request Re-upload |
| **Exits** | `/hr/exits` | Offboarding checklist, exit process | Start Exit, Update Checklist, Final Settlement |
| **Reports** | `/hr/reports` | Analytics, leave stats, attendance reports | Generate, Export, Schedule, Date Range Filter |
| **Compliance** | `/hr/compliance` | GDPR status, consent tracking | Export Data, Generate Report, View Consents |
| **Security** | `/hr/security` | Security settings, audit logs | View Logs, Reset Password, Manage API Keys |
| **Notification Settings** | `/hr/notification-settings` | Email/notification preferences | Toggle Channels, Set Timing, Test Send |
| **Notification Templates** | `/hr/notification-templates` | Email template editor | Edit Template, Preview, Reset Default |
| **Settings** | `/hr/settings` | General company settings | Edit (OTP required), Save, Reset |
| **Onboarding** | `/hr/onboarding` | Onboarding flow management | Guide Steps, Skip, Complete |
| **Welcome** | `/hr/welcome` | First-time welcome page | Tutorial, Skip Tutorial |

### 12.2 Employee Portal Pages (`/employee/(main)/`)

| Page | Route | Key Features | Components/Buttons |
|------|-------|-------------|-------------------|
| **Dashboard** | `/employee/dashboard` | Balance cards, upcoming holidays, team calendar, wellness | Quick Apply Leave, Check In/Out, View Calendar |
| **Request Leave** | `/employee/request-leave` | Smart leave form with constraint preview | Type Selector, Date Picker, Half-Day Toggle, Upload Doc, Submit |
| **Leave History** | `/employee/history` | Personal leave ledger | Filter by Type/Status, View Details, Cancel Pending |
| **Attendance** | `/employee/attendance` | Personal attendance calendar, check-in records | Check In, Check Out, Request Regularization, View Records |
| **Documents** | `/employee/documents` | Personal document management | Upload, View, Download |
| **Profile** | `/employee/profile` | Personal info, preferences | Edit Details, Change Password, Notification Preferences |
| **Welcome** | `/employee/welcome` | First-time tutorial | Start Tutorial, Skip |

### 12.3 Manager Portal Pages (`/manager/(main)/`)

| Page | Route | Key Features | Components/Buttons |
|------|-------|-------------|-------------------|
| **Dashboard** | `/manager/dashboard` | Team metrics, pending actions, availability | View Team, Quick Approve |
| **Approvals** | `/manager/approvals` | Team leave approval queue | Approve, Reject, Comment, Escalate |
| **Team Attendance** | `/manager/attendance` | Team check-in status | View Status, Send Reminder |
| **Team Management** | `/manager/team` | Direct reports, org unit view | View Profile, Reassign |
| **Reports** | `/manager/reports` | Team analytics | Generate, Export, Filter |

### 12.4 Onboarding Flow Pages

| Step | Component | Key Features |
|------|-----------|-------------|
| **Company Setup** | `company-settings.tsx` | Name, Industry, Work Schedule, Timezone |
| **Leave Types** | Linked to `leave-types-config.ts` | Category picker, Quota Editor, Toggle Carry-Forward |
| **Constraint Rules** | `constraint-rules-selection.tsx` | 13+ rules, Toggle Blocking/Warning, Priority |
| **Holiday Settings** | `holiday-settings-onboarding.tsx` | Country Auto-Fetch, Custom Holidays, Blocked Dates |
| **Notifications** | `notification-settings-onboarding.tsx` | Email Toggles, Reminder Timing |
| **Tutorial** | `tutorial-guide.tsx` | Interactive Platform Walkthrough |

### 12.5 Marketing & Auth Pages

| Page | Route | Key Features |
|------|-------|-------------|
| **Landing** | `/` | Premium marketing page, feature showcase, pricing, CTAs |
| **Sign In** | `/sign-in`, `/hr/sign-in`, `/employee/sign-in` | Supabase Auth, OAuth options |
| **Sign Up** | `/sign-up`, `/hr/sign-up`, `/employee/sign-up` | Registration with role selection |
| **Status** | `/status` | System health, uptime, incident history |

---

## 13. End-to-End Flows

### 13.1 New Company Onboarding (Day 0)

```
Admin visits continuum.hr
    │
    ▼ Sign Up (Supabase Auth)
    │
    ▼ Email verified
    │
    ▼ /onboarding → Company Setup Wizard (7 steps)
    │
    ├── Step 1: Company name, industry, size
    ├── Step 2: Work schedule (9-6, Mon-Fri, IST)
    ├── Step 3: Leave types (CL, SL, PL selected → quotas set)
    ├── Step 4: Constraint rules (auto-generated from types, admin toggles)
    ├── Step 5: Holiday calendar (India 2026 auto-fetched)
    ├── Step 6: Notification preferences
    └── Step 7: Complete
    │
    ▼ SYSTEM AUTO-EXECUTES:
    ├── Company record created (onboarding_completed = true)
    ├── Admin Employee record created (role: admin)
    ├── ConstraintPolicy created with compiled rules
    ├── RBAC permissions seeded for company
    ├── Default notification templates created
    ├── CompanySettings initialized
    └── Free tier subscription activated
    │
    ▼ Admin lands on /hr/dashboard (fully functional)
```

### 13.2 Employee Joins Company (Day 1)

```
Employee visits /employee/sign-up
    │
    ▼ Signs up via Supabase Auth
    │
    ▼ Enters company code → linked to company
    │
    ▼ Status: onboarding → pending_approval
    │
    ▼ HR receives notification → /hr/employee-registrations
    │
    ▼ HR approves → Email sent to employee
    │
    ▼ Employee logs in → /onboarding → tutorial
    │
    ▼ SYSTEM AUTO-EXECUTES:
    ├── LeaveBalance created for each company LeaveType
    ├── Annual entitlement calculated (pro-rata if mid-year)
    ├── ApprovalHierarchy set (manager, HR)
    ├── Notification preferences initialized
    └── Employee status: active (or probation if configured)
    │
    ▼ Employee lands on /employee/dashboard
    │
    ▼ Dashboard shows:
    ├── Balance cards (CL: 12, SL: 12, PL: 15...)
    ├── Team calendar
    ├── Upcoming holidays
    └── Quick actions (Apply Leave, Check In)
```

### 13.3 Leave Request (Full Cycle)

```
Employee → /employee/request-leave
    │
    ▼ Select: Casual Leave (CL)
    │  System shows: Balance 12, Policy summary
    │  Smart defaults: manager auto-filled, dates skip weekends
    │
    ▼ Fill: Dec 23-27, 2026 (5 days), Reason: "Family vacation"
    │  System previews: Sandwich rule check, balance impact
    │
    ▼ Submit → POST /api/leaves/submit
    │
    ▼ SERVER-SIDE:
    │  ├── Auth + rate limit ✓
    │  ├── Validate input (Zod) ✓
    │  ├── Fetch company constraint policy
    │  ├── Balance check: 12 ≥ 5 ✓
    │  ├── Constraint engine evaluation:
    │  │   ├── RULE001 (max duration): 5 ≤ 12 ✓
    │  │   ├── RULE002 (balance): sufficient ✓
    │  │   ├── RULE003 (team coverage): ≥60% ✓
    │  │   ├── RULE004 (concurrent): < 2 from dept ✓
    │  │   ├── RULE005 (blackout): Dec 23-27 not blocked ✓
    │  │   ├── RULE006 (advance notice): 30 days out ✓
    │  │   ├── RULE008 (sandwich): weekends between ⚠️ WARNING
    │  │   └── All others: PASS
    │  │
    │  ├── Result: PASS with warning (sandwich)
    │  ├── AI recommendation: APPROVE (confidence: 0.92)
    │  └── Create LeaveRequest (status: pending)
    │
    ▼ Balance updated: pending_days += 5
    │  AuditLog created (integrity hash chained)
    │  Email sent to manager (approval request)
    │  Pusher event → manager's real-time notification
    │
    ▼ Manager sees notification → /manager/approvals
    │  Reviews: employee, dates, type, AI recommendation, constraint results
    │
    ▼ Manager clicks "Approve" → POST /api/leaves/approve/[id]
    │
    ▼ SERVER-SIDE:
    │  ├── Auth + role check (manager) ✓
    │  ├── Same company check ✓
    │  ├── Status is "pending" ✓
    │  └── Updates: status=approved, approved_by, approved_at
    │
    ▼ Balance updated: used_days += 5, pending_days -= 5
    │  AuditLog created
    │  Email sent to employee (leave approved)
    │  Pusher event → employee notification
    │
    ▼ Employee dashboard updates in real-time
       CL Balance: 12 → 7 remaining
```

### 13.4 SLA Breach Auto-Escalation

```
Leave request pending for 48+ hours (company SLA)
    │
    ▼ Cron: /api/cron/sla-check (runs hourly)
    │
    ▼ Detects: request.sla_deadline < now() AND status = pending
    │
    ▼ Marks: sla_breached = true, escalation_count++
    │
    ▼ Finds next approver in hierarchy:
    │  level1_approver (skipped, was current) → level2_approver
    │
    ▼ Updates: current_approver = level2_approver, status = escalated
    │
    ▼ Email sent to level2 approver + HR partner
    │  AuditLog: LEAVE_SLA_BREACH
    │  Pusher: real-time alert to HR dashboard
```

### 13.5 Payroll Processing (Monthly)

```
HR → /hr/payroll → "Generate Payroll"
    │
    ▼ System creates PayrollRun (status: draft)
    │
    ▼ For each active employee:
    │  ├── Fetch SalaryStructure (CTC=₹12,00,000/yr)
    │  │   Basic: ₹50,000 | HRA: ₹20,000 | DA: ₹5,000 | SA: ₹25,000
    │  ├── Fetch Attendance (22 working, 20 present, 1 CL, 1 absent)
    │  ├── Calculate:
    │  │   ├── Gross: ₹1,00,000
    │  │   ├── PF Employee: ₹6,000 (12% of ₹50,000)
    │  │   ├── PF Employer: ₹6,000 (8.33% EPS + remainder PF)
    │  │   ├── ESI: ₹0 (gross > ₹21,000)
    │  │   ├── PT: ₹200 (Maharashtra slab)
    │  │   ├── TDS: ₹8,333 (new regime estimate)
    │  │   ├── LOP: ₹50,000/22 × 1 = ₹2,273 
    │  │   ├── Total Deductions: ₹16,806
    │  │   └── Net Pay: ₹83,194
    │  └── Create PayrollSlip
    │
    ▼ PayrollRun status: generated → HR reviews
    │
    ▼ HR approves → status: approved → processed → paid
    │
    ▼ Employee notified: "Payslip ready for December 2026"
```

---

## 14. Testing Strategy

### 14.1 Test Philosophy

> **Write tests first. Generate implementation. Red-team it. Refactor. Integration audit.**

### 14.2 Test Types

| Layer | Tool | Location | What It Tests |
|-------|------|----------|---------------|
| **Unit** | tsx --test | `web/tests/*.test.ts` | Validators, sanitizers, tax calculations, constraint rules |
| **Integration** | Node scripts | `web/scripts/*.js` | API endpoints, DB operations, auth flows |
| **E2E** | Playwright | `web/tests/e2e/` | Full user journeys, browser-based |
| **Load** | Custom | `web/scripts/multi-company-load-test.js` | Multi-tenant concurrency |
| **Security** | Custom | `web/tests/resilience-tests.ts` | Rate limiting, auth bypass attempts |
| **Constraint** | Python + TS | `web/backend/test_constraint_rules.py` | All 13+ constraint rules |

### 14.3 Test Files

```
tests/
├── auth-flow-scenarios.ts        # Auth redirects, role routing
├── calendarific.test.ts          # Holiday API integration
├── comprehensive-auto-test.js    # Full system automated test
├── deep-validation.test.ts       # Input validation edge cases
├── enterprise-validation.test.js # Enterprise feature validation
├── onboarding-routing.test.ts    # Onboarding flow routing
├── resilience-tests.ts           # Security & resilience
├── validate-auth-paths.ts        # Auth path validation
└── e2e/                          # Playwright E2E tests

scripts/
├── api-tests.js                  # API endpoint tests
├── comprehensive-api-test.js     # All API routes tested
├── full-system-test.js           # End-to-end system test
├── journey-simulation.js         # User journey simulation
├── production-test-suite.js      # Production readiness checks
├── user-journey-tests.js         # Role-specific journey tests
├── proof-dynamic-rules.js        # Constraint rule verification
├── test-dynamic-flow.ts          # Dynamic configuration flow
├── test-emails.ts                # Email delivery tests
└── test-onboarding-flow.ts       # Onboarding flow tests
```

### 14.4 Red-Team Checklist

- [ ] Employee submits leave with manipulated balance → Server rejects
- [ ] Employee calls HR API endpoint → 403 Forbidden
- [ ] Employee tries to approve own leave → Rejected
- [ ] Cross-company data access attempt → 403 Forbidden
- [ ] Rate limit exceeded → 429 Too Many Requests
- [ ] Expired OTP used → Rejected
- [ ] SQL injection in search fields → Sanitized
- [ ] XSS in leave reason → HTML stripped
- [ ] CSRF without token → Blocked
- [ ] Audit log tampering → Hash chain detects
- [ ] Direct DB balance manipulation → Ledger audit catches discrepancy
- [ ] Negative balance when disabled → Hard reject

---

## 15. Deployment

### 15.1 Architecture

```
┌─────────────────────────────────────────────────┐
│                 DEPLOYMENT TOPOLOGY               │
├─────────────────────────────────────────────────┤
│                                                   │
│  Vercel (Next.js Web)              Railway        │
│  ├── Frontend (SSR/RSC)           ├── Python     │
│  ├── API Routes                   │   Constraint │
│  ├── Cron Functions               │   Engine     │
│  └── Edge Middleware              └── Port 8001  │
│           │                            │          │
│           └─────────┬──────────────────┘          │
│                     │                              │
│           ┌─────────▼─────────────┐               │
│           │   Supabase (Hosted)   │               │
│           │   ├── PostgreSQL      │               │
│           │   ├── Auth            │               │
│           │   ├── Storage         │               │
│           │   └── PITR Backups    │               │
│           └───────────────────────┘               │
│                                                   │
│  Services:                                        │
│  ├── Pusher (Real-time)                          │
│  ├── Gmail (Email)                               │
│  ├── Razorpay/Stripe (Payments)                  │
│  └── Calendarific (Holidays)                     │
│                                                   │
└─────────────────────────────────────────────────┘
```

### 15.2 Local Development

```bash
# 1. Clone
git clone https://github.com/sreenidhis29/tetradeck_saas.git
cd tetradeck_saas/web

# 2. Install dependencies
npm install

# 3. Setup environment
cp env.example .env.local
# Fill in all required env vars (see §10.2)

# 4. Generate Prisma client
npx prisma generate

# 5. Push schema to DB
npx prisma db push

# 6. Start constraint engine
cd backend
pip install -r requirements.txt
python constraint_engine.py &

# 7. Start Next.js
cd ..
npm run dev
```

### 15.3 Docker (Full Stack)

```bash
# Development
docker-compose up -d

# Production (with nginx, monitoring)
docker-compose --profile production --profile monitoring up -d
```

### 15.4 Production Checklist

- [ ] All environment variables set and validated (`/api/security/env-check`)
- [ ] Database migrations applied (`prisma db push`)
- [ ] RBAC permissions seeded
- [ ] CRON_SECRET configured for cron endpoints
- [ ] SSL/HTTPS enforced
- [ ] Rate limiting active
- [ ] Health check endpoint responding (`/api/health`)
- [ ] Cron jobs scheduled (SLA, reminders, backups)
- [ ] Email delivery tested
- [ ] Payment webhook configured
- [ ] Monitoring dashboards set up

---

## 16. Tech Stack

### 16.1 Frontend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js | 16.1.1 | Full-stack React framework (App Router, RSC) |
| React | 19.2.3 | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first styling |
| Radix UI | Latest | Accessible UI primitives (Dialog, Select, Tabs, Switch) |
| Recharts | 3.7.0 | Data visualization |
| Framer Motion | 12.x | Animations |
| Lucide React | 0.562 | Icon library |
| Sonner | 2.x | Toast notifications |

### 16.2 Backend

| Technology | Version | Purpose |
|-----------|---------|---------|
| Next.js API Routes | 16.x | REST API endpoints |
| Prisma ORM | 6.19.x | Type-safe database access |
| PostgreSQL | 15+ | Primary database (via Supabase) |
| Python Flask | 3.x | Constraint evaluation engine |
| Pusher | 5.2 | Real-time WebSocket events |
| Nodemailer | 7.x | Email dispatch (Gmail OAuth2) |
| Zod | (via integrity/) | Runtime schema validation |

### 16.3 Infrastructure

| Technology | Purpose |
|-----------|---------|
| Supabase | Auth + Database + Storage + PITR |
| Vercel | Frontend deployment + Serverless functions |
| Railway | Python service deployment |
| Docker | Local development orchestration |
| Prometheus | Metrics collection |
| Grafana | Metrics visualization |

### 16.4 Payments

| Provider | Market | Features |
|----------|--------|----------|
| Razorpay | India | UPI, Cards, Netbanking, Subscriptions |
| Stripe | Global | Cards, Subscriptions, Webhooks |

### 16.5 AI & Intelligence

| Feature | Implementation |
|---------|----------------|
| Leave analysis | Constraint engine + confidence scoring |
| Smart defaults | `lib/zero-decision/smart-defaults.ts` — auto-fill forms, predict duration |
| Predictive analytics | ML-based leave pattern prediction |
| Burnout detection | No-leave-in-90-days flagging |
| Abuse pattern detection | Leave frequency anomaly detection |
| Decision explainability | `lib/enterprise/explainability.ts` — reasoning breakdown |

---

## Project Structure

```
tetradeck_saas/
├── web/                          # Main application
│   ├── app/                      # Next.js App Router
│   │   ├── (auth)/              # Auth pages
│   │   ├── (marketing)/         # Marketing pages
│   │   ├── api/                 # 30+ API route groups
│   │   │   ├── admin/           # Admin operations
│   │   │   ├── attendance/      # Attendance tracking
│   │   │   ├── audit-logs/      # Audit log queries
│   │   │   ├── billing/         # Payment/subscription
│   │   │   ├── company/         # Company management
│   │   │   ├── constraint-rules/# Policy engine API
│   │   │   ├── cron/            # Scheduled jobs (7 crons)
│   │   │   ├── employee/        # Employee operations
│   │   │   ├── enterprise/      # Health/metrics/backup
│   │   │   ├── health/          # System health check
│   │   │   ├── holidays/        # Holiday calendar
│   │   │   ├── hr/              # HR operations
│   │   │   ├── leaves/          # Leave CRUD + approval
│   │   │   ├── organization/    # Org structure
│   │   │   ├── payroll/         # Payroll processing
│   │   │   ├── policies/        # Constraint policies
│   │   │   ├── reports/         # Analytics/reports
│   │   │   ├── security/        # OTP/env-check
│   │   │   └── realtime/        # Pusher events
│   │   ├── dashboard/           # Dashboard redirect
│   │   ├── employee/            # Employee portal (9 pages)
│   │   ├── hr/                  # HR portal (30+ pages)
│   │   ├── manager/             # Manager portal (6 pages)
│   │   ├── onboarding/          # Onboarding wizard
│   │   └── status/              # System status page
│   │
│   ├── components/              # React components
│   │   ├── dashboard/           # Dashboard widgets (8)
│   │   ├── employee/            # Employee components (3)
│   │   ├── enterprise/          # Enterprise components (4)
│   │   ├── hr/                  # HR components (3)
│   │   ├── onboarding/          # Onboarding steps (8)
│   │   ├── marketing/           # Marketing sections
│   │   └── ui/                  # Shared UI primitives
│   │
│   ├── lib/                     # Core libraries
│   │   ├── rbac.ts              # RBAC engine (759 lines)
│   │   ├── auth-guard.ts        # Auth guards (258 lines)
│   │   ├── audit-logger.ts      # Enhanced audit (308 lines)
│   │   ├── audit.ts             # Core audit (413 lines)
│   │   ├── security.ts          # Security utils (381 lines)
│   │   ├── api-rate-limit.ts    # Rate limiting (196 lines)
│   │   ├── otp-service.ts       # OTP service (257 lines)
│   │   ├── email-service.ts     # Email service (1416 lines)
│   │   ├── notification-service.ts  # Notifications (350 lines)
│   │   ├── india-tax.ts         # Tax calculations (598 lines)
│   │   ├── constraint-rules-config.ts  # Rule generator (280 lines)
│   │   ├── leave-types-config.ts      # Leave types (349 lines)
│   │   ├── prisma.ts            # Prisma client
│   │   ├── billing/             # Razorpay/Stripe/Plans (7 files)
│   │   ├── compliance/          # GDPR/consent (3 files)
│   │   ├── enterprise/          # Enterprise modules (9 files)
│   │   ├── integrity/           # Validation/sanitization (3 files)
│   │   ├── onboarding/          # Onboarding routing (1 file)
│   │   └── zero-decision/       # Smart defaults (2 files)
│   │
│   ├── backend/                 # Python constraint engine
│   │   ├── constraint_engine.py # Flask server (2792 lines)
│   │   ├── constraint-engine/   # Rule schemas
│   │   └── requirements.txt     # Python dependencies
│   │
│   ├── prisma/
│   │   └── schema.prisma        # Database schema (1483 lines, 32 models)
│   │
│   ├── scripts/                 # Test & utility scripts (30+ files)
│   ├── tests/                   # Automated tests (9+ files)
│   └── middleware.ts            # Security middleware (251 lines)
│
├── backend/                     # Legacy backend (Node.js)
│   └── ai-services/            # AI agent services
│
├── docker-compose.yml           # Full stack orchestration
├── docs/                        # Documentation
└── package.json                 # Root package
```

---

## 17. Developer Guide — How Everything Works

This section provides deep technical explanations of every major subsystem for new developers.

---

### 17.1 Authentication & Registration Flow

#### Company Admin Registration

When a new company signs up, the following happens in strict order:

1. **Client-side** (`/sign-up`, "Start a Company" mode): The user fills in their name, email, password, company name, industry, size, and timezone. On submit, the page calls `supabase.auth.signUp({ email, password })` using the Supabase browser client. This creates an auth user in Supabase and sets a session cookie automatically.

2. **API call** (`POST /api/auth/register`): With the Supabase session cookie already set, the client calls this endpoint with the company details. The server:
   - Reads the authenticated Supabase user via `createSupabaseServerClient().auth.getUser()`
   - Validates that no `Employee` record exists for this `auth_id` yet (prevents double-registration)
   - Runs a **single database transaction** that atomically:
     - Creates a `Company` record with a randomly generated 8-character `join_code` (e.g., `A1B2C3D4`)
     - Creates an `Employee` record with `primary_role: 'admin'` linked to the new company
     - Seeds all 16 leave types from `LEAVE_TYPE_CATALOG` as `LeaveType` records
     - Seeds `LeaveBalance` records for the admin employee (one per leave type for the current year)
     - Seeds 13 default `LeaveRule` records from `DEFAULT_CONSTRAINT_RULES`
   - Creates an audit log entry with SHA-256 hash chain integrity
   - Returns `{ company_id, employee_id, join_code }`

3. **Client redirects** to `/onboarding` for the wizard.

**Why a transaction?** All-or-nothing semantics: if any step fails, the entire registration rolls back. No partial company records or orphaned employees.

**Why generate `join_code` at registration?** Employees need a code immediately. The admin can share it before finishing onboarding.

#### Employee Join Flow

Employees join an existing company using the code their HR admin shares:

1. **Client-side** (`/sign-up`, "Join a Company" mode): Employee enters name, email, password, company code, and their role. On submit:
   - `supabase.auth.signUp()` creates the auth user and sets session cookie
   - Client calls `POST /api/auth/join` with the company code and profile data

2. **API call** (`POST /api/auth/join`): The server:
   - Authenticates via Supabase session cookie
   - Looks up `Company` by `join_code` (case-insensitive after toUpperCase normalization)
   - Runs a **transaction** that:
     - Creates the `Employee` record with `status: 'onboarding'`
     - Seeds `LeaveBalance` rows using the company's active `LeaveType` records (falls back to `LEAVE_TYPE_CATALOG` if no custom types are configured yet)
   - Creates an audit log entry
   - Returns `{ employee_id, company_id, company_name }`

3. **Client redirects** to `/employee/dashboard`.

**Why `status: 'onboarding'`?** Employees start in onboarding status — the HR team can update this to `active` after verification.

**Why fall back to the catalog?** If the admin hasn't completed onboarding yet, the company may not have custom leave types. The fallback ensures employees always get initial balances.

---

### 17.2 Onboarding Wizard — Step-by-Step

The wizard at `/onboarding` is only visited by company admins post-registration. It has 6 steps:

| Step | UI Label | What it configures | What saves to DB |
|------|----------|--------------------|-----------------|
| 1 | Company Setup | Name, industry, size, timezone | `Company` fields updated |
| 2 | Leave Types | Enable/disable leave types, quotas | New `LeaveType` rows (skips already-seeded codes) |
| 3 | Constraint Rules | View/acknowledge defaults | Already seeded at registration — no DB write here |
| 4 | Holidays | Select public holidays | `PublicHoliday` rows (custom, per company) |
| 5 | Notifications | Email alerts, manager alerts, SLA alerts | `CompanySettings.email_notifications` upserted |
| 6 | Complete | Display join code | `Company.onboarding_completed = true` |

**Save trigger**: All data is collected in React state across steps. A **single API call** (`POST /api/onboarding/complete`) saves everything when the user clicks "Finish Setup" on step 5. The transaction inside the route ensures partial saves don't occur.

**Join Code display**: After `POST /api/onboarding/complete` succeeds, the route returns the company's existing `join_code`. The Complete step displays it prominently so the admin can share it with employees.

**Why not save each step individually?** To keep the wizard recoverable. If the admin closes the browser mid-wizard, they can re-open it and all state is re-enterable. Only the final "Finish Setup" writes to the database.

---

### 17.3 Auto-Seeding of Leave Balances

Leave balances are created automatically in two places:

**During company admin registration** (`POST /api/auth/register`):
```
LEAVE_TYPE_CATALOG (16 types) → LeaveBalance rows for admin employee
annual_entitlement = defaultQuota from catalog
remaining = defaultQuota (starts fresh)
year = current calendar year
```

**During employee join** (`POST /api/auth/join`):
```
company.leave_types (active) OR LEAVE_TYPE_CATALOG (fallback)
  → LeaveBalance rows for new employee
annual_entitlement = leave_type.default_quota
remaining = default_quota
year = current calendar year
```

**Why seed at creation?** The leave engine (`/api/leaves/submit`) checks balances before approving. If no balance exists, the system cannot evaluate the request. Pre-seeding eliminates a "chicken-and-egg" problem.

**How carry-forward works**: At year-end, the cron job (`/api/cron/sla-check` and balance cron) calculates `remaining × carry_forward_percentage` and creates new `LeaveBalance` rows for the next year, carrying the appropriate balance forward.

---

### 17.4 Leave Policy Engine Logic

The leave engine applies policies in this order when an employee submits a leave request:

```
1. Auth guard → getAuthEmployee() → verifies JWT, loads employee + permissions
2. Permission check → requires 'leave.apply_own'
3. Schema validation (Zod) → dates, leave type, reason
4. Input sanitization → strip XSS from reason field
5. Balance check → LeaveBalance.remaining >= requested days (unless negative_balance enabled)
6. Date validation → start_date <= end_date, no past dates
7. Constraint engine call → POST http://localhost:8001/evaluate
   - Returns: { allowed: bool, violations: [], confidence: float }
8. If allowed: create LeaveRequest (status: 'pending')
9. Deduct pending_days from LeaveBalance
10. Create AuditLog entry (SHA-256 chained)
11. Trigger notifications → manager + HR
12. Return success
```

**Constraint Engine** (`web/backend/constraint_engine.py`, Python Flask on port 8001):
- Receives company_id, employee_id, leave_type, dates, and the company's `LeaveRule` configs
- Evaluates 13+ rules: max duration, min team coverage, advance notice, blackout periods, concurrent leave limits, etc.
- Returns a confidence score (0–1) and a list of violations
- Violations from `is_blocking: true` rules prevent the request; `is_blocking: false` rules generate warnings

**Company-specific personalization**: Every `LeaveRule` is scoped to a `company_id`. The engine loads only rules for the requesting employee's company. This means two companies can have completely different constraint sets.

---

### 17.5 RBAC — Role-Based Access Control

Six roles exist: `admin`, `hr`, `director`, `manager`, `team_lead`, `employee`. Each maps to a set of permission codes (40+ permissions defined in `lib/rbac.ts`).

**How permissions are checked in API routes**:
```typescript
// Pattern used in every protected route
const employee = await getAuthEmployee();     // Loads from Supabase + Prisma
requireRole(employee, 'hr', 'admin');         // Throws 403 if not matching
requirePermissionGuard(employee, 'leave.approve'); // Throws 403 if missing perm
requireCompanyAccess(employee, targetCompanyId);   // Throws 403 if cross-company
```

**`getAuthEmployee()` flow**:
1. Read Supabase session from cookie (`createServerClient`)
2. Call `supabase.auth.getUser()` — validates JWT with Supabase
3. Query `Employee` by `auth_id` — loads role, company, status
4. Check `status !== 'terminated'` — blocks deactivated accounts
5. Load permissions via `getUserPermissions(employee.id, org_id)` — queries `RolePermission` table for company-specific overrides, falls back to `DEFAULT_ROLE_PERMISSIONS`
6. Return `AuthEmployee` object with `permissions[]` and `accessScope`

---

### 17.6 Email & Notification Systems

**Email Service** (`lib/email-service.ts`, 1416 lines):
- Uses Nodemailer with Gmail OAuth2 or SMTP
- Templates cover: leave submitted, leave approved/rejected, SLA breach, welcome email, OTP verification, payroll slip, onboarding invite
- Triggered from API routes after DB operations, not before — ensuring the DB write succeeded first

**In-App Notifications** (`lib/notification-service.ts`):
- Creates `Notification` records in the database (per employee, per company)
- Real-time delivery via Pusher WebSocket channels
- Types: `leave_request`, `leave_approved`, `leave_rejected`, `sla_breach`, `system`
- Each notification has `is_read: false` by default; marked read when the employee views it

**Notification preferences**: Per employee via `NotificationPreference` table. Company-wide defaults via `CompanySettings.email_notifications`.

---

### 17.7 AI Leave Service

The AI/intelligence layer operates at two levels:

**Smart Defaults** (`lib/zero-decision/smart-defaults.ts`):
- Auto-fills form fields based on historical patterns (e.g., predicted leave duration)
- Triggered when the employee opens the leave request form

**Constraint Engine with Confidence Scoring** (`backend/constraint_engine.py`):
- After evaluating rules, returns `confidence: float` (0–1)
- A high confidence (> 0.8) + `allowed: true` = auto-approve eligible
- The `ai_recommendation` JSON column on `LeaveRequest` stores the full engine response
- HR/managers can see why a request was auto-approved or flagged

**Burnout & Pattern Detection** (`lib/enterprise/`):
- Cron jobs flag employees who haven't taken leave in 90+ days (`burnout_risk: true`)
- Unusual leave frequency patterns trigger abuse detection alerts for HR
- Decision explainability (`lib/enterprise/explainability.ts`) generates human-readable reasoning

---

### 17.8 Audit Trail

Every state-changing action creates an immutable `AuditLog` entry via `createAuditLog()` in `lib/audit.ts`.

**SHA-256 hash chaining**:
```
hash_N = SHA256(action | entity_id | JSON(new_state) | hash_{N-1})
```
This creates a tamper-evident chain. If any log entry is modified, all subsequent hashes become invalid. The `/api/security/env-check` endpoint can verify chain integrity.

**What's tracked**:
- `COMPANY_REGISTER` — company creation with admin
- `EMPLOYEE_JOIN` — employee joining via code
- `COMPANY_ONBOARDING_COMPLETE` — onboarding wizard completed
- `LEAVE_SUBMIT / APPROVE / REJECT / CANCEL` — all leave state changes
- `EMPLOYEE_CREATE / UPDATE / STATUS_CHANGE` — HR actions on employees
- `PAYROLL_GENERATE / APPROVE` — payroll operations
- `LOGIN / LOGOUT` — authentication events
- `PERMISSION_CHANGE / API_KEY_CREATE` — security events

**Retention**: Audit logs are never deleted (soft-delete only on related records). The `AuditLog` model has no `deleted_at` field by design.

---

### 17.9 UI Components & Navigation

#### Sign-up Page (`/sign-up`)

Two modes toggled by a tab switcher:

| Mode | "Start a Company" | "Join a Company" |
|------|-------------------|-----------------|
| Fields | First/last name, email, password, company name, industry, size, timezone | First/last name, email, password, company code, role |
| On submit | `supabase.auth.signUp()` → `POST /api/auth/register` | `supabase.auth.signUp()` → `POST /api/auth/join` |
| Redirect | `/onboarding` | `/employee/dashboard` |

The company code input auto-uppercases as the user types (for UX consistency, since codes are always uppercase).

#### Onboarding Wizard (`/onboarding`)

- All form state is held in React `useState` at the top-level `OnboardingPage` component
- Child step components receive `data` + `onChange` props — they are fully controlled
- The "Finish Setup" button (on step 5, Notifications) triggers the single API save
- The "Complete" step (step 6) renders the company join_code in a prominent box

**Error handling**: Errors from the API are displayed in a red alert box above the wizard. The user stays on the current step and can retry.

#### Button Navigation Reference

| Button | Location | Action |
|--------|----------|--------|
| "Start a Company" tab | `/sign-up` | Switches mode to admin registration |
| "Join a Company" tab | `/sign-up` | Switches mode to employee join |
| "Create Company & Account" | `/sign-up` (admin mode) | Registers admin + creates company |
| "Join Company" | `/sign-up` (employee mode) | Joins existing company by code |
| "Next →" | Onboarding steps 1–4 | Advances to next step (no API call) |
| "Finish Setup" | Onboarding step 5 | Saves all wizard data to DB |
| "Go to HR Dashboard →" | Onboarding step 6 | Navigates to `/hr/dashboard` |
| "Sign In" | `/sign-in` | Authenticates via Supabase, redirects to `/hr/dashboard` |

---

### 17.10 API Endpoint Reference

#### New Endpoints (Registration & Onboarding)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/register` | Supabase session (new user) | Company admin registration — creates company, admin employee, seeds leave types, balances, constraint rules |
| `POST` | `/api/auth/join` | Supabase session (new user) | Employee join via company code — creates employee, seeds leave balances |
| `POST` | `/api/onboarding/complete` | `admin` role | Saves onboarding wizard config — leave types, holidays, notifications, marks company complete |

#### Leave Management

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/leaves/submit` | `employee` + `leave.apply_own` | Submit leave request with constraint engine evaluation |
| `POST` | `/api/leaves/approve/[requestId]` | `manager`/`hr` + `leave.approve` | Approve a pending leave request |
| `POST` | `/api/leaves/reject/[requestId]` | `manager`/`hr` + `leave.reject` | Reject a pending leave request |
| `GET` | `/api/leaves/balances` | Any authenticated | Get leave balances for current employee |

#### HR Operations

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/hr/adjust-balance` | `hr`/`admin` + `leave.adjust_balance` | Manually adjust an employee's leave balance |

#### System

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/api/health` | None | Health check — DB, constraint engine, email |
| `GET` | `/api/security/env-check` | `admin` | Validate environment config + audit chain integrity |
| `POST` | `/api/security/otp` | Any authenticated | Generate/verify OTP for sensitive operations |

---

### 17.11 Complete User Journey — Technical Walkthrough

```
Step 1: Company Admin Signs Up
  → /sign-up (admin mode)
  → supabase.auth.signUp() → JWT cookie set
  → POST /api/auth/register
      → Company created (join_code = "A1B2C3D4")
      → Employee created (role = admin, status = active)
      → 16 LeaveTypes seeded
      → 16 LeaveBalances seeded for admin
      → 13 LeaveRules seeded
      → AuditLog: COMPANY_REGISTER
  → redirect /onboarding

Step 2: Onboarding Wizard
  → Admin configures company, leave types, holidays, notifications
  → Click "Finish Setup"
  → POST /api/onboarding/complete
      → Company name/timezone updated
      → Custom leave types created
      → Public holidays created
      → CompanySettings upserted
      → Company.onboarding_completed = true
      → AuditLog: COMPANY_ONBOARDING_COMPLETE
  → Complete step shows join_code prominently

Step 3: Employee Joins
  → Admin shares join_code "A1B2C3D4" with employees
  → Employee visits /sign-up (employee mode)
  → supabase.auth.signUp() → JWT cookie set
  → POST /api/auth/join { company_code: "A1B2C3D4", role: "employee" }
      → Company found by join_code
      → Employee created (status = onboarding)
      → LeaveBalances seeded from company's active LeaveTypes
      → AuditLog: EMPLOYEE_JOIN
  → redirect /employee/dashboard

Step 4: Employee Submits Leave
  → POST /api/leaves/submit
  → Auth guard → getAuthEmployee()
  → Permission check: leave.apply_own
  → Balance check: LeaveBalance.remaining >= requested days
  → Constraint engine: POST http://constraint-engine:8001/evaluate
  → LeaveRequest created (status = pending)
  → LeaveBalance.pending_days += total_days
  → Notifications sent to manager + HR
  → AuditLog: LEAVE_SUBMIT

Step 5: Manager Approves
  → POST /api/leaves/approve/[requestId]
  → Auth guard + permission: leave.approve
  → LeaveRequest.status → approved
  → LeaveBalance: used_days += total_days, pending_days -= total_days
  → Notification sent to employee
  → AuditLog: LEAVE_APPROVE

Step 6: AI Recommendations
  → Constraint engine returns confidence score with each evaluation
  → ai_recommendation stored on LeaveRequest
  → Smart defaults auto-fill duration based on historical patterns
  → Burnout detection cron flags 90-day no-leave employees
```

---

### 17.12 Background Jobs (Cron)

| Cron Route | Schedule | Purpose |
|-----------|----------|---------|
| `/api/cron/sla-check` | Every hour | Check pending leave requests past SLA deadline; escalate/notify HR |

Cron endpoints are protected by `CRON_SECRET` header validation. All cron jobs are idempotent.

---

### 17.13 Multi-Tenancy & Data Isolation

Every database model that contains company data has a `company_id` (or `org_id`) column. All queries are scoped to `employee.org_id`:

- **Prisma queries**: Every API route filters by `company_id` before returning data
- **`requireCompanyAccess()`**: Explicitly checks that the target entity belongs to the requesting employee's company
- **No shared data**: Leave types, rules, employees, policies — all scoped per company
- **`join_code`**: Unique across all companies (`@unique` constraint) — prevents code collisions

---

### 17.14 Security Architecture Summary

| Layer | Implementation |
|-------|---------------|
| Authentication | Supabase JWT (RS256) + HttpOnly cookies |
| Authorization | RBAC with 40+ permission codes, company-scoped |
| Input validation | Zod schemas on all API inputs |
| Input sanitization | `sanitizeInput()` — strips HTML tags, encodes XSS chars, removes null bytes |
| Rate limiting | In-memory token bucket per endpoint per user |
| Audit trail | SHA-256 hash-chained immutable log |
| Cross-tenant isolation | `company_id` filter on all queries + `requireCompanyAccess()` |
| Security headers | CSP, HSTS, X-Frame-Options, X-Content-Type-Options (middleware) |
| OTP | Time-based OTP for sensitive operations (2FA escalation) |

---

## License

Proprietary — All rights reserved.

---

## Contact

**Continuum** — Modern HR for Startups
- Website: [continuum.hr](https://continuum.hr)
- Repository: [github.com/sreenidhis29/tetradeck_saas](https://github.com/sreenidhis29/tetradeck_saas)
