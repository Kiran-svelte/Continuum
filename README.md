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

## 18. User Facilities Guide — Everything a User Needs

> Think of the hotel analogy: everyone knows a hotel serves food, but guests also need A/C, chairs, tables, clean linen, hot water, WiFi, and a working elevator. This section documents every facility Continuum provides **beyond** the core leave-management feature — the things that make it truly usable.

---

### 18.1 Authentication Facilities

| Facility | Location | What It Does |
|----------|----------|--------------|
| **Sign Up — Company Admin** | `/sign-up` → "Start a Company" | Creates company, admin employee, 16 leave types, 13 rules, auto-seeds balances in one atomic transaction |
| **Sign Up — Employee** | `/sign-up` → "Join a Company" | Validates company join code, creates employee, seeds leave balances |
| **Sign In** | `/sign-in` | Supabase authentication with role-based redirect (HR → `/hr/dashboard`, Manager → `/manager/dashboard`, Employee → `/employee/dashboard`) |
| **Forgot Password** | `/forgot-password` | Sends Supabase password-reset email with time-limited link |
| **Reset Password** | `/reset-password` | Validates reset session, enforces 8-char minimum, shows success and auto-redirects |
| **Sign Out** | Sidebar footer (all portals) | Calls `supabase.auth.signOut()` and redirects to `/sign-in` — available on every page |

---

### 18.2 Navigation Facilities

| Facility | Description |
|----------|-------------|
| **Active nav link highlighting** | Current page is highlighted with blue background + blue dot indicator in all sidebars |
| **Sidebar logo link** | Clicking "Continuum" in sidebar takes user to their portal's dashboard |
| **Notification bell** | Live 🔔 badge with unread count in every sidebar header |
| **Custom 404 page** | Friendly not-found page at `/not-found.tsx` with "Go Home" and "My Dashboard" links |
| **Role-based redirect** | After sign-in, API `/api/auth/me` returns role → redirect to correct portal |

---

### 18.3 Employee Self-Service Facilities

| Facility | Location | Status |
|----------|----------|--------|
| **View leave balances** | Employee Dashboard | Live data from `/api/leaves/balances` with progress bars per leave type |
| **Apply for leave** | `/employee/request-leave` | Wired to `POST /api/leaves/submit` — shows day count, validation, success toast + redirect |
| **View leave history** | `/employee/leave-history` | Paginated, filterable by status (All / Pending / Approved / Rejected / Cancelled) |
| **Cancel pending request** | `/employee/leave-history` | "✕ Cancel Request" button calls `POST /api/leaves/cancel/[requestId]` — restores balance |
| **View attendance log** | `/employee/attendance` | Shows recent check-in/check-out + leave balance sidebar |
| **View payslips & documents** | `/employee/documents` | Document listing with category badges and download links |
| **View & edit profile** | `/employee/profile` | Shows real data from `/api/employees/me` — edit phone, department, designation inline |

---

### 18.4 Manager Facilities

| Facility | Location | Status |
|----------|----------|--------|
| **Pending approvals** | `/manager/approvals` | Live list of team's pending requests — ✓ Approve / ✗ Reject with real API calls |
| **Team attendance** | `/manager/team-attendance` | Today's team availability (Present / WFH / On Leave) with counts |
| **Team directory** | `/manager/team` | Live team member list from `/api/employees` |
| **Team reports** | `/manager/reports` | Leave analytics from `/api/reports/leave-summary` |
| **Approval success toast** | `/manager/approvals` | Inline success message after approve/reject action |

---

### 18.5 HR Portal Facilities

| Facility | Location | Status |
|----------|----------|--------|
| **Employee directory** | `/hr/employees` | Searchable, filterable by status/role, paginated, live from `/api/employees` |
| **Leave requests** | `/hr/leave-requests` | All requests with status filters + inline approve/reject buttons |
| **Leave analytics** | `/hr/reports` | Bar chart (monthly), status breakdown, leave type breakdown, top takers, SLA breach count |
| **Policy settings** | `/hr/policy-settings` | Full leave type catalog (16 types) + all 13 constraint rules displayed |
| **Payroll runs** | `/hr/payroll` | Payroll history with download buttons and next-run date |
| **Organization chart** | `/hr/organization` | Department list with head names and team sizes |
| **Company settings** | `/hr/settings` | Company info, join code display/copy, leave policy config, notification toggles |
| **Attendance overview** | `/hr/attendance` | Company-wide attendance stats |

---

### 18.6 Notification Facilities

Notifications are stored in the `Notification` DB model and served via three endpoints:

```
GET  /api/notifications              → List user's notifications (limit, unread filter)
PATCH /api/notifications/:id/read   → Mark single notification as read
PATCH /api/notifications/read-all   → Mark all as read
```

The **Notification Bell** component (in every sidebar header):
- Auto-loads on mount, auto-refreshes every 60 seconds
- Shows red badge with unread count (max "9+")
- Dropdown list with blue dot for unread items, "Mark all read" button
- Click to mark individual notifications read

---

### 18.7 Data Facilities

| Facility | API Endpoint | Description |
|----------|-------------|-------------|
| **Leave balance check** | `GET /api/leaves/balances` | Auto-seeds defaults on first call (INV-15) |
| **Role-scoped leave list** | `GET /api/leaves/list` | Employees → own only; Managers → team + self; HR/Admin → all company |
| **Leave analytics** | `GET /api/reports/leave-summary` | Year-level aggregations with monthly trend |
| **Employee lookup** | `GET /api/employees` | Paginated with search, status, department, role filters |
| **Own profile** | `GET /api/employees/me` | Full profile with manager info |
| **Profile update** | `PATCH /api/employees/me` | Phone, department, designation — with audit log |
| **My session** | `GET /api/auth/me` | Returns role for client-side redirect |

---

### 18.8 Security Facilities

| Facility | Implementation |
|----------|---------------|
| **Rate limiting** | Per-endpoint in-memory sliding window (30–200 req/min based on plan) |
| **Session management** | Supabase cookie-based sessions, refreshed by middleware on every request |
| **Role-based access control** | 40+ permission codes, 6 roles, multi-role support — see §2 |
| **Company isolation** | Every DB query is scoped to `org_id` — cross-company access returns 403 |
| **Audit trail** | SHA-256 chained audit logs for every write operation |
| **Input sanitization** | All user input sanitized via `lib/security.ts` before DB writes |
| **Password reset** | Supabase time-limited reset links (1 hour expiry) |
| **OTP verification** | Available for sensitive actions via `lib/otp-service.ts` |
| **Production error hiding** | Stack traces never exposed — generic message in production |

---

### 18.9 Onboarding Facilities

| Step | Facility |
|------|----------|
| **Step 1 — Company** | Name, logo URL, timezone, industry, size |
| **Step 2 — Leave Types** | Enable/configure from 16 catalog types |
| **Step 3 — Holidays** | Add public + custom holidays for the year |
| **Step 4 — Rules** | Set SLA hours, negative balance, probation period |
| **Step 5 — Notifications** | Email on/off, manager alerts, daily digest, SLA alerts |
| **Step 6 — Complete** | Shows company join code for sharing with employees |

---

### 18.10 Status & Observability Facilities

| Facility | Location |
|----------|----------|
| **System status page** | `/status` — service uptime, latency, incident history |
| **Health endpoint** | `GET /api/health` — JSON health check for load balancers |
| **Prometheus metrics** | `GET /api/enterprise/metrics` — prom-client metrics for Grafana |
| **Structured logging** | `lib/enterprise/logger.ts` — Winston with JSON format |
| **Alerting** | `lib/enterprise/alerting.ts` — error threshold alerts |

---

### 18.11 Infrastructure Facilities

| Facility | File | Description |
|----------|------|-------------|
| **Docker** | `Dockerfile` | Multi-stage production build |
| **Docker Compose** | `docker-compose.yml` | Full stack: app + Postgres + constraint engine |
| **Nginx** | `nginx.conf` (docker) | Reverse proxy with gzip, rate limit headers |
| **Cron jobs** | `api/cron/sla-check` | SLA breach detection runs every 15 minutes |
| **Environment validation** | `api/security/env-check` | Validates all required env vars are set |
| **Multi-tenancy** | Middleware | Every request checked for company isolation |

---

### 18.12 Compliance Facilities

| Facility | File | Description |
|----------|------|-------------|
| **GDPR data export** | `lib/compliance/data-export.ts` | Employee can request full data export |
| **Consent management** | `lib/compliance/consent.ts` | Tracks and verifies user consent |
| **Audit encryption** | `lib/enterprise/audit-encryption.ts` | AES-256 encrypted audit trail |
| **India labor law** | `lib/india-tax.ts` | PF, ESI, TDS, Form 16 calculations |
| **Leave policy compliance** | 13 constraint rules | Probation, notice period, max duration, gender-specific |

---

### 18.13 Quick Facility Reference — "Where is it?"

```
I want to...                          | Go to...
--------------------------------------|------------------------------------------
Log out                               | Sidebar bottom → "↩ Sign Out" button
Reset my forgotten password           | /forgot-password
Change my phone/designation           | /employee/profile → "✏️ Edit Profile"
Cancel a pending leave                | /employee/leave-history → "✕ Cancel Request"
See who's on leave today              | /manager/team-attendance
Approve a team member's leave         | /manager/approvals
See my leave balance                  | /employee/dashboard (top cards) or /employee/profile
View all company leave requests       | /hr/leave-requests
Export leave reports                  | /hr/reports → "📥 Export CSV"
Share join code with new employees    | /hr/settings → "Company Join Code"
Configure leave types & rules         | /hr/policy-settings
Check system status                   | /status
```

## License

Proprietary — All rights reserved.

---

## 19. Enterprise UI/UX Specification — Every Page, Every Button, Every Pixel

> This section specifies every UI/UX detail for enterprise-grade polish. No element is left undefined. Every screen, every interaction, every loading state, every empty state, every error state is documented.

---

### 19.1 Global UI Standards

| Standard | Specification |
|----------|---------------|
| **Design System** | Custom design tokens via Tailwind CSS 4 + CSS variables for light/dark mode (`--foreground`, `--background`, `--muted`, `--primary`, etc.) |
| **Typography** | Inter font stack (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`). Headings: `text-2xl font-bold`. Body: `text-sm`. Captions: `text-xs text-muted-foreground` |
| **Color System** | Semantic colors per variant — `success` (green), `warning` (amber), `danger` (red), `info` (blue), `default` (gray). All colors use HSL with dark mode inverse |
| **Spacing** | Page padding: `p-8`. Card gap: `gap-6`. Section gap: `space-y-8`. Inner content: `px-6 py-4` |
| **Border Radius** | Cards: `rounded-xl` (12px). Buttons: `rounded-xl` (12px). Badges: `rounded-full`. Inputs: `rounded-lg` (8px) |
| **Shadows** | Cards: `shadow-md` default, `shadow-xl` on hover. CTAs: `shadow-lg shadow-primary/20`. Modals: `shadow-2xl` |
| **Animations** | All page transitions use Framer Motion `containerVariants` (stagger 80ms). Cards spring in with `stiffness: 300, damping: 24`. Hover lift: `y: -4px` |
| **Dark Mode** | Full dark mode support. Toggle in sidebar header. Uses `dark:` Tailwind variants. Background: `bg-background` (dark: `hsl(240 10% 3.9%)`). Cards: `bg-card` |
| **Responsive** | Mobile-first. Grid breakpoints: `md:grid-cols-2`, `lg:grid-cols-3`, `xl:grid-cols-4`. Sidebar collapses on mobile |
| **Accessibility** | ARIA labels on all interactive elements. Keyboard navigation. Focus rings. `role="progressbar"` on progress components. Color contrast WCAG AA |

---

### 19.2 Loading States (Skeleton Screens)

Every page MUST have three distinct visual states:

#### State 1: Page Loading (Initial)
- **Top progress bar**: Indeterminate `ProgressBar` component fixed at `top-0 left-0 right-0 z-50`
- **Skeleton layout**: Mirrors the exact layout of the loaded page — same grid structure, same card count, same section arrangement
- **Card skeletons**: `animate-pulse` with `bg-muted rounded` blocks matching content dimensions (title: `h-4 w-24`, value: `h-8 w-12`, bar: `h-2 w-full rounded-full`)
- **Table skeletons**: Row-by-row shimmer with avatar circle + two text lines + badge placeholder per row
- **Duration**: Skeleton shows until API response arrives — no artificial delay, no minimum display time

#### State 2: Empty State (No Data)
- **Icon**: Large emoji (text-4xl) relevant to the context (`📭` for no requests, `📅` for no attendance, `🗓️` for no holidays, `👥` for no team)
- **Primary text**: `text-sm text-muted-foreground` explaining what's empty ("No leave requests yet")
- **Secondary text**: `text-xs text-muted-foreground` explaining what the user can do ("Requests will appear here once employees submit them")
- **CTA link**: If applicable, a primary-colored link to take action ("Submit your first request →")

#### State 3: Error State
- **Error banner**: `bg-destructive/10 border border-destructive/20 text-destructive rounded-xl px-4 py-3`
- **Retry button**: Standard outline button below the error message
- **Never show raw errors**: Production always shows user-friendly messages. Dev shows error.message

#### State 4: Optimistic UI
- **On action** (approve, reject, cancel): Immediately update local state before API response
- **Opacity reduction**: `OptimisticWrapper` component applies `opacity-70` during pending operations
- **Rollback on failure**: If API returns error, revert local state and show error toast

---

### 19.3 Page-by-Page UI Specification

#### 19.3.1 Landing Page (`/`)

| Element | Specification |
|---------|---------------|
| **Hero section** | Full-width gradient background (`from-blue-600 to-indigo-700`). Large heading (text-5xl), subtitle (text-xl text-blue-100), two CTA buttons ("Get Started" primary, "See Demo" outline) |
| **Feature grid** | 3-column grid on desktop, 1-column mobile. Each card: icon + title + description. Hover lift animation |
| **Pricing section** | 4-column grid (Free/Starter/Growth/Enterprise). Prices in INR (₹). "Most Popular" badge on Growth plan. Feature comparison checkmarks |
| **Social proof** | Testimonial cards, company logos (if available), stats ("500+ companies trust us") |
| **Footer** | Links: Terms, Privacy, Cookies, Support, Help, Status. Social: Twitter, LinkedIn, GitHub |
| **Meta tags** | `og:title`, `og:description`, `og:image`, `og:url`. Twitter card. Favicon. Apple touch icon |

#### 19.3.2 Sign In (`/sign-in`)

| Element | Specification |
|---------|---------------|
| **Layout** | Centered card (max-w-md) with logo at top |
| **Fields** | Email (type=email, autocomplete=email), Password (type=password, show/hide toggle) |
| **Buttons** | "Sign In" primary button (full width), "Forgot Password?" link below |
| **Loading state** | Button shows spinner + "Signing in..." during API call |
| **Error state** | Red alert above form with error message ("Invalid credentials") |
| **Success state** | Redirects immediately — no success message needed |
| **Remember me** | Checkbox for persistent session (optional) |

#### 19.3.3 Sign Up (`/sign-up`)

| Element | Specification |
|---------|---------------|
| **Tab switcher** | Two tabs: "Start a Company" / "Join a Company". Active tab highlighted with primary color |
| **Admin mode fields** | First name, last name, email, password, company name, industry dropdown, company size dropdown, timezone auto-detected |
| **Employee mode fields** | First name, last name, email, password, company join code (auto-uppercase), role selector (Employee/Manager) |
| **Validation** | Real-time field validation. Password: 8+ chars. Email: format check. Company code: 8 chars uppercase |
| **Submit button** | "Create Company & Account" (admin), "Join Company" (employee). Full width, primary style |

#### 19.3.4 Employee Dashboard (`/employee/dashboard`)

| Element | Specification |
|---------|---------------|
| **Greeting header** | "Welcome back, {firstName} 👋" with time-based greeting (morning/afternoon/evening) |
| **Leave balance cards** | Grid of cards, one per leave type. Each card: gradient accent line (color per type), type code badge, remaining count (text-3xl font-bold), "of X days remaining" subtitle, animated progress bar (fills from left, color per type) |
| **Quick actions panel** | Vertical stack of action links: Apply Leave, Leave History, Attendance, Documents. Each: icon + title + subtitle + chevron. Gradient background per item |
| **Recent requests** | Last 3 leave requests. Each row: type + days + date range + status badge. "View all →" link |
| **Upcoming holidays** | Real data from `/api/company/holidays`. Each: name + date + day-of-week badge. "Custom" chip for company-specific holidays |
| **Tutorial system** | Welcome modal on first visit. Floating tutorial button. Step-by-step guided tour |

#### 19.3.5 HR Dashboard (`/hr/dashboard`)

| Element | Specification |
|---------|---------------|
| **Metric cards** | 4-column grid: Total Employees (blue), Pending Approvals (amber), On Leave Today (purple), SLA Breaches (red). Each card: gradient accent line, icon in colored background circle, large number (text-3xl), subtitle with context |
| **Recent leave requests** | Table-like list, 5 most recent. Each row: employee avatar (initials), full name, leave type chip, date range, days count, department, status badge. Click to navigate to detail |
| **Quick actions** | 6 action cards: Manage Employees, Review Requests, Generate Report, Policy Settings, Attendance, Payroll. Each: gradient background, icon, title, subtitle, chevron arrow |
| **All data is real** | Fetched from `/api/employees` (count), `/api/leaves/list` (pending + recent), computed metrics (on-leave today) |

#### 19.3.6 Manager Dashboard (`/manager/dashboard`)

| Element | Specification |
|---------|---------------|
| **Metric cards** | Team Size, Pending Approvals, Team Available, On Leave Today. Real data from `/api/employees` and `/api/leaves/list` |
| **Pending approvals** | Full list with real employee data. Each row: avatar (initials), name, request ID (truncated), type, date range, days, time-ago. Inline "Approve" (green) and "Reject" (red) buttons with loading states |
| **Team members** | Scrollable list (max 10 visible). Each: avatar, name, designation, status badge (Active/Inactive). "View all →" link to `/manager/team` |
| **Approve flow** | Click Approve → request optimistically removed from list → API call → success: stays removed, error: re-appears with error toast |
| **Reject flow** | Click Reject → browser prompt for reason → API call with reason → request removed |

#### 19.3.7 Attendance Page (`/employee/attendance`)

| Element | Specification |
|---------|---------------|
| **Clock in/out** | Header-level buttons. Clock In (green, office icon), WFH (outline green, house icon), Clock Out (red, door icon). Buttons conditionally show based on today's record state |
| **Status message** | Green success banner on successful clock, amber warning on errors. Auto-dismisses after 10 seconds |
| **Summary cards** | 4 cards: Present Days (green), WFH Days (blue), Total Hours (purple), Attendance % (amber). Real computed data per month |
| **Attendance log** | Left panel. Month navigator (← month year →). Scrollable list of daily records: date + day, check-in time, check-out time, total hours, WFH badge, status badge |
| **Leave balances** | Right panel. Bar-style progress indicators per leave type: type name, remaining/total, animated progress bar, used/pending counts |

#### 19.3.8 Leave History (`/employee/leave-history`)

| Element | Specification |
|---------|---------------|
| **Status filters** | Pill buttons: All, Pending, Approved, Rejected, Cancelled. Active pill: primary color filled. Inactive: muted background |
| **Request list** | Full-width card with rows. Each row: leave type (bold), half-day chip (if applicable), status badge, date range, day count, reason (truncated), approver comments (italic with 💬), created date |
| **Cancel button** | Only on pending/escalated rows. Red text "✕ Cancel" with confirmation dialog. Loading state "Cancelling..." |
| **Pagination** | Bottom bar: ← Previous | Page X of Y | Next →. Disabled at boundaries |
| **Empty state** | 📭 icon + "No leave requests found" + link to submit first request |

#### 19.3.9 Request Leave (`/employee/request-leave`)

| Element | Specification |
|---------|---------------|
| **Leave type dropdown** | Lists company's active leave types with codes. Shows current balance next to each type |
| **Date pickers** | Start date and end date. Auto-calculates total days (excluding weekends/holidays) |
| **Half-day toggle** | Checkbox/switch for half-day leave |
| **Reason field** | Textarea, required, max 500 chars, with character count |
| **Document upload** | Optional file upload for medical certificates etc. |
| **Balance preview** | Shows "Current balance: X days" → "After this request: Y days" with color warning if balance goes low |
| **Submit button** | Primary button "Submit Request". Loading state with spinner. Disabled when form incomplete |
| **Success redirect** | On success, redirect to `/employee/leave-history` with success toast |

#### 19.3.10 Policy Settings (`/hr/policy-settings`)

| Element | Specification |
|---------|---------------|
| **Leave types table** | All 16 types with: code, name, category badge, default quota, carry-forward (Y/N), encashment (Y/N), paid (Y/N), gender filter, active toggle |
| **Constraint rules table** | 13+ rules with: rule ID, name, category, blocking/warning toggle, priority, active toggle |
| **Edit modals** | Click rule to open modal with editable config (JSON editor or form fields) |
| **OTP requirement** | Modifying any rule shows OTP verification dialog before save |
| **Save feedback** | Success toast on save. Error alert if validation fails |

---

### 19.4 UI Component Library Reference

| Component | File | Props | Usage |
|-----------|------|-------|-------|
| `Button` | `components/ui/button.tsx` | `variant` (primary/outline/ghost/danger), `size` (sm/md/lg), `disabled`, `loading` | All CTAs and actions |
| `Card` | `components/ui/card.tsx` | `CardHeader`, `CardTitle`, `CardContent` sub-components | All content containers |
| `Badge` | `components/ui/badge.tsx` | `variant` (success/warning/danger/info/default) | Status indicators |
| `Skeleton` | `components/ui/skeleton.tsx` | `className` for size control | Loading state placeholders |
| `ProgressBar` | `components/ui/progress.tsx` | `value`, `max`, `variant`, `indeterminate`, `animated` | Progress indicators |
| `PageLoader` | `components/ui/progress.tsx` | — | Top-of-page loading bar |
| `Spinner` | `components/ui/progress.tsx` | `size` (sm/md/lg) | Inline loading |
| `LoadingOverlay` | `components/ui/progress.tsx` | `show`, `message` | Full-area loading overlay |
| `ProgressSteps` | `components/ui/progress.tsx` | `steps`, `currentStep` | Wizard step indicators |
| `OptimisticWrapper` | `components/ui/progress.tsx` | `isOptimistic` | Wraps optimistic UI elements |
| `Modal` | `components/ui/modal.tsx` | `open`, `onClose`, `title` | All dialogs and popups |
| `Input` | `components/ui/input.tsx` | Standard input props + `error`, `label` | All form fields |
| `SidebarNav` | `components/sidebar-nav.tsx` | `items[]` (label, href, icon) | Portal navigation |
| `NotificationBell` | `components/notification-bell.tsx` | — | Header notification indicator |
| `ThemeToggle` | `components/theme-toggle.tsx` | — | Light/dark mode switch |
| `SignOutButton` | `components/sign-out-button.tsx` | — | Sidebar footer sign-out |

---

### 19.5 Animation System

| Animation | Implementation | Trigger |
|-----------|----------------|---------|
| **Page entry** | Framer Motion `containerVariants` (stagger 80ms, delay 100ms) | Page mount |
| **Card entry** | `itemVariants` — opacity 0→1, y 20→0, scale 0.95→1, spring physics | Staggered within container |
| **Card hover** | `whileHover={{ y: -4, boxShadow: '0 20px 40px -12px rgba(0,0,0,0.15)' }}` | Cursor enter |
| **Number entry** | Scale 0.5→1 with spring, delayed per index | After card appears |
| **Progress bar fill** | `initial={{ width: 0 }}` → `animate={{ width: percentage }}`, duration 0.8s | After card appears |
| **List item entry** | x: 10→0 or x: -20→0, staggered by 30-60ms | List mount |
| **Button hover** | Icon `scale-110`, color transition, slight translate-x on chevrons | Cursor enter |
| **Success/error messages** | `initial={{ opacity: 0, y: -10 }}` → visible | On event |
| **Sidebar active indicator** | Blue dot + blue background with 200ms transition | Route change |

---

## 20. Enterprise Readiness Checklist

> Every item must be verified before considering the platform production-ready for enterprise customers.

---

### 20.1 Authentication & Authorization

- [ ] Sign up (admin) creates company + seeds all data atomically
- [ ] Sign up (employee) joins via company code + seeds balances
- [ ] Sign in redirects to correct portal by role (admin/hr → `/hr`, manager → `/manager`, employee → `/employee`)
- [ ] Sign out clears all session cookies and redirects to `/sign-in`
- [ ] Forgot password sends Supabase reset email
- [ ] Reset password validates token + enforces minimum password length
- [ ] JWT tokens refresh automatically via middleware
- [ ] Expired sessions redirect to sign-in (not crash)
- [ ] Cross-company data access is 403 Forbidden
- [ ] Employee cannot access HR/Manager endpoints (403)
- [ ] Manager cannot access HR-only endpoints (403)
- [ ] Self-approval is blocked (employee cannot approve own leave)
- [ ] Deactivated accounts (status=terminated) are blocked at auth guard
- [ ] Rate limiting enforced on all API endpoints (429 on exceed)

### 20.2 Employee Features

- [ ] Dashboard shows real leave balances from API (no hardcoded data)
- [ ] Dashboard shows real upcoming holidays from DB
- [ ] Dashboard shows real recent leave requests
- [ ] Apply leave form shows all active company leave types
- [ ] Apply leave shows current balance per type
- [ ] Apply leave validates dates (no past dates, start ≤ end)
- [ ] Apply leave calls constraint engine and shows violations
- [ ] Apply leave creates request + adjusts pending balance atomically
- [ ] Leave history loads real data with pagination
- [ ] Leave history supports status filter (all/pending/approved/rejected/cancelled)
- [ ] Cancel pending request restores balance
- [ ] Attendance page loads real attendance records from DB
- [ ] Clock in creates attendance record with timestamp
- [ ] Clock out updates record with total hours calculation
- [ ] WFH flag correctly set on attendance records
- [ ] Profile page shows real employee data from `/api/employees/me`
- [ ] Profile edit (phone, department, designation) works with audit log
- [ ] Documents page lists real uploaded documents

### 20.3 Manager Features

- [ ] Dashboard shows real team size from `/api/employees`
- [ ] Dashboard shows real pending approvals count
- [ ] Pending approvals list shows real leave requests for direct reports
- [ ] Approve button calls `/api/leaves/approve/[id]` and updates balance
- [ ] Reject button prompts for reason and calls `/api/leaves/reject/[id]`
- [ ] Team list shows real direct reports
- [ ] Team attendance shows today's check-in status for team
- [ ] Reports page shows real leave analytics

### 20.4 HR/Admin Features

- [ ] Dashboard shows real employee count, pending approvals, on-leave-today
- [ ] Employee directory with search, filter by status/role/department
- [ ] Leave requests page with all company requests + approve/reject
- [ ] Policy settings shows all leave types + constraint rules
- [ ] Attendance overview for entire company
- [ ] Payroll generation creates PayrollRun + PayrollSlips with India tax calculations
- [ ] Organization page shows departments and hierarchy
- [ ] Company settings editable (with OTP for destructive changes)
- [ ] Reports with leave analytics, charts, export capability
- [ ] Onboarding wizard completes all 6 steps and marks company complete

### 20.5 Email System

- [ ] Gmail SMTP transport works with app password
- [ ] Gmail OAuth2 transport works (when configured)
- [ ] Welcome email sent on company registration
- [ ] Leave submission email sent to manager
- [ ] Leave approval email sent to employee
- [ ] Leave rejection email sent to employee
- [ ] SLA breach email sent to next approver + HR
- [ ] OTP email sent for sensitive operations
- [ ] Auto-approved leave email sent to employee
- [ ] Email test endpoint (`POST /api/email/test`) delivers test email
- [ ] Email config check (`GET /api/email/test`) reports configuration status
- [ ] Rate limiting (20 emails/minute) prevents abuse
- [ ] Email failures don't crash API endpoints (graceful fallback)
- [ ] All email templates have proper HTML with inline styles

### 20.6 Constraint Engine

- [ ] Python Flask server starts on port 8001
- [ ] `POST /api/evaluate` accepts company_id, employee_id, leave_type, dates
- [ ] RULE001 (Max Leave Duration) correctly enforces per-type limits
- [ ] RULE002 (Leave Balance Check) prevents over-balance requests
- [ ] RULE003 (Min Team Coverage) checks ≥60% team availability
- [ ] RULE004 (Max Concurrent Leave) limits same-department overlaps
- [ ] RULE005 (Blackout Period) blocks requests during blackout dates
- [ ] RULE006 (Advance Notice) warns on short-notice requests
- [ ] RULE007 (Consecutive Leave Limit) enforces max consecutive days
- [ ] RULE008 (Sandwich Rule) detects weekend/holiday sandwich
- [ ] RULE009 (Min Gap Between Leaves) warns on close-together requests
- [ ] RULE010 (Probation Restriction) blocks probation employees
- [ ] RULE011 (Critical Project Freeze) blocks during freeze periods
- [ ] RULE012 (Document Requirement) flags when proof needed
- [ ] RULE013 (Monthly Quota) enforces monthly limits
- [ ] Blocking rules return 400 with violations
- [ ] Warning rules allow request but set status to `escalated`
- [ ] Confidence score returned for AI recommendation
- [ ] Health check endpoint (`GET /health`) responds

### 20.7 Data Integrity

- [ ] Leave balance formula: `remaining = annual + carried - used - pending - encashed`
- [ ] Balance never goes negative when `Company.negative_balance = false`
- [ ] Leave request status follows state machine strictly
- [ ] Audit log hash chain: `hash[n] = SHA256(data + hash[n-1])`
- [ ] Audit log never deleted (no `deleted_at`, no hard delete)
- [ ] Every write operation creates audit log entry
- [ ] Tenant isolation: all queries scoped by company_id
- [ ] Unique constraints: `[emp_id, leave_type, year]` for LeaveBalance
- [ ] Soft delete everywhere (deleted_at field)
- [ ] Leave balance adjustments create audit entries with reason

### 20.8 Security

- [ ] Security headers set (CSP, HSTS, X-Frame-Options DENY, X-Content-Type-Options)
- [ ] Rate limiting per endpoint per user
- [ ] Input sanitization (XSS, SQL injection prevention)
- [ ] Zod schema validation on all API inputs
- [ ] OTP required for destructive operations (settings, delete, billing)
- [ ] No secrets in source code (all via environment variables)
- [ ] No stack traces in production responses
- [ ] HTTPS enforced in production
- [ ] Session cookies HttpOnly + Secure + SameSite
- [ ] CORS configured for production domain only

### 20.9 UI/UX Quality

- [ ] Every page has skeleton loading state (not blank white screen)
- [ ] Every page has empty state with icon + message + CTA
- [ ] Every page has error state with user-friendly message
- [ ] All colors use theme tokens (no hardcoded `gray-900`, `blue-600` etc.)
- [ ] Dark mode works on every page
- [ ] Mobile responsive on every page
- [ ] Framer Motion animations on page load
- [ ] Hover effects on interactive cards
- [ ] Progress bar animations on balance cards
- [ ] Status badges use semantic color variants
- [ ] No emoji or special characters in production error messages
- [ ] Forms show validation errors inline
- [ ] Buttons show loading state during API calls
- [ ] Navigation shows active page indicator
- [ ] Notification bell shows real unread count

### 20.10 Performance

- [ ] First Contentful Paint < 1.5s
- [ ] Largest Contentful Paint < 2.5s
- [ ] Total Bundle Size < 300kB first load JS
- [ ] API responses < 500ms (p95)
- [ ] Database queries use indexes (company_id, emp_id, date, status)
- [ ] Pagination on all list endpoints (max 100 per page)
- [ ] No N+1 queries (use Prisma includes)
- [ ] Server-side rendering for marketing pages
- [ ] Client-side navigation for portal pages (no full reloads)

---

## 21. Website, SEO & Marketing Readiness

---

### 21.1 Website Essentials

| Item | Status | Location |
|------|--------|----------|
| Landing page live | Required | `/` (app/page.tsx) |
| Open Graph tags | Required | `app/layout.tsx` metadata |
| `og:title` | "Continuum — Enterprise AI Leave Management System" | |
| `og:description` | "Config-driven, multi-tenant HR platform for Indian enterprises. AI-powered leave management, attendance tracking, payroll, and compliance." | |
| `og:image` | OG image (1200x630) at `/og-image.png` | |
| `og:url` | `https://continuum.hr` | |
| Twitter card | `summary_large_image` type | |
| Favicon | `/favicon.ico` + `/apple-touch-icon.png` | public/ |
| Mobile responsive | All pages | Tailwind responsive classes |
| SSL certificate | HTTPS via Vercel | Automatic |
| Download/CTA button | "Get Started" → `/sign-up` | Landing page hero |
| PWA manifest | `public/manifest.json` with app name, icons, theme color | |

### 21.2 SEO Essentials

| Item | Implementation |
|------|----------------|
| `<title>` tag | Dynamic per page via Next.js metadata API |
| `<meta name="description">` | Unique per page, 150-160 chars |
| `robots.txt` | `public/robots.txt` — allows all, disables /api/, /hr/, /employee/, /manager/ |
| `sitemap.xml` | `app/sitemap.ts` — auto-generated with all public routes |
| Structured data (JSON-LD) | SoftwareApplication schema on landing page |
| Canonical URLs | `<link rel="canonical">` on all pages |
| H1 per page | Every page has exactly one `<h1>` |
| Alt text on images | All `<img>` tags have descriptive alt text |
| Internal linking | Landing → Sign Up, Feature pages → Sign Up |
| Page speed | > 90 Lighthouse score target |

### 21.3 Legal Pages

| Page | Route | Content Requirements |
|------|-------|---------------------|
| **Privacy Policy** | `/privacy` | Data collection, storage, usage, third-party services (Supabase, Gmail, Razorpay), user rights, contact info, last updated date |
| **Terms of Service** | `/terms` | Acceptable use, subscription terms, liability limits, termination, refunds, governing law (India), dispute resolution |
| **Cookie Notice** | `/cookies` | Cookie types (essential, analytics), consent mechanism, opt-out instructions |
| **Support** | `/support` | Contact form, email support, FAQ, knowledge base links |
| **Help** | `/help` | Getting started guide, FAQ by role, video tutorials, troubleshooting |

---

## 22. Multi-Company Load Testing Specification

> Simulated enterprise load: 10 companies, 2-5 HR admins each, 30 employees each, all active daily.

---

### 22.1 Test Setup

| Parameter | Value |
|-----------|-------|
| **Companies** | 10 distinct companies |
| **HR/Admin per company** | 2-5 (admin + hr roles) |
| **Employees per company** | 30 |
| **Total users** | ~350 (10 × 35) |
| **Daily active operations** | Clock-in, clock-out, leave requests, approvals, balance checks |
| **Concurrent requests** | Peak 50 (14% of total users hitting API simultaneously) |

### 22.2 Daily Operation Simulation

For each company, each day:

| Action | Volume | Endpoint | Expected |
|--------|--------|----------|----------|
| Clock in (all employees) | 30 | `POST /api/attendance` | 200 OK for all |
| Clock out (all employees) | 30 | `POST /api/attendance` | 200 OK, hours calculated |
| Submit leave (10% of employees) | 3 | `POST /api/leaves/submit` | 200 OK or 400 (violations) |
| Check balance | 30 | `GET /api/leaves/balances` | 200 OK with balances |
| View dashboard | 35 | Various | 200 OK, real data |
| Approve/reject leaves | 2-3 | `PATCH /api/leaves/approve/[id]` | 200 OK, balance updated |
| View leave history | 10 | `GET /api/leaves/list` | 200 OK, paginated |
| View attendance | 15 | `GET /api/attendance` | 200 OK, monthly data |
| View holidays | 5 | `GET /api/company/holidays` | 200 OK |
| View notifications | 20 | `GET /api/notifications` | 200 OK |

### 22.3 Stress Test Scenarios

| Scenario | What to test | Pass criteria |
|----------|-------------|---------------|
| **Concurrent leave submit** | 10 employees from same department submit at once | No race conditions, team coverage rule works correctly |
| **Balance race condition** | Two requests for same employee overlap | Balance never goes negative when disabled; exactly one succeeds if balance insufficient for both |
| **Cross-company isolation** | Company A employee tries to view Company B data | 403 on every attempt |
| **Rate limit under load** | 200 requests/minute from single user | 429 after threshold; legitimate requests from other users unaffected |
| **SLA cron under load** | 100 pending requests past SLA | All escalated within 1 hour |
| **Payroll generation** | Generate payroll for 30 employees simultaneously | All slips created, correct tax calculations, no timeouts |
| **Auth session expiry** | Token expires mid-session | Automatic refresh or graceful redirect to sign-in |

### 22.4 Expected Failure Modes & Recovery

| Failure | Expected Behavior |
|---------|-------------------|
| Database connection pool exhausted | Retry with backoff, 503 after 3 retries |
| Constraint engine down | Fail closed (reject leave request with "evaluation unavailable" message) |
| Email service timeout | Log warning, queue for retry, don't block API response |
| Redis unavailable (if configured) | Fall back to in-memory rate limiting |
| Pusher unavailable | Notifications still created in DB; real-time delivery fails gracefully |

---

## 23. API Endpoint Complete Reference

> Every endpoint in the system with method, path, authentication, request body, and response format.

---

### 23.1 Authentication Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `POST` | `/api/auth/register` | Supabase session | `{ company_name, industry, size, timezone, first_name, last_name }` | `{ company_id, employee_id, join_code }` |
| `POST` | `/api/auth/join` | Supabase session | `{ company_code, first_name, last_name, role? }` | `{ employee_id, company_id, company_name }` |
| `GET` | `/api/auth/me` | Supabase session | — | `{ id, first_name, last_name, email, primary_role, company }` |
| `POST` | `/api/auth/session` | Firebase token | `{ token }` | Sets HttpOnly cookie |
| `DELETE` | `/api/auth/session` | Any | — | Clears auth cookie |
| `GET` | `/api/auth/firebase-check` | None | — | `{ configured: bool }` |

### 23.2 Leave Management Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `POST` | `/api/leaves/submit` | Employee | `{ leave_type, start_date, end_date, reason, is_half_day?, attachment? }` | `{ request_id, status, constraint_result }` |
| `GET` | `/api/leaves/balances` | Any auth | — | `{ year, balances: [{ leave_type, annual, carried, used, pending, remaining }] }` |
| `GET` | `/api/leaves/list` | Any auth | `?page&limit&status&year&emp_id` | `{ requests: [], pagination: { page, limit, total, pages } }` |
| `PATCH` | `/api/leaves/approve/[requestId]` | Manager/HR | `{ comments? }` | `{ request }` |
| `PATCH` | `/api/leaves/reject/[requestId]` | Manager/HR | `{ comments }` | `{ request }` |
| `PATCH` | `/api/leaves/cancel/[requestId]` | Employee/HR | `{ reason? }` | `{ request }` |

### 23.3 Employee Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `GET` | `/api/employees` | Manager+ | `?page&limit&search&status&department&role` | `{ employees: [], pagination }` |
| `GET` | `/api/employees/me` | Any auth | — | Full employee profile |
| `PATCH` | `/api/employees/me` | Any auth | `{ phone?, department?, designation? }` | Updated profile |

### 23.4 Attendance Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `GET` | `/api/attendance` | Any auth | `?month&year&limit` | `{ records: [], summary: { presentDays, wfhDays, totalHours, ... } }` |
| `POST` | `/api/attendance` | Any auth | `{ action: 'check_in'/'check_out', is_wfh? }` | `{ attendance }` |

### 23.5 Company Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `GET` | `/api/company/leave-types` | Any auth | — | `{ leave_types: [] }` |
| `GET` | `/api/company/holidays` | Any auth | — | `{ holidays: [] }` |

### 23.6 HR Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `POST` | `/api/hr/adjust-balance` | HR/Admin | `{ emp_id, leave_type, adjustment, reason }` | `{ balance }` |
| `POST` | `/api/hr/approve-registration` | HR/Admin | `{ emp_id, action: 'approve'/'reject', reason? }` | Updated employee |
| `GET/POST` | `/api/hr/policy` | HR/Admin | GET: list policies; POST: update policy | Policy data |
| `GET/POST` | `/api/hr/settings` | HR/Admin | GET: company settings; POST: update settings | Settings data |

### 23.7 System Endpoints

| Method | Path | Auth | Request | Response |
|--------|------|------|---------|----------|
| `GET` | `/api/health` | None | — | `{ status, db, email, constraint_engine }` |
| `GET/POST` | `/api/email/test` | Admin | POST: `{ to }` | `{ success, messageId }` |
| `GET` | `/api/security/env-check` | Admin | — | `{ configured_vars, missing_vars, audit_chain_valid }` |
| `POST` | `/api/security/otp` | Any auth | `{ action, method?: 'generate'/'verify', otp? }` | `{ sent }` or `{ valid }` |
| `GET` | `/api/cron/sla-check` | CRON_SECRET | — | `{ escalated_count }` |
| `GET` | `/api/enterprise/metrics` | Admin | — | Prometheus text format |
| `POST` | `/api/onboarding/complete` | Admin | Full onboarding config JSON | `{ success, join_code }` |
| `POST` | `/api/payroll/generate` | HR/Admin | `{ month, year }` | `{ payroll_run }` |
| `POST` | `/api/payroll/approve` | HR/Admin | `{ payroll_run_id }` | `{ payroll_run }` |
| `GET` | `/api/reports/leave-summary` | Manager+ | `?year` | `{ monthly_trend, by_type, by_status, top_takers }` |
| `GET/POST` | `/api/notifications` | Any auth | GET: `?limit&unread`; POST: create | `{ notifications: [] }` |
| `PATCH` | `/api/notifications/[id]/read` | Any auth | — | `{ success }` |
| `POST` | `/api/notifications/read-all` | Any auth | — | `{ count }` |

---

## 24. Deployment & Production Checklist

---

### 24.1 Pre-Deployment

| Step | Command/Action | Verification |
|------|---------------|-------------|
| Install dependencies | `npm install` | No errors, lock file updated |
| Generate Prisma client | `npx prisma generate` | Client generated in `node_modules/.prisma` |
| Push DB schema | `npx prisma db push` | All 35+ models created in PostgreSQL |
| Build project | `npx next build` | "Compiled successfully", no type errors |
| Run tests | `npm test` | All tests pass |
| Check environment | `GET /api/security/env-check` | All required vars present |
| Test email | `POST /api/email/test` | Email delivered to test address |
| Test constraint engine | `GET http://localhost:8001/health` | `{ status: "healthy" }` |

### 24.2 Vercel Deployment (Frontend)

```bash
# Install Vercel CLI
npm i -g vercel

# Link project
vercel link

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add DATABASE_URL
vercel env add DIRECT_URL
vercel env add GMAIL_USER
vercel env add GMAIL_APP_PASSWORD
vercel env add CRON_SECRET
# ... all required env vars

# Deploy
vercel --prod
```

### 24.3 Render Deployment (Constraint Engine)

```bash
# render.yaml in web/backend/ handles config
# Push to GitHub → Render auto-deploys from render.yaml
# Or manual:
# 1. Create Web Service on Render
# 2. Set root directory: web/backend
# 3. Build command: pip install -r requirements.txt
# 4. Start command: gunicorn constraint_engine:app --bind 0.0.0.0:8001
# 5. Set DATABASE_URL environment variable
```

### 24.4 Post-Deployment Verification

| Check | How | Expected |
|-------|-----|----------|
| App loads | Visit production URL | Landing page renders |
| Auth works | Sign up → Sign in | Redirects to correct portal |
| API healthy | `GET /api/health` | `{ status: "ok" }` |
| DB connected | Create test company | Company appears in DB |
| Email works | `POST /api/email/test` | Email delivered |
| Constraint engine | Submit leave request | Constraint evaluation completes |
| HTTPS active | Check browser padlock | Valid SSL certificate |
| Security headers | `curl -I` production URL | CSP, HSTS, X-Frame present |

### 24.5 Production Monitoring

| Tool | URL | Purpose |
|------|-----|---------|
| Health check | `GET /api/health` | Load balancer health probe |
| Prometheus metrics | `GET /api/enterprise/metrics` | Application metrics |
| Grafana dashboard | `monitoring/grafana/dashboards/` | Visual metrics |
| Vercel analytics | Vercel dashboard | Frontend performance |
| Supabase dashboard | `app.supabase.com` | Database monitoring, auth logs |

---

## 25. Glossary

| Term | Definition |
|------|-----------|
| **Company** | A tenant in the multi-tenant system. Each company has isolated data, policies, and employees |
| **Join Code** | 8-character alphanumeric code (e.g., `A1B2C3D4`) used by employees to join a company during sign-up |
| **Leave Balance** | Per-employee, per-leave-type, per-year ledger tracking annual entitlement, used, pending, carried forward, and remaining days |
| **Constraint Policy** | A versioned snapshot of all active leave rules for a company, stored as JSON with timestamp |
| **Constraint Engine** | Python Flask service that evaluates leave requests against 13+ configurable rules |
| **SLA** | Service Level Agreement — maximum hours a leave request can remain pending before auto-escalation |
| **Sandwich Rule** | Leave policy rule where weekends/holidays falling between two leave days are counted as leave |
| **RBAC** | Role-Based Access Control — 6 roles with 40+ granular permission codes |
| **Audit Trail** | Immutable SHA-256 hash-chained log of every data-changing operation in the system |
| **Onboarding** | 6-step wizard where company admin configures policies, leave types, holidays, and notifications |
| **Accrual** | Periodic credit of leave days to employee balance (monthly/quarterly/yearly via cron) |
| **Carry Forward** | Unused leave days from one year transferred to the next, subject to per-type limits |
| **Encashment** | Conversion of unused leave days to monetary compensation |
| **LWP** | Leave Without Pay — leave type with infinite quota but no salary |
| **Comp Off** | Compensatory off — leave earned by working on holidays/weekends |
| **Pro-rata** | Proportional leave allocation for mid-year joiners based on remaining months |

---

## Contact

**Continuum** — Modern HR for Startups
- Website: [continuum.hr](https://continuum.hr)
- Repository: [github.com/sreenidhis29/tetradeck_saas](https://github.com/sreenidhis29/tetradeck_saas)

---

## 18. Implementation Audit & Feature Checklist

> Full audit of every database model, API route, and UI page — what's done, what's partial, and what's missing. Used as the master checklist for layered implementation.

### 18.1 Database Models Inventory

#### Actively Used (19 models — have API routes and/or UI)

| # | Model | Used By | Status |
|---|-------|---------|--------|
| 1 | Company | Onboarding, settings, multi-tenant core | COMPLETE |
| 2 | Employee | Auth, profiles, list (read-only) | PARTIAL — no create/edit/deactivate API |
| 3 | LeaveType | Onboarding setup, leave forms | PARTIAL — no post-onboarding CRUD |
| 4 | LeaveBalance | Dashboard display, leave submission | COMPLETE |
| 5 | LeaveRequest | Submit, approve, reject, cancel, list | COMPLETE |
| 6 | LeaveRule | Constraint engine rules | COMPLETE |
| 7 | ConstraintPolicy | Policy versioning | COMPLETE |
| 8 | Attendance | Check-in/out, daily log | PARTIAL — no regularization |
| 9 | PublicHoliday | Holiday list (GET only) | PARTIAL — no CRUD |
| 10 | CompanySettings | HR settings page | COMPLETE |
| 11 | Notification | Bell dropdown, in-app alerts | COMPLETE |
| 12 | AuditLog | Logged from audit.ts | PARTIAL — no viewer UI |
| 13 | SettingsAuditLog | HR settings changes | PARTIAL — no viewer UI |
| 14 | OtpToken | Security OTP generation | COMPLETE |
| 15 | PayrollRun | Payroll generate/approve APIs | PARTIAL — basic UI only |
| 16 | PayrollSlip | Generated with payroll runs | PARTIAL — no employee view |
| 17 | OrganizationUnit | Org chart display | PARTIAL — read-only |
| 18 | Permission | RBAC seed data | COMPLETE |
| 19 | RolePermission | RBAC enforcement | COMPLETE |

#### Schema-Only Models (26 models — no API, no UI)

| # | Model | Intended Purpose | Priority |
|---|-------|-----------------|----------|
| 1 | LeaveEncashment | Encash unused leave days | HIGH |
| 2 | AttendanceRegularization | Correct attendance entries | HIGH |
| 3 | ApprovalHierarchy | Multi-level approval chains | HIGH |
| 4 | SalaryStructure | Employee salary breakdown | MEDIUM |
| 5 | SalaryComponent | Custom salary components | MEDIUM |
| 6 | SalaryRevision | Salary change history | MEDIUM |
| 7 | Document | Employee document management | HIGH |
| 8 | Reimbursement | Expense claims | MEDIUM |
| 9 | EmployeeMovement | Transfers, promotions | LOW |
| 10 | EmployeeStatusHistory | Employee lifecycle tracking | MEDIUM |
| 11 | ExitChecklist | Offboarding workflow | LOW |
| 12 | Shift | Shift definitions | MEDIUM |
| 13 | EmployeeShift | Shift assignments | MEDIUM |
| 14 | NotificationTemplate | Custom notification templates | MEDIUM |
| 15 | NotificationPreference | Per-employee notification settings | HIGH |
| 16 | JobLevel | Organizational grade levels | LOW |
| 17 | Subscription | SaaS billing | LOW |
| 18 | Payment | Payment records | LOW |
| 19 | UsageRecord | Platform usage metrics | LOW |
| 20 | ApiKey | API key management | LOW |
| 21 | PricingPlan | Pricing tier definitions | LOW |
| 22 | Waitlist | Marketing waitlist | LOW |
| 23 | Testimonial | Marketing testimonials | LOW |
| 24 | SystemIncident | Platform incidents | LOW |
| 25 | UptimeRecord | Service uptime tracking | LOW |
| 26 | PlatformStats | Platform-wide statistics | LOW |

---

### 18.2 API Routes Audit

#### Authentication & Session (10 routes)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/auth/register` | POST | COMPLETE | Firebase + Prisma user creation |
| `/api/auth/join` | POST | COMPLETE | Join company via code |
| `/api/auth/session` | GET | COMPLETE | Session validation |
| `/api/auth/me` | GET | COMPLETE | Current user profile |
| `/api/auth/callback` | GET | COMPLETE | OAuth callback |
| `/api/auth/firebase-check` | GET | COMPLETE | Firebase connectivity test |
| `/api/auth/test-firebase` | GET | DEV ONLY | Dev testing route |
| `/api/auth/test-signup-flow` | GET | DEV ONLY | Dev testing route |
| `/api/auth/dev-create-user` | POST | DEV ONLY | Dev user creation |
| `/api/hr/approve-registration` | POST | COMPLETE | HR approves new employee |

#### Leave Management (7 routes)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/leaves/submit` | POST | COMPLETE | Constraint engine + SLA + email |
| `/api/leaves/approve/[requestId]` | PATCH | COMPLETE | Balance update + notification |
| `/api/leaves/reject/[requestId]` | PATCH | COMPLETE | With notification |
| `/api/leaves/cancel/[requestId]` | PATCH | COMPLETE | Balance restoration |
| `/api/leaves/list` | GET | COMPLETE | Filterable, paginated |
| `/api/leaves/balances` | GET | COMPLETE | Per-employee balances |
| `/api/leaves/check-constraints` | POST | COMPLETE | Pre-submit constraint check |

#### Company & Config (3 routes)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/company/holidays` | GET | PARTIAL | **Missing: POST, PUT, DELETE** |
| `/api/company/leave-types` | GET | PARTIAL | **Missing: POST, PUT, DELETE** |
| `/api/hr/policy` | GET | COMPLETE | Policy settings |

#### Employee Management (2 routes existing, 4 routes missing)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/employees` | GET | COMPLETE | Paginated, filtered list |
| `/api/employees/me` | GET | COMPLETE | Current employee profile |
| `/api/employees` | POST | **MISSING** | Create employee |
| `/api/employees/[id]` | PUT | **MISSING** | Edit employee |
| `/api/employees/[id]` | DELETE | **MISSING** | Deactivate/terminate |
| `/api/employees/[id]/role` | PATCH | **MISSING** | Role change |

#### HR Operations (4 routes)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/hr/settings` | GET/PUT | COMPLETE | Company settings CRUD |
| `/api/hr/attendance` | GET | COMPLETE | Company-wide attendance |
| `/api/hr/organization` | GET | COMPLETE | Org chart data |
| `/api/hr/adjust-balance` | POST | COMPLETE | Manual balance adjustment |

#### Payroll (2 routes existing, 2 missing)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/payroll/generate` | POST | PARTIAL | Generates run + slips |
| `/api/payroll/approve` | POST | PARTIAL | Status transitions |
| `/api/payroll/slips/[empId]` | GET | **MISSING** | Employee payslip view |
| `/api/payroll/history` | GET | **MISSING** | Payroll history |

#### Notifications (3 routes)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/notifications` | GET | COMPLETE | Paginated list |
| `/api/notifications/[notifId]/read` | PATCH | COMPLETE | Mark single read |
| `/api/notifications/read-all` | PATCH | COMPLETE | Mark all read |

#### Reports (1 route existing, 2 missing)

| Route | Method | Status | Notes |
|-------|--------|--------|-------|
| `/api/reports/leave-summary` | GET | PARTIAL | Basic aggregation |
| `/api/reports/attendance-summary` | GET | **MISSING** | Attendance report |
| `/api/reports/department-trends` | GET | **MISSING** | Department analytics |

#### Critical Missing API Routes

| Route | Method | Purpose | Priority |
|-------|--------|---------|----------|
| `/api/company/holidays` | POST/PUT/DELETE | Holiday CRUD | **P0** |
| `/api/company/leave-types` | POST/PUT/DELETE | Leave type management | **P0** |
| `/api/employees` | POST | Create employee | **P0** |
| `/api/employees/[id]` | PUT/DELETE | Edit/deactivate employee | **P0** |
| `/api/employees/[id]/role` | PATCH | Change employee role | **P1** |
| `/api/attendance/regularize` | POST | Regularization request | **P1** |
| `/api/attendance/regularize/[id]/approve` | PATCH | Approve regularization | **P1** |
| `/api/leaves/encash` | POST | Leave encashment | **P1** |
| `/api/leaves/bulk-approve` | POST | Bulk approve leaves | **P1** |
| `/api/documents/upload` | POST | Document upload | **P2** |
| `/api/documents/[id]` | GET/DELETE | Document operations | **P2** |
| `/api/audit-logs` | GET | Audit log viewer | **P2** |
| `/api/payroll/slips/[empId]` | GET | Employee payslip view | **P2** |
| `/api/shifts` | CRUD | Shift management | **P3** |
| `/api/reimbursements` | CRUD | Expense reimbursements | **P3** |

---

### 18.3 Page-by-Page Feature Audit

#### Employee Portal (`/employee/*`)

##### Dashboard (`/employee/dashboard`)
- [x] Leave balance cards with used/remaining/total
- [x] Quick actions panel (apply leave, view history, attendance, documents)
- [x] Upcoming holidays sidebar
- [x] Recent leave requests list
- [x] Pusher real-time updates
- [ ] Pending approvals counter (when user is also a manager)
- [ ] Calendar mini-view showing days off
- [ ] Announcement/news feed from HR

##### Request Leave (`/employee/request-leave`)
- [x] Leave type selection (from company config)
- [x] Date range picker with half-day toggle
- [x] Constraint engine pre-check before submission
- [x] Reason/notes field
- [x] Form validation and error display
- [x] Success/failure feedback with constraint details
- [ ] File attachment upload (medical certificates etc.)
- [ ] Leave balance preview (show remaining after this request)
- [ ] Team calendar check (who else is on leave)
- [ ] Draft save functionality (status=draft exists in schema)
- [ ] Multi-day breakdown view

##### Leave History (`/employee/leave-history`)
- [x] Leave requests list with status badges
- [x] Status filters (all, pending, approved, rejected, cancelled)
- [x] Cancel pending request
- [x] Pagination
- [ ] Date range filter
- [ ] Leave type filter
- [ ] Export to CSV/PDF
- [ ] Show approver comments inline
- [ ] Request details modal with full timeline

##### Attendance (`/employee/attendance`)
- [x] Daily check-in/check-out buttons
- [x] Today's status display
- [x] Monthly attendance summary table
- [x] Status indicators (present, absent, half-day, WFH)
- [ ] Monthly statistics summary card
- [ ] Attendance regularization request form
- [ ] Calendar heat-map view
- [ ] Late arrival trend chart

##### Documents (`/employee/documents`)
- [x] Static document list display (placeholder)
- [ ] **Document upload/download functionality**
- [ ] Document categories (personal, company, payslips)
- [ ] Document status tracking
- [ ] Document expiry alerts

##### Profile (`/employee/profile`)
- [x] Display personal information
- [x] Display employment details
- [x] Edit mode toggle
- [ ] **Profile picture upload**
- [ ] **Emergency contact management**
- [ ] **Bank details section**
- [ ] **Address management**

##### Settings (`/employee/settings`)
- [x] Theme toggle (light/dark/system)
- [x] Display preferences UI
- [ ] **Notification preferences (DB-persisted)**
- [ ] Password change
- [ ] Two-factor authentication toggle
- [ ] Language/locale preference

---

#### HR Portal (`/hr/*`)

##### Dashboard (`/hr/dashboard`)
- [x] Metric cards (total employees, pending requests, attendance, departments)
- [x] Pending leave requests summary
- [x] Quick actions (manage employees, process payroll, configure policy)
- [x] Pusher real-time updates
- [ ] Leave trend charts
- [ ] Department-wise leave utilization widget
- [ ] Upcoming holidays widget
- [ ] SLA breach alerts widget

##### Employees (`/hr/employees`)
- [x] Paginated employee table with search
- [x] Status and department filters
- [x] Employee detail view (expandable rows)
- [ ] **Add new employee form/modal**
- [ ] **Edit employee details**
- [ ] **Change employee role**
- [ ] **Terminate/Deactivate with reason**
- [ ] **Assign manager**
- [ ] **Export employee list to CSV**
- [ ] Bulk import employees via CSV
- [ ] Employee profile page (/hr/employees/[id])

##### Leave Requests (`/hr/leave-requests`)
- [x] All company leave requests table
- [x] Status filters
- [x] Approve/Reject individual requests with comments
- [x] SLA breach indicators
- [ ] **Bulk approve/reject**
- [ ] Date range filter
- [ ] Department filter
- [ ] Leave type filter
- [ ] Export to CSV
- [ ] Conflict detection

##### Attendance (`/hr/attendance`)
- [x] Company-wide attendance table
- [x] Date filter
- [x] Status summary
- [ ] **Regularization approval queue**
- [ ] Bulk mark attendance
- [ ] Late arrivals report
- [ ] Export attendance report

##### Payroll (`/hr/payroll`)
- [x] Payroll run generation UI
- [x] Run status display
- [x] Basic approve/process workflow
- [ ] **Payroll history (past runs)**
- [ ] **Individual payslip view and download**
- [ ] **Salary component configuration**
- [ ] **Salary revision workflow**
- [ ] **Statutory compliance verification**
- [ ] Bulk payslip PDF generation

##### Policy Settings (`/hr/policy-settings`)
- [x] Constraint engine rule list with enable/disable
- [x] Leave policy summary
- [x] Rule priority display
- [ ] **Add/Edit/Delete leave types**
- [ ] **Add/Edit/Delete holidays**
- [ ] **Leave accrual configuration**
- [ ] **Create/edit constraint rules**
- [ ] Approval workflow configuration

##### Reports (`/hr/reports`)
- [x] Leave summary report with basic charts
- [x] Department breakdown
- [ ] **Attendance summary report**
- [ ] **Employee headcount trend**
- [ ] **Monthly payroll summary**
- [ ] **Custom date range for all reports**
- [ ] **Export all reports to CSV/PDF**

##### Organization (`/hr/organization`)
- [x] Organization tree/chart display
- [x] Department listing
- [ ] **Add/Edit/Delete organization units**
- [ ] **Assign unit heads**
- [ ] **Cost center management**

##### Settings (`/hr/settings`)
- [x] Company profile
- [x] Work schedule configuration
- [x] Grace period and half-day settings
- [x] SLA configuration
- [x] Join code management
- [x] Notification settings (email config)
- [x] OTP verification for sensitive changes
- [x] Settings audit log display
- [ ] **Approval workflow configuration**
- [ ] **Integration settings (Slack, Teams, Calendar)**

---

#### Manager Portal (`/manager/*`)

##### Dashboard (`/manager/dashboard`)
- [x] Team metrics cards
- [x] Pending approval list
- [x] Pusher real-time updates
- [ ] **Team availability calendar widget**
- [ ] **Leave trend charts for team**
- [ ] **Quick approve from dashboard**

##### Approvals (`/manager/approvals`)
- [x] Pending leave requests from direct reports
- [x] Approve/reject with comments
- [x] Constraint engine recommendation display
- [ ] **Bulk approve/reject**
- [ ] **Calendar conflict view**
- [ ] **Manager delegation (proxy approver)**
- [ ] **Approval history tab**
- [ ] Filter by leave type, employee

##### Team Attendance (`/manager/team-attendance`)
- [x] Daily team attendance table
- [x] Date navigation
- [x] Status indicators
- [ ] **Weekly/Monthly summary view**
- [ ] **Regularization approval queue**
- [ ] **Export team attendance**

##### Team (`/manager/team`)
- [x] Team member list with roles and status
- [ ] **Team member detail view**
- [ ] **Leave balance overview per member**
- [ ] **Performance/attendance summary per member**

##### Reports (`/manager/reports`)
- [x] Basic team report display
- [ ] **Team leave utilization report**
- [ ] **Team attendance summary**
- [ ] **Export reports to CSV/PDF**
- [ ] **Custom date range selector**

##### Settings (`/manager/settings`)
- [x] Theme toggle
- [x] Display preferences
- [ ] **Notification preferences (DB-persisted)**
- [ ] **Delegation settings**

---

#### Missing Pages (Need Creation)

| Page | Path | Priority | Description |
|------|------|----------|-------------|
| Holiday Management | `/hr/holidays` | **P0** | Add/edit/delete company holidays |
| Team Calendar | `/manager/team-calendar` | **P0** | Visual team leave schedule |
| Audit Log Viewer | `/hr/audit-logs` | **P1** | Searchable audit log table |
| Employee Detail | `/hr/employees/[id]` | **P1** | Full employee profile for HR |

---

### 18.4 Implementation Layers

#### Layer 1: Core CRUD (Foundation)
> Complete read-only APIs with full CRUD. Without these, HR cannot manage configuration after onboarding.

| # | Task | Files | API Changes |
|---|------|-------|------------|
| 1.1 | Holiday CRUD API | `api/company/holidays/route.ts` | Add POST, PUT, DELETE |
| 1.2 | Holiday Management Page | `hr/(main)/holidays/page.tsx` (new) | New page with table + forms |
| 1.3 | Leave Type CRUD API | `api/company/leave-types/route.ts` | Add POST, PUT, DELETE |
| 1.4 | Leave Type Management UI | `hr/(main)/policy-settings/page.tsx` | Add CRUD forms |
| 1.5 | Employee CRUD API | `api/employees/route.ts` + `api/employees/[id]/route.ts` (new) | Add POST, PUT, DELETE |
| 1.6 | Employee Management UI | `hr/(main)/employees/page.tsx` | Add create/edit/deactivate modals |
| 1.7 | Employee Detail Page | `hr/(main)/employees/[id]/page.tsx` (new) | Full profile view for HR |
| 1.8 | Manager Team Calendar | `manager/(main)/team-calendar/page.tsx` (new) | Visual team leave calendar |

#### Layer 2: Manager Portal & Approval Workflow
> Enterprise-grade team management with bulk operations and delegation.

| # | Task | Files | API Changes |
|---|------|-------|------------|
| 2.1 | Bulk approve/reject API | `api/leaves/bulk-approve/route.ts` (new) | Batch endpoint |
| 2.2 | Bulk approve UI (manager) | `manager/(main)/approvals/page.tsx` | Checkbox + bulk actions |
| 2.3 | Approval history tab | `manager/(main)/approvals/page.tsx` | Tabs: pending / history |
| 2.4 | Manager delegation API | `api/manager/delegate/route.ts` (new) | Proxy approver |
| 2.5 | Team member detail view | `manager/(main)/team/page.tsx` | Expandable with balances |
| 2.6 | Team reports with date range | `manager/(main)/reports/page.tsx` | Date picker + charts |
| 2.7 | Quick approve from dashboard | `manager/(main)/dashboard/page.tsx` | Inline approve/reject |
| 2.8 | HR bulk approve/reject | `hr/(main)/leave-requests/page.tsx` | Same pattern |

#### Layer 3: Audit, Security & Compliance
> Enterprise compliance: audit trails, attendance regularization, org unit management.

| # | Task | Files | API Changes |
|---|------|-------|------------|
| 3.1 | Audit log viewer API | `api/audit-logs/route.ts` (new) | Filtered, paginated |
| 3.2 | Audit log viewer page | `hr/(main)/audit-logs/page.tsx` (new) | Table with filters |
| 3.3 | Notification prefs API | `api/notifications/preferences/route.ts` (new) | GET/PUT prefs |
| 3.4 | Notification prefs UI | All settings pages | DB-backed toggles |
| 3.5 | Attendance regularization API | `api/attendance/regularize/route.ts` (new) | Submit + approve |
| 3.6 | Regularization UI | Attendance pages | Request + approval queue |
| 3.7 | Organization unit CRUD | `api/hr/organization/route.ts` | Add POST, PUT, DELETE |
| 3.8 | Organization management UI | `hr/(main)/organization/page.tsx` | Add/edit/delete units |

#### Layer 4: Advanced Features & Polish
> Document management, payroll lifecycle, reporting, encashment.

| # | Task | Files | API Changes |
|---|------|-------|------------|
| 4.1 | Document upload/download API | `api/documents/route.ts` (new) | File storage |
| 4.2 | Document management UI | Documents pages | Upload, view, verify |
| 4.3 | Payroll history API | `api/payroll/history/route.ts` (new) | Past runs list |
| 4.4 | Employee payslip view | `employee/(main)/payslips/page.tsx` (new) | View + download |
| 4.5 | Enhanced reports | New report APIs | Attendance aggregation |
| 4.6 | Report export utility | `lib/report-export.ts` (new) | CSV/PDF generation |
| 4.7 | Leave history enhancements | Leave history page | Filters + export |
| 4.8 | Leave encashment API | `api/leaves/encash/route.ts` (new) | Encashment flow |
| 4.9 | Profile enhancements | Profile page | Emergency contacts, bank |
| 4.10 | HR dashboard widgets | HR dashboard | Charts, SLA alerts |

---

### 18.5 Implementation Status Scorecard

| Category | Score | Details |
|----------|-------|---------|
| **Leave Management Core** | 85% | Submit/approve/reject/cancel/constraints all working. Missing: bulk approve, encashment, attachments, draft save. |
| **Employee Management** | 30% | Read-only list. No create, edit, terminate, role change. |
| **Attendance** | 40% | Basic check-in/out. No regularization, no monthly stats, no export. |
| **Payroll** | 20% | Generate/approve APIs exist. UI basic. No history, no payslip view. |
| **Holiday Management** | 15% | GET-only. No CRUD post-onboarding. No dedicated page. |
| **Leave Type Management** | 15% | GET-only. Cannot add/edit/delete after onboarding. |
| **Manager Portal** | 35% | Basic approve/reject. No bulk, no team calendar, no delegation. |
| **Documents** | 5% | Schema exists. UI placeholder. No upload/download. |
| **Organization** | 25% | Read-only tree. No CRUD for units. |
| **Reports & Analytics** | 20% | Basic leave summary only. No attendance, no export, no date range. |
| **Notifications** | 60% | In-app works. Preferences not in DB. |
| **Audit & Compliance** | 40% | Logs written. No viewer UI. |
| **Security** | 50% | OTP for settings. No 2FA login. RBAC exists, no management UI. |
| **Shifts** | 0% | Schema only. |
| **Reimbursements** | 0% | Schema only. |
| **Employee Lifecycle** | 0% | Schema only (movements, status history, exit checklist). |

**Overall Platform Completion: ~35%**

---

### 18.6 Quality Checklist (Enterprise Standard)

Every feature must meet ALL of:

- [ ] **API**: try/catch with appropriate HTTP status codes
- [ ] **API**: `getAuthEmployee()` on all authenticated endpoints
- [ ] **API**: `requireRole()` for role-restricted endpoints
- [ ] **API**: `checkApiRateLimit()` on all endpoints
- [ ] **API**: `writeAuditLog()` for all state-changing operations
- [ ] **API**: Input validation (types, required fields, boundaries)
- [ ] **UI**: Loading skeleton states
- [ ] **UI**: Empty states with actionable messaging
- [ ] **UI**: Error states with retry
- [ ] **UI**: Responsive (mobile, tablet, desktop)
- [ ] **UI**: Dark mode support
- [ ] **UI**: Design system components (Card, Button, Badge, Input)
- [ ] **UI**: Toast notifications for success/error
- [ ] **UI**: Accessible (keyboard nav, ARIA labels)
- [ ] **Data**: Pagination for list endpoints
- [ ] **Data**: Search and filter functionality
- [ ] **Data**: Pusher real-time updates where relevant
- [ ] **Security**: Tenant isolation (`company_id` checks)
- [ ] **Security**: Soft delete (`deleted_at`) not hard delete

---

## 26. Definitive Implementation Roadmap — Layered Build Plan

> Accurate as of 2026-03-09. Every feature audited against actual source code. Each layer is self-contained and testable.

---

### 26.1 Current Implementation Status (Verified)

| Portal/Feature | Completion | What Works | What's Missing |
|----------------|-----------|------------|----------------|
| **Auth & RBAC** | 90% | Sign-in, sign-up, role redirect, session mgmt, RBAC enforcement | No Keycloak (uses Supabase+Firebase), no 2FA login |
| **Onboarding Wizard** | 95% | All 6 steps, atomic save, join code generation | Minor: no logo upload |
| **Employee Dashboard** | 90% | Real balances, holidays, recent requests, Pusher | No calendar mini-view, no announcements |
| **Leave Request** | 95% | Constraint engine, real-time pre-check, form validation | No file attachment, no draft save, no team calendar check |
| **Leave History** | 85% | Paginated list, status filters, cancel pending | No date/type filter, no export, no detail modal |
| **Employee Attendance** | 80% | Clock in/out (office+WFH), monthly log, leave balances | No regularization, no heat-map calendar |
| **Employee Documents** | 0% | PLACEHOLDER ("Coming Soon") | Everything - upload, download, categories, status |
| **Employee Profile** | 75% | Display + inline edit (phone/dept/designation) | No photo, no emergency contacts, no bank details |
| **Employee Settings** | 30% | Theme toggle, password reset via Firebase | Notification prefs are localStorage-only, no 2FA, no i18n |
| **Manager Dashboard** | 85% | Real metrics, pending list, approve/reject | No team calendar widget, no trend charts |
| **Manager Approvals** | 90% | Full approve/reject, constraint results, AI recommendation | No bulk operations, no approval history, no filters |
| **Manager Team** | 40% | Lists employees (but ALL, not filtered to reports) | No direct-report filtering, no detail view, no balances |
| **Manager Team Attendance** | 50% | Inferred from leave data (not real check-ins) | Not using actual attendance records, not scoped to team |
| **Manager Team Calendar** | 95% | Full calendar, holidays, color-coded leaves | Enterprise-grade - done |
| **Manager Reports** | 40% | Basic status breakdown | No charts, no export, no date range |
| **Manager Settings** | 30% | Theme, password reset | Notification prefs localStorage-only, 2FA placeholder |
| **HR Dashboard** | 85% | Real metrics, recent requests, quick actions | No trend charts, no SLA widget |
| **HR Employees** | 90% | Full CRUD, registration approval, search, filters | Enterprise-grade - mostly done |
| **HR Leave Requests** | 80% | All requests, approve/reject, status filters | No comments input, no bulk ops, no constraint display |
| **HR Reports** | 80% | Year selector, charts, CSV export, top takers | No attendance report, no custom date range |
| **HR Payroll** | 25% | Generate button works, basic display | No history, no payslips, no salary structures |
| **HR Policy Settings** | 90% | Rules toggle, leave types CRUD | Enterprise-grade - mostly done |
| **HR Holidays** | 90% | Full CRUD, national/custom distinction | Enterprise-grade - done |
| **HR Attendance** | 85% | Date picker, search, filter, export | No regularization queue |
| **HR Organization** | 50% | Read-only department list | No CRUD for org units, no org chart viz |
| **HR Settings** | 90% | All config server-persisted, join code, inline edit | Enterprise-grade - mostly done |
| **Admin Portal** | 0% | NO SEPARATE ADMIN PORTAL | Admin uses HR portal. Need: audit logs, billing, system config, RBAC editor |
| **Audit Log Viewer** | 0% | Logs written to DB | No viewer page, no search, no export |
| **Billing/Subscriptions** | 0% | Lib files exist (Razorpay/Stripe) | No billing page, no subscription management |
| **Compliance** | 0% | Lib files exist (consent, data-export) | No compliance page, no consent UI |
| **Document Management** | 0% | DB model exists | No API, no upload, no verification flow |
| **Attendance Regularization** | 0% | DB model exists | No API, no request form, no approval queue |
| **Leave Encashment** | 0% | DB model exists | No API, no UI |
| **Employee Movements** | 0% | DB model exists | No API, no transfer/promotion UI |
| **Exit Management** | 0% | DB model exists | No API, no offboarding checklist UI |
| **Shift Management** | 0% | DB model exists | No API, no UI |
| **Salary Structures** | 0% | DB model exists | No API, no salary management UI |
| **Notification Preferences** | 0% | DB model exists | No API to save per-employee preferences |

**Overall Platform Completion: ~40%**

---

### 26.2 Layered Build Plan

#### Layer 3: Manager Portal — Team Scoping & Full Features
> **Goal**: Manager sees ONLY their direct reports. All manager pages use actual team data.

| # | Task | File(s) | What Changes |
|---|------|---------|-------------|
| 3.1 | Fix team page to filter direct reports only | `manager/(main)/team/page.tsx` | Use `manager_id` filter on `/api/employees`, add detail expand, show leave balances |
| 3.2 | Fix team attendance to use real check-in data | `manager/(main)/team-attendance/page.tsx` | Call `/api/hr/attendance` scoped to team, show actual check-in/out times |
| 3.3 | Add approval history tab | `manager/(main)/approvals/page.tsx` | Second tab showing past approved/rejected requests |
| 3.4 | Add bulk approve/reject | `manager/(main)/approvals/page.tsx` | Checkbox selection + batch action buttons |
| 3.5 | Enhance manager reports | `manager/(main)/reports/page.tsx` | Date range picker, bar chart, CSV export |
| 3.6 | Fix manager settings | `manager/(main)/settings/page.tsx` | Server-persisted notification preferences via `/api/notifications/preferences` |
| 3.7 | Add notification preferences API | `api/notifications/preferences/route.ts` (new) | GET/PUT per-employee notification settings |

#### Layer 4: Employee Portal — Complete Self-Service
> **Goal**: Every employee self-service feature fully functional, not placeholder.

| # | Task | File(s) | What Changes |
|---|------|---------|-------------|
| 4.1 | Build document management API | `api/documents/route.ts` (new) | Upload (file URL/metadata), list, download, delete |
| 4.2 | Build documents page | `employee/(main)/documents/page.tsx` | Upload form, category tabs, status badges, download links |
| 4.3 | Fix employee settings | `employee/(main)/settings/page.tsx` | Server-backed notification prefs, remove fake 2FA, remove fake i18n |
| 4.4 | Enhance leave history | `employee/(main)/leave-history/page.tsx` | Date range filter, leave type filter, request detail modal with timeline |
| 4.5 | Add leave request draft save | `employee/(main)/request-leave/page.tsx` | Save as draft (status=draft), resume draft |
| 4.6 | Enhance profile | `employee/(main)/profile/page.tsx` | Emergency contact fields, address section |
| 4.7 | Add attendance regularization | `employee/(main)/attendance/page.tsx` | "Request Regularization" button + form |
| 4.8 | Build attendance regularization API | `api/attendance/regularize/route.ts` (new) | Submit/approve/reject regularization |

#### Layer 5: HR Portal — Full Lifecycle Management
> **Goal**: HR can manage payroll end-to-end, adjust balances via UI, manage org structure.

| # | Task | File(s) | What Changes |
|---|------|---------|-------------|
| 5.1 | Build payroll history API | `api/payroll/history/route.ts` (new) | List past payroll runs with status |
| 5.2 | Build payslip view API | `api/payroll/slips/route.ts` (new) | Get payslips for a run or employee |
| 5.3 | Enhance HR payroll page | `hr/(main)/payroll/page.tsx` | History table, payslip viewer, approve workflow, download |
| 5.4 | Build HR balance adjustment UI | `hr/(main)/leave-requests/page.tsx` or new page | Inline balance adjust with `/api/hr/adjust-balance` |
| 5.5 | Build org unit CRUD API | `api/hr/organization/route.ts` | Add POST/PUT/DELETE for org units |
| 5.6 | Enhance organization page | `hr/(main)/organization/page.tsx` | Add/edit/delete departments, assign heads |
| 5.7 | Add HR leave request comments | `hr/(main)/leave-requests/page.tsx` | Comment input on approve/reject (like manager page) |
| 5.8 | Build leave encashment API | `api/leaves/encash/route.ts` (new) | Request + approve encashment |
| 5.9 | Build leave encashment page | `hr/(main)/leave-encashment/page.tsx` (new) | Encashment requests table + approve/reject |
| 5.10 | Add HR dashboard widgets | `hr/(main)/dashboard/page.tsx` | SLA breach alerts, leave trend chart, department utilization |

#### Layer 6: Admin Features — Audit, Compliance, System Config
> **Goal**: Admins get audit log viewer, system health dashboard, RBAC management.

| # | Task | File(s) | What Changes |
|---|------|---------|-------------|
| 6.1 | Build audit log API | `api/audit-logs/route.ts` (new) | Paginated, filterable audit logs |
| 6.2 | Build audit log viewer page | `hr/(main)/audit-logs/page.tsx` (new) | Table with action type, actor, entity, timestamp, diff view |
| 6.3 | Build system health dashboard | `hr/(main)/system-health/page.tsx` (new) | API health, DB status, constraint engine, email, real-time |
| 6.4 | Add OTP verification UI component | `components/otp-dialog.tsx` (new) | Reusable OTP input modal for destructive operations |
| 6.5 | Wire OTP to destructive actions | Various settings pages | Wrap delete/modify actions with OTP dialog |
| 6.6 | Add RBAC permission viewer | `hr/(main)/security/page.tsx` (new) | View roles, permissions, company overrides |
| 6.7 | Update sidebar nav for admin pages | `hr/(main)/layout.tsx` | Add audit logs, system health, security links |

#### Layer 7: Advanced Features — Movements, Exit, Shifts
> **Goal**: Full employee lifecycle: transfers, promotions, offboarding, shift management.

| # | Task | File(s) | What Changes |
|---|------|---------|-------------|
| 7.1 | Build employee movement API | `api/employees/[id]/movements/route.ts` (new) | Transfer, promotion, dept change with approval |
| 7.2 | Build employee movements page | `hr/(main)/employee-movements/page.tsx` (new) | Movement request + approval workflow |
| 7.3 | Build exit management API | `api/employees/[id]/exit/route.ts` (new) | Exit checklist, status transitions |
| 7.4 | Build exit management page | `hr/(main)/exits/page.tsx` (new) | Exit process workflow, checklist UI |
| 7.5 | Build salary structure API | `api/payroll/salary/route.ts` (new) | Employee salary CRUD |
| 7.6 | Build salary structure page | `hr/(main)/salary-structures/page.tsx` (new) | CTC breakdown, component editor |
| 7.7 | Build reimbursement API | `api/reimbursements/route.ts` (new) | Submit + approve reimbursements |
| 7.8 | Build reimbursement page | `hr/(main)/reimbursements/page.tsx` (new) | Reimbursement management |

#### Layer 8: Enterprise Polish — Export, Analytics, Integration
> **Goal**: CSV/PDF export everywhere, date range on all reports, predictive analytics.

| # | Task | File(s) | What Changes |
|---|------|---------|-------------|
| 8.1 | Build report export utility | `lib/report-export.ts` (new) | CSV generator, PDF support |
| 8.2 | Add export to all report pages | Various report pages | Export CSV/PDF buttons |
| 8.3 | Add date range to all reports | All report pages + APIs | DateRangePicker component, API param |
| 8.4 | Build attendance summary report | `api/reports/attendance-summary/route.ts` (new) | Aggregated attendance stats |
| 8.5 | Build employee payslip page | `employee/(main)/payslips/page.tsx` (new) | View + download monthly payslips |
| 8.6 | Add bulk operations API | `api/leaves/bulk-approve/route.ts` (new) | Batch approve/reject |
| 8.7 | Build comprehensive test suite | `tests/` | Integration tests for all new APIs |

#### Layer 9: End-to-End Testing & Production Readiness
> **Goal**: Every flow tested, every edge case handled, build clean.

| # | Task | What |
|---|------|------|
| 9.1 | Run full build (`next build`) | Fix all TypeScript errors |
| 9.2 | Test all auth flows | Sign-up, sign-in, role redirect, session expiry |
| 9.3 | Test all CRUD operations | Holiday, leave type, employee, attendance, payroll |
| 9.4 | Test constraint engine integration | All 13 rules pass/fail correctly |
| 9.5 | Test multi-tenant isolation | Company A cannot see Company B data |
| 9.6 | Test mobile responsiveness | All pages on 375px, 768px, 1024px viewports |
| 9.7 | Test dark mode | All pages render correctly in dark theme |
| 9.8 | Verify audit trail integrity | SHA-256 chain valid after all operations |
| 9.9 | Performance audit | API response times, bundle sizes |

---

### 26.3 Facility Checklist — What Every Feature MUST Have

> Like a hotel: the room exists, but does it have A/C, hot water, clean linen, WiFi, minibar?

#### Leave Management Facilities
- [x] Apply for leave (basic form)
- [x] Choose leave type from company config
- [x] Date range selection
- [x] Half-day option
- [x] Constraint engine validation before submit
- [x] View leave history with status filter
- [x] Cancel pending request (restores balance)
- [x] Manager approve/reject with comments
- [x] HR approve/reject
- [x] Real-time balance update via Pusher
- [x] Audit log on every state change
- [ ] **File attachment upload (medical certificates)**
- [ ] **Save as draft (resume later)**
- [ ] **Team calendar check (who else is off?)**
- [ ] **Leave extension request (modify approved leave)**
- [ ] **Bulk approve/reject for managers & HR**
- [ ] **Leave encashment request + approval**
- [ ] **Leave request detail modal with full timeline**
- [ ] **Export leave history to CSV**
- [ ] **Date range filter on history page**
- [ ] **Leave type filter on history page**

#### Attendance Facilities
- [x] Clock in (office)
- [x] Clock in (WFH)
- [x] Clock out
- [x] Monthly attendance log
- [x] Summary stats (present days, WFH, hours, %)
- [x] Leave balance display alongside attendance
- [ ] **Attendance regularization (request + approval)**
- [ ] **Calendar heat-map view**
- [ ] **Late arrival tracking & alerts**
- [ ] **Export attendance to CSV**
- [ ] **Manager: View team's actual check-in data (not inferred)**
- [ ] **HR: Regularization approval queue**

#### Employee Self-Service Facilities
- [x] View profile with employment details
- [x] Edit phone, department, designation
- [x] View leave balances
- [x] View upcoming holidays
- [ ] **Upload/download documents (ID, certificates, payslips)**
- [ ] **View monthly payslips**
- [ ] **Emergency contact management**
- [ ] **Server-persisted notification preferences**
- [ ] **Password change (without Firebase hack)**

#### Manager Facilities
- [x] View pending approvals
- [x] Approve/reject with constraint engine display
- [x] View team members (needs scoping fix)
- [x] Team leave calendar
- [ ] **Filter team to direct reports ONLY**
- [ ] **Bulk approve/reject**
- [ ] **Approval history (past decisions)**
- [ ] **Team member detail with balance overview**
- [ ] **Team reports with charts & export**
- [ ] **Manager delegation (proxy approver)**
- [ ] **Server-persisted notification settings**

#### HR/Admin Facilities
- [x] Employee directory with CRUD
- [x] Leave request management
- [x] Policy settings (rules + leave types)
- [x] Holiday management
- [x] Company settings
- [x] Reports with leave analytics
- [x] Attendance overview
- [x] Organization structure view
- [ ] **Payroll full lifecycle (generate → review → approve → paid)**
- [ ] **Payroll history & payslip viewer**
- [ ] **Salary structure management**
- [ ] **Leave balance manual adjustment UI**
- [ ] **Audit log viewer with search & filters**
- [ ] **System health dashboard**
- [ ] **OTP verification on destructive actions (UI component)**
- [ ] **Org unit CRUD (add/edit/delete departments)**
- [ ] **Employee movement management (transfers, promotions)**
- [ ] **Exit management (offboarding workflow)**
- [ ] **Leave encashment approval**
- [ ] **Bulk operations (import/export employees)**
- [ ] **RBAC permission viewer/editor**

#### Notification Facilities
- [x] In-app notification bell with unread count
- [x] Mark single/all as read
- [x] Auto-refresh every 60 seconds
- [ ] **Per-employee notification preferences (DB-persisted)**
- [ ] **Email notification templates management**
- [ ] **Push notification support**

#### Compliance & Security Facilities
- [x] Audit logging with SHA-256 hash chain
- [x] Rate limiting on all endpoints
- [x] Security headers (CSP, HSTS, X-Frame-Options)
- [x] Input sanitization (XSS prevention)
- [x] Soft delete everywhere
- [ ] **Audit log viewer page for admin**
- [ ] **GDPR data export UI**
- [ ] **Consent management UI**
- [ ] **OTP verification dialog component**
- [ ] **2FA setup for user accounts**

---

## 27. Comprehensive Implementation Master Checklist (2026-03-09)

> Full gap analysis comparing README specification against actual codebase. Every item verified file-by-file.

---

### 27.1 MISSING PAGES (18 pages do not exist in codebase)

| # | Page | Path | Priority | Description | Implementation Location |
|---|------|------|----------|-------------|------------------------|
| 1 | **Admin Portal** | `/admin/*` | P0 | Entire admin portal — audit logs, billing, sys config, RBAC editor | `web/app/admin/(main)/` (new directory) |
| 2 | **HR Employee Detail** | `/hr/employees/[id]` | P0 | Full employee profile view for HR: leave ledger, attendance, docs | `web/app/hr/(main)/employees/[id]/page.tsx` (new) |
| 3 | **HR Employee Registrations** | `/hr/employee-registrations` | P1 | Pending employee approval queue | `web/app/hr/(main)/employee-registrations/page.tsx` (new) |
| 4 | **HR Leave Records** | `/hr/leave-records` | P1 | Historical leave data analytics | `web/app/hr/(main)/leave-records/page.tsx` (new) |
| 5 | **HR Leave Encashment** | `/hr/leave-encashment` | P1 | Encashment requests + calculations + approval | `web/app/hr/(main)/leave-encashment/page.tsx` (new) |
| 6 | **HR Escalation** | `/hr/escalation` | P1 | Escalated requests (SLA breached) with override actions | `web/app/hr/(main)/escalation/page.tsx` (new) |
| 7 | **HR Job Levels** | `/hr/job-levels` | P2 | Job level configuration (add/edit/rank) | `web/app/hr/(main)/job-levels/page.tsx` (new) |
| 8 | **HR Approval Hierarchies** | `/hr/approval-hierarchies` | P1 | Approval chain config per employee | `web/app/hr/(main)/approval-hierarchies/page.tsx` (new) |
| 9 | **HR Employee Movements** | `/hr/employee-movements` | P2 | Transfers, promotions, role changes | `web/app/hr/(main)/employee-movements/page.tsx` (new) |
| 10 | **HR Salary Structures** | `/hr/salary-structures` | P2 | CTC breakdown, component config | `web/app/hr/(main)/salary-structures/page.tsx` (new) |
| 11 | **HR Reimbursements** | `/hr/reimbursements` | P2 | Expense claims, approval workflow | `web/app/hr/(main)/reimbursements/page.tsx` (new) |
| 12 | **HR Documents** | `/hr/documents` | P1 | Document management, verification | `web/app/hr/(main)/documents/page.tsx` (new) |
| 13 | **HR Exits** | `/hr/exits` | P2 | Offboarding checklist, exit process | `web/app/hr/(main)/exits/page.tsx` (new) |
| 14 | **HR Compliance** | `/hr/compliance` | P2 | GDPR status, consent tracking | `web/app/hr/(main)/compliance/page.tsx` (new) |
| 15 | **HR Security** | `/hr/security` | P1 | Security settings, audit logs, API keys | `web/app/hr/(main)/security/page.tsx` (new) |
| 16 | **HR Notification Settings** | `/hr/notification-settings` | P2 | Email/notification preferences | `web/app/hr/(main)/notification-settings/page.tsx` (new) |
| 17 | **HR Notification Templates** | `/hr/notification-templates` | P2 | Email template editor | `web/app/hr/(main)/notification-templates/page.tsx` (new) |
| 18 | **HR Welcome** | `/hr/welcome` | P3 | First-time welcome page | `web/app/hr/(main)/welcome/page.tsx` (new) |

### 27.2 MISSING API ROUTES (15+ routes)

| # | Route | Methods | Priority | Purpose | Implementation Location |
|---|-------|---------|----------|---------|------------------------|
| 1 | `/api/admin/*` | Various | P1 | Admin operations (RBAC editor, sys config) | `web/app/api/admin/` (new) |
| 2 | `/api/billing/*` | CRUD | P2 | Subscription management, payment webhooks | `web/app/api/billing/` (new) |
| 3 | `/api/employees` | POST | P0 | Create new employee | `web/app/api/employees/route.ts` (extend) |
| 4 | `/api/employees/[id]` | PUT/DELETE | P0 | Edit/deactivate employee | `web/app/api/employees/[id]/route.ts` (extend) |
| 5 | `/api/employees/[id]/role` | PATCH | P1 | Change employee role | `web/app/api/employees/[id]/role/route.ts` (new) |
| 6 | `/api/attendance/regularize` | POST | P1 | Submit regularization request | `web/app/api/attendance/regularize/route.ts` (new) |
| 7 | `/api/attendance/regularize/[id]` | PATCH | P1 | Approve/reject regularization | `web/app/api/attendance/regularize/[id]/route.ts` (new) |
| 8 | `/api/leaves/encash` | POST | P1 | Leave encashment request | `web/app/api/leaves/encash/route.ts` (new) |
| 9 | `/api/documents` | CRUD | P1 | Document upload, list, download, delete | `web/app/api/documents/route.ts` (new) |
| 10 | `/api/audit-logs` | GET | P1 | Paginated, filterable audit log viewer | `web/app/api/audit-logs/route.ts` (new) |
| 11 | `/api/payroll/slips` | GET | P2 | Employee payslip view | `web/app/api/payroll/slips/route.ts` (new) |
| 12 | `/api/payroll/history` | GET | P2 | Payroll run history | `web/app/api/payroll/history/route.ts` (new) |
| 13 | `/api/reports/attendance-summary` | GET | P2 | Attendance analytics | `web/app/api/reports/attendance-summary/route.ts` (new) |
| 14 | `/api/shifts` | CRUD | P3 | Shift management | `web/app/api/shifts/route.ts` (new) |
| 15 | `/api/reimbursements` | CRUD | P3 | Expense reimbursements | `web/app/api/reimbursements/route.ts` (new) |

### 27.3 MISSING COMPONENT DIRECTORIES (6 of 7 component subdirs don't exist)

| # | Directory | Specified Components | Priority | Note |
|---|-----------|---------------------|----------|------|
| 1 | `components/dashboard/` | 8 dashboard widgets (heatmap, analytics, wellness, etc.) | P1 | Extract widgets from inline page code |
| 2 | `components/employee/` | Employee-specific components (3) | P2 | Extract from pages |
| 3 | `components/enterprise/` | Enterprise components (4) | P3 | Monitor, health, metrics UI |
| 4 | `components/hr/` | HR-specific components (3) | P2 | Extract from pages |
| 5 | `components/onboarding/` | 8 onboarding step components | P2 | Extract steps from monolithic page |
| 6 | `components/marketing/` | Marketing sections | P3 | Extract from landing page |

### 27.4 MISSING FEATURES PER PORTAL — FULL FACILITY LIST

#### A. Employee Portal — Missing Facilities

| # | Facility | Current State | Required File Changes |
|---|----------|-------------|----------------------|
| 1 | File attachment on leave request | NOT IMPLEMENTED | `request-leave/page.tsx` + new upload API |
| 2 | Save leave request as draft | NOT IMPLEMENTED | `request-leave/page.tsx` + modify submit API |
| 3 | Team calendar check before submit | NOT IMPLEMENTED | `request-leave/page.tsx` + new API endpoint |
| 4 | Leave extension request | NOT IMPLEMENTED | New API + page flow |
| 5 | Leave request detail modal with timeline | NOT IMPLEMENTED | `leave-history/page.tsx` |
| 6 | Date range filter on leave history | NOT IMPLEMENTED | `leave-history/page.tsx` |
| 7 | Leave type filter on leave history | NOT IMPLEMENTED | `leave-history/page.tsx` |
| 8 | Export leave history CSV | NOT IMPLEMENTED | `leave-history/page.tsx` + export util |
| 9 | Document upload/download | PLACEHOLDER ONLY | `documents/page.tsx` (full rewrite) |
| 10 | Document categories & status | NOT IMPLEMENTED | `documents/page.tsx` |
| 11 | Attendance regularization | NOT IMPLEMENTED | `attendance/page.tsx` + new API |
| 12 | Attendance calendar heatmap | NOT IMPLEMENTED | `attendance/page.tsx` |
| 13 | Profile picture upload | NOT IMPLEMENTED | `profile/page.tsx` |
| 14 | Emergency contact management | NOT IMPLEMENTED | `profile/page.tsx` |
| 15 | Bank details section | NOT IMPLEMENTED | `profile/page.tsx` |
| 16 | Server-persisted notification prefs | localStorage only | `settings/page.tsx` or new settings area |
| 17 | Password change (native) | Firebase-dependent | settings area |
| 18 | View monthly payslips | NOT IMPLEMENTED | New `payslips/page.tsx` |
| 19 | Calendar mini-view on dashboard | NOT IMPLEMENTED | `dashboard/page.tsx` |
| 20 | Announcements/news from HR | NOT IMPLEMENTED | `dashboard/page.tsx` |

#### B. Manager Portal — Missing Facilities

| # | Facility | Current State | Required File Changes |
|---|----------|-------------|----------------------|
| 1 | Filter team to direct reports only | Shows ALL employees | `team/page.tsx` — add manager_id filter |
| 2 | Bulk approve/reject | NOT IMPLEMENTED | `approvals/page.tsx` + new/existing bulk API |
| 3 | Approval history tab | NOT IMPLEMENTED | `approvals/page.tsx` |
| 4 | Manager delegation (proxy approver) | NOT IMPLEMENTED | New API + settings UI |
| 5 | Team member detail with balances | NOT IMPLEMENTED | `team/page.tsx` |
| 6 | Team reports with charts | Basic text only | `reports/page.tsx` |
| 7 | Team reports CSV export | NOT IMPLEMENTED | `reports/page.tsx` |
| 8 | Team reports date range | NOT IMPLEMENTED | `reports/page.tsx` |
| 9 | Team attendance from real data | Inferred from leaves | `team-attendance/page.tsx` |
| 10 | Regularization approval queue | NOT IMPLEMENTED | `team-attendance/page.tsx` |
| 11 | Server-persisted notification prefs | localStorage only | `settings/page.tsx` |
| 12 | Team availability calendar widget | NOT IMPLEMENTED | `dashboard/page.tsx` |
| 13 | Leave trend charts for team | NOT IMPLEMENTED | `dashboard/page.tsx` |

#### C. HR Portal — Missing Facilities

| # | Facility | Current State | Required File Changes |
|---|----------|-------------|----------------------|
| 1 | Payroll full lifecycle UI | Generate button only | `payroll/page.tsx` (major enhancement) |
| 2 | Payroll history | NOT IMPLEMENTED | `payroll/page.tsx` + new API |
| 3 | Payslip viewer/download | NOT IMPLEMENTED | `payroll/page.tsx` + payslip modal |
| 4 | Salary structure management | NOT IMPLEMENTED | New `salary-structures/page.tsx` + API |
| 5 | Salary revision workflow | NOT IMPLEMENTED | New API + UI |
| 6 | Leave balance adjustment UI | API exists, no UI button | `leave-requests/page.tsx` or new page |
| 7 | Audit log viewer | NOT IMPLEMENTED | New `audit-logs/page.tsx` + API |
| 8 | System health dashboard | NOT IMPLEMENTED | New page |
| 9 | OTP verification UI component | NOT IMPLEMENTED | New `components/otp-dialog.tsx` |
| 10 | Org unit CRUD | Read-only | `organization/page.tsx` + extend API |
| 11 | Employee detail page | No per-employee page | New `employees/[id]/page.tsx` |
| 12 | Employee registration approval page | Not a dedicated page | New `employee-registrations/page.tsx` |
| 13 | HR leave request comments input | NOT IMPLEMENTED | `leave-requests/page.tsx` |
| 14 | Leave encashment management | NOT IMPLEMENTED | New page + API |
| 15 | Employee movement management | NOT IMPLEMENTED | New page + API |
| 16 | Exit management | NOT IMPLEMENTED | New page + API |
| 17 | Reimbursement management | NOT IMPLEMENTED | New page + API |
| 18 | Compliance/GDPR page | NOT IMPLEMENTED | New page |
| 19 | Security settings page | NOT IMPLEMENTED | New page |
| 20 | Notification template editor | NOT IMPLEMENTED | New page |
| 21 | Dashboard trend charts | NOT IMPLEMENTED | `dashboard/page.tsx` |
| 22 | Dashboard SLA breach widget | NOT IMPLEMENTED | `dashboard/page.tsx` |
| 23 | Bulk approve/reject | NOT IMPLEMENTED | `leave-requests/page.tsx` |
| 24 | Employee CSV import/export | NOT IMPLEMENTED | `employees/page.tsx` |
| 25 | RBAC permission viewer/editor | NOT IMPLEMENTED | New security page |

#### D. Admin Portal — Entirely Missing

| # | Facility | Description | Priority |
|---|----------|-------------|----------|
| 1 | Admin Dashboard | System-level metrics, health status, tenant stats | P1 |
| 2 | Audit Log Viewer | Full audit trail browser with hash chain verification | P1 |
| 3 | Billing Management | Subscription plans, payment history, invoices | P2 |
| 4 | RBAC Editor | View/edit role permissions, company overrides | P1 |
| 5 | System Health | DB status, constraint engine, email, Pusher health | P1 |
| 6 | API Key Management | Create/revoke API keys per company | P2 |
| 7 | Security Dashboard | Failed auth attempts, rate limit hits, suspicious activity | P2 |
| 8 | Backup Management | Trigger/view database backups | P3 |
| 9 | Notification Template Editor | Systemwide email template management | P2 |
| 10 | Platform Stats | Total companies, employees, requests, revenue | P2 |

#### E. Auth — Keycloak Migration & Security Hardening

| # | Facility | Current State | Required Changes |
|---|----------|-------------|-----------------|
| 1 | Keycloak integration | Uses Firebase + Supabase dual auth | Replace with Keycloak as primary identity provider |
| 2 | SSO (Single Sign-On) | NOT IMPLEMENTED | Keycloak SAML/OIDC federation |
| 3 | 2FA/MFA on login | NOT IMPLEMENTED | Keycloak OTP authenticator |
| 4 | Social login (Google, Microsoft) | NOT IMPLEMENTED | Keycloak identity brokering |
| 5 | Account lockout after N failures | Rate limit only | Keycloak brute force detection |
| 6 | Password policy enforcement | Supabase defaults | Keycloak password policies |
| 7 | Session management UI | No visibility | Keycloak account console |
| 8 | User federation (LDAP/AD) | NOT IMPLEMENTED | Keycloak user federation |

### 27.5 SCHEMA-ONLY MODELS NEEDING FULL IMPLEMENTATION

| # | Model | Tables in DB | API Exists | UI Exists | Facilities Needed |
|---|-------|-------------|-----------|----------|-------------------|
| 1 | LeaveEncashment | Yes | No | No | Request, calculate, approve, process payment |
| 2 | AttendanceRegularization | Yes | No | No | Request form, approval queue (mgr + HR) |
| 3 | ApprovalHierarchy | Yes | No | No | CRUD for approval chains, auto-assignment |
| 4 | SalaryStructure | Yes | No | No | CTC editor, component breakdown, revision |
| 5 | SalaryComponent | Yes | No | No | Custom component types CRUD |
| 6 | SalaryRevision | Yes | No | No | Revision history, effective dates |
| 7 | Document | Yes | No | No | Upload/download, verification workflow |
| 8 | Reimbursement | Yes | No | No | Submit, approve, process, receipt upload |
| 9 | EmployeeMovement | Yes | No | No | Transfer/promotion request + approval |
| 10 | EmployeeStatusHistory | Yes | No | No | Lifecycle tracking, state machine triggers |
| 11 | ExitChecklist | Yes | No | No | Offboarding flow, 8-item checklist |
| 12 | Shift | Yes | No | No | Shift definitions CRUD |
| 13 | EmployeeShift | Yes | No | No | Shift assignment per employee |
| 14 | NotificationTemplate | Yes | No | No | Template CRUD per event per channel |
| 15 | NotificationPreference | Yes | API exists (partial) | No | Per-employee notification toggles |
| 16 | JobLevel | Yes | No | No | Job grade CRUD |
| 17 | Subscription | Yes | No | No | Plan management, payment processing |
| 18 | Payment | Yes | No | No | Payment records, refunds |
| 19 | UsageRecord | Yes | No | No | Metered usage tracking |
| 20 | ApiKey | Yes | No | No | Key generation, revocation |

### 27.6 UPDATED LAYERED BUILD PLAN (Post-Audit)

#### Layer 1 (Current Sprint): Manager Portal Fix + Core CRUD Gaps
**Target**: Manager sees real team data; HR can manage holidays/leave types/employees post-onboarding.

| Task | File | Change |
|------|------|--------|
| Fix manager team to filter direct reports | `manager/(main)/team/page.tsx` | Use `manager_id` parameter |
| Fix manager team-attendance to use real data | `manager/(main)/team-attendance/page.tsx` | Call attendance API scoped to team |
| Add approval history tab (manager) | `manager/(main)/approvals/page.tsx` | Tabs: Pending / History |
| Add bulk approve/reject (manager) | `manager/(main)/approvals/page.tsx` | Checkbox + batch buttons |
| Enhance manager reports | `manager/(main)/reports/page.tsx` | Charts, date range, CSV export |
| Add notification preferences API | `api/notifications/preferences/route.ts` | GET/PUT per-employee prefs |
| Wire notification prefs to settings | All `/settings/page.tsx` | DB-persisted toggles |

#### Layer 2: Employee Portal Completion
**Target**: All employee self-service features fully functional.

| Task | File | Change |
|------|------|--------|
| Build document management API | `api/documents/route.ts` (new) | Upload metadata, list, delete |
| Rebuild documents page | `employee/(main)/documents/page.tsx` | Upload form, categories, download |
| Add leave history filters | `employee/(main)/leave-history/page.tsx` | Date range + type filter |
| Add leave history export | `employee/(main)/leave-history/page.tsx` | CSV download button |
| Add attendance regularization | `employee/(main)/attendance/page.tsx` + API | Request form + status |
| Enhance profile (emergency contacts) | `employee/(main)/profile/page.tsx` | Additional fields |
| Build employee payslip page | `employee/(main)/payslips/page.tsx` (new) | View + download |

#### Layer 3: HR Portal Full Lifecycle
**Target**: HR manages payroll end-to-end, org structure CRUD, balance adjustments via UI.

| Task | File | Change |
|------|------|--------|
| Build payroll history API | `api/payroll/history/route.ts` (new) | Past runs list |
| Build payslip view API | `api/payroll/slips/route.ts` (new) | Per-run/per-employee |
| Enhance HR payroll page | `hr/(main)/payroll/page.tsx` | Full lifecycle, history, slips |
| Build org unit CRUD API | Extend `api/hr/organization/` | POST/PUT/DELETE |
| Enhance org page | `hr/(main)/organization/page.tsx` | Add/edit/delete units |
| Build leave encashment API | `api/leaves/encash/route.ts` (new) | Request + approve |
| Build leave encashment page | `hr/(main)/leave-encashment/page.tsx` (new) | Table + actions |
| Add HR leave comments | `hr/(main)/leave-requests/page.tsx` | Comment input |
| Add bulk approve (HR) | `hr/(main)/leave-requests/page.tsx` | Checkbox + batch |
| Add HR dashboard widgets | `hr/(main)/dashboard/page.tsx` | Charts, SLA alerts |

#### Layer 4: Admin Portal & Audit
**Target**: Admin portal exists with audit logs, RBAC editor, system health.

| Task | File | Change |
|------|------|--------|
| Build audit log API | `api/audit-logs/route.ts` (new) | Paginated, filterable |
| Build audit log viewer | `hr/(main)/audit-logs/page.tsx` (new) | Table + diff view |
| Build OTP verification component | `components/otp-dialog.tsx` (new) | Reusable OTP modal |
| Wire OTP to destructive actions | Various settings pages | Wrap with OTP |
| Build system health page | `hr/(main)/system-health/page.tsx` (new) | Health dashboard |
| Build RBAC viewer | `hr/(main)/security/page.tsx` (new) | Roles + permissions |
| Update sidebar for new pages | `hr/(main)/layout.tsx` | Menu items |

#### Layer 5: Advanced Features
**Target**: Employee movements, exits, salary structures, reimbursements, shifts.

| Task | File | Change |
|------|------|--------|
| Build movement API + page | New API + new page | Transfer/promotion workflow |
| Build exit management API + page | New API + new page | Offboarding checklist |
| Build salary structure API + page | New API + new page | CTC editor |
| Build reimbursement API + page | New API + new page | Expense claims |
| Build attendance regularization approval | Extend API/pages | Manager/HR queue |

#### Layer 6: Auth Hardening (Keycloak)
**Target**: Replace dual Firebase+Supabase with Keycloak for enterprise-grade auth.

| Task | File | Change |
|------|------|--------|
| Set up Keycloak Docker | `docker-compose.yml` | Add Keycloak service |
| Configure Keycloak realm | Keycloak admin | Realm, clients, roles |
| Replace auth-guard.ts | `lib/auth-guard.ts` | Keycloak token verification |
| Update middleware | `middleware.ts` | Keycloak session management |
| Update sign-in/sign-up | Auth pages | Keycloak login flow |
| Add 2FA/MFA | Keycloak config | OTP authenticator |
| Add social login | Keycloak config | Google, Microsoft brokering |

#### Layer 7: Enterprise Polish
**Target**: Export everywhere, all reports with date ranges, billing integration.

| Task | File | Change |
|------|------|--------|
| Build report export utility | `lib/report-export.ts` (new) | CSV/PDF generation |
| Add export to all report pages | Various | Export buttons |
| Build billing API | `api/billing/` (new) | Razorpay/Stripe integration |
| Build billing page | New admin page | Subscription management |
| Comprehensive test suite | `tests/` | All new API integration tests |

#### Layer 8: Testing & Production Readiness
**Target**: Full build, all tests pass, every flow verified.

| Task | What |
|------|------|
| Run `next build` and fix all errors | TypeScript + lint + build |
| Test all auth flows end-to-end | Sign-up, sign-in, role redirect, session |
| Test all CRUD operations | Every create/read/update/delete |
| Test constraint engine integration | All 13 rules |
| Test multi-tenant isolation | Cross-company access blocked |
| Test mobile responsive | 375px, 768px, 1024px |
| Test dark mode | All pages |
| Verify audit trail integrity | SHA-256 chain |
| Load test (10 companies, 350 users) | Concurrent operations |
| Performance audit | Bundle size, API latency |

### 27.7 OVERALL COMPLETION METRICS

| Metric | Current | Target |
|--------|---------|--------|
| Pages implemented | 42 / 44 | 44 / 44 |
| API routes implemented | 47 / 48 | 48 / 48 |
| DB models with full CRUD | 28 / 32 | 32 / 32 |
| Schema-only models activated | 18 / 20 | 20 / 20 |
| Component subdirectories | 4 / 7 | 7 / 7 |
| Enterprise facilities complete | ~92% | 100% |
| Test coverage | ~30% | >80% |
| Build status | Clean build | Clean build |

---

### 27.8 IMPLEMENTATION LOG (L1–L16)

All layers implemented in a single push. Clean build verified after each layer.

#### L1 — Payroll, Escalation, Leave Encashment
| Item | Files |
|------|-------|
| Payroll history API | `api/payroll/history/route.ts` |
| Payroll slips API | `api/payroll/slips/route.ts` |
| Payroll status API | `api/payroll/status/route.ts` |
| HR payroll management page | `hr/(main)/payroll/page.tsx` |
| Employee payslips page | `employee/(main)/payslips/page.tsx` |
| HR escalation page | `hr/(main)/escalation/page.tsx` |
| HR leave encashment page | `hr/(main)/leave-encashment/page.tsx` |
| HR employee detail page | `hr/(main)/employees/[id]/page.tsx` |

**L1 Critique fixes applied:** Rate limiting on all 3 payroll APIs, `ensureMe()` on all new pages, `alert()` replaced with inline feedback, audit action mapping corrected, optimistic concurrency on status transitions, reject reason textarea, Framer Motion stagger animations.

#### L2 — Admin Portal, UI Theme
| Item | Files |
|------|-------|
| Admin layout + sidebar | `admin/(main)/layout.tsx` |
| Admin dashboard | `admin/(main)/dashboard/page.tsx` |
| Admin RBAC viewer/editor | `admin/(main)/rbac/page.tsx` |
| Admin system health monitor | `admin/(main)/system-health/page.tsx` |
| RBAC admin API | `api/admin/rbac/route.ts` |

#### L3 — Advanced Feature UIs
| Item | Files |
|------|-------|
| Salary structure API | `api/salary-structures/route.ts` |
| HR salary structure page | `hr/(main)/salary-structures/page.tsx` |
| Reimbursement API | `api/reimbursements/route.ts` |
| Employee reimbursement page | `employee/(main)/reimbursements/page.tsx` |
| HR reimbursement management | `hr/(main)/reimbursements/page.tsx` |
| Employee movement API | `api/employee-movements/route.ts` |
| HR employee movement page | `hr/(main)/employee-movements/page.tsx` |
| Manager team calendar page | `manager/(main)/team-calendar/page.tsx` |
| HR audit logs page | `hr/(main)/audit-logs/page.tsx` |
| HR holidays page | `hr/(main)/holidays/page.tsx` |
| Sidebar nav updates | `hr/layout.tsx`, `employee/layout.tsx` |

#### L4 — Keycloak Auth Integration
| Item | Files |
|------|-------|
| Server-side Keycloak adapter (OIDC, JWKS, zero deps) | `lib/keycloak.ts` |
| Client-side Keycloak adapter (browser OIDC) | `lib/keycloak-client.ts` |
| OIDC callback route | `api/auth/keycloak/callback/route.ts` |
| Logout route | `api/auth/keycloak/logout/route.ts` |
| Token refresh route | `api/auth/keycloak/refresh/route.ts` |
| Auth-guard updated (Keycloak primary) | `lib/auth-guard.ts` |
| Client-auth updated (Keycloak refresh) | `lib/client-auth.ts` |
| Sign-in SSO button | `(auth)/sign-in/page.tsx` |
| Sign-up SSO button | `(auth)/sign-up/page.tsx` |
| Middleware CSP + public routes for Keycloak | `middleware.ts` |

**Auth chain:** Keycloak (primary) → Firebase (legacy) → Supabase (fallback). Controlled by `KEYCLOAK_ENABLED` env var.

#### L5 — Universal Report Export
| Item | Files |
|------|-------|
| PDF export utility (print-to-PDF, zero deps) | `lib/report-export.ts` |
| HR reports: CSV + PDF export | `hr/(main)/reports/page.tsx` |
| Manager reports: CSV + PDF export | `manager/(main)/reports/page.tsx` |

#### L6 — Error Boundaries & Loading States
| Item | Files |
|------|-------|
| Admin error boundary | `admin/(main)/error.tsx` |
| Admin loading skeleton | `admin/(main)/loading.tsx` |
| Employee error boundary | `employee/(main)/error.tsx` |
| Employee loading skeleton | `employee/(main)/loading.tsx` |
| HR error boundary | `hr/(main)/error.tsx` |
| HR loading skeleton | `hr/(main)/loading.tsx` |
| Manager error boundary | `manager/(main)/error.tsx` |
| Manager loading skeleton | `manager/(main)/loading.tsx` |

**Pre-existing:** Global error boundary (`components/global-error-boundary.tsx`), root `error.tsx`, `not-found.tsx`, auth `error.tsx`, sanitizers (`lib/integrity/sanitizers.ts`), validators (`lib/integrity/validators.ts`), error handling hooks (`lib/error-handling.ts`).

#### L7 — Enterprise Middleware Hardening
| Item | Detail |
|------|--------|
| CORS handling | Origin whitelist, pre-flight OPTIONS, `Vary: Origin` |
| Request ID tracing | `X-Request-Id` header on every response |
| Path traversal protection | Blocks `..`, `%2e` encoded traversals |
| Structured JSON logging | Sensitive routes, rate limit breaches, path traversal attempts |
| Keycloak CSP integration | Dynamic `connect-src` + `frame-src` from env |

#### L8 — Build Verification
| Check | Status |
|-------|--------|
| `next build` clean (0 errors) | PASS |
| All TypeScript types valid | PASS |
| No unused imports | PASS |
| Middleware compiles (34.9 kB) | PASS |
| All 38 pages render to static/dynamic | PASS |

#### L9 — Document File Upload API
| Item | Files |
|------|-------|
| Multipart file upload endpoint (Supabase Storage + base64 fallback) | `api/documents/upload/route.ts` |
| Employee documents page: file picker + URL toggle | `employee/(main)/documents/page.tsx` |

**Upload strategy:** Supabase Storage (primary) → base64 data URL (fallback) → placeholder URL (oversized). 10MB limit, PDF/PNG/JPG/DOC/DOCX validation, audit logged.

#### L10 — Shift Management
| Item | Files |
|------|-------|
| Shift CRUD API (create/read/update/delete + employee assignment) | `api/shifts/route.ts` |
| HR shift management page (summary cards, table, modals) | `hr/(main)/shifts/page.tsx` |

#### L11 — Exit Checklist
| Item | Files |
|------|-------|
| Exit checklist CRUD API (task completion tracking) | `api/exit-checklist/route.ts` |
| HR exit checklist page (progress bars, category filters) | `hr/(main)/exit-checklist/page.tsx` |

#### L12 — Approval Hierarchy & Job Levels
| Item | Files |
|------|-------|
| Approval hierarchy API (4-level chain + HR partner, upsert) | `api/approval-hierarchy/route.ts` |
| Job levels CRUD API | `api/job-levels/route.ts` |
| HR approval config page (two-tab: chains + levels) | `hr/(main)/approval-config/page.tsx` |

#### L13 — Salary Components & Revisions
| Item | Files |
|------|-------|
| Salary components CRUD API (grouped by earning/deduction/statutory) | `api/salary-components/route.ts` |
| Salary revisions API (paginated history, auto change_percent) | `api/salary-revisions/route.ts` |
| HR salary components page (two-tab: components + revision history) | `hr/(main)/salary-components/page.tsx` |

#### L14 — Navigation Updates
| Item | Detail |
|------|--------|
| HR sidebar nav | Added Shifts, Exit Checklist, Approval Config, Salary Components (21 total items) |
| Icon imports | Timer, ListChecks, GitBranch, Layers |

#### L15 — Build Verification (Post L9-L14)
| Check | Status |
|-------|--------|
| `next build` clean (0 errors) | PASS |
| All new API routes compiled | PASS |
| All new pages rendered | PASS |
| 42+ pages total | PASS |

#### L16 — Document Upload UI Enhancement
| Item | Detail |
|------|--------|
| Upload mode toggle | File upload (default) / Paste URL, toggle buttons |
| Drag-and-drop file picker | PDF/PNG/JPG/DOC/DOCX, 10MB limit, file size display |
| FormData multipart submission | Uses `/api/documents/upload` for file mode |
| Backward-compatible URL mode | Uses existing `/api/documents` POST for URL mode |

#### L17 — Runtime Fix (.next Cache Corruption)
| Check | Detail |
|-------|--------|
| Root cause | Corrupted `.next/server/vendor-chunks/@supabase.js` — stale dev cache |
| Fix | Deleted `.next` directory, fresh dev server start |
| Result | All 42+ pages return HTTP 200 |

---

### 27.9 COMPREHENSIVE FACILITY AUDIT & IMPLEMENTATION CHECKLIST

> Audit performed 2026-03-09. Every page and API route was tested at runtime.
> Legend: [x] = implemented, [ ] = missing/needs implementation

#### EMPLOYEE PORTAL (9 pages)

**Dashboard**
- [x] Leave balance cards with progress bars
- [x] Recent leave requests with status
- [x] Upcoming holidays
- [x] Quick action grid
- [x] Real-time Pusher updates
- [x] Welcome tutorial modal
- [ ] Calendar widget showing personal leave/attendance

**Request Leave**
- [x] Company-specific leave types
- [x] Real-time constraint checking with AI recommendations
- [x] Violation/warning display
- [x] Progress bar during submission
- [ ] Draft save functionality
- [ ] Leave request on behalf of (for managers)

**Leave History**
- [x] Status filter tabs
- [x] Cancel pending/escalated requests
- [x] Detail view modal
- [x] Pagination
- [ ] CSV export of leave history
- [ ] Date range filter

**Attendance**
- [x] Check-in/check-out (Office + WFH)
- [x] Monthly attendance log with date navigation
- [x] Summary cards (Present, WFH, Hours, %)
- [x] Leave balance panel
- [x] Regularization request modal with date + reason
- [x] Past regularization request list
- [ ] Calendar view of attendance
- [ ] Overtime tracking
- [ ] Export own attendance

**Documents**
- [x] Upload modal (file + URL modes)
- [x] Category tabs (Personal ID, Certificates, etc.)
- [x] Status badges (pending/verified/rejected/expired)
- [x] Expiry date tracking
- [x] File upload via multipart/form-data to Supabase Storage
- [ ] Preview document inline (PDF viewer)

**Payslips**
- [x] Monthly payslip list
- [x] Detail modal
- [x] Download capability
- [ ] Year/month filter
- [ ] Salary comparison chart

**Reimbursements**
- [x] Submit reimbursement with amount, category, receipt
- [x] Status tracking
- [ ] Receipt preview
- [ ] Reimbursement history filter

**Profile**
- [x] View and edit personal info via /api/employees/me
- [ ] Profile photo upload
- [ ] Emergency contact section

**Settings**
- [x] Notification preferences
- [x] Theme settings
- [ ] Password change (depends on auth provider)
- [ ] Two-factor authentication toggle

#### HR PORTAL (21 pages)

**Dashboard**
- [x] 6 parallel API calls for metrics
- [x] Employee count, pending approvals, today absent, SLA breaches
- [x] Leave trends bar chart
- [x] Recent pending requests with inline approve/reject
- [x] Quick actions grid
- [x] Real-time Pusher updates
- [ ] Customizable widget layout
- [ ] Department-level drill down

**Employees**
- [x] Full CRUD (add/edit/delete)
- [x] Search and pagination
- [x] Pending registrations with approve/reject
- [x] Employee detail page (/hr/employees/[id])
- [ ] Bulk import employees (CSV upload)
- [ ] Employee profile photo
- [ ] Employment history timeline

**Leave Requests**
- [x] Status filter tabs (pending/escalated/approved/rejected/all)
- [x] Date range filtering (client-side)
- [x] Department filter
- [x] Leave type filter
- [x] Pagination (server-side, 20/page)
- [x] Individual approve/reject
- [x] Bulk select + bulk approve/reject
- [ ] **Search by employee name** (HIGH PRIORITY)
- [ ] **CSV/PDF export** (HIGH PRIORITY)
- [ ] Column sorting
- [ ] Request detail/comments view modal
- [ ] Audit trail per request inline

**Leave Encashment**
- [x] Approve/reject encashment requests
- [ ] Encashment policy configuration
- [ ] Batch processing

**Escalation**
- [x] SLA-breached request display
- [x] Approve/reject actions
- [ ] Escalation rules configuration
- [ ] Auto-escalation preview

**Approvals (hub)**
- [x] Re-exports leave-requests page
- [ ] **Unified approval queue** (leaves + reimbursements + regularizations + movements)

**Attendance**
- [x] Daily attendance view for all employees
- [x] Date picker
- [x] Search by employee name
- [x] Status filter
- [x] Summary stats
- [x] CSV export
- [ ] **Regularization approval UI** (HIGH PRIORITY — API exists but no HR UI)
- [ ] Monthly/weekly aggregate view
- [ ] PDF export
- [ ] Attendance analytics/trends

**Payroll**
- [x] Generate payroll run
- [x] Approve payroll
- [x] Payroll history
- [x] Slip detail view
- [ ] Payroll configuration UI (tax slabs, PF rates)
- [ ] Payroll export to bank format
- [ ] Year-end tax computation report

**Salary Structures**
- [x] CRUD with CTC breakdown
- [x] Component display
- [ ] Bulk salary revision
- [ ] Salary comparison

**Reimbursements**
- [x] View and process reimbursement requests
- [ ] Category-wise reporting
- [ ] Policy limit configuration

**Employee Movements**
- [x] Promotions/transfers/lateral moves
- [ ] Movement approval workflow
- [ ] Movement history timeline per employee

**Shifts**
- [x] CRUD for shift definitions
- [x] Employee-to-shift assignment
- [ ] Shift calendar view
- [ ] Shift swap requests

**Exit Checklist**
- [x] Checklist templates and tracking
- [x] Progress bars per employee
- [ ] Automated task assignment
- [ ] Exit interview scheduling

**Approval Config**
- [x] Multi-level approval hierarchy
- [x] Job levels management
- [ ] Conditional approval routing rules
- [ ] Approval delegation

**Salary Components**
- [x] CRUD grouped by type
- [x] Revision history
- [ ] Component formula editor

**Policy Settings**
- [x] Constraint rules inline editing
- [x] Leave types full CRUD
- [x] Active/inactive toggle per rule
- [ ] Policy version history/rollback
- [ ] Policy simulation/preview

**Holidays**
- [x] Holiday management CRUD
- [ ] Regional holiday support
- [ ] Holiday calendar view

**Reports**
- [x] Leave summary analytics
- [x] Status breakdown, leave types, monthly trend
- [x] Top leave takers
- [x] CSV export
- [x] PDF export
- [ ] Custom date range reports
- [ ] Attendance reports
- [ ] Payroll reports

**Organization**
- [x] Org unit CRUD (department/division/team/branch)
- [x] Hierarchical parent assignment
- [x] Department member view
- [ ] **Visual org chart** (tree diagram)
- [ ] Department head assignment UI
- [ ] Search/filter org units

**Settings**
- [x] Company settings and configuration
- [ ] Email notification template editor
- [ ] Branding/logo configuration

**Audit Logs**
- [x] Full audit log viewer
- [x] Search and pagination
- [x] Expandable detail rows
- [x] Action type filtering
- [ ] Audit log CSV/PDF export
- [ ] Integrity verification UI

#### MANAGER PORTAL (7 pages)

**Dashboard**
- [x] Team metrics (size, pending, availability, on leave)
- [x] Inline approve/reject pending requests
- [x] Team member list
- [ ] Reject modal (currently uses window.prompt)

**Team Calendar**
- [x] Monthly calendar grid with leave overlays
- [x] Holiday display
- [x] Grid/list view toggle
- [ ] Export capability

**Approvals**
- [x] Constraint engine analysis per request
- [x] Search by employee name
- [x] Status filter
- [x] Pagination
- [x] Bulk approve/reject
- [ ] CSV/PDF export of decisions

**Team Attendance**
- [x] Daily view with date navigation
- [x] Summary cards
- [x] Regularization approval tab
- [ ] Export attendance data
- [ ] Weekly/monthly aggregate view

**Team**
- [x] Expandable team member cards
- [x] Leave balances per member
- [x] Attendance summary per member
- [ ] Dedicated team member profile page
- [ ] Export team data

**Reports**
- [x] CSV export
- [x] PDF export
- [x] Year selector
- [ ] Custom date range

**Settings**
- [x] Basic settings
- [ ] **Reimbursement approval page** (HIGH PRIORITY — managers cannot approve team expenses)

#### ADMIN PORTAL (3+3 shared pages)

**Dashboard**
- [x] 6 parallel API calls for metrics
- [x] System health display
- [x] Recent audit logs
- [x] Recent payroll runs
- [ ] User session management
- [ ] Failed login attempt tracking

**RBAC & Permissions**
- [x] Full interactive permission matrix (6 roles x 48 permissions)
- [x] Toggle, save, reset to defaults
- [x] Search and module filter
- [ ] Role creation/deletion
- [ ] Permission audit trail

**System Health**
- [x] Real-time monitoring with auto-refresh
- [x] Database, memory, environment display
- [x] Response time history chart
- [ ] Alert configuration
- [ ] Uptime history graph

**Missing Admin Pages**
- [ ] **SSO/Keycloak configuration UI**
- [ ] **Email template editor**
- [ ] **Feature flag management**
- [ ] **Bulk data import/export tools**
- [ ] **Security dashboard** (failed logins, IP blocks)
- [ ] **Subscription/license management**

#### CROSS-CUTTING FACILITIES

**Audit Logging**
- [x] Comprehensive action coverage (leave, employee, attendance, payroll, security)
- [x] Integrity chain hashing
- [x] Dedicated viewer page
- [ ] Export audit logs

**Notifications**
- [x] Bell component in all portals
- [x] Preferences API
- [x] Read/read-all
- [ ] Email notification delivery
- [ ] Notification history full page

**Error Handling**
- [x] Portal-specific error.tsx boundaries
- [x] Portal-specific loading.tsx skeletons
- [x] Inline error states with retry
- [ ] Global error reporting dashboard

**Help / Documentation**
- [ ] In-app help pages per portal
- [ ] Contextual tooltips
- [ ] FAQ / knowledge base

---

### 27.10 IMPLEMENTATION PRIORITY QUEUE (Post L17)

| # | Item | Portal | Type | Impact | Status |
|---|------|--------|------|--------|--------|
| 1 | HR Leave Requests: employee name search + CSV/PDF export | HR | Enhancement | HIGH | DONE (L18) |
| 2 | Manager Reimbursement approval page | Manager | New page | HIGH | DONE (L19) |
| 3 | HR Attendance: regularization approval tab | HR | Enhancement | HIGH | DONE (L20) |
| 4 | Manager reject modal (replace window.prompt) | Manager | Fix | HIGH | DONE (L21) |
| 5 | HR Approvals: unified queue (leaves + reimbursements + regularizations) | HR | Enhancement | MEDIUM | PLANNED |
| 6 | Visual org chart | HR | New feature | MEDIUM | PLANNED |
| 7 | Employee leave history: CSV export + date range filter | Employee | Enhancement | MEDIUM | DONE (L22) |
| 8 | Audit log export (CSV/PDF) | HR | Enhancement | MEDIUM | DONE (L23) |
| 9 | Admin security dashboard (failed logins, sessions) | Admin | New page | MEDIUM | PLANNED |
| 10 | Help/documentation pages | All | New pages | MEDIUM | PLANNED |

### 27.11 IMPLEMENTATION LOG (L17–L23)

#### L17 — Runtime Fix (.next Cache Corruption)
| Check | Detail |
|-------|--------|
| Root cause | Corrupted `.next/server/vendor-chunks/@supabase.js` — stale dev cache |
| Fix | Deleted `.next` directory, fresh dev server start |
| Result | All 42+ pages return HTTP 200 at runtime |

#### L18 — HR Leave Requests: Search + Export
| Item | Detail |
|------|--------|
| Employee name search | Real-time client-side search across name and department |
| CSV export | Download filtered leave requests as CSV |
| PDF export | Print-to-PDF with status, date range, totals |
| Search input | Full-width search bar with lucide Search icon |

#### L19 — Manager Reimbursement Approval Page
| Item | Files |
|------|-------|
| Reimbursement approval page | `manager/(main)/reimbursements/page.tsx` |
| Manager layout nav update | Added "Reimbursements" with Receipt icon |
| Features | Status filter tabs, search, summary cards, approve/reject actions |

#### L20 — HR Attendance Regularization Tab
| Item | Detail |
|------|--------|
| Tab system | "Daily Attendance" + "Regularization Requests" tabs |
| Regularization list | Employee, date, reason, submitted date, status |
| Approve/reject | PATCH /api/attendance/regularize/[id] |
| Summary cards | Pending / Approved / Rejected counts |
| Existing functionality | 100% preserved — daily tab unchanged |

#### L21 — Manager Reject Modal
| Item | Detail |
|------|--------|
| Replaced | `window.prompt()` → proper Modal component |
| Modal | Title, textarea for reason (optional), Cancel/Confirm Reject buttons |
| UX | Non-blocking, mobile-friendly, dark mode compatible |

#### L22 — Employee Leave History: Export + Filter
| Item | Detail |
|------|--------|
| Date range filter | From/To date inputs filter leave requests client-side |
| CSV export | Download filtered leave history with all columns |

#### L23 — Audit Log Export
| Item | Detail |
|------|--------|
| CSV export | Timestamp, Action, Actor, Entity Type, Entity ID |
| PDF export | Same columns, formatted report with metadata |

#### Build Verification (Post L18-L23)
| Check | Status |
|-------|--------|
| `next build` clean (0 errors) | PASS |
| 59 static pages generated | PASS |
| All new routes return HTTP 200 | PASS |
| Manager reimbursements page functional | PASS |

### 27.12 SIX-LAYER PRODUCT AUDIT

> Deep functional audit: every button, API call, and data flow tested against the 6-layer product framework.

#### Layer 1 — Core Service (Leave Management Flow)
| Journey | Status | Detail |
|---------|--------|--------|
| Employee requests leave | WORKS | Full form → constraint engine → submit → progress UI → redirect |
| Constraint engine real-time preview | WORKS | Debounced POST to /api/leaves/check-constraints, graceful degradation if engine offline |
| Manager approves leave | WORKS | POST /api/leaves/approve/[id] with atomic Prisma $transaction (balance update + status change + audit log) |
| Manager rejects leave | WORKS | POST /api/leaves/reject/[id] with balance restoration, rejection email with comments |
| Bulk approve/reject | WORKS (FIXED) | Now uses atomic POST /api/leaves/bulk-approve endpoint (was: N sequential calls) |
| Employee cancels leave | WORKS | POST /api/leaves/cancel/[id] with balance restoration |
| Leave balance auto-seed | WORKS | /api/leaves/balances auto-creates balances for new employees |

#### Layer 2 — Essential Infrastructure
| Component | Status | Detail |
|-----------|--------|--------|
| Authentication (3 providers) | WORKS | Supabase (primary) → Firebase (legacy) → Keycloak (SSO) |
| Role-based redirects | WORKS | Sign-in → /api/auth/me → role check → portal redirect |
| Auth guard (server) | WORKS | Every API route uses getAuthEmployee() with role/permission validation |
| Auth guard (client) | WORKS | Every layout calls /api/auth/me, redirects unauthorized users |
| Database (Prisma + PostgreSQL) | WORKS | 44 models, all queries use org_id scoping for multi-tenancy |
| Rate limiting | WORKS | checkApiRateLimit on all critical endpoints |
| CORS + Request tracing | WORKS | Origin whitelist, X-Request-Id on every response |
| Path traversal protection | WORKS | Middleware blocks `..` and `%2e` encoded attacks |

#### Layer 3 — Usability
| Component | Status | Detail |
|-----------|--------|--------|
| Employee dashboard | WORKS | 3 parallel API calls, leave balances, recent requests, holidays |
| HR dashboard | WORKS | 6 parallel API calls, employee count, pending approvals, SLA breaches |
| Manager dashboard | WORKS | Team metrics, inline approve/reject with modal (FIXED from window.prompt) |
| Admin dashboard | WORKS | System health, audit logs, payroll runs, 4 metric cards |
| Onboarding wizard | WORKS (ENHANCED) | 6-step flow, custom holiday support added |
| Dark mode | WORKS | Full HSL theme with Tailwind v4, all pages consistent |
| Mobile responsive | WORKS | Animated sidebar drawer, responsive grids, touch-friendly |
| Loading skeletons | WORKS | Every page has Skeleton components during data fetch |
| Error states | WORKS | Inline error banners with retry buttons on every page |

#### Layer 4 — Comfort Features
| Feature | Status | Detail |
|---------|--------|--------|
| Real-time notifications (Pusher) | WORKS (FIXED) | Server-side sendPusherEvent() wired into submit/approve/reject APIs |
| Notification bell | WORKS | Dropdown with unread count, mark read, mark all read |
| DB notifications | WORKS (FIXED) | sendNotification() creates DB record + Pusher event on leave actions |
| Search | WORKS | Employee name search on HR leaves, HR employees, HR attendance, manager approvals |
| Filters | WORKS | Status, date range, department, leave type on all list pages |
| CSV export | WORKS | HR leave requests, HR attendance, HR reports, manager reports, employee leave history, audit logs |
| PDF export | WORKS | HR leave requests, HR reports, manager reports, audit logs |
| Pagination | WORKS | Server-side on leaves, employees, audit logs; client-side on others |

#### Layer 5 — Delight / Premium
| Feature | Status | Detail |
|---------|--------|--------|
| AI constraint engine | WORKS | Real-time leave policy evaluation with confidence scores |
| Smart suggestions | WORKS | Per-rule alternative date suggestions when constraints violated |
| Framer Motion animations | WORKS | Container/item stagger, spring physics, exit animations on all pages |
| Progress bar on submit | WORKS | Multi-step progress (20% → 40% → 80% → 100%) with step labels |
| Optimistic UI updates | WORKS | Approve/reject immediately updates list without re-fetch |

#### Layer 6 — Trust
| Feature | Status | Detail |
|---------|--------|--------|
| Audit logging | WORKS | Every leave/employee/attendance/payroll action logged with actor, entity, timestamp |
| Audit integrity chain | WORKS | SHA-256 chain hashing for tamper detection |
| RBAC permissions | WORKS | 6 roles × 48 permissions, interactive matrix editor |
| Data scoping | WORKS | All queries filtered by org_id (multi-tenant isolation) |
| Self-action prevention | WORKS | Cannot approve own leave, cannot deactivate self |
| Approval hierarchy | WORKS | Manager → Director → HR escalation chain |
| SLA breach detection | WORKS | Cron-based SLA check with auto-escalation |

### 27.13 USER JOURNEY MAPS

#### Employee Journey
```
Sign In → Auth check → /employee/dashboard
  ├→ View leave balances (auto-seeded)
  ├→ Request Leave → Select type → Pick dates → Constraint check → Submit → Progress bar → Redirect to history
  ├→ Leave History → View status → Cancel pending → CSV export
  ├→ Attendance → Clock In (Office/WFH) → Clock Out → View log → Request Regularization
  ├→ Documents → Upload file (multipart) or paste URL → View/filter by category
  ├→ Payslips → View monthly payslips → Download
  ├→ Reimbursements → Submit expense → Track status
  ├→ Profile → View/edit personal info
  └→ Settings → Notification preferences → Theme toggle
```

#### Manager Journey
```
Sign In → Auth check → /manager/dashboard
  ├→ View team metrics (size, pending, availability)
  ├→ Inline approve/reject pending requests (with modal for rejection reason)
  ├→ Approvals → Full list → Constraint engine analysis → Approve/Reject with comments → Bulk operations (atomic)
  ├→ Team Calendar → Monthly grid → Leave overlays → Holiday display
  ├→ Team Attendance → Daily view → Regularization approval tab
  ├→ Team → Expandable member cards → Leave balances → Attendance summary
  ├→ Reimbursements → Approve/reject team expenses
  ├→ Reports → CSV/PDF export → Year selector
  └→ Settings → Preferences
```

#### HR Journey
```
Sign In → Auth check → /hr/dashboard
  ├→ 6-metric dashboard with Pusher real-time
  ├→ Employees → CRUD → Add/Edit/Deactivate → Pending registrations → Employee detail page
  ├→ Leave Requests → Search by name → Filter → Approve/Reject → Bulk → CSV/PDF export
  ├→ Leave Encashment → Process encashment requests
  ├→ Escalation → Handle SLA-breached requests
  ├→ Attendance → Daily view → CSV export → Regularization approval tab
  ├→ Payroll → Generate → Approve → History → Slips
  ├→ Salary Structures → CRUD with CTC breakdown
  ├→ Salary Components → Earnings/deductions/statutory management → Revision history
  ├→ Reimbursements → Process team expenses
  ├→ Employee Movements → Promotions/transfers/lateral moves
  ├→ Shifts → CRUD → Employee assignment
  ├→ Exit Checklist → Task tracking with progress bars
  ├→ Approval Config → Multi-level hierarchy → Job levels
  ├→ Policy Settings → Leave types CRUD → Constraint rules editing
  ├→ Holidays → CRUD management
  ├→ Reports → Leave summary → CSV/PDF export
  ├→ Organization → Org units CRUD → Department member view
  ├→ Settings → Company configuration
  └→ Audit Logs → Search → Expand detail → CSV/PDF export
```

#### Admin Journey
```
Sign In → Auth check → /admin/dashboard
  ├→ System metrics (employees, attendance, health, audit, payroll)
  ├→ RBAC & Permissions → Interactive 6×48 matrix → Toggle/Save/Reset
  ├→ System Health → Real-time monitoring → DB latency → Memory → Auto-refresh
  ├→ Employees → (Shared with HR) full CRUD
  ├→ Audit Logs → (Shared with HR) full viewer with export
  └→ Settings → (Shared with HR) company settings
```

### 27.14 IMPLEMENTATION LOG (L24–L27: Deep Audit Fixes)

#### L24 — Real-Time Notifications Fix (CRITICAL)
| Item | Detail |
|------|--------|
| Root cause | Server-side APIs never called Pusher after leave actions |
| Channel mismatch | Server emitted to `employee-{id}`, client listened on `user-{id}` — fixed to `user-{id}` |
| Files modified | `lib/notification-service.ts`, `api/leaves/submit/route.ts`, `api/leaves/approve/[requestId]/route.ts`, `api/leaves/reject/[requestId]/route.ts` |
| Behavior | Submit notifies manager via DB+Pusher; Approve/Reject notifies employee via DB+Pusher |

#### L25 — Atomic Bulk Approve Fix
| Item | Detail |
|------|--------|
| Root cause | Manager approvals page looped N individual API calls instead of using `/api/leaves/bulk-approve` |
| Fix | Replaced sequential loop with single POST to `/api/leaves/bulk-approve` |
| Impact | Atomic operation (all-or-nothing), 1 network call instead of N, proper error aggregation |
| File modified | `manager/(main)/approvals/page.tsx` |

#### L26 — Custom Holidays in Onboarding
| Item | Detail |
|------|--------|
| Root cause | Only 6 hardcoded Indian holidays, no way to add custom dates |
| Fix | Added "Add Holiday" button, name+date inputs, remove button, `custom` flag on HolidayEntry |
| File modified | `onboarding/page.tsx` (HolidaysStep component) |

#### L27 — Build Verification (Post Deep Audit)
| Check | Status |
|-------|--------|
| `next build` clean (0 errors) | PASS |
| All 59 pages compile | PASS |
| Notification service channel fix | VERIFIED |
| Bulk approve endpoint wiring | VERIFIED |

---
