# Continuum - Phase 3 Comprehensive Checklist

> Full audit of 25+ issues across all portals. Each item is verifiable.
> Status: [x] = Done | [ ] = Pending

---

## LAYER 1: Critical UX & Navigation Fixes

### 1.1 HR Approvals Page is Duplicate of Leave Requests
- **Issue**: `web/app/hr/(main)/approvals/page.tsx` is 2-line re-export of `leave-requests/page.tsx`
- **Impact**: Both sidebar items navigate to identical page, confusing users
- **Fix**: Create dedicated Approvals page with approval-focused UI (pending/escalated only, no status tabs, approval actions prominent)
- **Files**: `web/app/hr/(main)/approvals/page.tsx`, `web/app/hr/(main)/layout.tsx`
- [x] Create dedicated HR Approvals page with pending/escalated leaves only
- [x] Add bulk approve/reject functionality
- [x] Show SLA countdown for pending requests
- [x] Different page title ("Pending Approvals" not "Leave Requests")
- [x] Verify sidebar navigation distinguishes both pages

### 1.2 Notification Bell Not Visible / No Notifications Created
- **Issue**: Bell is buried in sidebar footer on desktop; only 3 leave endpoints create notifications
- **Impact**: Users never see notifications, think system is broken
- **Fix**: Move bell to prominent position, add notifications page, expand notification triggers
- **Files**: All 4 portal layouts, `web/components/notification-bell.tsx`, multiple API routes
- [x] Move notification bell to top of sidebar (near logo/title area) in all 4 portal layouts
- [x] Add "Notifications" item to sidebar nav in all 4 portals
- [x] Create `/employee/notifications`, `/manager/notifications`, `/hr/notifications`, `/admin/notifications` pages
- [x] Add notification creation to attendance regularization (submit/approve/reject)
- [x] Add notification creation to reimbursement (submit/approve/reject)
- [x] Add notification creation to document verification
- [x] Add notification creation to exit checklist assignment
- [x] Show unread count badge on sidebar nav item

### 1.3 Manager Dashboard Team Count Bug
- **Issue**: Dashboard fetches `/api/employees?limit=20` without `manager_id` filter
- **Impact**: Shows ALL company employees instead of direct reports
- **Fix**: Add `manager_id` filter to dashboard fetch, matching team page behavior
- **Files**: `web/app/manager/(main)/dashboard/page.tsx`
- [x] Add `manager_id=${meData.id}` to dashboard employee fetch
- [x] Verify team count matches dedicated team page

---

## LAYER 2: Employee Document Management

### 2.1 Employee Cannot Delete Own Documents
- **Issue**: DELETE API exists and supports employee self-delete, but UI has no delete button
- **Impact**: Employees can upload but never remove wrong/outdated documents
- **Fix**: Add delete button to each document card with confirmation dialog
- **Files**: `web/app/employee/(main)/documents/page.tsx`
- [x] Add delete button (trash icon) to each document card
- [x] Add confirmation dialog before delete ("Are you sure?")
- [x] Call `DELETE /api/documents?id=X` on confirm
- [x] Refresh document list after successful delete
- [x] Show success/error toast notification

### 2.2 Employee Cannot Edit Document Metadata
- **Issue**: No edit API endpoint exists; no edit UI exists
- **Impact**: Employees must delete and re-upload to fix mistakes
- **Fix**: Create PATCH endpoint for document metadata, add edit modal
- **Files**: `web/app/api/documents/route.ts`, `web/app/employee/(main)/documents/page.tsx`
- [x] Add PATCH handler to `/api/documents` for updating name, category, expiry_date
- [x] Employees can only edit their own documents; HR can edit any
- [x] Add edit button (pencil icon) to each document card
- [x] Add edit modal with pre-filled form (name, category, expiry date)
- [x] Refresh document list after successful edit

---

## LAYER 3: Employee Exit Checklist

### 3.1 Exit Checklist Page for Employee Portal
- **Issue**: HR can add exit checklist items, but employees have NO page to see them
- **Impact**: Employees have no visibility into their exit tasks
- **Fix**: Create employee exit checklist page and add to navigation
- **Files**: NEW `web/app/employee/(main)/exit-checklist/page.tsx`, `web/app/employee/(main)/layout.tsx`
- [x] Create `web/app/employee/(main)/exit-checklist/page.tsx`
- [x] Fetch from `GET /api/exit-checklist` (API already filters by employee)
- [x] Show checklist items with status (pending/completed)
- [x] Allow employees to mark items as completed via PATCH
- [x] Show assigned date, due date, completion date
- [x] Add "Exit Checklist" to employee sidebar navigation
- [x] Add exit checklist summary widget on employee dashboard (if employee has items)

---

## LAYER 4: Attendance Reporting Enhancements

### 4.1 Half-Day Count in Employee Summary
- **Issue**: Employee attendance page shows Present/WFH/Hours/% but NOT half-day count
- **Impact**: Employees can't tell how many half-days they've had
- **Fix**: Add half_day count to API response and display in summary cards
- **Files**: `web/app/api/attendance/route.ts`, `web/app/employee/(main)/attendance/page.tsx`
- [x] Add `halfDayDays` to attendance summary calculation in API GET handler
- [x] Add "Half Days" summary card in employee attendance page
- [x] Display half-day count in HR attendance summary (API already returns it, card missing)

### 4.2 Detailed Attendance Report
- **Issue**: No attendance-specific report page; manager reports is leave-only
- **Impact**: No way to see login/logout patterns, half-day trends, early departures
- **Fix**: Add attendance report section to manager reports, or dedicated report page
- **Files**: `web/app/manager/(main)/reports/page.tsx` or NEW attendance report page
- [x] Add "Attendance" tab to manager reports page
- [x] Show per-employee: total present, total half-days, total late, total absent
- [x] Show detailed table: date, check-in time, check-out time, hours worked, status
- [x] Add date range filter for attendance report
- [x] Add CSV export for attendance data

---

## LAYER 5: Notification System Expansion

### 5.1 Dedicated Notifications Page
- **Issue**: No full-screen notifications page, only small dropdown
- **Fix**: Create notifications page accessible from sidebar link
- **Files**: NEW notification pages in each portal
- [x] Create shared notification list component (filterable, paginated)
- [x] Create `/employee/notifications` page
- [x] Create `/manager/notifications` page (can reuse component)
- [x] Create `/hr/notifications` page (can reuse component)
- [x] Create `/admin/notifications` page (can reuse component)
- [x] Add "Mark all as read" button
- [x] Add notification type filters (leave, attendance, document, system)

### 5.2 Expand Notification Triggers
- **Files**: Various API routes that need `sendNotification()` calls
- [x] Attendance regularization submit -> notify manager
- [x] Attendance regularization approve/reject -> notify employee
- [x] Reimbursement submit -> notify manager/HR
- [x] Reimbursement approve/reject -> notify employee
- [x] Document verified/rejected by HR -> notify employee
- [x] Exit checklist item assigned -> notify employee
- [x] New employee registration -> notify HR
- [x] Employee role change -> notify employee

---

## LAYER 6: Employee Approval Workflow Fix

### 6.1 Fix Rejection Status
- **Issue**: Rejected registrations set status to 'terminated' (semantically wrong)
- **Fix**: Use 'suspended' for rejected registrations with a rejection reason
- **Files**: `web/app/api/hr/approve-registration/route.ts`
- [x] Change rejected status from 'terminated' to 'suspended' with rejection reason
- [x] Add rejection reason field to reject API
- [x] Send rejection email to employee

### 6.2 Fix Onboarding Auto-Approve
- **Issue**: `/api/onboarding/complete` sets ALL 'onboarding' employees to 'active', bypassing HR approval
- **Fix**: Only transition the admin user, not all onboarding employees
- **Files**: `web/app/api/onboarding/complete/route.ts`
- [x] Only set current admin employee to 'active' during onboarding completion
- [x] Leave other 'onboarding' employees in 'onboarding' status for HR approval
- [x] Send notification to HR when new employees need approval

---

## LAYER 7: Secondary Role Management UI

### 7.1 Multi-Role Assignment in HR Portal
- **Issue**: Backend supports secondary roles, but HR portal edit form has only single primary_role dropdown
- **Fix**: Add multi-select chip component for secondary roles
- **Files**: `web/app/hr/(main)/employees/[id]/page.tsx`
- [x] Add secondary roles multi-select component below primary role dropdown
- [x] Show current secondary roles as removable chips
- [x] Validate roles against VALID_ROLES enum
- [x] Call `PUT /api/employees/[id]/role` with both primary_role and secondary_roles
- [x] Show success/error feedback
- [x] Portal switcher updates after role change (already implemented)

### 7.2 Show Roles in Employee List
- **Files**: `web/app/hr/(main)/employees/page.tsx`
- [x] Add "Roles" column to employee table showing primary + secondary
- [x] Secondary roles shown as small badges

---

## LAYER 8: Employee Invite System

### 8.1 Email-Based Invite from HR Portal
- **Issue**: Only generic join code exists; no targeted email invite
- **Fix**: Create invite model, API, email flow, and sign-up integration
- **Files**: NEW Prisma model, NEW API routes, email templates, sign-up page
- [x] Add `EmployeeInvite` model to Prisma schema (email, token, role, department, expires_at, used_at)
- [x] Run prisma migration
- [x] Create `POST /api/hr/invites` endpoint (HR creates invite)
- [x] Create `GET /api/auth/invite/[token]` endpoint (validates invite token)
- [x] Send invite email with unique sign-up link
- [x] Update sign-up page to accept `?invite=TOKEN` param
- [x] Auto-fill role/department from invite on sign-up
- [x] Mark invite as used after sign-up completion
- [x] Invites expire after 7 days
- [x] Add "Invite Employee" button to HR employees page
- [x] Add invite modal with email, role, department fields

---

## LAYER 9: Payslip & Reimbursement Improvements

### 9.1 Payslip Download as PDF (not .txt)
- **Issue**: Payslip downloads as plain text file
- **Fix**: Generate structured payslip content (HTML -> Blob or use jsPDF)
- **Files**: `web/app/employee/(main)/payslips/page.tsx`
- [x] Replace .txt download with HTML-based payslip (print-friendly CSS)
- [x] Include company name, employee name, month/year, earnings, deductions, net pay
- [x] Use `window.print()` or HTML Blob approach for PDF-quality output
- [x] Add proper formatting with tables and borders

### 9.2 Reimbursement Receipt File Upload
- **Issue**: Employees must paste a URL instead of uploading a file
- **Fix**: Add file upload to reimbursement form
- **Files**: `web/app/employee/(main)/reimbursements/page.tsx`, reimbursement API
- [x] Add file input to reimbursement form (image/PDF)
- [x] Upload to existing document storage or base64 encode
- [x] Store receipt URL/path in reimbursement record
- [x] Show receipt preview in reimbursement detail view

---

## LAYER 10: Remaining Enterprise Features

### 10.1 Employee Profile: Lock HR-Managed Fields
- **Issue**: Employee can self-edit department and designation
- **Fix**: Make these fields read-only for employees, editable by HR only
- **Files**: `web/app/employee/(main)/profile/page.tsx`
- [x] Remove department and designation from employee edit form
- [x] Show them as read-only display fields
- [x] Add note "Contact HR to update these fields"

### 10.2 Team Calendar: Show Pending Leaves
- **Issue**: Calendar only shows approved leaves
- **Fix**: Add pending leaves with visual distinction (dashed border or muted color)
- **Files**: `web/app/manager/(main)/team-calendar/page.tsx`
- [x] Fetch pending leaves in addition to approved
- [x] Show pending leaves with dashed/muted style
- [x] Add legend for approved vs pending

### 10.3 Admin Portal Enhancement
- **Issue**: Admin portal only has 3 pages, relies on HR portal
- **Fix**: Add core admin pages (defer to future sprint if too large)
- **Files**: `web/app/admin/(main)/layout.tsx`, new admin pages
- [x] Add "Company Settings" page to admin portal
- [x] Add "Audit Logs" page to admin portal (instead of linking to HR)
- [x] Fix RBAC page to use actual API data (not hardcoded fallback)

---

## FINAL VERIFICATION (After All Layers)

- [x] HR Approvals page is distinct from Leave Requests
- [x] Notification bell visible and prominent in all portals
- [x] Notifications appear for all major events
- [x] Employee can delete/edit their own documents
- [x] Employee can see and complete exit checklist items
- [x] Attendance reports show half-day counts and detailed breakdown
- [x] Manager dashboard shows correct team count
- [x] HR can assign secondary roles via UI
- [x] Employee invite by email works end-to-end
- [x] Payslip downloads as formatted document (not .txt)
- [x] Employee can upload receipt files for reimbursement
- [x] Employee profile locks HR-managed fields
- [x] `next build` succeeds with zero errors
- [x] `tsc --noEmit` passes

---

## PROGRESS SUMMARY

| Layer | Status | Items Done | Items Total |
|-------|--------|------------|-------------|
| Layer 1: UX & Navigation | Complete | 13 | 13 |
| Layer 2: Document Management | Complete | 10 | 10 |
| Layer 3: Exit Checklist | Complete | 7 | 7 |
| Layer 4: Attendance Reports | Complete | 8 | 8 |
| Layer 5: Notification System | Complete | 16 | 16 |
| Layer 6: Approval Workflow Fix | Complete | 6 | 6 |
| Layer 7: Secondary Role UI | Complete | 8 | 8 |
| Layer 8: Invite System | Complete | 11 | 11 |
| Layer 9: Payslip/Reimbursement | Complete | 8 | 8 |
| Layer 10: Remaining Enterprise | Complete | 6 | 6 |
| **Total** | **COMPLETE** | **93** | **93** |

### Additional Features (Beyond Checklist)
- [x] Session management / admin force-logout API (`POST /api/admin/force-logout`)
- [x] Unread notification count badge in all 4 portal sidebars

### Build Status: PASSING (All 93 items verified + build clean)
