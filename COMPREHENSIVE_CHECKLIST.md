# Continuum - Comprehensive Implementation Checklist

> Generated from README.md analysis - March 8, 2026
> This document tracks ALL features, roles, pages, constraints, and behaviors promised in the system.

---

## 📋 Executive Summary

### Why Leave Request Stuck at 60%?

**Root Cause**: The constraint engine API call (`/api/evaluate`) is timing out or failing silently.

**Flow Explanation**:
1. Employee submits leave request → `POST /api/leaves/submit`
2. API validates input, checks balance
3. **Calls Python Constraint Engine** ← THIS IS WHERE IT HANGS
4. Engine returns pass/fail/warnings
5. Leave request created, balance updated
6. Email sent to manager

**When constraint engine fails**:
- The frontend shows "Updating leave balances..." (step 3/5 = 60%)
- The API is stuck waiting for the constraint engine response
- No timeout handling → infinite wait

**Fix Required**:
1. Add timeout to constraint engine calls (15 seconds max)
2. Fail gracefully if engine unavailable (proceed with manual review)
3. Update UI to show better progress states

---

## 🎭 ROLES & PERMISSIONS

### Role Hierarchy (6 Roles)

| Role | Level | Portal | Access Scope |
|------|-------|--------|--------------|
| `admin` | 1 | `/admin/*` | ALL system access, policy engine control |
| `hr` | 2 | `/hr/*` | Company-wide operations |
| `director` | 3 | `/hr/*` or `/manager/*` | Division-level oversight |
| `manager` | 4 | `/manager/*` | Department-level control |
| `team_lead` | 5 | `/manager/*` | Team-level approvals |
| `employee` | 6 | `/employee/*` | Self-service only |

### Permission Matrix (40+ Permissions)

#### Leave Module
- [ ] `leave.apply_own` - Submit own leave requests
- [ ] `leave.approve_team` - Approve team member leaves
- [ ] `leave.approve_any` - Approve any leave request
- [ ] `leave.view_team` - View team leave data
- [ ] `leave.view_all` - View all company leave data
- [ ] `leave.cancel_any` - Cancel any approved/pending leave
- [ ] `leave.adjust_balance` - Manual balance adjustments
- [ ] `leave.override` - Override constraint violations
- [ ] `leave.encash` - Process leave encashment

#### Attendance Module
- [ ] `attendance.mark_own` - Check in/out
- [ ] `attendance.view_team` - View team attendance
- [ ] `attendance.view_all` - View all attendance
- [ ] `attendance.regularize` - Regularize attendance
- [ ] `attendance.override` - Override attendance records

#### Payroll Module
- [ ] `payroll.view_own` - View own payslips
- [ ] `payroll.view_all` - View all payroll data
- [ ] `payroll.generate` - Generate payroll runs
- [ ] `payroll.approve` - Approve payroll
- [ ] `payroll.process` - Process payments

#### Employee Module
- [ ] `employee.view_own` - View own profile
- [ ] `employee.view_team` - View team profiles
- [ ] `employee.view_all` - View all employees
- [ ] `employee.edit_any` - Edit any employee
- [ ] `employee.onboard` - Onboard new employees
- [ ] `employee.terminate` - Terminate employees

#### Company Module
- [ ] `company.view_settings` - View company settings
- [ ] `company.edit_settings` - Edit company settings (OTP required)
- [ ] `company.manage_policies` - Manage leave policies
- [ ] `company.manage_billing` - Manage subscriptions

#### Reports Module
- [ ] `reports.view_team` - View team reports
- [ ] `reports.view_all` - View all reports
- [ ] `reports.export` - Export reports

#### Audit Module
- [ ] `audit.view_own` - View own audit trail
- [ ] `audit.view_all` - View all audit logs
- [ ] `audit.export` - Export audit data

---

## 📱 PAGES BY ROLE

### HR Portal (`/hr/*`) - 30+ Pages

| Page | Status | Key Features | Buttons/Actions |
|------|--------|--------------|-----------------|
| `/hr/dashboard` | ⬜ | Metrics, heatmap, AI insights | Quick actions, approval queue |
| `/hr/employees` | ⬜ | Directory, search, filter | Add, Import CSV, Bulk Actions |
| `/hr/employee/[id]` | ⬜ | Full profile, ledger, history | Edit, Change Manager, Terminate |
| `/hr/employee-registrations` | ⬜ | Pending approval queue | Approve, Reject |
| `/hr/leave-requests` | ⬜ | All requests, filters | Approve, Reject, Escalate, Bulk |
| `/hr/leave-records` | ⬜ | Historical data, analytics | Filter, Export |
| `/hr/leave-encashment` | ⬜ | Encashment requests | Approve, Calculate, Process |
| `/hr/approvals` | ⬜ | Pending queue, SLA indicators | Approve, Reject, Escalate |
| `/hr/escalation` | ⬜ | SLA-breached requests | Override, Reassign |
| `/hr/attendance` | ⬜ | Company-wide attendance | Mark Override, Send Reminder |
| `/hr/policy-settings` | ⬜ | Constraint rules, quotas | Add Rule, Edit, Toggle (OTP) |
| `/hr/holiday-settings` | ⬜ | Calendar management | Add Holiday, Import, Block |
| `/hr/organization` | ⬜ | Org tree, departments | Add Unit, Edit Hierarchy |
| `/hr/job-levels` | ⬜ | Job level config | Add Level, Set Rank |
| `/hr/approval-hierarchies` | ⬜ | Approval chain per employee | Edit Chain, Set Levels |
| `/hr/employee-movements` | ⬜ | Transfers, promotions | Initiate, Approve |
| `/hr/payroll` | ⬜ | Payroll runs, slips | Generate, Approve, Process |
| `/hr/salary-structures` | ⬜ | CTC breakdown | Set Structure, Add Component |
| `/hr/reimbursements` | ⬜ | Expense claims | Approve, Reject, Flag |
| `/hr/documents` | ⬜ | Document management | Verify, Reject, Request |
| `/hr/exits` | ⬜ | Offboarding checklist | Start Exit, Settlement |
| `/hr/reports` | ⬜ | Analytics, stats | Generate, Export, Schedule |
| `/hr/compliance` | ⬜ | GDPR, consent tracking | Export Data, Report |
| `/hr/security` | ⬜ | Security settings | View Logs, Reset, API Keys |
| `/hr/notification-settings` | ⬜ | Email preferences | Toggle, Test Send |
| `/hr/notification-templates` | ⬜ | Email editor | Edit, Preview, Reset |
| `/hr/settings` | ⬜ | Company settings | Edit (OTP), Save |
| `/hr/onboarding` | ⬜ | Onboarding flow | Guide Steps, Complete |
| `/hr/welcome` | ⬜ | First-time welcome | Tutorial, Skip |

### Employee Portal (`/employee/*`) - 8+ Pages

| Page | Status | Key Features | Buttons/Actions |
|------|--------|--------------|-----------------|
| `/employee/dashboard` | ⬜ | Balance cards, calendar | Quick Apply, Check In/Out |
| `/employee/request-leave` | ⬜ | Smart form, constraints | Submit, Upload, Cancel |
| `/employee/history` | ⬜ | Leave ledger | Filter, View Details, Cancel |
| `/employee/attendance` | ⬜ | Personal calendar | Check In/Out, Regularize |
| `/employee/documents` | ⬜ | Personal documents | Upload, View, Download |
| `/employee/profile` | ⬜ | Personal info | Edit, Change Password |
| `/employee/settings` | ⬜ | Preferences | Update, Toggle |
| `/employee/welcome` | ⬜ | Tutorial | Start, Skip |

### Manager Portal (`/manager/*`) - 6+ Pages

| Page | Status | Key Features | Buttons/Actions |
|------|--------|--------------|-----------------|
| `/manager/dashboard` | ⬜ | Team metrics, actions | View Team, Quick Approve |
| `/manager/approvals` | ⬜ | Team leave queue | Approve, Reject, Comment |
| `/manager/attendance` | ⬜ | Team check-in status | View, Send Reminder |
| `/manager/team` | ⬜ | Direct reports | View Profile, Reassign |
| `/manager/reports` | ⬜ | Team analytics | Generate, Export |
| `/manager/settings` | ⬜ | Preferences | Update |

### Auth & Marketing Pages

| Page | Status | Key Features |
|------|--------|--------------|
| `/` | ⬜ | Landing, pricing, CTAs |
| `/sign-in` | ⬜ | Supabase Auth |
| `/sign-up` | ⬜ | Registration with company code |
| `/status` | ⬜ | System health, uptime |
| `/onboarding` | ⬜ | Company setup wizard |

---

## 🔧 CONSTRAINT ENGINE RULES (13+)

| Rule ID | Name | Type | Blocking | Status |
|---------|------|------|----------|--------|
| RULE001 | Max Leave Duration | validation | ✅ Yes | ⬜ |
| RULE002 | Leave Balance Check | validation | ✅ Yes | ⬜ |
| RULE003 | Min Team Coverage | business | ✅ Yes | ⬜ |
| RULE004 | Max Concurrent Leave | business | ✅ Yes | ⬜ |
| RULE005 | Blackout Period | business | ✅ Yes | ⬜ |
| RULE006 | Advance Notice | validation | ⚠️ Warn | ⬜ |
| RULE007 | Consecutive Leave Limit | validation | ⚠️ Warn | ⬜ |
| RULE008 | Sandwich Rule | business | ✅ Yes | ⬜ |
| RULE009 | Min Gap Between Leaves | business | ⚠️ Warn | ⬜ |
| RULE010 | Probation Restriction | compliance | ✅ Yes | ⬜ |
| RULE011 | Critical Project Freeze | business | ✅ Yes | ⬜ |
| RULE012 | Document Requirement | compliance | ⚠️ Warn | ⬜ |
| RULE013 | Monthly Quota | validation | ✅ Yes | ⬜ |

---

## 📦 LEAVE TYPES (16)

| Code | Name | Quota | Carry Forward | Paid | Gender | Status |
|------|------|-------|---------------|------|--------|--------|
| CL | Casual Leave | 12 | ❌ | ✅ | All | ⬜ |
| SL | Sick Leave | 12 | ❌ | ✅ | All | ⬜ |
| PL | Privilege Leave | 15 | ✅ (max 15) | ✅ | All | ⬜ |
| EL | Earned Leave | 15 | ✅ (max 30) | ✅ | All | ⬜ |
| AL | Annual Leave | 20 | ✅ (max 10) | ✅ | All | ⬜ |
| ML | Maternity Leave | 182 | ❌ | ✅ | F only | ⬜ |
| PTL | Paternity Leave | 15 | ❌ | ✅ | M only | ⬜ |
| BL | Bereavement Leave | 5 | ❌ | ✅ | All | ⬜ |
| MRL | Marriage Leave | 5 | ❌ | ✅ | All | ⬜ |
| STL | Study Leave | 5 | ❌ | ❌ | All | ⬜ |
| CMP | Comp Off | 0 | ❌ | ✅ | All | ⬜ |
| WFH | Work From Home | 52 | ❌ | ✅ | All | ⬜ |
| OD | On Duty | 30 | ❌ | ✅ | All | ⬜ |
| VOL | Volunteer Leave | 3 | ❌ | ✅ | All | ⬜ |
| LWP | Leave Without Pay | ∞ | ❌ | ❌ | All | ⬜ |
| SAB | Sabbatical | 180 | ❌ | ❌ | All | ⬜ |

---

## 🔄 STATE MACHINES

### Leave Request States
```
draft → pending → approved → cancelled
              ↘ rejected (TERMINAL)
              ↘ escalated → approved/rejected
```

### Employee Status States
```
onboarding → probation → active → on_notice → exited
                    ↘ suspended → active
                    ↘ resigned → on_notice → exited
                    ↘ terminated (TERMINAL)
```

### Payroll Run States
```
draft → generated → under_review → approved → processed → paid
                              ↘ rejected → draft
```

---

## 🛡️ SECURITY REQUIREMENTS

### OTP-Protected Operations (8)
- [ ] `settings_change` - Company settings
- [ ] `delete_employee` - Employee removal
- [ ] `export_data` - GDPR export
- [ ] `billing_change` - Subscription
- [ ] `leave_type_create` - New leave type
- [ ] `leave_type_delete` - Delete leave type
- [ ] `rule_change` - Constraint modification
- [ ] `work_schedule_change` - Work schedule

### Security Headers (Mandatory)
- [ ] Content-Security-Policy
- [ ] Strict-Transport-Security
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] X-XSS-Protection

### Rate Limiting
- [ ] Per-IP limiting
- [ ] Per-endpoint limiting
- [ ] Per-user limiting
- [ ] Auto IP blocking after 10 suspicious requests

---

## 📊 INVARIANTS TO VERIFY

### Data Integrity
- [ ] INV-01: `used_days == SUM(approved_requests)` for each balance
- [ ] INV-02: Leave status transitions follow state machine
- [ ] INV-03: Audit log hash chain integrity
- [ ] INV-04: All queries scoped by `company_id`
- [ ] INV-05: `remaining = annual + carried - used - pending - encashed`

### Security
- [ ] INV-06: Every mutation creates AuditLog
- [ ] INV-07: Every API calls getAuthEmployee()
- [ ] INV-08: Rate limit checked before business logic
- [ ] INV-09: OTP required for protected actions
- [ ] INV-10: No secrets in responses

### Business Logic
- [ ] INV-11: All constraint rules evaluated on submit
- [ ] INV-12: Approval chain enforced
- [ ] INV-13: SLA breach triggers escalation within 1 hour
- [ ] INV-14: Payroll matches India statutory formulas
- [ ] INV-15: Balance auto-seeding on first query

---

## 🎨 UI/THEME REQUIREMENTS

### Light Theme (FundFlow Style - Image 1)
- [ ] Soft white/gray backgrounds (#F8FAFC)
- [ ] Light blue accents (#3B82F6)
- [ ] Subtle shadows and rounded corners
- [ ] Glassmorphism for cards
- [ ] Gradient highlights on metrics

### Dark Theme (Dashboard Style - Image 2)
- [ ] Deep blue backgrounds (#0A1628, #1E3A5F)
- [ ] Glowing blue accents (#60A5FA)
- [ ] Glass/blur effects on cards
- [ ] Subtle grid/pattern backgrounds
- [ ] Progress bars with glow effects

### Components to Update
- [ ] All Card components
- [ ] Navigation sidebar
- [ ] Button variants
- [ ] Form inputs
- [ ] Progress indicators
- [ ] Balance cards
- [ ] Charts/graphs
- [ ] Modal dialogs
- [ ] Dropdowns
- [ ] Tables

---

## 🚀 IMPLEMENTATION LAYERS

### Layer 1: Core Fixes (PRIORITY)
1. [ ] Fix constraint engine timeout (leave stuck at 60%)
2. [ ] Add proper error handling
3. [ ] Fix missing API endpoints
4. [ ] Ensure all state machines work

### Layer 2: UI Theme Overhaul
1. [ ] Create theme configuration
2. [ ] Update CSS variables
3. [ ] Implement light theme (FundFlow)
4. [ ] Implement dark theme (Dashboard)
5. [ ] Add theme toggle

### Layer 3: Missing Features
1. [ ] Complete all HR pages
2. [ ] Add manager portal pages
3. [ ] Implement payroll calculations
4. [ ] Add constraint engine all rules

### Layer 4: Testing & Validation
1. [ ] Test all user flows
2. [ ] Verify invariants
3. [ ] Security testing
4. [ ] Performance testing

---

## ✅ VERIFICATION CHECKLIST

After each implementation layer, verify:

- [ ] All pages load without errors
- [ ] All API endpoints return correct responses
- [ ] State machines transition correctly
- [ ] Constraint engine evaluates all rules
- [ ] Audit logs created for mutations
- [ ] Security headers present
- [ ] Rate limiting active
- [ ] Theme applied consistently
- [ ] Mobile responsive
- [ ] No console errors

---

*Last Updated: March 8, 2026*
