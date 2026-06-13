# C07 — Payroll & Compliance

**Priority:** P1 | **Routes:** payroll pages, `/api/payroll/*`, PF reports, compliance

**User:** HR runs payroll cycles, payslips, statutory reports.  
**Connects:** Onboarding step 11, attendance LOP, employee compensation.  
**Defects:** Disclaimer components required; partial PR14 modules; preflight gating.  
**Recovery:** Payroll preflight blocks bad runs; rollback cycle status in DB.  
**Tests:** `payroll-attendance.test.ts`, compliance routes
