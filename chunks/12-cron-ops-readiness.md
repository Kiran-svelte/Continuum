# C12 — Cron & Operations Readiness

**Priority:** P1 | **Routes:** `/api/cron/*`, super-admin operations page

**User:** System runs scheduled jobs (accrual, SLA, document expiry, probation).  
**Connects:** C05 leave SLA, C07 payroll, C11 compliance alerts.  
**Defects:** Cron auth secret rotation; ops readiness API completeness.  
**Recovery:** Failed cron → idempotent retry next window; Sentry alert.  
**Tests:** `cron-auth.test.ts`, `operations-readiness.test.ts`
