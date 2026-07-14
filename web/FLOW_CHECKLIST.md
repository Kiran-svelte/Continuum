# Continuum Platform — Complete Flow & Logic Checklist

## FLOWS BY ACTOR

---

### 🔴 SUPER ADMIN FLOWS
| # | Flow | Page | Status | Notes |
|---|------|------|--------|-------|
| SA-1 | Create Company + Owner | `/super-admin/companies/new` | ✅ FIXED | FK violation fixed; onboardingStatus added to response |
| SA-2 | Send Invite (no company) | `/super-admin/users/new` | ✅ FIXED | Module cap UI added; cap stored in UserInvite.module_cap and passed through to onboarding |
| SA-3 | View all companies | `/super-admin/companies` | ✅ OK | List + stats |
| SA-4 | View company detail | `/super-admin/companies/[id]` | ✅ OK | credentials + module toggle correct |
| SA-5 | Edit company module cap | `/super-admin/companies/[id]` | ✅ OK | PATCH validates, resolves deps, persists correctly |
| SA-6 | View all platform users | `/super-admin/users` | ✅ OK | Server component, auth server-side |
| SA-7 | Resend/revoke invite | `/super-admin/users` | ✅ OK | Server actions guarded by super_admin check |
| SA-8 | Platform operations | `/super-admin/operations` | 🔲 TODO | Cron, health, audit |
| SA-9 | Super admin dashboard | `/super-admin/dashboard` | 🔲 TODO | KPIs, company count, user count |
| SA-10 | Delete/suspend company | `/super-admin/companies/[id]` | 🔲 TODO | Soft delete? Hard delete? |

---

### 🟠 ADMIN FLOWS (Company Owner)
| # | Flow | Page | Status | Notes |
|---|------|------|--------|-------|
| A-1 | Onboarding wizard | `/hr/onboarding` | ✅ FIXED | step=13 set, draft cleared, leave quotas initialized, module_cap from invite applied |
| A-2 | Invite HR/employees | `/hr/employees/invite` | 🔲 TODO | Role selection, email invite |
| A-3 | Configure modules | `/hr/settings` | ✅ OK | Module toggle is SA-only; HR settings covers leave/notifications |
| A-4 | Configure roles & permissions | `/admin/rbac` | ✅ OK | credentials + tenant isolation correct |
| A-5 | Company billing & plan | `/admin/billing` | 🔲 TODO | Seat count, plan limits |
| A-6 | Company settings | `/admin/settings` | 🔲 TODO | Name, timezone, logo, leave year |
| A-7 | Manage leave types | `/hr/settings` → leave types | 🔲 TODO | Add/edit/disable leave types |
| A-8 | Set leave quotas | `/hr/leave-quotas` | 🔲 TODO | Annual allotments per type per employee |
| A-9 | Configure holidays | `/hr/settings` → holidays | 🔲 TODO | National + company holidays |
| A-10 | Manage departments | `/hr/settings` | 🔲 TODO | Create/rename/delete departments |
| A-11 | Startup readiness | `/admin/startup-readiness` | 🔲 TODO | Checklist for going live |
| A-12 | Delete employee | `/hr/employees/[id]` | 🔲 TODO | Soft delete (deleted_at), data retention |

---

### 🟡 HR FLOWS
| # | Flow | Page | Status | Notes |
|---|------|------|--------|-------|
| H-1 | View all employees | `/hr/employees` | 🔲 TODO | List, filter, search |
| H-2 | View employee profile | `/hr/employees/[id]` | 🔲 TODO | Full profile, documents, attendance |
| H-3 | Approve / reject leave | `/hr/approvals` | ✅ OK | Auth + credentials correct |
| H-4 | Manage attendance | `/hr/attendance` | ✅ OK | credentials + org scoping correct |
| H-5 | Approve regularization | `/hr/attendance` | ✅ OK | PATCH action correct |
| H-6 | Process payroll | `/hr/payroll` | ✅ FIXED | Actual attendance + leave days now used; LOP deduction calculated |
| H-7 | Approve reimbursements | `/hr/reimbursements` | ✅ OK | Auth + org scoping correct |
| H-8 | Leave requests view | `/hr/leave-requests` | ✅ OK | credentials correct |
| H-9 | Leave quotas management | `/hr/leave-quotas` | ✅ OK | credentials + bulk set correct |
| H-10 | Goals management | `/hr/goals` | ✅ OK | credentials correct |
| H-11 | Exit management | `/hr/exit` | ✅ OK | All 4 fetch calls have credentials |
| H-12 | Invite employees | `/hr/employees/invite` | 🔲 TODO | Email invite with role |

---

### 🔵 MANAGER FLOWS
| # | Flow | Page | Status | Notes |
|---|------|------|--------|-------|
| M-1 | Approve team leave | `/manager/approvals` | ✅ FIXED | JSON parse error fixed |
| M-2 | View team members | `/manager/team` | ✅ FIXED | Auth + org scoping added |
| M-3 | Approve payroll advances (team) | `/manager/advances` | ✅ OK | Shared PayrollAdvancesView with team approvals enabled |
| M-4 | Approve reimbursements (team) | `/manager/reimbursements` | ✅ OK | credentials + approve/reject correct |
| M-5 | Set team goals | `/manager/goals` | ⚠️ MISSING | Page/route does not exist yet — feature not built |
| M-6 | Approve attendance regularization | via approvals | ✅ FIXED | Cross-tenant scope fixed |

---

### 🟢 EMPLOYEE FLOWS
| # | Flow | Page | Status | Notes |
|---|------|------|--------|-------|
| E-1 | Sign in | `/sign-in` | ✅ FIXED | auth-secret.ts fix |
| E-2 | Employee dashboard | `/employee/dashboard` | ✅ FIXED | end_date null crash fixed |
| E-3 | Request leave | `/employee/request-leave` | ✅ OK | All required fields, credentials correct |
| E-4 | View leave history | `/employee/leave-history` | ✅ FIXED | Added catch block; json().catch guard added |
| E-5 | Check attendance | `/employee/attendance` | ✅ OK | Check-in/out POST correct |
| E-6 | Submit regularization | `/employee/attendance` | ✅ OK | regularize POST validates + dedups |
| E-7 | View payslip | `/employee/payroll` | ✅ FIXED | Popup-blocked alert added so failure is visible |
| E-8 | Submit reimbursement | `/employee/reimbursements` | ✅ OK | credentials + fields correct |
| E-9 | Request payroll advance | `/employee/payroll-advances` | ✅ FIXED | repaymentMonths validation |
| E-10 | View performance goals | `/employee/performance` | ✅ FIXED | Error handling added |
| E-11 | Self review | `/employee/performance` | ✅ FIXED | Added rating+strengths+improvements form for open reviews |
| E-12 | Travel & expenses | `/employee/travel` | ✅ FIXED | Error handling added |
| E-13 | Learning & courses | `/employee/learning` | ✅ FIXED | Error handling added |
| E-14 | View documents | `/employee/documents` | ✅ FIXED | Auth + error handling |
| E-15 | Update own profile | `/employee/profile` | ✅ FIXED | date_of_birth validation added (was 500, now 400) |
| E-16 | Change password | `/employee/profile` | ⚠️ MISSING | Password reset is email-based (link); no inline change for employees. By design (Supabase). |
| E-17 | Exit / resignation | `/employee/exit` | ✅ FIXED | Checklist now toggles individual items (was toggling whole checklist) |
| E-18 | Notifications | bell icon | ✅ FIXED | mark-read + mark-all-read now send credentials: 'include' |

---

### 🟣 UNIVERSAL FLOWS
| # | Flow | Status | Notes |
|---|------|--------|-------|
| U-1 | Invite accept (email link) | ✅ FIXED | FK bugs fixed, module_cap passed to onboarding, invited_by_type null-safe |
| U-2 | Password reset | `/reset-password` | ✅ OK | Complete flow: email → token link → set password → sessions revoked |
| U-3 | Global search | search bar | ✅ FIXED | Offset overflow fixed |
| U-4 | Module guard (disabled module) | everywhere | ✅ OK | requireModuleForOrg checks |
| U-5 | Sign out | nav | ✅ FIXED | credentials: 'include' added to sign-out API call |

---

## BUSINESS LOGIC GAPS IDENTIFIED

### SA-2: Send Invite vs Create Company inconsistency
**Problem:** Create Company lets super admin pre-select modules. Send Invite doesn't.
**Root cause:** Module cap can't be stored in `UserInvite` (no schema field) + company doesn't exist yet.
**Fix:** Update Send Invite UI to clearly explain the difference. Add module cap to `UserInvite` schema OR instruct super admin to set cap post-creation via company detail page.
**Decision:** Add `module_cap Json?` to `UserInvite` + pass it during onboarding company creation. This requires a DB migration.

### SA-1: Create Company broken
**Fixed:** `invited_by_id` → `invited_by_super_id`

### Onboarding completion
**Problem:** After a super admin creates a company, the owner must complete an onboarding wizard. But the onboarding wizard's `complete` endpoint had a bug (ConstraintPolicy always v1). Fixed.

### Leave quota initialization
**Problem:** When a company completes onboarding, are leave quotas initialized for existing employees?
**TODO:** Check `quotas/initialize` route is called during onboarding completion.

### Role hierarchy & permission flow
**Problem:** Custom company roles created via RBAC need to propagate to module permission checks.
**TODO:** Verify `requirePermissionGuard` reads from custom roles, not just hardcoded role strings.
