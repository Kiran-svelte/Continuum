# 🧪 CONTINUUM SMOKE TEST RESULTS
> Generated: 2026-06-29T09:02:49.904Z

## 📊 Summary

| Metric | Count |
|--------|-------|
| Total routes tested | **95** |
| ✅ Success | **4** |
| ❌ Crashes (JS errors) | **0** |
| ⛔ 404 Not Found | **0** |
| 🔒 Auth Required (redirected to login) | **91** |
| ⚠️  Redirects (unexpected) | **0** |
| ⏱️  Timeouts | **0** |
| Total buttons clicked | **1** |
| Dead buttons (crash/error) | **0** |

## ❌ CRASHES (JS Errors)

> No page crashes found! 🎉

## ⛔ 404 NOT FOUND ROUTES

> No 404s found! 🎉

## 🔘 DEAD BUTTONS

> No dead buttons found! 🎉

## 🔒 AUTH-GATED ROUTES (expected)

- `http://localhost:3000/privacy` → `http://localhost:3000/sign-in`
- `http://localhost:3000/terms` → `http://localhost:3000/sign-in`
- `http://localhost:3000/support` → `http://localhost:3000/sign-in`
- `http://localhost:3000/help` → `http://localhost:3000/sign-in`
- `http://localhost:3000/status` → `http://localhost:3000/sign-in`
- `http://localhost:3000/about` → `http://localhost:3000/sign-in`
- `http://localhost:3000/blog` → `http://localhost:3000/sign-in`
- `http://localhost:3000/careers` → `http://localhost:3000/sign-in`
- `http://localhost:3000/changelog` → `http://localhost:3000/sign-in`
- `http://localhost:3000/cookies` → `http://localhost:3000/sign-in`
- `http://localhost:3000/hr/dashboard` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fdashboard&error=auth_required`
- `http://localhost:3000/hr/employees` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Femployees&error=auth_required`
- `http://localhost:3000/hr/employees/invite` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Femployees%2Finvite&error=auth_required`
- `http://localhost:3000/hr/approvals` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fapprovals&error=auth_required`
- `http://localhost:3000/hr/attendance` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fattendance&error=auth_required`
- `http://localhost:3000/hr/audit-logs` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Faudit-logs&error=auth_required`
- `http://localhost:3000/hr/bulk-import` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fbulk-import&error=auth_required`
- `http://localhost:3000/hr/compensation` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fcompensation&error=auth_required`
- `http://localhost:3000/hr/compliance` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fcompliance&error=auth_required`
- `http://localhost:3000/hr/documents` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fdocuments&error=auth_required`
- `http://localhost:3000/hr/employee-movements` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Femployee-movements&error=auth_required`
- `http://localhost:3000/hr/escalation` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fescalation&error=auth_required`
- `http://localhost:3000/hr/exit-checklist` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fexit-checklist&error=auth_required`
- `http://localhost:3000/hr/goals` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fgoals&error=auth_required`
- `http://localhost:3000/hr/holidays` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fholidays&error=auth_required`
- `http://localhost:3000/hr/job-board` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fjob-board&error=auth_required`
- `http://localhost:3000/hr/learning` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Flearning&error=auth_required`
- `http://localhost:3000/hr/leave-balance` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fleave-balance&error=auth_required`
- `http://localhost:3000/hr/leave-calendar` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fleave-calendar&error=auth_required`
- `http://localhost:3000/hr/leave-encashment` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fleave-encashment&error=auth_required`
- `http://localhost:3000/hr/leave-quotas` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fleave-quotas&error=auth_required`
- `http://localhost:3000/hr/leave-requests` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fleave-requests&error=auth_required`
- `http://localhost:3000/hr/my-attendance` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fmy-attendance&error=auth_required`
- `http://localhost:3000/hr/notifications` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fnotifications&error=auth_required`
- `http://localhost:3000/hr/organization` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Forganization&error=auth_required`
- `http://localhost:3000/hr/payroll` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fpayroll&error=auth_required`
- `http://localhost:3000/hr/payroll-advances` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fpayroll-advances&error=auth_required`
- `http://localhost:3000/hr/payslips` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fpayslips&error=auth_required`
- `http://localhost:3000/hr/performance` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fperformance&error=auth_required`
- `http://localhost:3000/hr/pf-reports` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fpf-reports&error=auth_required`
- `http://localhost:3000/hr/policy-settings` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fpolicy-settings&error=auth_required`
- `http://localhost:3000/hr/profile` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fprofile&error=auth_required`
- `http://localhost:3000/hr/recruitment` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Frecruitment&error=auth_required`
- `http://localhost:3000/hr/reimbursements` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Freimbursements&error=auth_required`
- `http://localhost:3000/hr/report-builder` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Freport-builder&error=auth_required`
- `http://localhost:3000/hr/reports` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Freports&error=auth_required`
- `http://localhost:3000/hr/request-leave` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Frequest-leave&error=auth_required`
- `http://localhost:3000/hr/reviews` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Freviews&error=auth_required`
- `http://localhost:3000/hr/salary-components` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fsalary-components&error=auth_required`
- `http://localhost:3000/hr/salary-structures` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fsalary-structures&error=auth_required`
- `http://localhost:3000/hr/search` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fsearch&error=auth_required`
- `http://localhost:3000/hr/settings` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fsettings&error=auth_required`
- `http://localhost:3000/hr/shifts` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fshifts&error=auth_required`
- `http://localhost:3000/hr/travel` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Ftravel&error=auth_required`
- `http://localhost:3000/hr/approval-config` → `http://localhost:3000/sign-in?redirect=%2Fhr%2Fapproval-config&error=auth_required`
- `http://localhost:3000/employee/dashboard` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fdashboard&error=auth_required`
- `http://localhost:3000/employee/attendance` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fattendance&error=auth_required`
- `http://localhost:3000/employee/directory` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fdirectory&error=auth_required`
- `http://localhost:3000/employee/documents` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fdocuments&error=auth_required`
- `http://localhost:3000/employee/exit-checklist` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fexit-checklist&error=auth_required`
- `http://localhost:3000/employee/leave-history` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fleave-history&error=auth_required`
- `http://localhost:3000/employee/learning` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Flearning&error=auth_required`
- `http://localhost:3000/employee/notifications` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fnotifications&error=auth_required`
- `http://localhost:3000/employee/payslips` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fpayslips&error=auth_required`
- `http://localhost:3000/employee/performance` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fperformance&error=auth_required`
- `http://localhost:3000/employee/profile` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fprofile&error=auth_required`
- `http://localhost:3000/employee/reimbursements` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Freimbursements&error=auth_required`
- `http://localhost:3000/employee/request-leave` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Frequest-leave&error=auth_required`
- `http://localhost:3000/employee/search` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fsearch&error=auth_required`
- `http://localhost:3000/employee/settings` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fsettings&error=auth_required`
- `http://localhost:3000/employee/travel` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Ftravel&error=auth_required`
- `http://localhost:3000/employee/payroll-advances` → `http://localhost:3000/sign-in?redirect=%2Femployee%2Fpayroll-advances&error=auth_required`
- `http://localhost:3000/manager/dashboard` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fdashboard&error=auth_required`
- `http://localhost:3000/manager/approvals` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fapprovals&error=auth_required`
- `http://localhost:3000/manager/directory` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fdirectory&error=auth_required`
- `http://localhost:3000/manager/leave-requests` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fleave-requests&error=auth_required`
- `http://localhost:3000/manager/my-attendance` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fmy-attendance&error=auth_required`
- `http://localhost:3000/manager/notifications` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fnotifications&error=auth_required`
- `http://localhost:3000/manager/people` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fpeople&error=auth_required`
- `http://localhost:3000/manager/performance` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fperformance&error=auth_required`
- `http://localhost:3000/manager/profile` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fprofile&error=auth_required`
- `http://localhost:3000/manager/reimbursements` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Freimbursements&error=auth_required`
- `http://localhost:3000/manager/reports` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Freports&error=auth_required`
- `http://localhost:3000/manager/request-leave` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Frequest-leave&error=auth_required`
- `http://localhost:3000/manager/search` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fsearch&error=auth_required`
- `http://localhost:3000/manager/settings` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fsettings&error=auth_required`
- `http://localhost:3000/manager/team` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fteam&error=auth_required`
- `http://localhost:3000/manager/team-attendance` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fteam-attendance&error=auth_required`
- `http://localhost:3000/manager/team-calendar` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fteam-calendar&error=auth_required`
- `http://localhost:3000/manager/payslips` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fpayslips&error=auth_required`
- `http://localhost:3000/manager/payroll-advances` → `http://localhost:3000/sign-in?redirect=%2Fmanager%2Fpayroll-advances&error=auth_required`

## ✅ ALL ROUTE RESULTS

| Route | Status | Final URL | Load Time | Errors | Buttons Clicked |
|-------|--------|-----------|-----------|--------|-----------------|
| `/` | ✅ success | `/` | 4576ms | 0 | 0 |
| `/sign-in` | ✅ success | `/sign-in` | 7369ms | 0 | 1 |
| `/sign-up` | ✅ success | `/sign-up` | 3986ms | 0 | 0 |
| `/forgot-password` | ✅ success | `/forgot-password` | 4034ms | 0 | 0 |
| `/privacy` | 🔒 auth-required | `/sign-in` | 6586ms | 0 | 0 |
| `/terms` | 🔒 auth-required | `/sign-in` | 6909ms | 0 | 0 |
| `/support` | 🔒 auth-required | `/sign-in` | 6273ms | 0 | 0 |
| `/help` | 🔒 auth-required | `/sign-in` | 5242ms | 0 | 0 |
| `/status` | 🔒 auth-required | `/sign-in` | 6676ms | 0 | 0 |
| `/about` | 🔒 auth-required | `/sign-in` | 6724ms | 0 | 0 |
| `/blog` | 🔒 auth-required | `/sign-in` | 6750ms | 0 | 0 |
| `/careers` | 🔒 auth-required | `/sign-in` | 6465ms | 0 | 0 |
| `/changelog` | 🔒 auth-required | `/sign-in` | 6800ms | 0 | 0 |
| `/cookies` | 🔒 auth-required | `/sign-in` | 7133ms | 0 | 0 |
| `/hr/dashboard` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fdashboard&error=auth_required` | 2822ms | 0 | 0 |
| `/hr/employees` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Femployees&error=auth_required` | 4821ms | 0 | 0 |
| `/hr/employees/invite` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Femployees%2Finvite&error=auth_required` | 3017ms | 0 | 0 |
| `/hr/approvals` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fapprovals&error=auth_required` | 2795ms | 0 | 0 |
| `/hr/attendance` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fattendance&error=auth_required` | 2792ms | 0 | 0 |
| `/hr/audit-logs` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Faudit-logs&error=auth_required` | 3477ms | 0 | 0 |
| `/hr/bulk-import` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fbulk-import&error=auth_required` | 2644ms | 0 | 0 |
| `/hr/compensation` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fcompensation&error=auth_required` | 2858ms | 0 | 0 |
| `/hr/compliance` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fcompliance&error=auth_required` | 2771ms | 0 | 0 |
| `/hr/documents` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fdocuments&error=auth_required` | 2770ms | 0 | 0 |
| `/hr/employee-movements` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Femployee-movements&error=auth_required` | 2835ms | 0 | 0 |
| `/hr/escalation` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fescalation&error=auth_required` | 2803ms | 0 | 0 |
| `/hr/exit-checklist` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fexit-checklist&error=auth_required` | 2837ms | 0 | 0 |
| `/hr/goals` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fgoals&error=auth_required` | 2855ms | 0 | 0 |
| `/hr/holidays` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fholidays&error=auth_required` | 2817ms | 0 | 0 |
| `/hr/job-board` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fjob-board&error=auth_required` | 2787ms | 0 | 0 |
| `/hr/learning` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Flearning&error=auth_required` | 2838ms | 0 | 0 |
| `/hr/leave-balance` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fleave-balance&error=auth_required` | 4511ms | 0 | 0 |
| `/hr/leave-calendar` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fleave-calendar&error=auth_required` | 2773ms | 0 | 0 |
| `/hr/leave-encashment` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fleave-encashment&error=auth_required` | 2724ms | 0 | 0 |
| `/hr/leave-quotas` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fleave-quotas&error=auth_required` | 2755ms | 0 | 0 |
| `/hr/leave-requests` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fleave-requests&error=auth_required` | 2759ms | 0 | 0 |
| `/hr/my-attendance` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fmy-attendance&error=auth_required` | 2674ms | 0 | 0 |
| `/hr/notifications` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fnotifications&error=auth_required` | 2756ms | 0 | 0 |
| `/hr/organization` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Forganization&error=auth_required` | 2719ms | 0 | 0 |
| `/hr/payroll` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fpayroll&error=auth_required` | 2691ms | 0 | 0 |
| `/hr/payroll-advances` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fpayroll-advances&error=auth_required` | 2682ms | 0 | 0 |
| `/hr/payslips` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fpayslips&error=auth_required` | 2901ms | 0 | 0 |
| `/hr/performance` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fperformance&error=auth_required` | 2787ms | 0 | 0 |
| `/hr/pf-reports` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fpf-reports&error=auth_required` | 3853ms | 0 | 0 |
| `/hr/policy-settings` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fpolicy-settings&error=auth_required` | 2760ms | 0 | 0 |
| `/hr/profile` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fprofile&error=auth_required` | 2756ms | 0 | 0 |
| `/hr/recruitment` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Frecruitment&error=auth_required` | 2748ms | 0 | 0 |
| `/hr/reimbursements` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Freimbursements&error=auth_required` | 2686ms | 0 | 0 |
| `/hr/report-builder` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Freport-builder&error=auth_required` | 2709ms | 0 | 0 |
| `/hr/reports` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Freports&error=auth_required` | 2760ms | 0 | 0 |
| `/hr/request-leave` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Frequest-leave&error=auth_required` | 3405ms | 0 | 0 |
| `/hr/reviews` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Freviews&error=auth_required` | 2700ms | 0 | 0 |
| `/hr/salary-components` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fsalary-components&error=auth_required` | 2732ms | 0 | 0 |
| `/hr/salary-structures` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fsalary-structures&error=auth_required` | 2701ms | 0 | 0 |
| `/hr/search` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fsearch&error=auth_required` | 2714ms | 0 | 0 |
| `/hr/settings` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fsettings&error=auth_required` | 2806ms | 0 | 0 |
| `/hr/shifts` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fshifts&error=auth_required` | 2852ms | 0 | 0 |
| `/hr/travel` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Ftravel&error=auth_required` | 2792ms | 0 | 0 |
| `/hr/approval-config` | 🔒 auth-required | `/sign-in?redirect=%2Fhr%2Fapproval-config&error=auth_required` | 2744ms | 0 | 0 |
| `/employee/dashboard` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fdashboard&error=auth_required` | 2815ms | 0 | 0 |
| `/employee/attendance` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fattendance&error=auth_required` | 2806ms | 0 | 0 |
| `/employee/directory` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fdirectory&error=auth_required` | 2871ms | 0 | 0 |
| `/employee/documents` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fdocuments&error=auth_required` | 3708ms | 0 | 0 |
| `/employee/exit-checklist` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fexit-checklist&error=auth_required` | 2830ms | 0 | 0 |
| `/employee/leave-history` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fleave-history&error=auth_required` | 2832ms | 0 | 0 |
| `/employee/learning` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Flearning&error=auth_required` | 2797ms | 0 | 0 |
| `/employee/notifications` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fnotifications&error=auth_required` | 2706ms | 0 | 0 |
| `/employee/payslips` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fpayslips&error=auth_required` | 2704ms | 0 | 0 |
| `/employee/performance` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fperformance&error=auth_required` | 2697ms | 0 | 0 |
| `/employee/profile` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fprofile&error=auth_required` | 3383ms | 0 | 0 |
| `/employee/reimbursements` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Freimbursements&error=auth_required` | 2753ms | 0 | 0 |
| `/employee/request-leave` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Frequest-leave&error=auth_required` | 2771ms | 0 | 0 |
| `/employee/search` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fsearch&error=auth_required` | 2713ms | 0 | 0 |
| `/employee/settings` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fsettings&error=auth_required` | 2717ms | 0 | 0 |
| `/employee/travel` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Ftravel&error=auth_required` | 2682ms | 0 | 0 |
| `/employee/payroll-advances` | 🔒 auth-required | `/sign-in?redirect=%2Femployee%2Fpayroll-advances&error=auth_required` | 2799ms | 0 | 0 |
| `/manager/dashboard` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fdashboard&error=auth_required` | 2792ms | 0 | 0 |
| `/manager/approvals` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fapprovals&error=auth_required` | 2827ms | 0 | 0 |
| `/manager/directory` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fdirectory&error=auth_required` | 2739ms | 0 | 0 |
| `/manager/leave-requests` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fleave-requests&error=auth_required` | 2736ms | 0 | 0 |
| `/manager/my-attendance` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fmy-attendance&error=auth_required` | 3585ms | 0 | 0 |
| `/manager/notifications` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fnotifications&error=auth_required` | 2873ms | 0 | 0 |
| `/manager/people` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fpeople&error=auth_required` | 2814ms | 0 | 0 |
| `/manager/performance` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fperformance&error=auth_required` | 3260ms | 0 | 0 |
| `/manager/profile` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fprofile&error=auth_required` | 2848ms | 0 | 0 |
| `/manager/reimbursements` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Freimbursements&error=auth_required` | 2758ms | 0 | 0 |
| `/manager/reports` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Freports&error=auth_required` | 2772ms | 0 | 0 |
| `/manager/request-leave` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Frequest-leave&error=auth_required` | 2953ms | 0 | 0 |
| `/manager/search` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fsearch&error=auth_required` | 2829ms | 0 | 0 |
| `/manager/settings` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fsettings&error=auth_required` | 2796ms | 0 | 0 |
| `/manager/team` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fteam&error=auth_required` | 2886ms | 0 | 0 |
| `/manager/team-attendance` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fteam-attendance&error=auth_required` | 2852ms | 0 | 0 |
| `/manager/team-calendar` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fteam-calendar&error=auth_required` | 3006ms | 0 | 0 |
| `/manager/payslips` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fpayslips&error=auth_required` | 2789ms | 0 | 0 |
| `/manager/payroll-advances` | 🔒 auth-required | `/sign-in?redirect=%2Fmanager%2Fpayroll-advances&error=auth_required` | 2881ms | 0 | 0 |
