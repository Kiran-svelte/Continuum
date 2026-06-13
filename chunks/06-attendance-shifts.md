# C06 — Attendance & Shifts

**Priority:** P1 | **Routes:** employee/HR/manager attendance pages, `/api/attendance/*`, `/api/shifts/*`

**User:** Clock in/out, regularization, team attendance views.  
**Connects:** Onboarding step 8, shift admin, payroll LOP (C07).  
**Defects:** Geo/photo flags not fully enforced; WFH policy drift from settings.  
**Recovery:** Offline check-in queue N/A — show retry; HR override via `attendance.override` perm.  
**Tests:** `payroll-attendance.test.ts`
