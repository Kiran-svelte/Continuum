# Continuum Feature Checklist

> Comprehensive comparison of README spec vs actual implementation status

---

## CRITICAL ISSUES IDENTIFIED

| Issue | README Spec | Actual Behavior | Impact |
|-------|-------------|-----------------|--------|
| ~~**Admin redirect after signup**~~ | Admin registers → `/onboarding` → 7-step wizard → `/hr/dashboard` | ✅ **FIXED** - Sign-in/sign-up check onboarding status, redirect to `/onboarding` if incomplete | ~~**CRITICAL**~~ ✅ |
| ~~**Role-based routing**~~ | Admin → `/hr/*`, Employee → `/employee/*`, Manager → `/manager/*` | ✅ **FIXED** - Dashboard pages verify role, redirect to correct portal | ~~**CRITICAL**~~ ✅ |
| ~~**Onboarding gate**~~ | Company must complete onboarding before accessing dashboards | ✅ **FIXED** - Sign-in/HR dashboard check `onboarding_completed` flag | ~~**CRITICAL**~~ ✅ |
| ~~**Auth provider**~~ | README says Supabase Auth | ✅ **FIXED** - Fully migrated to Firebase Auth | ~~**HIGH**~~ ✅ |

---

## CHUNK 1: Company Registration & Onboarding Flow

### 1.1 Admin Sign-Up (Company Registration)

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 1.1.1 | Admin signs up via Firebase Auth | Create account with email/password | ✅ `firebaseSignUp()` in sign-up page | ✅ |
| 1.1.2 | Admin selects "Start a Company" mode | Mode toggle on sign-up page | ✅ Mode toggle exists | ✅ |
| 1.1.3 | Collects: company name, industry, size, timezone | Form fields on sign-up | ✅ Fields collected | ✅ |
| 1.1.4 | Calls `/api/auth/register` | Creates Company + Employee (admin role) | ✅ API works | ✅ |
| 1.1.5 | Seeds leave types catalog (16 types) | Auto-seed from `LEAVE_TYPE_CATALOG` | ✅ Seeded in API | ✅ |
| 1.1.6 | Seeds constraint rules (13 rules) | Auto-seed from `DEFAULT_CONSTRAINT_RULES` | ✅ Seeded in API | ✅ |
| 1.1.7 | Seeds leave balances for admin | LeaveBalance for each leave type | ✅ Done | ✅ |
| 1.1.8 | Generates unique join_code | 8-char alphanumeric code | ✅ Generated | ✅ |
| 1.1.9 | Creates audit log | `COMPANY_REGISTER` action logged | ✅ Logged | ✅ |
| 1.1.10 | Redirect to `/onboarding` | Admin must complete 7-step wizard | ✅ Sign-in/sign-up check onboarding status, redirect properly | ✅ |

### 1.2 Onboarding Wizard (7 Steps)

| # | Step | README Spec | Current State | Status |
|---|------|-------------|---------------|--------|
| 1.2.1 | Step 1: Company Settings | Name, industry, work schedule, timezone, grace period, leave year, probation, notice, SLA hours | ⚠️ Basic company settings form exists, missing some fields | ⚠️ |
| 1.2.2 | Step 2: Leave Types | Pick from 16 predefined, customize quotas, carry-forward, encashment, gender-filter | ⚠️ Leave types step exists with toggles | ⚠️ |
| 1.2.3 | Step 3: Constraint Rules | 13+ rules auto-generated, toggle blocking/warning, set priorities, configure params | ⚠️ Constraint rules step exists but limited | ⚠️ |
| 1.2.4 | Step 4: Holiday Settings | Auto-fetch country holidays, add custom, block dates | ⚠️ Holidays step exists | ⚠️ |
| 1.2.5 | Step 5: Notification Settings | Check-in/out reminders, email toggles, HR alerts | ⚠️ Notifications step exists | ⚠️ |
| 1.2.6 | Step 6: Tutorial | Interactive platform walkthrough | ❌ Missing interactive tutorial step | ❌ |
| 1.2.7 | Step 7: Complete | Save all settings, mark `onboarding_completed = true`, redirect to HR dashboard | ❌ Completion logic not implemented | ❌ |

### 1.3 Post-Onboarding System Auto-Configuration

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 1.3.1 | ConstraintPolicy created | Compiled rules saved to DB | ⚠️ LeaveRules seeded but no ConstraintPolicy aggregation | ⚠️ |
| 1.3.2 | RBAC permissions seeded | Company-specific permissions | ❌ Not implemented | ❌ |
| 1.3.3 | Notification templates | Per-event per-channel templates | ❌ Not implemented | ❌ |
| 1.3.4 | CompanySettings initialized | All settings saved | ⚠️ Partial during registration | ⚠️ |
| 1.3.5 | Free tier subscription activated | Subscription record created | ❌ Not implemented | ❌ |
| 1.3.6 | Admin redirected to HR Dashboard | Role-based destination | ❌ Not implemented | ❌ |

### 1.4 Onboarding Gate (Protection)

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 1.4.1 | Check `onboarding_completed` flag | If false → redirect to `/onboarding` | ✅ Sign-in and HR dashboard check flag | ✅ |
| 1.4.2 | Admin cannot access HR portal until onboarding done | Gate at middleware or page level | ✅ HR dashboard redirects to `/onboarding` if not complete | ✅ |
| 1.4.3 | Onboarding page fetches current company config | Pre-fill existing settings | ✅ Fetches from `/api/auth/me`, pre-fills company name | ✅ |

---

## CHUNK 2: Employee Join Flow

### 2.1 Employee Sign-Up (Join Company)

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 2.1.1 | Employee signs up via Firebase Auth | Create account with email/password | ✅ `firebaseSignUp()` available | ✅ |
| 2.1.2 | Employee selects "Join a Company" mode | Mode toggle on sign-up page | ✅ Mode toggle exists | ✅ |
| 2.1.3 | Collects: company code, first name, last name, role | Form fields on sign-up | ✅ Fields collected | ✅ |
| 2.1.4 | Calls `/api/auth/join` | Links to existing company | ✅ API works, seeds leave balances | ✅ |
| 2.1.5 | Employee status: `onboarding` | Initial status set to 'onboarding' for HR approval | ✅ Status is 'onboarding' | ✅ |
| 2.1.6 | HR receives notification | Real-time push to HR dashboard | ⚠️ Not real-time, but visible in Pending Registrations tab | ⚠️ |

### 2.2 HR Approves Employee Registration

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 2.2.1 | HR sees pending registrations at `/hr/employees` | Approval queue | ✅ **IMPLEMENTED** - "Pending Registrations" tab in Employees page | ✅ |
| 2.2.2 | HR approves → status: `active` or `probation` | State machine transition | ✅ **IMPLEMENTED** - `/api/hr/approve-registration` API | ✅ |
| 2.2.3 | Email sent to employee | Approval/rejection email | ✅ **IMPLEMENTED** - `sendRegistrationApprovedEmail` / `sendRegistrationRejectedEmail` | ✅ |
| 2.2.4 | Leave balances seeded | LeaveBalance per company LeaveType | ✅ Seeded during join (before approval) | ✅ |
| 2.2.5 | Pro-rata calculation if mid-year join | Balance = annual × (remaining_months / 12) | ⚠️ Not yet implemented | ⚠️ |

### 2.3 Employee First Login After Approval

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 2.3.1 | Employee lands on `/employee/dashboard` | Dashboard after approval | ✅ Redirects to employee dashboard | ✅ |
| 2.3.2 | Interactive tutorial shows features | Step-by-step guide | ⚠️ WelcomeModal created | ⚠️ |
| 2.3.3 | Dashboard shows balance cards | Leave balances populated | ✅ Balance API with auth token | ✅ |
| 2.3.4 | Dashboard shows upcoming holidays | From company holidays | ⚠️ Hardcoded placeholder | ⚠️ |

---

## CHUNK 3: Role-Based Routing & Middleware

### 3.1 Middleware Authentication Gate

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 3.1.1 | Public routes accessible without auth | `/`, `/sign-in`, `/sign-up`, `/status`, etc. | ✅ PUBLIC_ROUTES defined | ✅ |
| 3.1.2 | Protected routes require Firebase auth | Check session/token | ⚠️ Middleware passes through; API routes check auth | ⚠️ |
| 3.1.3 | Rate limiting per route | Different limits for auth, leaves, general | ✅ Implemented | ✅ |
| 3.1.4 | Security headers on all responses | CSP, HSTS, X-Frame, etc. | ✅ Implemented | ✅ |

### 3.2 Role-Based Portal Routing

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 3.2.1 | Admin role → `/hr/*` | Redirect on login | ✅ Sign-in routes admin to `/hr/dashboard` | ✅ |
| 3.2.2 | HR role → `/hr/*` | Redirect on login | ✅ Sign-in routes hr to `/hr/dashboard` | ✅ |
| 3.2.3 | Manager role → `/manager/*` | Redirect on login | ✅ Sign-in routes manager to `/manager/dashboard` | ✅ |
| 3.2.4 | Employee role → `/employee/*` | Redirect on login | ✅ Sign-in routes employee to `/employee/dashboard` | ✅ |
| 3.2.5 | Multi-role users → primary_role portal | Use `primary_role` field | ✅ Uses `primary_role` from `/api/auth/me` | ✅ |

### 3.3 Portal Access Verification

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 3.3.1 | Employee cannot access `/hr/*` | 403 or redirect | ✅ HR dashboard redirects non-admin/hr to correct portal | ✅ |
| 3.3.2 | Employee cannot access `/manager/*` | 403 or redirect | ✅ Manager dashboard redirects employees to `/employee/dashboard` | ✅ |
| 3.3.3 | Manager can access `/employee/*` | Higher roles inherit | ✅ Employee dashboard allows higher roles (but redirects admin/hr to HR) | ✅ |

---

## CHUNK 4: Leave Request Flow

### 4.1 Employee Applies for Leave

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 4.1.1 | Request Leave page at `/employee/request-leave` | Smart form with constraint preview | ✅ Page exists with good form | ✅ |
| 4.1.2 | Real-time balance display | Fetch from `/api/leaves/balances` | ✅ Balance API exists, uses session cookies | ✅ |
| 4.1.3 | Leave type selector | Dynamic from company LeaveTypes | ⚠️ Hardcoded types, should fetch from company | ⚠️ |
| 4.1.4 | Date range picker | Skip weekends/holidays auto | ⚠️ Date picker exists, no weekend/holiday skip | ⚠️ |
| 4.1.5 | Auto-fill manager | From ApprovalHierarchy | ⚠️ Not yet visible in UI | ⚠️ |
| 4.1.6 | Constraint rule preview | Show rules before submit | ⚠️ Not implemented in UI | ⚠️ |
| 4.1.7 | Submit → POST `/api/leaves/submit` | Constraint evaluation | ✅ API fully implemented | ✅ |
| 4.1.8 | Python constraint engine evaluation | 13 rules evaluated | ✅ Python backend integrated, called from API | ✅ |
| 4.1.9 | Success → pending_days updated | Balance ledger entry | ✅ Balance updated in API | ✅ |
| 4.1.10 | Manager notified | Email + real-time push | ✅ Email via `sendLeaveSubmissionEmail` | ✅ |

### 4.2 Manager/HR Approves Leave

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 4.2.1 | Approvals page shows pending requests | Filter by status | ✅ Page at `/manager/approvals` | ✅ |
| 4.2.2 | Approve/Reject buttons | State change API | ✅ `/api/leaves/approve/[id]` and `/api/leaves/reject/[id]` | ✅ |
| 4.2.3 | On approve: used_days updated | Balance ledger | ✅ Implemented in approve API | ✅ |
| 4.2.4 | Audit log created | Immutable record | ✅ Audit log created | ✅ |
| 4.2.5 | Employee notified | Email + push | ✅ Email via `sendLeaveApprovalEmail` | ✅ |

---

## CHUNK 5: HR Portal Features

### 5.1 HR Dashboard

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 5.1.1 | HR Dashboard at `/hr/dashboard` | Overview metrics | ✅ Page exists with auth verification | ✅ |
| 5.1.2 | Team availability heatmap | Real-time visualization | ⚠️ May exist | ? |
| 5.1.3 | Pending approvals widget | Quick action queue | ⚠️ May exist | ? |
| 5.1.4 | Attendance monitor | Check-in status | ⚠️ May exist | ? |

### 5.2 Policy Settings

| # | Feature | README Spec | Current State | Status |
|---|---------|-------------|---------------|--------|
| 5.2.1 | Configure constraint rules | Toggle blocking/warning, priorities | ⚠️ Page exists | ? |
| 5.2.2 | Configure leave types | Edit quotas, carry-forward | ⚠️ Page exists | ? |
| 5.2.3 | OTP verification for changes | Critical settings protected | ⚠️ OTP service exists | ? |

---

## IMPLEMENTATION PRIORITY ORDER

### Phase 1: Fix Critical Flow Breaks (Immediate)
1. ❌ **Onboarding Gate** - Check `onboarding_completed`, redirect if false
2. ❌ **Role-Based Routing** - Admin → `/hr/dashboard`, Employee → `/employee/dashboard`
3. ❌ **Complete Onboarding Wizard** - Save settings, mark complete, redirect
4. ⚠️ **Fix Auth Token Handling** - Ensure Firebase tokens work end-to-end

### Phase 2: Complete Core User Flows
5. ⚠️ **Employee Join Flow** - `/api/auth/join` → pending_approval → HR approval
6. ⚠️ **Employee Onboarding** - First-time employee tutorial/welcome
7. ⚠️ **Leave Request Submit** - Full constraint evaluation
8. ⚠️ **Leave Approval** - Manager/HR approve flow

### Phase 3: Polish & Enterprise Features
9. ⚠️ **Real-time Notifications** - Pusher integration
10. ⚠️ **Email Notifications** - Gmail service
11. ⚠️ **SLA Escalation** - Cron job for auto-escalation
12. ⚠️ **Payroll** - Monthly payroll run

---

## CHUNK IMPLEMENTATION PLAN

### Chunk 1: Fix Registration → Onboarding → HR Dashboard Flow
**Files to modify:**
- `middleware.ts` - Add onboarding gate, role-based redirects
- `app/onboarding/page.tsx` - Complete wizard, save settings API, completion redirect
- `app/(auth)/sign-up/page.tsx` - Ensure proper redirect handling
- `app/api/onboarding/complete/route.ts` - NEW: Save settings, mark complete

**Verification:**
1. Admin signs up → lands on `/onboarding`
2. Completes all 7 steps → data saved to DB
3. Click "Complete" → `onboarding_completed = true` → redirect to `/hr/dashboard`
4. Subsequent logins → straight to `/hr/dashboard`

### Chunk 2: Fix Role-Based Routing
**Files to modify:**
- `middleware.ts` - Add role check, portal routing
- `app/api/auth/me/route.ts` - NEW: Return current user role
- Layout files - Add role verification

**Verification:**
1. Admin user → always lands on `/hr/*`
2. Employee user → always lands on `/employee/*`
3. Manager user → can access `/manager/*`
4. Cross-portal access blocked

### Chunk 3: Employee Join & Approval Flow
**Files to modify:**
- `app/api/auth/join/route.ts` - Verify employee creation, status
- `app/hr/(main)/employee-registrations/page.tsx` - Approval queue
- `app/api/hr/approve-registration/route.ts` - Approve/reject

**Verification:**
1. Employee signs up with company code → status pending_approval
2. HR sees in queue → approves
3. Employee can login → lands on `/employee/dashboard`

---

*Last Updated: 2026-03-06*
*Version: 1.0*
