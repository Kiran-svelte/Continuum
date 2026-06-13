# C11 — Reports, Audit & Compliance

**Priority:** P2 | **Routes:** `/api/reports/*`, audit logs, compliance pages

**User:** HR exports headcount, leave, payroll register, document expiry.  
**Connects:** All modules for data sources; audit chain integrity.  
**Defects:** Report endpoints must enforce tenant scope + module gates.  
**Recovery:** Export fails → retry; audit chain verification job.  
**Tests:** `audit-chain-integrity.test.ts`, `enterprise-readiness-sections-2-3.test.ts`
