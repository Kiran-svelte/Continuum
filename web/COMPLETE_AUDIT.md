# COMPLETE EXHAUSTIVE FORENSIC AUDIT

## EXECUTIVE SUMMARY

- **Total number of files:** 1097
- **Total routes:** 164 (working: 75, broken: 89)
- **Total API endpoints:** 0 (working: 0, broken: 0, fake: 0)
- **Total buttons/events:** 915 (working: 914, dead: 1, fake: 0)
- **External services:** 0 (real: 0, fake: 0)

### Critical issues that will cause PRODUCTION FAILURE:
1. Missing environment variables identified in Audit 3.
2. Fake/Empty UI buttons that do not trigger API requests.
3. Fake API routes returning "Not implemented".


## AUDIT 1: PROJECT STRUCTURE

**Entry Point:** `web/server.js` (Custom server) or `web/app/layout.tsx` (Next.js Root)

| File Path | Probable Purpose |
|---|---|
*Note: Displaying directory summaries due to 1097 total files.*
| `d:/projects/Continuum-main-deploy/web` | Contains 64 files. |
| `d:/projects/Continuum-main-deploy/web/.vercel` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/(auth)` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/forgot-password` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/reset-password` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/sign-in` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/sign-up` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/(marketing)` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/about` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/actions` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/billing` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/company-settings` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/compliance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/directory` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/getting-started` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/holidays` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/leave-requests` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/my-payroll-advances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/notifications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/org-chart` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/payroll` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/payslips` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/people/invite` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/people` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/pf-reports` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/policy-settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/profile` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/salary-components` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/salary-structures` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/search` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/setup-wizard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/shifts` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/startup-readiness` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/system-health` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/integrations/whatsapp` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/admin/login` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/backup` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/capability-owners` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/force-logout` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/health` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/module-readiness` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/org-config` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/rbac` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/recovery-readiness` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/role-model` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/security/mfa` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/admin/test-email` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/assistant` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/attrition` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/coaching` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/query` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/ai/smart-leave` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/approval-hierarchy` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/summary` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance/regularize/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/attendance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/audit-logs` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/callback` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/confirm` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/send` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/email-verification/status` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/failed-login` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/forgot-password` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/invite` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/join` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/me` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/oauth/[provider]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/password-change` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/profile-sync` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/refresh` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/register` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/reset-password` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/session` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/sign-out` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/signin` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/auth/signup` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/confirm` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/link-from-web` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/start` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/channel/verify/unlink` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/templates` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/company-roles/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/create` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/holidays/bulk` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/holidays` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/invite-user` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/invite-user/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/leave-types/templates` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/quotas/initialize` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/quotas` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/quotas/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/roles` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/settings/search-views` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/company/validate-code` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/compensation/cycles` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/compensation/recommendations` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/compliance/pf-report` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/compliance/reports` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/course-enrollments` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/courses` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/document-expiry` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/learning-overdue` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/leave-accrual` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/leave-sla-breach` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/performance-overdue` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/probation-check` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/process-events` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/sla-check` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/cron/year-end-carry-forward` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/directory` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/documents` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/documents/upload` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/email/test` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/calendar` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/kpis` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/notifications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/dashboard/summary` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/notification-preferences` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/onboarding` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/payslip/download` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/payslip` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/profile` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee/welcome/complete` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employee-movements` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/me` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employees` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/[id]/role` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/employees/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/enterprise/metrics` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/exit-checklist` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/expenses` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/goals` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/goals/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/health/live` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/health/ready` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/health` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/holidays/fetch` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/adjust-balance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/approve-registration` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/attendance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/attention-required` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/bulk-import/preview` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/bulk-import` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/dashboard/metrics` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/departments` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/employees/export` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/invites` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/leave-balance-adjust` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/leave-calendar` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/leave-quotas-by-role` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/organization` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/policy` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/hr/stats/approval-rates` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/internal/escalate-sla` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/internal/purge-chat-history` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/interviews` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/invite/accept` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/job-applications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/job-applications/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/job-levels` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/job-postings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/approve/[requestId]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/balances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/bulk-approve` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/cancel/[requestId]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/check-constraints` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/encash` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/encash/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/list` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/reject/[requestId]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/leaves/submit` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/manager/approvals/[id]/action` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/manager/dashboard/team-overview` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/manager/pending-approvals` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/preferences` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/read-all` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/notifications/[notifId]/read` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/offer-letters` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/checklist` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/complete` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/defaults` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/finalize` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/holidays` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/progress` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/step/[step]` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/onboarding/welcome-sequence` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/ops/operations-readiness` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/ops/startup-readiness` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payments/create-order` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payments/verify` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/approve` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/calculate-preview` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/generate` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/history` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/preflight` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/slips/latest` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/slips` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll/status` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/payroll-advances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/permissions` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/permissions/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/profile` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reimbursements` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/attendance-summary` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/builder` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/document-expiry` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/exit-attrition` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/export-bundle` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/headcount` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/learning-completion` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/leave-summary/pdf` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/leave-summary` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/payroll-register` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/performance-summary` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/recruitment-pipeline` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/reimbursement-spend` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/reports/travel-spend` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/review-cycles` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/review-cycles/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/review-instances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-components` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-revisions` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/salary-structures` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/search/global` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/search` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/security/env-check` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/security/otp` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/account-management` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/alerts` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/settings/integrations` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/shifts` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/status/public` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/modules` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/resend-credentials` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/companies/[id]/subscription` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/user-invites/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/users` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/super-admin/users/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/system/self-heal` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/test-neon` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/travel-requests` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/tutorial/progress` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/upload` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/upload/[category]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/webhooks/cashfree` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/webhooks/razorpay` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/webhooks/whatsapp` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/workflows/pending` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/workflows/start` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/api/workflows/[id]/action` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/auth/callback` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/blog` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/careers` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/changelog` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/cookies` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/directory` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/exit-checklist` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/learning` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/leave-history` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/notifications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payroll-advances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/performance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/request-leave` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/search` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/travel` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/onboarding` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/profile/whatsapp` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/employee/welcome` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app` | Contains 8 files. |
| `d:/projects/Continuum-main-deploy/web/app/help` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approvals` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/bulk-import` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/compensation` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/compliance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/directory` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/documents` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/invite` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/invite/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/expenses/all` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/goals` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/job-board` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/courses/new` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/courses/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/enrollments` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/paths` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/reports` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-balance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-calendar` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-quotas` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-requests` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/my-attendance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/my-payroll-advances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/notifications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/org-chart` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll-advances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payslips` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/performance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/pf-reports` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/policy-settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/profile` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/applications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/applications/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings/new` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/report-builder` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reports` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/request-leave` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reviews` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/search` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/travel/all` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/travel` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/hr/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/invite/accept/[token]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/approvals` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/directory` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/leave-requests` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/my-attendance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/notifications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/org-chart` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/payroll-advances` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/payslips` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/people/invite` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/people` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/performance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/profile` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/reimbursements` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/reports` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/request-leave` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/search` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team-attendance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team-calendar` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/manager/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/module-disabled` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/company` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/onboarding` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/steps` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/privacy` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/status` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/new` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/[id]/core-functions` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/[id]/settings` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/operations` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/invites/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/[id]` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/support` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/terms` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/app/ui-demos` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/backend` | Contains 7 files. |
| `d:/projects/Continuum-main-deploy/web/components` | Contains 23 files. |
| `d:/projects/Continuum-main-deploy/web/components/admin` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/approval` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/assistant` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/components/auth` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/components/compliance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/dashboard` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/design-system` | Contains 15 files. |
| `d:/projects/Continuum-main-deploy/web/components/employee` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/components/hooks` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/hr` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/components/invite` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/components/layouts` | Contains 4 files. |
| `d:/projects/Continuum-main-deploy/web/components/marketing` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/motion` | Contains 10 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin` | Contains 17 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth` | Contains 4 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee` | Contains 18 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr` | Contains 44 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager` | Contains 15 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/public` | Contains 12 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/shared` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin` | Contains 11 files. |
| `d:/projects/Continuum-main-deploy/web/components/pages/_shared` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/components/portals` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/portals/role-dashboards` | Contains 5 files. |
| `d:/projects/Continuum-main-deploy/web/components/profile` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/components/super-admin` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/components/tutorial` | Contains 6 files. |
| `d:/projects/Continuum-main-deploy/web/components/ui` | Contains 33 files. |
| `d:/projects/Continuum-main-deploy/web/docs/api` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/docs` | Contains 4 files. |
| `d:/projects/Continuum-main-deploy/web/docs/proofs` | Contains 6 files. |
| `d:/projects/Continuum-main-deploy/web/docs/test-plans` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/hooks` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/ai-engine` | Contains 5 files. |
| `d:/projects/Continuum-main-deploy/web/lib` | Contains 119 files. |
| `d:/projects/Continuum-main-deploy/web/lib/api-guards` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/appwrite` | Contains 4 files. |
| `d:/projects/Continuum-main-deploy/web/lib/betterstack` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/billing` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/lib/channel` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/lib/compliance` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/lib/continuum-assistant` | Contains 7 files. |
| `d:/projects/Continuum-main-deploy/web/lib/continuum-assistant/actions` | Contains 6 files. |
| `d:/projects/Continuum-main-deploy/web/lib/continuum-assistant/adapters` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/continuum-assistant/engine` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/continuum-assistant/insights` | Contains 11 files. |
| `d:/projects/Continuum-main-deploy/web/lib/core-functions` | Contains 8 files. |
| `d:/projects/Continuum-main-deploy/web/lib/enterprise` | Contains 12 files. |
| `d:/projects/Continuum-main-deploy/web/lib/hr` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/integrations/twentyfirst` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/integrity` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/lib/logging` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/modules` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/navigation` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/lib/notifications` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/onboarding` | Contains 11 files. |
| `d:/projects/Continuum-main-deploy/web/lib/operations-readiness` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/lib/payroll` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/performance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/phone` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/production-security` | Contains 7 files. |
| `d:/projects/Continuum-main-deploy/web/lib/recruitment` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/services` | Contains 13 files. |
| `d:/projects/Continuum-main-deploy/web/lib/services/_shared` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/lib/ui` | Contains 2 files. |
| `d:/projects/Continuum-main-deploy/web/lib/whatsapp` | Contains 3 files. |
| `d:/projects/Continuum-main-deploy/web/lib/zero-decision` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/monitoring/grafana/dashboards` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/monitoring/loki` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/monitoring/prometheus` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma` | Contains 7 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/0_init` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/20260505055241_add_lms_compensation_travel_modules` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/20260520120000_workflow_current_approver` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/20260520140000_payroll_advance` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/20260613153000_payment_order_tracking` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/20260613165000_company_roles` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/20260613_zero_ui_channel_identity` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/20260614120000_invite_manager_id` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/prisma/migrations/normalize_emails` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/public` | Contains 4 files. |
| `d:/projects/Continuum-main-deploy/web/scripts` | Contains 16 files. |
| `d:/projects/Continuum-main-deploy/web/test-results` | Contains 5 files. |
| `d:/projects/Continuum-main-deploy/web/tests` | Contains 43 files. |
| `d:/projects/Continuum-main-deploy/web/tests/fixtures` | Contains 1 files. |
| `d:/projects/Continuum-main-deploy/web/types` | Contains 7 files. |

## AUDIT 2: DEPENDENCIES

| Dependency | Status |
|---|---|
| `@prisma/client` | **UNUSED - LEFTOVER** |
| `@radix-ui/react-avatar` | **UNUSED - LEFTOVER** |
| `@radix-ui/react-tabs` | **UNUSED - LEFTOVER** |
| `@sendgrid/mail` | **UNUSED - LEFTOVER** |
| `@sentry/nextjs` | **UNUSED - LEFTOVER** |
| `@supabase/ssr` | **UNUSED - LEFTOVER** |
| `@supabase/supabase-js` | **UNUSED - LEFTOVER** |
| `@types/bcrypt` | **UNUSED - LEFTOVER** |
| `@upstash/redis` | **UNUSED - LEFTOVER** |
| `bcrypt` | **UNUSED - LEFTOVER** |
| `bcryptjs` | **UNUSED - LEFTOVER** |
| `class-variance-authority` | **UNUSED - LEFTOVER** |
| `clsx` | **UNUSED - LEFTOVER** |
| `date-fns` | **UNUSED - LEFTOVER** |
| `framer-motion` | **UNUSED - LEFTOVER** |
| `jose` | **UNUSED - LEFTOVER** |
| `jspdf` | **UNUSED - LEFTOVER** |
| `libphonenumber-js` | **UNUSED - LEFTOVER** |
| `lucide-react` | **UNUSED - LEFTOVER** |
| `next` | **UNUSED - LEFTOVER** |
| `next-themes` | **UNUSED - LEFTOVER** |
| `node-appwrite` | **UNUSED - LEFTOVER** |
| `node-vault` | **UNUSED - LEFTOVER** |
| `nodemailer` | **UNUSED - LEFTOVER** |
| `openai` | **UNUSED - LEFTOVER** |
| `prom-client` | **UNUSED - LEFTOVER** |
| `pusher` | **UNUSED - LEFTOVER** |
| `pusher-js` | **UNUSED - LEFTOVER** |
| `razorpay` | **UNUSED - LEFTOVER** |
| `react` | **UNUSED - LEFTOVER** |
| `react-dom` | **UNUSED - LEFTOVER** |
| `recharts` | **UNUSED - LEFTOVER** |
| `sonner` | **UNUSED - LEFTOVER** |
| `tailwind-merge` | **UNUSED - LEFTOVER** |
| `uuid` | **UNUSED - LEFTOVER** |
| `winston` | **UNUSED - LEFTOVER** |
| `winston-loki` | **UNUSED - LEFTOVER** |
| `zod` | **UNUSED - LEFTOVER** |
| `@eslint/eslintrc` | **UNUSED - LEFTOVER** |
| `@playwright/test` | **UNUSED - LEFTOVER** |
| `@tailwindcss/postcss` | **UNUSED - LEFTOVER** |
| `@types/node` | **UNUSED - LEFTOVER** |
| `@types/nodemailer` | **UNUSED - LEFTOVER** |
| `@types/react` | **UNUSED - LEFTOVER** |
| `@types/react-dom` | **UNUSED - LEFTOVER** |
| `@types/uuid` | **UNUSED - LEFTOVER** |
| `eslint` | **UNUSED - LEFTOVER** |
| `eslint-config-next` | **UNUSED - LEFTOVER** |
| `postcss` | **UNUSED - LEFTOVER** |
| `prisma` | **UNUSED - LEFTOVER** |
| `tailwindcss` | **UNUSED - LEFTOVER** |
| `tsx` | **UNUSED - LEFTOVER** |
| `typescript` | **UNUSED - LEFTOVER** |

## AUDIT 3: ENVIRONMENT VARIABLES

| Environment Variable | Status |
|---|---|
| `NODE_ENV` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_WHATSAPP_ENABLED` | **MISSING** - Expected by code |
| `SUPABASE_SERVICE_ROLE_KEY` | CONFIG EXISTS |
| `NEXT_PUBLIC_SUPABASE_URL` | CONFIG EXISTS |
| `SENDGRID_API_KEY` | CONFIG EXISTS |
| `SMTP_HOST` | CONFIG EXISTS |
| `EMAIL_PROVIDER` | CONFIG EXISTS |
| `SENDGRID_FROM_EMAIL` | CONFIG EXISTS |
| `SMTP_FROM` | CONFIG EXISTS |
| `NEXT_PUBLIC_APP_URL` | CONFIG EXISTS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | CONFIG EXISTS |
| `CRON_SECRET` | CONFIG EXISTS |
| `SMTP_PORT` | CONFIG EXISTS |
| `SMTP_USER` | CONFIG EXISTS |
| `SMTP_PASS` | CONFIG EXISTS |
| `GMAIL_USER` | CONFIG EXISTS |
| `GMAIL_APP_PASSWORD` | CONFIG EXISTS |
| `GMAIL_CLIENT_ID` | **MISSING** - Expected by code |
| `GMAIL_CLIENT_SECRET` | **MISSING** - Expected by code |
| `GMAIL_REFRESH_TOKEN` | **MISSING** - Expected by code |
| `API_NINJAS_KEY` | **MISSING** - Expected by code |
| `CONSTRAINT_ENGINE_URL` | CONFIG EXISTS |
| `PUBLIC_SYSTEM_STATUS` | **MISSING** - Expected by code |
| `PUBLIC_SYSTEM_STATUS_MESSAGE` | **MISSING** - Expected by code |
| `WHATSAPP_VERIFY_TOKEN` | **MISSING** - Expected by code |
| `OPENAI_API_KEY` | CONFIG EXISTS |
| `BETTERSTACK_SOURCE_TOKEN` | CONFIG EXISTS |
| `LOGTAIL_SOURCE_TOKEN` | **MISSING** - Expected by code |
| `BETTERSTACK_TELEMETRY_TOKEN` | **MISSING** - Expected by code |
| `BETTERSTACK_LOGS_HOST` | **MISSING** - Expected by code |
| `LOGTAIL_INGEST_HOST` | **MISSING** - Expected by code |
| `RAZORPAY_KEY_ID` | **MISSING** - Expected by code |
| `RAZORPAY_KEY_SECRET` | **MISSING** - Expected by code |
| `STRIPE_SECRET_KEY` | **MISSING** - Expected by code |
| `STRIPE_WEBHOOK_SECRET` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_PRODUCT_NAME` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_PRODUCT_TAGLINE` | **MISSING** - Expected by code |
| `COOKIE_PREFIX` | **MISSING** - Expected by code |
| `JWT_ISSUER` | **MISSING** - Expected by code |
| `JWT_AUDIENCES` | **MISSING** - Expected by code |
| `EMAIL_FROM_NAME` | CONFIG EXISTS |
| `SUPPORT_EMAIL` | **MISSING** - Expected by code |
| `VERCEL_URL` | CONFIG EXISTS |
| `MODULE_STATE_SOURCE` | **MISSING** - Expected by code |
| `SENDGRID_FROM_NAME` | CONFIG EXISTS |
| `ADMIN_ALERT_EMAIL` | **MISSING** - Expected by code |
| `CLOUDFLARE_API_TOKEN` | **MISSING** - Expected by code |
| `CLOUDFLARE_ZONE_ID` | **MISSING** - Expected by code |
| `CLOUDFLARE_ACCOUNT_ID` | **MISSING** - Expected by code |
| `CLOUDFLARE_TURNSTILE_SECRET` | **MISSING** - Expected by code |
| `ENCRYPTION_KEY` | **MISSING** - Expected by code |
| `VAULT_ADDR` | **MISSING** - Expected by code |
| `REDIS_URL` | **MISSING** - Expected by code |
| `EMAIL_SERVER_HOST` | **MISSING** - Expected by code |
| `RESEND_API_KEY` | CONFIG EXISTS |
| `APP_VERSION` | **MISSING** - Expected by code |
| `VAULT_TOKEN` | **MISSING** - Expected by code |
| `VAULT_NAMESPACE` | **MISSING** - Expected by code |
| `LOKI_URL` | **MISSING** - Expected by code |
| `LOG_LEVEL` | **MISSING** - Expected by code |
| `DATABASE_URL` | CONFIG EXISTS |
| `RAZORPAY_WEBHOOK_SECRET` | **MISSING** - Expected by code |
| `SENTRY_DSN` | **MISSING** - Expected by code |
| `UPLOAD_BUCKET` | **MISSING** - Expected by code |
| `UPLOAD_ACCESS_KEY` | **MISSING** - Expected by code |
| `UPLOAD_SECRET_KEY` | **MISSING** - Expected by code |
| `UPLOAD_REGION` | **MISSING** - Expected by code |
| `UPLOAD_ENDPOINT` | **MISSING** - Expected by code |
| `UPLOAD_PUBLIC_URL` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_CONSTRAINT_ENGINE_URL` | **MISSING** - Expected by code |
| `NEON_AUTH_URL` | **MISSING** - Expected by code |
| `NEON_JWKS_URL` | **MISSING** - Expected by code |
| `NEON_API_KEY` | **MISSING** - Expected by code |
| `PUSHER_APP_ID` | **MISSING** - Expected by code |
| `PUSHER_KEY` | **MISSING** - Expected by code |
| `PUSHER_SECRET` | **MISSING** - Expected by code |
| `PUSHER_CLUSTER` | **MISSING** - Expected by code |
| `APP_URL` | CONFIG EXISTS |
| `VERCEL` | CONFIG EXISTS |
| `VERCEL_ENV` | CONFIG EXISTS |
| `CASHFREE_WEBHOOK_SECRET` | **MISSING** - Expected by code |
| `SECURITY_BLOCKED_IPS` | **MISSING** - Expected by code |
| `BLOCKED_IPS` | **MISSING** - Expected by code |
| `AUTH_FAILED_LOGIN_WINDOW_SEC` | **MISSING** - Expected by code |
| `AUTH_FAILED_LOGIN_ALERT_THRESHOLD` | **MISSING** - Expected by code |
| `AUTH_FAILED_LOGIN_AUTO_BLOCK_THRESHOLD` | **MISSING** - Expected by code |
| `HIBP_PASSWORD_CHECK_ENABLED` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_ALLOW_PUBLIC_SIGNUP` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_PUSHER_KEY` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | **MISSING** - Expected by code |
| `UPSTASH_REDIS_REST_URL` | **MISSING** - Expected by code |
| `UPSTASH_REDIS_REST_TOKEN` | **MISSING** - Expected by code |
| `NEXT_PUBLIC_SENTRY_DSN` | **MISSING** - Expected by code |
| `SENTRY_ENVIRONMENT` | **MISSING** - Expected by code |
| `SESSION_SECRET` | CONFIG EXISTS |
| `CSRF_SECRET` | CONFIG EXISTS |
| `CORS_ALLOWED_ORIGINS` | CONFIG EXISTS |
| `BASE_URL` | **MISSING** - Expected by code |
| `SMOKE_BASE_URL` | **MISSING** - Expected by code |
| `CONTINUUM_APP_BASE_URL` | **MISSING** - Expected by code |
| `TEST_HR_EMAIL` | **MISSING** - Expected by code |
| `TEST_HR_PASSWORD` | **MISSING** - Expected by code |
| `TEST_EMPLOYEE_EMAIL` | **MISSING** - Expected by code |
| `TEST_EMPLOYEE_PASSWORD` | **MISSING** - Expected by code |

## AUDIT 4: ROUTES & PAGES

| Route File | Status |
|---|---|
| `d:/projects/Continuum-main-deploy/web/app/(auth)/forgot-password/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/reset-password/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/sign-in/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/sign-up/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/about/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/billing/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/company-settings/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/compliance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/dashboard/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/directory/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/getting-started/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/holidays/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/leave-requests/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/my-payroll-advances/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/notifications/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/org-chart/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/payroll/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/payslips/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/people/invite/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/people/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/pf-reports/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/policy-settings/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/profile/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/salary-components/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/salary-structures/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/search/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/setup-wizard/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/shifts/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/startup-readiness/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/system-health/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/integrations/whatsapp/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/admin/login/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/blog/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/careers/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/changelog/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/cookies/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/dashboard/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/directory/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/exit-checklist/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/learning/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/leave-history/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/notifications/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payroll-advances/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/performance/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/request-leave/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/search/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/travel/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/onboarding/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/employee/profile/whatsapp/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/employee/welcome/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/help/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approvals/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/bulk-import/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/compensation/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/compliance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/dashboard/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/directory/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/documents/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/invite/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/invite/[id]/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/expenses/all/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/goals/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/job-board/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/courses/new/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/courses/[id]/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/enrollments/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/paths/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/reports/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-balance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-calendar/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-quotas/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-requests/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/my-attendance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/my-payroll-advances/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/notifications/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/org-chart/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll-advances/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payslips/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/performance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/pf-reports/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/policy-settings/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/profile/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/applications/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/applications/[id]/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings/new/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings/[id]/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/report-builder/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reports/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/request-leave/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reviews/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/search/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/travel/all/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/travel/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/invite/accept/[token]/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/approvals/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/dashboard/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/directory/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/leave-requests/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/my-attendance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/notifications/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/org-chart/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/payroll-advances/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/payslips/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/people/invite/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/people/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/performance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/profile/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/reimbursements/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/reports/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/request-leave/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/search/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/settings/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team-attendance/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team-calendar/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/module-disabled/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/company/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/privacy/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/status/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/new/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/[id]/core-functions/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/[id]/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/companies/[id]/settings/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/operations/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/invites/[id]/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/[id]/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |
| `d:/projects/Continuum-main-deploy/web/app/support/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/terms/page.tsx` | [EXISTS AND LOADS] |
| `d:/projects/Continuum-main-deploy/web/app/ui-demos/page.tsx` | [FILE EXISTS BUT CRASHES/EMPTY] |

## AUDIT 5: API ENDPOINTS

| API Route | Status |
|---|---|

## AUDIT 6: FRONTEND COMPONENTS

| Component | Status |
|---|---|
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/salary-components/page.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/access-denied-panel.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/actions.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/admin/billing-upgrade-button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/approval/workflow-explainer-panel.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-host.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/auth/auth-provider.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/auth/can-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/compliance/payroll-compliance-disclaimer.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/dashboard/leave-pulse-row.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/auth-shell.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/badge.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/bento-grid.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/card.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/command-palette.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/data-table-shell.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/empty-state.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/input.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/page-header.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/page-shell.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/portal-breadcrumbs.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/skeleton.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/design-system/stat-card.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/employee/leave-balance-cards.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/employee/upcoming-holidays.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/glass-panel.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/help-tooltip.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/hr/global-search-trigger.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/hr/invite-credentials-editor.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/invite/people-invite-actions.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/invite/resend-invite-button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/layouts/dashboard-template.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/layouts/detail-template.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/layouts/list-template.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/layouts/wizard-template.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/marketing/landing-bento.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/module-filtered-portal-layout.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/ambient-background.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/counter.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/fade-in.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/glow-card.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/interactive-cursor.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/magnetic-button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/particles.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/scroll-reveal.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/motion/tilt-card.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/notification-bell.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/page-header.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/audit-logs-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/billing-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/dashboard-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/getting-started-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/leave-requests-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/login-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/notifications-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-invite-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/profile-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/search-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/setup-wizard-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/startup-readiness-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/system-health-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/whatsapp-integration-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/forgot-password-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/reset-password-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/sign-in-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/sign-up-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/dashboard-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/exit-checklist-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/learning-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/notifications-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/onboarding-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payslips-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/performance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/request-leave-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/search-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/settings-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/welcome-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compliance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/dashboard-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-id-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/goals-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/job-board-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/learning-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-quotas-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/notifications-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-advances-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/performance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/pf-reports-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/profile-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/recruitment-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reports-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/request-leave-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/search-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/dashboard-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/notifications-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/people-invite-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/people-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/performance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/profile-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/request-leave-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/search-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/settings-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/invite-accept-token-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-company-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/about-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/blog-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/careers-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/changelog-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/cookies-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/help-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/module-disabled-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/privacy-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/status-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/support-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/terms-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/ui-demos-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/shared/company-directory-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/shared/my-attendance-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/shared/reporting-tree-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-core-functions-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-settings-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/dashboard-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/operations-readiness-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-id-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-invites-id-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-new-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-view.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/_shared/marketing-shell.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/pages/_shared/portal-list-template.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/portals/portal-shell-v2.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/portals/role-dashboards/admin-ops-dashboard.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/portals/role-dashboards/employee-hub.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/portals/role-dashboards/hr-analytics-cockpit.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/portals/role-dashboards/manager-command-center.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/profile/role-profile-page.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/sidebar-nav.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/sign-out-button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/static-portal-layout.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/super-admin/invite-credentials-editor.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/super-admin/module-chips-summary.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/super-admin/user-credentials-editor.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/system-health-history.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/system-status-banner.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/tab-button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/theme-preferences-panel.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/theme-provider.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/adaptive-field.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in-demo.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animations.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/app-loading.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/avatar.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/background-paper-shaders.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/badge.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/card.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/empty-state.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/input.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/label.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/loading.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modern-form-card.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modern-stunning-sign-in.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/optimistic-button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/page-summary-strip.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/portal-select.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/progress-indicators.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/progress.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/pulse-beams.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/save-button.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/skeleton.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/status-badge.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/tabs.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/textarea.tsx` | [UNUSED - ORPHAN] |
| `d:/projects/Continuum-main-deploy/web/components/ui/toaster.tsx` | [UNUSED - ORPHAN] |

## AUDIT 7: BUTTONS AND ACTIONS

| File | Line | Trigger | Action | Status |
|---|---|---|---|---|
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 138 | Event | `onClick={reset}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 148 | Event | `onClick={() => window.location.href = '/'}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 165 | Event | `onClick={() => window.location.href = '/auth/forgot-password'}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/error.tsx` | 171 | Event | `onClick={() => window.open('mailto:support@continuum-hr.com', '_blank')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/forgot-password/page.tsx` | 78 | Event | `onClick={() => setSent(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/forgot-password/page.tsx` | 101 | Event | `<form onSubmit={handleSubmit} className="space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/(auth)/reset-password/page.tsx` | 184 | Event | `<form onSubmit={handleSubmit} className="space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 184 | Event | `onClick={handleRefresh}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 247 | Event | `<MagneticButton variant="gradient" size="sm" onClick={handleSearch} className="s` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 275 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 373 | Event | `onClick={() => handlePageChange(pagination.page - 1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/audit-logs/page.tsx` | 382 | Event | `onClick={() => handlePageChange(pagination.page + 1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/error.tsx` | 32 | Event | `onClick={reset}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/people/people-table.tsx` | 120 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 351 | Event | `<Button variant="outline" size="sm" onClick={resetChanges}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 355 | Event | `<Button variant="primary" size="sm" onClick={() => setConfirmModalOpen(true)} lo` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 474 | Event | `onClick={() => togglePermission(perm, role)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 511 | Event | `<Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearchQue` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 566 | Event | `onClick={() => setConfirmModalOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/rbac/page.tsx` | 573 | Event | `onClick={handleSave}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/system-health/page.tsx` | 247 | Event | `onClick={() => setAutoRefresh(!autoRefresh)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/(main)/system-health/page.tsx` | 259 | Event | `onClick={() => fetchHealth(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/login/page.tsx` | 176 | Event | `<form onSubmit={handleSubmit} className="space-y-6">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/admin/login/page.tsx` | 210 | Event | `onClick={() => setShowPassword(!showPassword)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 310 | Event | `onClick={() => { setShowRegModal(true); setRegError(''); setRegSuccess(''); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 319 | Event | `onClick={() => handleClock('check_in', false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 329 | Event | `onClick={() => handleClock('check_in', true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 340 | Event | `onClick={() => handleClock('check_out')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 378 | Event | `onClick={() => { setError(null); loadAttendance(); loadLeaveBalances(); loadRegu` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 439 | Event | `<button onClick={prevMonth} className="p-1.5 hover:bg-white/10 rounded-full tran` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 445 | Event | `<button onClick={nextMonth} className="p-1.5 hover:bg-white/10 rounded-full tran` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 667 | Event | `onClick={() => !regSubmitting && setShowRegModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 681 | Event | `onClick={() => !regSubmitting && setShowRegModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 730 | Event | `onClick={() => !regSubmitting && setShowRegModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/attendance/page.tsx` | 736 | Event | `onClick={handleRegSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 419 | Event | `onClick={loadDocuments}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 427 | Event | `onClick={handleOpenUpload}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 446 | Event | `onClick={() => setActiveTab(cat.key)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 504 | Event | `<Button onClick={loadDocuments} className="mt-6 gap-2">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 566 | Event | `onClick={() => window.open(doc.url, '_blank')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 573 | Event | `<Button size="sm" variant="ghost" className="text-white/60 hover:text-white hove` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 576 | Event | `<Button size="sm" variant="ghost" className="text-red-400/70 hover:text-red-400 ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/documents/page.tsx` | 597 | Event | `<Button onClick={handleOpenUpload} className="mt-6 gap-2">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/error.tsx` | 32 | Event | `onClick={reset}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/exit-checklist/page.tsx` | 211 | Event | `onClick={loadChecklists}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/exit-checklist/page.tsx` | 335 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips/page.tsx` | 148 | Event | `<Button variant="ghost" size="sm" className="text-red-300 underline hover:no-und` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips/page.tsx` | 270 | Event | `<Button variant="ghost" size="sm" className="gap-2 text-xs font-bold text-primar` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/payslips/page.tsx` | 361 | Event | `<Button variant="outline" className="w-full gap-2 font-bold text-primary hover:b` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 192 | Event | `<Button className="gap-2 font-bold text-primary hover:bg-primary/20 bg-primary/1` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 242 | Event | `<form onSubmit={handleSave} className="mt-8 pt-6 border-t border-white/10 space-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 397 | Event | `onClick={() => { setEditing(false); setSaveError(''); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 489 | Event | `<button type="button" onClick={startEditing} className="text-primary hover:text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 518 | Event | `onClick={() => setShowBankDetails((v) => !v)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 560 | Event | `<button type="button" onClick={startEditing} className="text-primary hover:text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/profile/page.tsx` | 595 | Event | `<button type="button" onClick={startEditing} className="text-primary hover:text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 270 | Event | `onClick={openModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 320 | Event | `onClick={openModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 416 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 458 | Event | `<Button onClick={openModal} variant="outline" size="sm" className="mt-6 bg-white` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 526 | Event | `onClick={() => setPage(page - 1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 539 | Event | `onClick={() => setPage(page + 1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 559 | Event | `onClick={() => setShowModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 566 | Event | `onClick={(e) => e.stopPropagation()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 568 | Event | `<form onSubmit={handleSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/reimbursements/page.tsx` | 652 | Event | `<Button type="button" variant="ghost" onClick={() => setShowModal(false)} classN` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings/page.tsx` | 70 | Event | `onClick={() => !disabled && onChange(!value)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings/page.tsx` | 289 | Event | `onClick={loadSettingsData}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/(main)/settings/page.tsx` | 503 | Event | `onClick={async () => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/profile/whatsapp/page.tsx` | 140 | Event | `<Button onClick={startVerify} disabled={loading || !phone.trim()}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/employee/profile/whatsapp/page.tsx` | 144 | Event | `<Button onClick={confirmVerify} disabled={loading || code.length !== 6 || !exter` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/error.tsx` | 101 | Event | `onClick={isChunkLoadError ? () => window.location.reload() : reset}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/error.tsx` | 108 | Event | `onClick={() => window.location.href = '/'}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/global-error.tsx` | 27 | Event | `<Button type="button" onClick={() => reset()}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/global-error.tsx` | 30 | Event | `<Button type="button" variant="outline" onClick={() => window.location.reload()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/help/page.tsx` | 208 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/help/page.tsx` | 282 | Event | `onClick={() => setSelectedArticle({` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/help/page.tsx` | 306 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 79 | Event | `<Button onClick={onAction} variant="primary" size="sm">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 119 | Event | `onClick={() => setIsOpen(!isOpen)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 151 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 328 | Event | `onClick={() => setActiveTab('approvals')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 336 | Event | `onClick={() => setActiveTab('levels')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 359 | Event | `<Button size="sm" variant="primary" onClick={() => openModal('approval')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 404 | Event | `<Button variant="ghost" size="sm" onClick={() => openModal('approval', true, h)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 405 | Event | `<Button variant="ghost" size="sm" onClick={() => handleDelete('approval', h.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 425 | Event | `<Button size="sm" variant="primary" onClick={() => openModal('level')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 452 | Event | `<Button variant="ghost" size="sm" onClick={() => openModal('level', true, jl)}><` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 453 | Event | `<Button variant="ghost" size="sm" onClick={() => handleDelete('level', jl.id)} d` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 517 | Event | `<Button variant="secondary" onClick={() => setApprovalModal(m => ({ ...m, isOpen` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 518 | Event | `<Button variant="primary" onClick={() => handleSave('approval')} loading={approv` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 563 | Event | `<Button variant="secondary" onClick={() => setLevelModal(m => ({ ...m, isOpen: f` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/approval-config/page.tsx` | 564 | Event | `<Button variant="primary" onClick={() => handleSave('level')} loading={levelModa` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 218 | Event | `<TabButton active={activeTab === 'daily'} onClick={() => setActiveTab('daily')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 219 | Event | `<TabButton active={activeTab === 'regularization'} onClick={() => setActiveTab('` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 250 | Event | `<Button variant="outline" size="sm" onClick={exportAttendanceCsv} disabled={reco` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 366 | Event | `<Button size="sm" variant="success" onClick={() => handleRegAction(req.id, 'appr` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 369 | Event | `<Button size="sm" variant="danger" onClick={() => handleRegAction(req.id, 'rejec` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 383 | Event | `<Button variant="outline" size="sm" onClick={() => setRegPagination(p => ({ ...p` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/attendance/page.tsx` | 385 | Event | `<Button variant="outline" size="sm" onClick={() => setRegPagination(p => ({ ...p` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 379 | Event | `onClick={handleExportCSV}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 388 | Event | `onClick={handleExportPDF}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 418 | Event | `onClick={handleVerifyChain}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 501 | Event | `<form onSubmit={handleSearchSubmit} className="flex gap-1.5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 525 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 541 | Event | `<button onClick={() => fetchLogs(page)} className="ml-2 text-sm underline hover:` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 596 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 627 | Event | `onClick={() => hasChanges && toggleRow(log.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 781 | Event | `onClick={() => setPage(1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 790 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 812 | Event | `onClick={() => setPage(p)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 827 | Event | `onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/audit-logs/page.tsx` | 836 | Event | `onClick={() => setPage(pagination.pages)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 493 | Event | `<Button onClick={openCreateModal}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 537 | Event | `onClick={() => { setStatusFilter(f.value); setPage(1); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 634 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={openCreateModal}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 707 | Event | `onClick={() => handleAction(mov.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 717 | Event | `onClick={() => handleAction(mov.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 787 | Event | `onClick={() => handleAction(mov.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 798 | Event | `onClick={() => handleAction(mov.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 816 | Event | `<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 820 | Event | `<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(total` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 872 | Event | `onClick={() => selectEmployee(emp)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 967 | Event | `<Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={fo` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employee-movements/page.tsx` | 970 | Event | `<Button onClick={handleCreate} loading={formSubmitting}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 520 | Event | `<Button variant="primary" onClick={openAddModal} className="gap-2">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 524 | Event | `<Button variant="outline" onClick={() => router.push('/hr/employees/invite')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 529 | Event | `onClick={() => showJoinCode ? setShowJoinCode(false) : fetchJoinCode()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 562 | Event | `<Button variant="outline" size="sm" onClick={copyJoinCode}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 579 | Event | `onClick={() => setActiveTab('all')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 585 | Event | `onClick={() => setActiveTab('pending')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 724 | Event | `onClick={() =>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 733 | Event | `onClick={() => openEditModal(emp)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 741 | Event | `onClick={() => openDeactivateConfirm(emp)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 782 | Event | `onClick={() => setExpandedEmployeeId(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 803 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 812 | Event | `onClick={() => setPage((p) => Math.min(totalPages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 887 | Event | `onClick={() => handleApproval(reg.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 896 | Event | `onClick={() => handleApproval(reg.id, 'approve', 'probation')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 904 | Event | `onClick={() => handleApproval(reg.id, 'approve', 'active')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 932 | Event | `onClick={() => setShowAddModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 944 | Event | `onClick={() => setShowAddModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1042 | Event | `<Button variant="outline" onClick={() => setShowAddModal(false)} disabled={formS` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1045 | Event | `<Button variant="primary" onClick={handleAddEmployee} disabled={formSubmitting} ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1067 | Event | `onClick={() => setShowEditModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1081 | Event | `onClick={() => setShowEditModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1168 | Event | `<Button variant="outline" onClick={() => setShowEditModal(false)} disabled={form` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1171 | Event | `<Button variant="primary" onClick={handleEditEmployee} disabled={formSubmitting}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1193 | Event | `onClick={() => setShowDeactivateConfirm(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1223 | Event | `onClick={() => setShowDeactivateConfirm(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1230 | Event | `onClick={handleDeactivateEmployee}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1253 | Event | `onClick={() => setShowInviteModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1262 | Event | `onClick={(e) => e.stopPropagation()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1266 | Event | `<button onClick={() => setShowInviteModal(false)} className="p-1 hover:bg-white/` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1279 | Event | `onSubmit={async (e) => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/page.tsx` | 1351 | Event | `<Button variant="outline" type="button" onClick={() => setShowInviteModal(false)` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 256 | Event | `<button onClick={() => router.push('/hr/employees')} className="flex items-cente` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 264 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={fetchEmployee}>Ret` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 280 | Event | `<button onClick={() => router.push('/hr/employees')} className="flex items-cente` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 301 | Event | `<Button variant={editing ? 'outline' : 'primary'} size="sm" className="gap-1" on` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 370 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/employees/[id]/page.tsx` | 391 | Event | `<Button variant="primary" size="sm" className="w-full mt-2" onClick={handleSave}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/error.tsx` | 49 | Event | `onClick={reset}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 122 | Event | `<Button variant="outline" size="sm" onClick={fetchEscalated} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 145 | Event | `<Button variant="ghost" size="sm" onClick={fetchEscalated}>Retry</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 266 | Event | `onClick={() => handleAction(req.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/escalation/page.tsx` | 276 | Event | `onClick={() => handleAction(req.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 362 | Event | `<Button onClick={() => setShowAddModal(true)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 428 | Event | `onClick={() => setStatusFilter(f.value)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 540 | Event | `onClick={() => setShowAddModal(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 589 | Event | `onClick={() => handleToggleComplete(checklist)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 662 | Event | `onClick={() => handleDelete(checklist.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 750 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/exit-checklist/page.tsx` | 758 | Event | `<Button onClick={handleAddChecklist} loading={addLoading} disabled={addLoading}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 85 | Event | `<Button onClick={onAdd} className="gap-2">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 126 | Event | `onClick={onDismiss}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 175 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 192 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 200 | Event | `<form onSubmit={handleSubmit} className="space-y-4">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 243 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 280 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 307 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 315 | Event | `onClick={onConfirm}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 466 | Event | `<Button onClick={handleAdd} className="gap-2 shrink-0">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 507 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 576 | Event | `onClick={() => handleEdit(holiday)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 583 | Event | `onClick={() =>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/holidays/page.tsx` | 619 | Event | `onSubmit={handleFormSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/learning/courses/new/page.tsx` | 72 | Event | `<form onSubmit={handleSubmit} className="card p-6 space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 207 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 272 | Event | `onClick={() => loadEncashments(page, statusFilter)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 373 | Event | `onClick={() => handleAction(req.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 383 | Event | `onClick={() => handleAction(req.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 411 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/leave-encashment/page.tsx` | 422 | Event | `onClick={() => setPage((p) => Math.min(totalPages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 280 | Event | `onClick={openAddModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 318 | Event | `onClick={loadData}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 421 | Event | `onClick={() => openEditModal(unit)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 429 | Event | `onClick={() => setDeletingUnit(unit)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 467 | Event | `onClick={() => toggleDept(dept.name)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 534 | Event | `onClick={closeModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 548 | Event | `onClick={closeModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 624 | Event | `onClick={closeModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 630 | Event | `onClick={handleFormSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 657 | Event | `onClick={() => !deleteSubmitting && setDeletingUnit(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 678 | Event | `onClick={() => !deleteSubmitting && setDeletingUnit(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/organization/page.tsx` | 684 | Event | `onClick={handleDelete}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 321 | Event | `<Button variant="ghost" size="sm" onClick={downloadCSV} className="text-xs gap-1` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 357 | Event | `<Button variant="ghost" size="sm" onClick={() => setSelectedSlip(s)} className="` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 391 | Event | `<Button variant="ghost" size="sm" onClick={() => setSelectedSlip(s)} className="` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 580 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={() => window.locat` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 599 | Event | `<Button variant="outline" size="sm" onClick={fetchRuns} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 602 | Event | `<Button variant="primary" onClick={handleGenerate} loading={generating} disabled` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 633 | Event | `<button onClick={() => setGenerateResult(null)} className="text-white/60 hover:t` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 743 | Event | `<Button variant="primary" className="mt-6" onClick={handleGenerate} loading={gen` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 759 | Event | `onClick={() => setExpandedRun(isExpanded ? null : run.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 794 | Event | `<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 801 | Event | `onClick={() => handleStatusTransition(run.id, action.status)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 813 | Event | `onClick={() => setRejectRun(run)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 879 | Event | `<Button variant="outline" size="sm" onClick={() => setRejectRun(null)}>Cancel</B` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/payroll/page.tsx` | 885 | Event | `onClick={() => handleReject(rejectRun.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/recruitment/postings/new/page.tsx` | 68 | Event | `<form onSubmit={handleSubmit} className="card p-6 space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 372 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 523 | Event | `onClick={() => handleAction(r.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 533 | Event | `onClick={() => openRejectModal(r.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 546 | Event | `onClick={() => handleAction(r.id, 'process')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 644 | Event | `onClick={() => handleAction(r.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 655 | Event | `onClick={() => openRejectModal(r.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 669 | Event | `onClick={() => handleAction(r.id, 'process')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 692 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 704 | Event | `onClick={() => setPage((p) => Math.min(pagination!.pages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 749 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reimbursements/page.tsx` | 761 | Event | `onClick={confirmReject}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reports/page.tsx` | 79 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/reports/page.tsx` | 124 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 399 | Event | `<Button onClick={openAddComponent}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 437 | Event | `onClick={() => setActiveTab(tab.key)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 499 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={fetchComponents}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 512 | Event | `<Button size="sm" className="mt-4" onClick={openAddComponent}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 570 | Event | `onClick={() => openEditComponent(comp)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 578 | Event | `onClick={() => handleDeleteComponent(comp.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 622 | Event | `<Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => op` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 629 | Event | `onClick={() => handleDeleteComponent(comp.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 682 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={() => fetchRevisio` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 821 | Event | `onClick={() => setRevisionsPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 832 | Event | `onClick={() => setRevisionsPage((p) => Math.min(revisionsTotalPages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 933 | Event | `<Button variant="outline" onClick={() => setShowComponentModal(false)} disabled=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-components/page.tsx` | 936 | Event | `<Button onClick={handleComponentSubmit} disabled={formSubmitting}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 247 | Event | `<Button variant="primary" onClick={openAdd} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 296 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={fetchStructures}>R` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 303 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={openAdd}>Add Struc` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 339 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewStructure(s)} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 342 | Event | `<Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 366 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewStructure(s)} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 367 | Event | `<Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 463 | Event | `onClick={() => { setFormEmployeeId(e.id); setEmpSearch(`${e.first_name} ${e.last` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 571 | Event | `<Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/salary-structures/page.tsx` | 572 | Event | `<Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 100 | Event | `onClick={() => !disabled && onChange(!value)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 120 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 167 | Event | `onClick={() => { onSave(val); setEditing(false); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 173 | Event | `onClick={() => { setVal(displayValue); setEditing(false); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 183 | Event | `onClick={() => setEditing(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 336 | Event | `onClick={loadAll}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 760 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={a` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 793 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={(` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 803 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={(` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/settings/page.tsx` | 812 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={(` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 322 | Event | `<Button variant="primary" onClick={openAdd} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 376 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={fetchShifts}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 388 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={openAdd}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 454 | Event | `onClick={() => openAssign(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 463 | Event | `onClick={() => openEdit(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 472 | Event | `onClick={() => setDeleteShift(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 512 | Event | `<Button variant="ghost" size="sm" onClick={() => openAssign(s)} className="text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 515 | Event | `<Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 521 | Event | `onClick={() => setDeleteShift(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 661 | Event | `<Button variant="outline" size="sm" onClick={() => setShowModal(false)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 664 | Event | `<Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 722 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 771 | Event | `<Button variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 774 | Event | `<Button variant="primary" size="sm" onClick={handleAssign} disabled={assignSavin` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 805 | Event | `onClick={() => setDeleteShift(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/hr/(main)/shifts/page.tsx` | 812 | Event | `onClick={handleDelete}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/invite/accept/[token]/page.tsx` | 209 | Event | `<form onSubmit={handleSubmit} className="card p-6 space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/error.tsx` | 52 | Event | `onClick={() => reset()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team/page.tsx` | 570 | Event | `onClick={() => window.location.reload()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/manager/(main)/team/page.tsx` | 753 | Event | `onClick={() => onToggleExpand(member.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/not-found.tsx` | 125 | Event | `onClick={() => window.history.back()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 140 | Event | `<form onSubmit={handleInvite} className="space-y-4">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 253 | Event | `onClick={() => copyToClipboard(user.inviteUrl)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 267 | Event | `onClick={() => copyToClipboard(user.tempPassword!)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 284 | Event | `onClick={handleSkip}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/invite-team/page.tsx` | 290 | Event | `onClick={handleComplete}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 204 | Event | `onClick={() => onChange({ ...value, orgModel: model.value })}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 225 | Event | `<button type="button" onClick={addDepartment} className="btn btn-secondary text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 269 | Event | `onClick={() => removeDepartment(dept.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 292 | Event | `<button type="button" onClick={addLocation} className="btn btn-secondary text-xs` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 302 | Event | `<button type="button" onClick={() => removeLocation(loc.id)} className="col-span` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 317 | Event | `<button type="button" onClick={addCostCenter} className="btn btn-secondary text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 326 | Event | `<button type="button" onClick={() => removeCostCenter(cc.id)} className="col-spa` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/onboarding-org-steps.tsx` | 460 | Event | `onClick={() => toggle(module.slug)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 586 | Event | `onClick={() => removeBlackout(idx)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 620 | Event | `onClick={addBlackout}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 777 | Event | `onClick={() => removeCustomHoliday(idx)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 812 | Event | `onClick={addCustomHoliday}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 820 | Event | `onClick={() => { setShowAddForm(false); setNewHoliday({ name: '', date: '' }); }` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 830 | Event | `onClick={() => setShowAddForm(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 1489 | Event | `onClick={() => setCurrentStep((s) => s - 1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/page.tsx` | 1497 | Event | `onClick={handleNext}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/onboarding/steps/step-1-company.tsx` | 294 | Event | `<form onSubmit={handleSubmit} className="space-y-8">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard/action-panel.tsx` | 60 | Event | `<Button type="button" variant="ghost" onClick={handleSync} className="p-3 bg-[va` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard/action-panel.tsx` | 65 | Event | `<Button type="button" variant="ghost" onClick={handlePurge} className="p-3 bg-[v` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/dashboard/action-panel.tsx` | 70 | Event | `<Button type="button" variant="ghost" onClick={handleMaintenance} className="p-3` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 90 | Event | `onClick={() => copyToClipboard(success.inviteUrl)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 113 | Event | `onClick={() => copyToClipboard(success.tempPassword!)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 132 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/super-admin/users/new/page.tsx` | 168 | Event | `<form onSubmit={handleSubmit} className="card p-6 space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/support/page.tsx` | 154 | Event | `onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/app/support/page.tsx` | 258 | Event | `<Button type="button" size="sm" className="gap-2" onClick={startChatRequest}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/actions.tsx` | 102 | Event | `onClick={onClick}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/admin/billing-upgrade-button.tsx` | 179 | Event | `onClick={() => { void handleUpgrade(); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 93 | Event | `onClick={() => setSidebarOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 119 | Event | `onClick={() => setCollapsed(!collapsed)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 125 | Event | `onClick={() => setSidebarOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 211 | Event | `onClick={() => setSidebarOpen(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 235 | Event | `onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 261 | Event | `onClick={onSignOut}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/app-layout.tsx` | 445 | Event | `onClick={() => onRowClick?.(row)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 289 | Event | `onClick={() => setOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 331 | Event | `onClick={() => setOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 359 | Event | `onClick={() => setOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 395 | Event | `onClick={confirmPendingAction}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 405 | Event | `onClick={cancelPendingAction}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 420 | Event | `onClick={() => sendMessage(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 431 | Event | `onSubmit={(e) => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/assistant/continuum-assistant-widget.tsx` | 484 | Event | `onClick={() => setOpen((v) => !v)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 127 | Event | `onClick={this.handleReset}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 137 | Event | `onClick={this.handleRefresh}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 154 | Event | `onClick={() => window.open('mailto:support@continuum-hr.com', '_blank')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-error-boundary.tsx` | 160 | Event | `onClick={() => window.open('/help', '_blank')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 355 | Event | `<Button onClick={() => void runSearch()} disabled={!canSearch || loading}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 359 | Event | `<Button type="button" variant="outline" onClick={saveCurrentView} disabled={!can` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 364 | Event | `<Button type="button" variant="outline" onClick={() => void saveSharedView()} di` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 369 | Event | `<Button type="button" variant="outline" onClick={exportCsv} disabled={!hasResult` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 383 | Event | `onClick={() => applyPreset(preset)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 390 | Event | `onClick={() => deletePreset(preset.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 410 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 422 | Event | `onClick={() => void deleteSharedView(view.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 440 | Event | `onClick={() => toggleDomain(domain)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/global-search-page.tsx` | 489 | Event | `<Button type="button" size="sm" variant="outline" onClick={() => void runSearch(` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/help-tooltip.tsx` | 56 | Event | `onClick={() => setIsOpen(!isOpen)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/help-tooltip.tsx` | 85 | Event | `onClick={() => setIsOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/hr/global-search-trigger.tsx` | 27 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/hr/invite-credentials-editor.tsx` | 69 | Event | `<form className="card p-6 space-y-4" onSubmit={onSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/invite/resend-invite-button.tsx` | 62 | Event | `onClick={handleResend}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/layouts/wizard-template.tsx` | 98 | Event | `onClick={onBack}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/layouts/wizard-template.tsx` | 107 | Event | `onClick={onSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/layouts/wizard-template.tsx` | 115 | Event | `onClick={onNext}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/motion/magnetic-button.tsx` | 68 | Event | `onClick={handleClick}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notification-bell.tsx` | 228 | Event | `onClick={() => setOpen((o) => !o)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notification-bell.tsx` | 299 | Event | `onClick={markAllRead}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notification-bell.tsx` | 338 | Event | `onClick={() => !notification.is_read && markRead(notification.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 193 | Event | `onClick={markAllRead}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 214 | Event | `onClick={() => setFilter('all')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 222 | Event | `onClick={() => setFilter('unread')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 233 | Event | `onClick={() => setTypeFilter('all')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 246 | Event | `onClick={() => setTypeFilter(isActive ? 'all' : types[0])}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/notifications-page.tsx` | 284 | Event | `onClick={() => !notif.is_read && markAsRead(notif.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 224 | Event | `onClick={() => setActiveTab('general')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 233 | Event | `onClick={() => setActiveTab('time')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 242 | Event | `onClick={() => setActiveTab('notifications')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 251 | Event | `onClick={() => setActiveTab('roles')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 260 | Event | `onClick={() => setActiveTab('capabilities')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 271 | Event | `onClick={() => setActiveTab('org-structure')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 281 | Event | `onClick={() => setActiveTab('approval-chains')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 291 | Event | `onClick={() => setActiveTab('modules')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 301 | Event | `onClick={() => setActiveTab('security')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 312 | Event | `<form className="card p-6 sm:p-8 shadow-lg hoverable-off" onSubmit={handleSave}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 404 | Event | `<Button type="button" disabled={isMfaSaving} onClick={handleForceGlobalMfa} clas` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 439 | Event | `onClick={() => handleRoleModelUpgrade(model.key)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 512 | Event | `<Button type="button" id="save-org-structure" disabled={isOrgConfigSaving} onCli` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 536 | Event | `<Button type="button" id="save-approval-chains" disabled={isOrgConfigSaving} onC` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 559 | Event | `<Button type="button" id="save-modules" disabled={isOrgConfigSaving} onClick={()` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/company-settings-view.tsx` | 569 | Event | `<Button type="button" onClick={handleDiscardChanges} className="btn btn-secondar` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/login-view.tsx` | 139 | Event | `<form onSubmit={handleSubmit} className="space-y-4 card p-6 sm:p-8 shadow-lg">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/login-view.tsx` | 173 | Event | `onClick={() => setShowPassword(!showPassword)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-invite-view.tsx` | 228 | Event | `<form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-invite-view.tsx` | 244 | Event | `onClick={() => setAuthMode('invite')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/people-invite-view.tsx` | 252 | Event | `onClick={() => setAuthMode('direct')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 245 | Event | `<Button variant="outline" size="sm" onClick={resetChanges}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 249 | Event | `<Button size="sm" onClick={() => setConfirmModalOpen(true)} loading={saving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 365 | Event | `onClick={() => togglePermission(perm, role)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 406 | Event | `<Button variant="ghost" size="sm" className="mt-3" onClick={() => { setSearchQue` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 463 | Event | `onClick={() => setConfirmModalOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/rbac-view.tsx` | 469 | Event | `onClick={handleSave}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/setup-wizard-view.tsx` | 399 | Event | `onClick={() => void fetchProgress()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/startup-readiness-view.tsx` | 83 | Event | `<Button onClick={load}>Refresh</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/system-health-view.tsx` | 238 | Event | `onClick={() => setAutoRefresh(!autoRefresh)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/system-health-view.tsx` | 250 | Event | `onClick={() => fetchHealth(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/whatsapp-integration-view.tsx` | 66 | Event | `<Button onClick={handleConnectWABA} disabled={isConnecting} id="btn-connect-what` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/admin/whatsapp-integration-view.tsx` | 80 | Event | `<Button variant="outline" onClick={handleTestWebhook} id="btn-test-whatsapp-webh` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/forgot-password-view.tsx` | 54 | Event | `onClick={() => setSent(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/forgot-password-view.tsx` | 81 | Event | `<form onSubmit={handleSubmit} className="space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/reset-password-view.tsx` | 174 | Event | `<form onSubmit={handleSubmit} className="space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/auth/sign-up-view.tsx` | 303 | Event | `<form onSubmit={handleSignUp} className="space-y-4">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 311 | Event | `onClick={() => { setShowRegModal(true); setRegError(''); setRegSuccess(''); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 320 | Event | `onClick={() => handleClock('check_in', false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 330 | Event | `onClick={() => handleClock('check_in', true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 341 | Event | `onClick={() => handleClock('check_out')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 379 | Event | `onClick={() => { setError(null); loadAttendance(); loadLeaveBalances(); loadRegu` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 440 | Event | `<Button onClick={prevMonth} className="p-1.5 hover:bg-[var(--accent)] rounded-fu` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 446 | Event | `<Button onClick={nextMonth} className="p-1.5 hover:bg-[var(--accent)] rounded-fu` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 668 | Event | `onClick={() => !regSubmitting && setShowRegModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 682 | Event | `onClick={() => !regSubmitting && setShowRegModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 731 | Event | `onClick={() => !regSubmitting && setShowRegModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/attendance-view.tsx` | 737 | Event | `onClick={handleRegSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 160 | Event | `onClick={handleExport}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 179 | Event | `onClick={() => setActiveCategory('identity')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 201 | Event | `onClick={() => setActiveCategory('financial')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 223 | Event | `onClick={() => setActiveCategory('policies')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/documents-view.tsx` | 347 | Event | `onClick={() => handleDelete(doc.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/exit-checklist-view.tsx` | 211 | Event | `onClick={loadChecklists}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/exit-checklist-view.tsx` | 338 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/learning-view.tsx` | 187 | Event | `onClick={() => void handleMarkProgress(enrollment.id, pct)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/learning-view.tsx` | 226 | Event | `onClick={() => void handleEnroll(course.id)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 450 | Event | `onClick={() => { setStartDateFilter(''); setEndDateFilter(''); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 461 | Event | `onClick={handleExportCsv}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 486 | Event | `onClick={() => { setStatusFilter(s); setPage(1); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 499 | Event | `onClick={() => setShowFilters((v) => !v)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 591 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 659 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 688 | Event | `onClick={() => openDetail(req)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 744 | Event | `onClick={(e) => { e.stopPropagation(); handleCancel(req.id); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 773 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 786 | Event | `onClick={() => setPage((p) => Math.min(totalPages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 1060 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/leave-history-view.tsx` | 1070 | Event | `<Button variant="outline" size="sm" onClick={closeDetail}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/onboarding-view.tsx` | 139 | Event | `onClick={async () => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/onboarding-view.tsx` | 170 | Event | `<form onSubmit={submit} className="card p-6 md:p-8 space-y-8">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 183 | Event | `<Button type="button" onClick={() => setShowForm((v) => !v)} className="btn btn-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 197 | Event | `<form onSubmit={handleSubmit} className="rounded-xl border border-[var(--border)` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 224 | Event | `<Button type="button" variant="secondary" onClick={() => setShowForm(false)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 309 | Event | `onClick={() => actOnTeamRequest(row.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payroll-advances-view.tsx` | 318 | Event | `onClick={() => actOnTeamRequest(row.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payslips-view.tsx` | 140 | Event | `<Button variant="ghost" size="sm" className="text-red-300 underline hover:no-und` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payslips-view.tsx` | 262 | Event | `<Button variant="ghost" size="sm" className="gap-2 text-xs font-bold text-primar` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/payslips-view.tsx` | 353 | Event | `<Button variant="outline" className="w-full gap-2 font-bold text-primary hover:b` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/performance-view.tsx` | 168 | Event | `onClick={() => setActiveTab(tab)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/performance-view.tsx` | 199 | Event | `onClick={() => void handleCreateGoal()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/performance-view.tsx` | 249 | Event | `onClick={() => void handleUpdateProgress(goal.id, pct)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 133 | Event | `<button type="button" className={tabClass('personal')} onClick={() => setActiveT` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 134 | Event | `<button type="button" className={tabClass('emergency')} onClick={() => setActive` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 135 | Event | `<button type="button" className={tabClass('bank')} onClick={() => setActiveTab('` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/profile-view.tsx` | 216 | Event | `<button type="button" onClick={handleSave} disabled={isSaving} className="btn bt` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 294 | Event | `<Button size="lg" onClick={openModal}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 336 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 367 | Event | `<Button onClick={openModal} variant="outline" size="sm" className="mt-6">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 421 | Event | `<Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 426 | Event | `<Button size="sm" variant="outline" disabled={page === pagination.pages} onClick` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 444 | Event | `onClick={() => setShowModal(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 451 | Event | `onClick={(e) => e.stopPropagation()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 453 | Event | `<form onSubmit={handleSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/reimbursements-view.tsx` | 548 | Event | `<Button type="button" variant="outline" onClick={() => setShowModal(false)}>Canc` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/request-leave-view.tsx` | 289 | Event | `onSubmit={handleSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/settings-view.tsx` | 110 | Event | `onClick={() => toggle(event, channel)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/settings-view.tsx` | 123 | Event | `<Button type="button" onClick={handleSave} disabled={isSaving} className="btn bt` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 105 | Event | `<Button size="sm" variant="outline" onClick={() => setShowTravelForm((v) => !v)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 108 | Event | `<Button size="sm" onClick={() => setShowExpenseForm((v) => !v)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 251 | Event | `<button onClick={onCancel} className="text-[var(--muted-foreground)] hover:text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 255 | Event | `<form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 277 | Event | `<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 319 | Event | `<button onClick={onCancel} className="text-[var(--muted-foreground)] hover:text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 323 | Event | `<form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/travel-view.tsx` | 344 | Event | `<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/employee/welcome-view.tsx` | 82 | Event | `onClick={continueToDashboard}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 105 | Event | `<Button onClick={onAction} variant="primary" size="sm">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 145 | Event | `onClick={() => setIsOpen(!isOpen)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 177 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 417 | Event | `onClick={() => setActiveTab('approvals')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 425 | Event | `onClick={() => setActiveTab('levels')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 448 | Event | `<Button size="sm" variant="primary" onClick={() => openModal('approval')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 493 | Event | `<Button variant="ghost" size="sm" onClick={() => openModal('approval', true, h)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 494 | Event | `<Button variant="ghost" size="sm" onClick={() => handleDelete('approval', h.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 514 | Event | `<Button size="sm" variant="primary" onClick={() => openModal('level')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 541 | Event | `<Button variant="ghost" size="sm" onClick={() => openModal('level', true, jl)}><` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 542 | Event | `<Button variant="ghost" size="sm" onClick={() => handleDelete('level', jl.id)} d` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 609 | Event | `<Button variant="secondary" onClick={() => setApprovalModal(m => ({ ...m, isOpen` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 610 | Event | `<Button variant="primary" onClick={() => handleSave('approval')} loading={approv` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 655 | Event | `<Button variant="secondary" onClick={() => setLevelModal(m => ({ ...m, isOpen: f` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approval-config-view.tsx` | 656 | Event | `<Button variant="primary" onClick={() => handleSave('level')} loading={levelModa` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 281 | Event | `onClick={() => { setStatusTab('pending'); setPagination(p => ({ ...p, page: 1 })` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 293 | Event | `onClick={() => { setStatusTab('escalated'); setPagination(p => ({ ...p, page: 1 ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 328 | Event | `<Button size="sm" onClick={() => handleBulkAction('approve')} loading={bulkLoadi` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 331 | Event | `<Button size="sm" variant="outline" onClick={() => handleBulkAction('reject')} l` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 334 | Event | `<Button onClick={() => setSelectedIds(new Set())} className="text-sm text-[var(-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 414 | Event | `<Button size="sm" onClick={() => handleAction(req.id, 'approve')} loading={isAct` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 417 | Event | `<Button size="sm" variant="outline" onClick={() => handleAction(req.id, 'reject'` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 433 | Event | `<Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, p` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/approvals-view.tsx` | 437 | Event | `<Button variant="outline" size="sm" onClick={() => setPagination(p => ({ ...p, p` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 238 | Event | `<TabButton active={activeTab === 'daily'} onClick={() => setActiveTab('daily')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 239 | Event | `<TabButton active={activeTab === 'regularization'} onClick={() => setActiveTab('` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 283 | Event | `<Button variant="outline" size="sm" disabled={records.length === 0} onClick={han` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 405 | Event | `<Button size="sm" variant="success" onClick={() => handleRegAction(req.id, 'appr` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 408 | Event | `<Button size="sm" variant="danger" onClick={() => handleRegAction(req.id, 'rejec` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 422 | Event | `<Button variant="outline" size="sm" onClick={() => setRegPagination(p => ({ ...p` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/attendance-view.tsx` | 424 | Event | `<Button variant="outline" size="sm" onClick={() => setRegPagination(p => ({ ...p` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 375 | Event | `onClick={handleExportCSV}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 384 | Event | `onClick={handleExportPDF}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 414 | Event | `onClick={handleVerifyChain}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 497 | Event | `<form onSubmit={handleSearchSubmit} className="flex gap-1.5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 521 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 537 | Event | `<Button onClick={() => fetchLogs(page)} className="ml-2 text-sm underline hover:` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 592 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 623 | Event | `onClick={() => hasChanges && toggleRow(log.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 777 | Event | `onClick={() => setPage(1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 786 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 808 | Event | `onClick={() => setPage(p)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 823 | Event | `onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/audit-logs-view.tsx` | 832 | Event | `onClick={() => setPage(pagination.pages)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 93 | Event | `<button type="button" onClick={downloadSample} className="btn btn-secondary btn-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 103 | Event | `onClick={() => fileRef.current?.click()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 137 | Event | `<button type="button" onClick={handleUpload} disabled={isUploading} className="b` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/bulk-import-view.tsx` | 187 | Event | `<button type="button" onClick={() => { setFile(null); setSummary(null); setResul` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 80 | Event | `<Button size="sm" onClick={() => setShowCreateForm((v) => !v)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 115 | Event | `<Button className="mt-4" size="sm" onClick={() => setShowCreateForm(true)}>Creat` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 193 | Event | `<form onSubmit={(e) => void handleSubmit(e)} className="grid grid-cols-1 sm:grid` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/compensation-view.tsx` | 213 | Event | `<Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 492 | Event | `<Button onClick={openCreateModal}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 536 | Event | `onClick={() => { setStatusFilter(f.value); setPage(1); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 633 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={openCreateModal}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 706 | Event | `onClick={() => handleAction(mov.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 716 | Event | `onClick={() => handleAction(mov.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 786 | Event | `onClick={() => handleAction(mov.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 797 | Event | `onClick={() => handleAction(mov.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 815 | Event | `<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 819 | Event | `<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(total` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 871 | Event | `onClick={() => selectEmployee(emp)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 966 | Event | `<Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={fo` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employee-movements-view.tsx` | 969 | Event | `<Button onClick={handleCreate} loading={formSubmitting}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 281 | Event | `<Button onClick={() => router.push('/hr/employees')} className="flex items-cente` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 289 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={fetchEmployee}>Ret` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 305 | Event | `<Button onClick={() => router.push('/hr/employees')} className="flex items-cente` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 326 | Event | `<Button variant={editing ? 'outline' : 'primary'} size="sm" className="gap-1" on` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 399 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-id-view.tsx` | 443 | Event | `<Button variant="primary" size="sm" className="w-full mt-2" onClick={handleSave}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 380 | Event | `onClick={() => router.push('/hr/employees')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 403 | Event | `onClick={() => setMode('single')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 414 | Event | `onClick={() => setMode('bulk')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 476 | Event | `onClick={() => copyInviteLink(result.inviteLink!)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 489 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 498 | Event | `onClick={() => router.push('/hr/employees')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 514 | Event | `onClick={() => setAccountMode('invite')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 524 | Event | `onClick={() => setAccountMode('direct')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 679 | Event | `onClick={handleSendInvite}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 712 | Event | `onClick={() => setBulkAccountMode('invite')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 722 | Event | `onClick={() => setBulkAccountMode('direct')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 781 | Event | `onClick={() => csvInputRef.current?.click()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/employees-invite-view.tsx` | 787 | Event | `onClick={handleBulkInvite}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 122 | Event | `<Button variant="outline" size="sm" onClick={fetchEscalated} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 145 | Event | `<Button variant="ghost" size="sm" onClick={fetchEscalated}>Retry</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 266 | Event | `onClick={() => handleAction(req.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/escalation-view.tsx` | 276 | Event | `onClick={() => handleAction(req.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 361 | Event | `<Button onClick={() => setShowAddModal(true)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 469 | Event | `onClick={() => setStatusFilter(f.value)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 578 | Event | `onClick={() => setShowAddModal(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 627 | Event | `onClick={() => handleToggleComplete(checklist)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 700 | Event | `onClick={() => handleDelete(checklist.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 797 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/exit-checklist-view.tsx` | 805 | Event | `<Button onClick={handleAddChecklist} loading={addLoading} disabled={addLoading}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/goals-view.tsx` | 165 | Event | `<Button onClick={() => setShowCreateModal(true)} size="sm">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/goals-view.tsx` | 335 | Event | `<Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Butt` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/goals-view.tsx` | 336 | Event | `<Button onClick={handleCreateGoal} disabled={isSaving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 84 | Event | `<Button onClick={onAdd} className="gap-2">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 125 | Event | `onClick={onDismiss}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 174 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 191 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 199 | Event | `<form onSubmit={handleSubmit} className="space-y-4">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 242 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 279 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 306 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 314 | Event | `onClick={onConfirm}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 465 | Event | `<Button onClick={handleAdd} className="gap-2 shrink-0">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 506 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 575 | Event | `onClick={() => handleEdit(holiday)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 582 | Event | `onClick={() =>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/holidays-view.tsx` | 618 | Event | `onSubmit={handleFormSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/job-board-view.tsx` | 244 | Event | `onClick={() => handleApply(job.id, job.title)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/learning-view.tsx` | 119 | Event | `<button key={s} onClick={() => setFilterStatus(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 174 | Event | `<form onSubmit={handleSubmit} className="card p-6 sm:p-8 shadow-lg space-y-6">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 245 | Event | `onClick={() => setForm((prev) => ({ ...prev, adjustment: prev.adjustment - 1 }))` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 259 | Event | `onClick={() => setForm((prev) => ({ ...prev, adjustment: prev.adjustment + 1 }))` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-balance-view.tsx` | 291 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 445 | Event | `<Button variant="danger" size="sm" onClick={() => fetchCalendarData(currentDate.` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 481 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 484 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 491 | Event | `<Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} className="h-8` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 494 | Event | `<Button variant="ghost" size="sm" onClick={goToToday} className="px-3 text-sm fo` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 497 | Event | `<Button variant="ghost" size="sm" onClick={() => changeMonth(1)} className="h-8 ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-calendar-view.tsx` | 503 | Event | `<Button variant="outline" size="sm" onClick={goToToday}>Today</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 207 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 272 | Event | `onClick={() => loadEncashments(page, statusFilter)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 373 | Event | `onClick={() => handleAction(req.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 383 | Event | `onClick={() => handleAction(req.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 411 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-encashment-view.tsx` | 422 | Event | `onClick={() => setPage((p) => Math.min(totalPages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-quotas-view.tsx` | 95 | Event | `<button type="button" onClick={addRow} className="btn btn-secondary btn-sm flex ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-quotas-view.tsx` | 131 | Event | `<button type="button" onClick={() => removeRow(row.id)} className="h-9 w-9 flex ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-quotas-view.tsx` | 148 | Event | `<button type="button" onClick={handleSave} disabled={isSaving || !rows.length} c` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 347 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 371 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 430 | Event | `onClick={() => { setStatusFilter(f.value); setPage(1); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 438 | Event | `onClick={() => setShowFilters(!showFilters)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 532 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 590 | Event | `onClick={() => setBulkResult(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 632 | Event | `onClick={clearFilters}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 680 | Event | `onClick={(e) => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 728 | Event | `onClick={() => handleAction(req.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 738 | Event | `onClick={() => handleAction(req.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 758 | Event | `<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 762 | Event | `<Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(total` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 794 | Event | `onClick={() => handleBulkAction('approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 804 | Event | `onClick={() => handleBulkAction('reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 812 | Event | `onClick={() => setSelectedIds(new Set())}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 835 | Event | `onClick={() => setSelectedRequest(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 867 | Event | `onClick={() => setSelectedRequest(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 1008 | Event | `onClick={() => handleAction(selectedRequest.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/leave-requests-view.tsx` | 1018 | Event | `onClick={() => handleAction(selectedRequest.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 281 | Event | `onClick={openAddModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 319 | Event | `onClick={loadData}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 422 | Event | `onClick={() => openEditModal(unit)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 430 | Event | `onClick={() => setDeletingUnit(unit)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 468 | Event | `onClick={() => toggleDept(dept.name)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 535 | Event | `onClick={closeModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 550 | Event | `onClick={closeModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 629 | Event | `onClick={closeModal}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 635 | Event | `onClick={handleFormSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 662 | Event | `onClick={() => !deleteSubmitting && setDeletingUnit(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 683 | Event | `onClick={() => !deleteSubmitting && setDeletingUnit(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/organization-view.tsx` | 689 | Event | `onClick={handleDelete}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-advances-view.tsx` | 107 | Event | `onClick={() => act(row.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-advances-view.tsx` | 116 | Event | `onClick={() => act(row.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 328 | Event | `<Button variant="ghost" size="sm" onClick={downloadCSV} className="text-xs gap-1` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 364 | Event | `<Button variant="ghost" size="sm" onClick={() => setSelectedSlip(s)} className="` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 398 | Event | `<Button variant="ghost" size="sm" onClick={() => setSelectedSlip(s)} className="` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 629 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={() => window.locat` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 648 | Event | `<Button variant="outline" size="sm" onClick={fetchRuns} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 651 | Event | `<Button variant="primary" onClick={() => handleGenerate(false)} loading={generat` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 686 | Event | `onClick={() => setGenerateResult(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 735 | Event | `<Button variant="outline" size="sm" onClick={() => setRegularizationWarning(null` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 739 | Event | `onClick={() => handleGenerate(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 829 | Event | `<Button variant="primary" className="mt-6" onClick={() => handleGenerate(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 845 | Event | `onClick={() => setExpandedRun(isExpanded ? null : run.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 880 | Event | `<div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 887 | Event | `onClick={() => handleStatusTransition(run.id, action.status)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 899 | Event | `onClick={() => setRejectRun(run)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 965 | Event | `<Button variant="outline" size="sm" onClick={() => setRejectRun(null)}>Cancel</B` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/payroll-view.tsx` | 971 | Event | `onClick={() => handleReject(rejectRun.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 157 | Event | `onClick={() => setEditing(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 249 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 259 | Event | `onClick={() => { setConfig(rule.config); setJsonError(''); setEditing(false); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 352 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 368 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 377 | Event | `<form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 476 | Event | `<Button type="button" variant="ghost" onClick={onClose}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 510 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 533 | Event | `<Button type="button" variant="ghost" onClick={onClose} disabled={deleting}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 536 | Event | `<Button type="button" variant="danger" loading={deleting} onClick={onConfirm}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 700 | Event | `<Button size="sm" onClick={handleAdd}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 716 | Event | `<Button size="sm" onClick={handleAdd}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 784 | Event | `onClick={() => handleEdit(lt)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 791 | Event | `onClick={() => handleDeleteClick(lt)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/policy-settings-view.tsx` | 924 | Event | `onClick={() => setActiveTab(tab.key)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 372 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 523 | Event | `onClick={() => handleAction(r.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 533 | Event | `onClick={() => openRejectModal(r.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 546 | Event | `onClick={() => handleAction(r.id, 'process')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 644 | Event | `onClick={() => handleAction(r.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 655 | Event | `onClick={() => openRejectModal(r.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 669 | Event | `onClick={() => handleAction(r.id, 'process')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 692 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 704 | Event | `onClick={() => setPage((p) => Math.min(pagination!.pages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 749 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reimbursements-view.tsx` | 761 | Event | `onClick={confirmReject}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 171 | Event | `onClick={() => setSelectedTemplate(template)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 216 | Event | `<button onClick={onBack} className="p-2 rounded-lg hover:bg-[var(--muted)] trans` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 224 | Event | `<Button size="sm" onClick={() => onRun()} disabled={isRunning}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 228 | Event | `<Button size="sm" variant="outline" onClick={onExport}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 373 | Event | `onClick={() => onPageChange(currentPage - 1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/report-builder-view.tsx` | 384 | Event | `onClick={() => onPageChange(currentPage + 1)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reports-view.tsx` | 153 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reports-view.tsx` | 198 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 148 | Event | `<Button onClick={() => setShowCreateModal(true)} size="sm">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 163 | Event | `<Button onClick={() => setShowCreateModal(true)} className="mt-4">Create Review ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 272 | Event | `<Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Butt` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/reviews-view.tsx` | 273 | Event | `<Button onClick={handleCreateCycle} disabled={isSaving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 395 | Event | `<Button onClick={openAddComponent}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 433 | Event | `onClick={() => setActiveTab(tab.key)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 495 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={fetchComponents}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 508 | Event | `<Button size="sm" className="mt-4" onClick={openAddComponent}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 566 | Event | `onClick={() => openEditComponent(comp)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 574 | Event | `onClick={() => handleDeleteComponent(comp.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 618 | Event | `<Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => op` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 625 | Event | `onClick={() => handleDeleteComponent(comp.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 678 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={() => fetchRevisio` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 817 | Event | `onClick={() => setRevisionsPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 828 | Event | `onClick={() => setRevisionsPage((p) => Math.min(revisionsTotalPages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 930 | Event | `<Button variant="outline" onClick={() => setShowComponentModal(false)} disabled=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-components-view.tsx` | 933 | Event | `<Button onClick={handleComponentSubmit} disabled={formSubmitting}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 298 | Event | `<Button variant="primary" onClick={openAdd} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 367 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={fetchStructures}>R` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 374 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={openAdd}>Add Struc` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 410 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewStructure(s)} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 413 | Event | `<Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 437 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewStructure(s)} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 438 | Event | `<Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 534 | Event | `onClick={() => { setFormEmployeeId(e.id); setEmpSearch(`${e.first_name} ${e.last` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 644 | Event | `<Button variant="outline" size="sm" onClick={() => setShowModal(false)}>Cancel</` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/salary-structures-view.tsx` | 645 | Event | `<Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 98 | Event | `onClick={() => !disabled && onChange(!value)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 146 | Event | `onClick={() => { onSave(val); setEditing(false); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 152 | Event | `onClick={() => { setVal(displayValue); setEditing(false); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 164 | Event | `onClick={() => setEditing(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 319 | Event | `onClick={loadAll}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 744 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={a` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 766 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={(` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 776 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={(` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/settings-view.tsx` | 785 | Event | `<Button variant="outline" className="justify-start gap-3 h-auto py-4" onClick={(` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 390 | Event | `<Button variant="primary" onClick={openAdd} className="gap-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 438 | Event | `onClick={handleBulkDelete}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 459 | Event | `<Button variant="outline" size="sm" className="mt-3" onClick={fetchShifts}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 471 | Event | `<Button variant="primary" size="sm" className="mt-4" onClick={openAdd}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 555 | Event | `onClick={() => openAssign(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 564 | Event | `onClick={() => openEdit(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 573 | Event | `onClick={() => setDeleteShift(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 613 | Event | `<Button variant="ghost" size="sm" onClick={() => openAssign(s)} className="text-` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 616 | Event | `<Button variant="ghost" size="sm" onClick={() => openEdit(s)} className="text-xs` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 622 | Event | `onClick={() => setDeleteShift(s)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 762 | Event | `<Button variant="outline" size="sm" onClick={() => setShowModal(false)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 765 | Event | `<Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 823 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 872 | Event | `<Button variant="outline" size="sm" onClick={() => setShowAssignModal(false)}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 875 | Event | `<Button variant="primary" size="sm" onClick={handleAssign} disabled={assignSavin` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 906 | Event | `onClick={() => setDeleteShift(null)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/shifts-view.tsx` | 913 | Event | `onClick={handleDelete}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 188 | Event | `onClick={() => void handleTravelAction(req.id, 'approve')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 193 | Event | `onClick={() => void handleTravelAction(req.id, 'reject')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 242 | Event | `onClick={() => void handleExpenseAction(expense.id, 'approve')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/hr/travel-view.tsx` | 247 | Event | `onClick={() => void handleExpenseAction(expense.id, 'reject')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 523 | Event | `onClick={() => setError('')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 541 | Event | `onClick={() => setActiveTab(tab.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 589 | Event | `<Button variant="ghost" onClick={() => { setFilterName(''); setFilterLeaveType('` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 606 | Event | `<Button size="sm" variant="success" onClick={() => openBulkDialog('approve')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 609 | Event | `<Button size="sm" variant="danger" onClick={() => openBulkDialog('reject')}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 633 | Event | `<Button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm tex` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 693 | Event | `onClick={() => setHistoryPage(p => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 705 | Event | `onClick={() => setHistoryPage(p => Math.min(historyPagination.pages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 738 | Event | `<Button variant="ghost" onClick={cancelAction} className="text-muted-foreground ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 741 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 796 | Event | `<Button variant="ghost" onClick={closeBulkDialog} disabled={bulkProcessing} clas` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 802 | Event | `onClick={executeBulkAction}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 824 | Event | `<Button onClick={() => onToggleSelect(req.id)} className="mt-1">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 855 | Event | `<Button variant="danger" size="sm" onClick={() => onStartAction(req.id, 'reject'` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/approvals-view.tsx` | 858 | Event | `<Button variant="success" size="sm" onClick={() => onStartAction(req.id, 'approv` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/people-invite-view.tsx` | 220 | Event | `<form className="grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={handleSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/performance-view.tsx` | 186 | Event | `<Button size="sm" variant="outline" id={`review-btn-${instance.id}`} onClick={()` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/performance-view.tsx` | 202 | Event | `onClick={() => setRatingInput((prev) => ({ ...prev, [instance.id]: { ...(prev[in` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/performance-view.tsx` | 246 | Event | `onClick={() => void handleSubmitReview(instance.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 325 | Event | `onClick={() => loadReimbursements(page, statusFilter)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 376 | Event | `onClick={() => setError('')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 405 | Event | `onClick={() => { setStatusFilter(tab.value); setPage(1); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 474 | Event | `onClick={() => setPage((p) => Math.max(1, p - 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 485 | Event | `onClick={() => setPage((p) => Math.min(pagination!.pages, p + 1))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 591 | Event | `onClick={() => onAction(request.id, 'approve')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reimbursements-view.tsx` | 601 | Event | `onClick={() => onAction(request.id, 'reject')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 764 | Event | `<Button variant="outline" size="sm" onClick={exportCSV} disabled={isLoading || (` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 768 | Event | `<Button variant="outline" size="sm" onClick={exportPDFReport} disabled={isLoadin` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 808 | Event | `onClick={() => setActiveReportTab('leave')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 821 | Event | `onClick={() => setActiveReportTab('attendance')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/reports-view.tsx` | 864 | Event | `<Button variant="outline" size="sm" onClick={exportAttendanceCSV} disabled={atte` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/settings-view.tsx` | 83 | Event | `onClick={() => !disabled && onChange(!value)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/settings-view.tsx` | 268 | Event | `onClick={loadAll}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/settings-view.tsx` | 459 | Event | `onClick={async () => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 503 | Event | `onClick={() => fetchData(selectedDate)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 531 | Event | `<Button variant="ghost" size="sm" onClick={goToPreviousDay} aria-label="Previous` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 537 | Event | `<Button variant="secondary" size="sm" onClick={goToToday}>Go to Today</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 539 | Event | `<Button variant="ghost" size="sm" onClick={handleRefresh} disabled={refreshing} ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 543 | Event | `<Button variant="ghost" size="sm" onClick={goToNextDay} disabled={!canGoForward}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 643 | Event | `onClick={() => setActiveTab(id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 819 | Event | `<Button size="sm" variant="success" onClick={() => onAction(request.id, 'approve` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-attendance-view.tsx` | 823 | Event | `<Button size="sm" variant="danger" onClick={() => onAction(request.id, 'reject')` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 150 | Event | `<Button onClick={onRetry} variant="danger" size="sm" className="mt-6">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 320 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewMode('grid')} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 321 | Event | `<Button variant="ghost" size="sm" onClick={() => setViewMode('list')} className=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 324 | Event | `<Button variant="ghost" size="sm" onClick={() => changeMonth(-1)} className="h-8` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 325 | Event | `<Button variant="ghost" size="sm" onClick={goToToday} className="px-3 py-1.5 tex` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 328 | Event | `<Button variant="ghost" size="sm" onClick={() => changeMonth(1)} className="h-8 ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/manager/team-calendar-view.tsx` | 330 | Event | `{!isCurrentMonthView && <Button variant="outline" size="sm" onClick={goToToday}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/invite-accept-token-view.tsx` | 259 | Event | `onSubmit={handleSubmit}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-company-view.tsx` | 98 | Event | `<form className="relative z-10 space-y-5" onSubmit={handleContinue}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 249 | Event | `<Button className="btn btn-secondary w-full sm:w-auto mt-4 text-xs h-10 border-d` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 257 | Event | `<Button type="button" className="btn btn-sm btn-ghost hover:bg-[var(--accent)]" ` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 286 | Event | `<form onSubmit={handleSubmit} className="space-y-4">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/onboarding/onboarding-invite-team-view.tsx` | 313 | Event | `<Button type="button" onClick={() => removeInvite(index)} title="Remove invite r` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/help-view.tsx` | 203 | Event | `onClick={() => document.getElementById('help-topics')?.scrollIntoView({ behavior` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/help-view.tsx` | 262 | Event | `onClick={() => setSelectedArticle({ ...article, sectionTitle: section.title })}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/help-view.tsx` | 280 | Event | `onClick={() => setActiveSection(activeSection === section.id ? null : section.id` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/support-view.tsx` | 157 | Event | `onClick={() => setExpandedFaq(expandedFaq === index ? null : index)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/public/support-view.tsx` | 261 | Event | `<Button type="button" size="sm" className="gap-2" onClick={startChatRequest}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/shared/reporting-tree-view.tsx` | 80 | Event | `onClick={() => setOpen((v) => !v)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-core-functions-view.tsx` | 143 | Event | `<Button onClick={save} disabled={saving} className="inline-flex items-center gap` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-core-functions-view.tsx` | 195 | Event | `onClick={() => toggleCap(item.slug)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-core-functions-view.tsx` | 207 | Event | `onClick={() => toggleEnabled(item.slug)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-settings-view.tsx` | 176 | Event | `onClick={() => router.push(`/super-admin/companies/${companyId}`)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-settings-view.tsx` | 197 | Event | `<form onSubmit={handleSave} className="bg-card border border-border rounded-xl p` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-settings-view.tsx` | 279 | Event | `onClick={() => setForm(initialForm)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 281 | Event | `onClick={() => router.push(`/super-admin/companies/${companyId}/core-functions`)` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 288 | Event | `onClick={() => router.push(`/super-admin/companies/${companyId}/settings`)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 382 | Event | `onClick={resendOwnerCredentials}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 472 | Event | `onClick={() => copyToClipboard(company.joinCode!)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 547 | Event | `onClick={() => router.push(`/super-admin/users?companyId=${companyId}`)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 559 | Event | `onClick={() => router.push(`/admin/audit-logs?companyId=${companyId}`)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-id-view.tsx` | 571 | Event | `onClick={deleteCompany}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 242 | Event | `onClick={() => router.push('/super-admin/companies')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 248 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 290 | Event | `<form onSubmit={handleSubmit} className="bg-card border border-border rounded-lg` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-new-view.tsx` | 563 | Event | `onClick={() => router.back()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 219 | Event | `onClick={() => router.push('/super-admin/companies/new')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 283 | Event | `<form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 320 | Event | `onClick={bulkDeleteCompanies}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 350 | Event | `onClick={() => router.push('/super-admin/companies/new')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 449 | Event | `onClick={() => router.push(`/super-admin/companies/${company.id}`)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 458 | Event | `onClick={() => router.push(`/super-admin/companies/${company.id}/settings`)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 468 | Event | `onClick={() => deleteCompany(company)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 491 | Event | `onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/companies-view.tsx` | 498 | Event | `onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/operations-readiness-view.tsx` | 67 | Event | `<Button onClick={load}>Retry</Button>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/operations-readiness-view.tsx` | 89 | Event | `<Button variant="outline" onClick={load}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-new-view.tsx` | 143 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/pages/super-admin/users-new-view.tsx` | 179 | Event | `<form onSubmit={handleSubmit} className="card p-6 space-y-5">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 231 | Event | `onClick={() => setSidebarOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 280 | Event | `onClick={() => toggleGroup(group.name!)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 306 | Event | `onClick={(e) => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-layout.tsx` | 370 | Event | `onClick={() => setSidebarOpen(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 121 | Event | `onClick={() => setOpen(!open)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 137 | Event | `onClick={() => switchPortal(portal.href)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 159 | Event | `onClick={() => setOpen(!open)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/portal-switcher.tsx` | 188 | Event | `onClick={() => switchPortal(portal.href)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/profile/role-profile-page.tsx` | 298 | Event | `<Button className="btn btn-primary" onClick={saveProfile} disabled={saving}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/profile/role-profile-page.tsx` | 348 | Event | `<Button className="btn btn-primary" onClick={addOrUpdateEmergencyContact} disabl` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/profile/role-profile-page.tsx` | 351 | Event | `<Button className="btn btn-secondary" onClick={deleteEmergencyContact} disabled=` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 162 | Event | `onClick={() => setIsOpen(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 183 | Event | `onClick={() => setIsOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 190 | Event | `onClick={(e) => e.stopPropagation()}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 196 | Event | `onClick={() => setIsOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 268 | Event | `onClick={() => markComplete(step.id)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 287 | Event | `onClick={handleDismiss}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/quick-start-guide.tsx` | 295 | Event | `onClick={() => setIsOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/sidebar-nav.tsx` | 32 | Event | `onClick={onItemClick}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/sign-out-button.tsx` | 49 | Event | `onClick={handleSignOut}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/sign-out-button.tsx` | 61 | Event | `onClick={handleSignOut}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/super-admin/invite-credentials-editor.tsx` | 65 | Event | `<form className="card p-6 space-y-4" onSubmit={onSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/super-admin/user-credentials-editor.tsx` | 78 | Event | `<form className="space-y-4" onSubmit={onSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 20 | Event | `onClick={() => setTheme('light')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 35 | Event | `onClick={() => setTheme('dark')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 50 | Event | `onClick={() => setTheme('system')}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/theme-toggle.tsx` | 77 | Event | `onClick={cycleTheme}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 108 | Event | `onClick={handleSkip}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 134 | Event | `onClick={handleSkip}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 195 | Event | `onClick={step.action.onClick}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 210 | Event | `onClick={handlePrev}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 221 | Event | `onClick={handleSkip}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 226 | Event | `onClick={handleNext}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 345 | Event | `onClick={onStartTutorial}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 353 | Event | `onClick={onSkip}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-guide.tsx` | 428 | Event | `onClick={() => setShowInfo(!showInfo)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 355 | Event | `onClick={onSkip}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 400 | Event | `onClick={onPrev}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 413 | Event | `onClick={isLastStep ? onComplete : onNext}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/tutorial-provider.tsx` | 457 | Event | `onClick={() => startTutorial(tutorial)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 60 | Event | `onClick={handleMaybeLater}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 78 | Event | `onClick={handleMaybeLater}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 144 | Event | `onClick={handleStartTutorial}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 152 | Event | `onClick={handleSkip}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/tutorial/welcome-modal.tsx` | 193 | Event | `onClick={() => startTutorial(tutorial)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/adaptive-field.tsx` | 71 | Event | `onClick={() => setIsEditing(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/adaptive-field.tsx` | 98 | Event | `onClick={handleSave}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/adaptive-field.tsx` | 105 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 151 | Event | `<button type="button" className="theme-toggle" onClick={toggleDarkMode}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 162 | Event | `<form className="login-form" onSubmit={handleSubmit}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 191 | Event | `onClick={() => setShowPassword(!showPassword)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 220 | Event | `<button className="social-button github" type="button" aria-label="Continue with` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 223 | Event | `<button className="social-button twitter" type="button" aria-label="Continue wit` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animated-sign-in.tsx` | 226 | Event | `<button className="social-button linkedin" type="button" aria-label="Continue wi` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animations.tsx` | 96 | Event | `onClick={onClick}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animations.tsx` | 213 | Event | `onClick={onClick}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/animations.tsx` | 304 | Event | `onClick={onToggle}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 169 | Event | `onClick={() => setOpen(true)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 186 | Event | `onClick={() => setOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 205 | Event | `onClick={() => setOpen(false)}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 242 | Event | `onClick={() => { setOpen(false); router.push(item.href); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/command-k.tsx` | 279 | Event | `onClick={() => { setOpen(false); router.push(item.href); }}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/empty-state.tsx` | 31 | Event | `<Button type="button" variant="primary" size="sm" onClick={action.onClick}>` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 98 | Event | `onClick={resetError}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 108 | Event | `onClick={() => window.location.href = '/'}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 135 | Event | `<Button onClick={resetError} size="sm">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/error-boundary.tsx` | 156 | Event | `<Button onClick={() => window.location.reload()} size="sm">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 73 | Event | `onClick={closeOnOverlayClick ? onClose : undefined}` | [DEAD - FUNCTION EMPTY] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 126 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 211 | Event | `onClick={onClose}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modal.tsx` | 218 | Event | `onClick={onConfirm}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modern-stunning-sign-in.tsx` | 198 | Event | `<form onSubmit={handleSignIn} className="space-y-4">` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/modern-stunning-sign-in.tsx` | 264 | Event | `onClick={() => {` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/save-button.tsx` | 30 | Event | `onClick={onSave}` | [WORKING] |
| `d:/projects/Continuum-main-deploy/web/components/ui/save-button.tsx` | 45 | Event | `onClick={onSave}` | [WORKING] |

## AUDIT 8: EXTERNAL SERVICES

| Service | Detected Usage | Env Configured | Status |
|---|---|---|---|

## AUDIT 9: BACKGROUND JOBS & CRON

| Job Provider | Configured | Status |
|---|---|---|
| Redis/Queue | NO | [NOT CONFIGURED] |
| Vercel Cron | Found in vercel.json | [NOT CONFIGURED] |

## AUDIT 10: DATABASE

- **Database Provider**: Prisma
- **Status**: [CONNECTED] PostgreSQL
- **Migrations**: Found prisma/migrations directory.

## RECOMMENDATIONS

Based on this audit, I recommend fixing these things in this priority order:
1. **Provide missing Environment Variables**: Check Audit 3 for missing keys.
2. **Connect Fake API Routes**: Implement the logic for routes marked as [EMPTY FUNCTION].
3. **Wire Dead UI Buttons**: Connect buttons marked [DEAD - FUNCTION EMPTY] to the backend.
4. **Cleanup Orphan Components**: Remove components marked [UNUSED - ORPHAN] in Audit 6 to reduce bundle size.
5. **Remove Unused Dependencies**: Audit 2 found several unused packages in package.json.
