# Critical Workflow Remediation Report

Audit identifier: `CWA-20260630`

Date: 2026-06-30

## Proof Summary

- `npx tsc --noEmit --pretty false --incremental false` passed.
- `npx tsx --test tests/critical-workflow-stabilization.test.ts tests/critical-workflow-rbac.test.ts tests/critical-workflow-services.test.ts tests/security-channel.test.ts tests/continuum-assistant-v1-headless.test.ts` passed 34/34 after the `CWA-20260630-PAYROLL-FORM16` endpoint was added.
- `npm run build` passed after the `CWA-20260630-PAYROLL-FORM16` endpoint was added, including production compilation, type validation, page-data collection, static generation for 168 pages, and route generation for `/api/payroll/form-16`.
- `npx eslint app/api/payroll/form-16/route.ts tests/critical-workflow-services.test.ts` passed.
- `npm run lint` still fails repo-wide on pre-existing lint debt, including tracked legacy scripts/tests and untracked audit helpers; this batch does not claim full-repo ESLint closure.

## What Changed

### `web/middleware.ts`

- `CWA-20260630-CSP`: Replaced permissive production CSP script/connect/image sources with explicit allowlists.
- Removed production `unsafe-eval` while preserving development compatibility.

### `web/lib/env-check.ts` and `web/.env.example`

- `CWA-20260630-ENV`: Added runtime validation and example values for session, constraint fallback, storage fallback, rate limits, observability, cron, and WhatsApp/Meta webhook secrets.
- Reduced false-critical env failures while still warning on production-unsafe constraint engine URLs and missing operations settings.

### `web/lib/leave-workflow.ts`

- `CWA-20260630-CONSTRAINT`: Production now rejects non-local HTTP constraint engine URLs.

### `web/lib/services/leave-submit.ts`

- `CWA-20260630-CONSTRAINT`: Leave submit now uses the shared constraint evaluator with local fallback instead of treating engine outage as a clean pass.
- `CWA-20260630-CONCURRENCY`: Leave balance mutation now uses optimistic guards and reports concurrency conflicts.

### Leave mutation API routes

- `web/app/api/leaves/check-constraints/route.ts`: Uses shared constraint evaluator and validates date ranges.
- `web/app/api/leaves/bulk-approve/route.ts`: Adds guarded state transitions and balance concurrency checks.
- `web/app/api/leaves/reject/[requestId]/route.ts`: Adds guarded state transitions and shared balance helper.
- `web/app/api/leaves/encash/[id]/route.ts`: Adds pending-state guards and balance update guards.

### `web/lib/services/leave-approve.ts`

- `CWA-20260630-ATTENDANCE`: Final leave approval now syncs approved leave into attendance as `on_leave` or `half_day`.
- Existing punch records are not overwritten.

### Backup and disaster recovery

- `web/lib/backup-manifest.ts`: Added SHA-256 integrity manifest generation and verification.
- `web/app/api/admin/backup/route.ts`: Backup exports now include `_integrity` metadata and audit checksum details.

### RBAC hardening

- `web/app/api/payroll/slips/route.ts`: Requires payroll module plus `payroll.view_all` or `payroll.view_own`.
- `web/app/api/payroll/status/route.ts`: Requires payroll module plus transition-specific `payroll.approve`, `payroll.process`, or `payroll.generate`.
- `web/app/api/attendance/regularize/route.ts`: Requires attendance module plus own/team/all attendance permissions.
- `web/app/api/settings/account-management/route.ts`: Uses `company.view_settings` and `company.edit_settings`.
- `web/app/api/settings/alerts/route.ts`: Uses `company.view_settings` and `notifications.configure`.
- `web/app/api/settings/integrations/route.ts`: Uses `company.view_settings` and `company.edit_settings`.

### Payroll workflow

- `web/app/api/payroll/bank-file/route.ts`: Added bank transfer CSV export for approved/processed/paid payroll runs.
- Blocks export when employee bank account or IFSC details are missing.
- Optional `mark_processed` moves an approved payroll run to processed with an optimistic status guard.
- Audits bank-file generation using `PAYROLL_PROCESS`.
- `web/app/api/payroll/form-16/route.ts`: Added `CWA-20260630-PAYROLL-FORM16` financial-year Form 16 PDF generation from monthly payroll slips.
- Enforces payroll module access, `payroll.view_own` for self-service downloads, and `payroll.view_all` for HR/admin employee downloads.
- Includes PAN, employee code, salary totals, deductions, professional tax, and TDS in the generated PDF and audits exports with `DATA_EXPORT`.

### Audit and compliance

- `web/lib/audit.ts`: Added `AUDIT_VERIFY`.
- `web/app/api/cron/audit-verification/route.ts`: Added cron-protected scheduled audit chain verification across companies.
- Notifies active HR/admin users if the chain is broken and writes an audit verification event.

### Exit management

- `web/app/api/exit-checklist/finalize/route.ts`: Added HR/admin finalization endpoint.
- Requires the exit module and `employee.terminate`.
- Blocks finalization until all exit checklist rows are completed.
- Marks the employee `exited`, records status history, revokes refresh tokens, revokes channel links, and writes an audit event.
- `web/app/api/exit-checklist/route.ts`: Non-HR/admin users can no longer patch another employee's checklist.

### WhatsApp security

- `web/app/api/webhooks/whatsapp/route.ts`: Verifies `x-hub-signature-256` with HMAC and fails closed when the app secret is missing.
- `web/tests/security-channel.test.ts`: Updated proof to current WhatsApp integration UI copy and added webhook HMAC assertions.

### Prisma/build hardening

- `web/lib/prisma.ts`: Avoids passing an undefined datasource URL to PrismaClient and skips eager connection when `DATABASE_URL` is absent. This fixed the production build page-data collection crash.

### Tests added

- `web/tests/critical-workflow-stabilization.test.ts`
- `web/tests/critical-workflow-rbac.test.ts`
- `web/tests/critical-workflow-services.test.ts`

## Appendix A Service Inventory Status

This is the honest state after remediation. "Build-covered" means the route/page/API exists and was included in the successful Next build. It does not mean every enterprise-grade feature from Workday/SAP-class HRMS scope is fully complete.

| # | Service | Current status | Proof |
|---|---|---|---|
| 1 | Leave Management | Working, hardened | Constraint fallback, balance concurrency, approval attendance sync, focused tests, build |
| 2 | Multi-tenant Architecture | Working foundation | Tenant-scoped routes build; existing company isolation retained |
| 3 | RBAC & Authentication | Hardened in critical APIs | Payroll, attendance, settings RBAC tests pass |
| 4 | Real-time Updates | Existing | Notification/Pusher code builds; not deeply retested in this batch |
| 5 | Attendance Tracking | Improved | Approved leave now writes attendance sync; regularization RBAC hardened |
| 6 | Employee Management | Existing | Employee routes/pages build; exit finalization now updates employee status |
| 7 | Zero UI / WhatsApp | Hardened | HMAC webhook proof and assistant headless tests pass |
| 8 | Payroll | Improved | Generate/approve/status/payslip existing; bank-file export and Form 16 PDF added and tested |
| 9 | Notifications | Existing | Notification routes/pages build; exit/audit alerts use notification service |
| 10 | Document Storage | Existing | Document routes/pages and expiry cron build; backup includes documents |
| 11 | Recruitment | Build-covered | Job posting/application/interview/offer routes and HR pages build |
| 12 | Workflow Engine | Build-covered | Workflow routes build; leave approval routing still uses existing workflow logic |
| 13 | Performance Management | Build-covered | Goals, review cycles, review instances, HR/manager/employee pages build |
| 14 | LMS | Build-covered | Courses, enrollments, learning reports, HR/employee pages build |
| 15 | Compensation Planning | Build-covered | Compensation cycles/recommendations API and HR page build |
| 16 | Expense Management | Build-covered | Expenses/reimbursements APIs and employee/manager/HR pages build |
| 17 | Travel Management | Build-covered | Travel request API and employee/HR pages build |
| 18 | Exit Management | Improved | Finalize endpoint, access revocation, status history, checklist guard tested |
| 19 | Reporting & Analytics | Build-covered | Report APIs and report-builder pages build |
| 20 | Self-Service Portal | Build-covered | Employee profile, documents, payslips, learning, travel, reimbursements pages build |
| 21 | Backup & DR | Improved | Backup integrity manifest and proof test added |
| 22 | Audit Verification | Improved | Cron-protected audit chain verifier added and tested |

## Still Not Safe To Call "100% Enterprise Complete"

- Payroll still lacks a real bank-integration submission/acknowledgement flow, official TRACES/digital-signature Form 16 filing, and the CTC restructuring tool.
- Document management still uses current schema constraints; rich versioning and explicit expiry-date fields are not fully modeled.
- LMS does not include SCORM/xAPI runtime execution.
- Travel does not include live flight/hotel booking provider integration.
- Compensation planning has workflow surfaces, but market benchmarking and deep budget modeling are not proven here.
- Reporting APIs build, but predictive analytics/DEI/attrition ML are not proven complete.
- Mobile-native push and SMS channels are not proven.
- Repo-wide ESLint still fails on existing lint debt outside the Form 16 slice.

## Bottom Line

The old Appendix A claim that many services were only models/no routes is no longer accurate for this checkout: all 22 service categories have route/page coverage in the successful build, and several production blockers now have concrete workflow code plus tests.

I am not marking the whole HRMS as "100% enterprise complete" because that would be fake. The verified claim is: critical blockers were remediated, core Appendix A surfaces now build, and the high-risk payroll, audit, exit, attendance, backup, CSP, env, constraint, concurrency, RBAC, and WhatsApp gaps have proof.
