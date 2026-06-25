# Onboarding Data Map

This document maps each onboarding wizard step to the database fields it reads and writes, and defines the completion contract.

## Completion Contract

The `Company.onboarding_completed` flag is set to `true` only when all required steps have been validated and saved via `POST /api/onboarding/complete`.

Before completion:
- `CompanySettings.hr_alerts.onboarding_draft` holds in-progress step state.
- Incomplete setup triggers `COMPANY_SETUP_INCOMPLETE` guard in middleware and API routes.

## Step → Field Map

| Step | Name | DB Fields Written |
|------|------|-------------------|
| 1 | Company Basics | `Company.name`, `Company.industry`, `Company.timezone`, `Company.fiscal_year_start`, `CompanySettings.work_schedule` |
| 2 | Org Structure | `Department[]`, `Location[]`, `CompanySettings.org_structure` |
| 3 | Approval Mapping | `CompanySettings.approval_chain`, `CompanySettings.hr_alerts.approval_config` |
| 4 | Active Modules | `Company.enabled_modules`, `CompanySettings.module_cap` |
| 5 | Role Structure | `CompanySettings.role_structure`, `CompanySettings.hr_alerts.onboarding_draft.roles` |
| 6 | Leave Types | `LeaveType[]`, `CompanySettings.hr_alerts.onboarding_draft.leave_types` |
| 7 | Role Quotas | `LeaveBalance[]`, `CompanySettings.hr_alerts.onboarding_draft.role_quotas` |
| 8 | Attendance Rules | `LeaveRule[]` (constraint rules), `CompanySettings.hr_alerts.onboarding_draft.attendance` |
| 9 | Holidays | `Holiday[]`, `CompanySettings.hr_alerts.onboarding_draft.holidays` |
| 10 | AI & Automation | `CompanySettings.auto_approve_threshold`, `CompanySettings.hr_alerts.onboarding_draft.automation` |
| 11 | Payroll Defaults | `CompanySettings.payroll_defaults`, `CompanySettings.hr_alerts.onboarding_draft.payroll` |
| 12 | Notifications | `CompanySettings.notification_preferences`, `CompanySettings.hr_alerts.onboarding_draft.notifications` |
| 13 | Finalize Setup | `Company.onboarding_completed = true`, clears `CompanySettings.hr_alerts.onboarding_draft` |

## Completion Guards

- `Company.onboarding_completed` must be `false` for the wizard to be accessible.
- Steps 1–12 validate required fields before allowing progression to step 13.
- `POST /api/onboarding/complete` validates all required drafts before setting `Company.onboarding_completed = true`.
- If validation fails, returns `COMPANY_SETUP_INCOMPLETE` error code.

## Cookie State

The middleware reads `COOKIE_ONBOARDING` (set by `/api/auth/me`, `/api/auth/signin`, and `/api/auth/refresh`) to gate access to the HR/admin portal until `Company.onboarding_completed = true`.

## Related Contracts

- `lib/onboarding-step-contract.ts` — Zod schemas for each step payload
- `lib/onboarding-step-payload-normalizer.ts` — canonical normalization
- `lib/onboarding-readiness.ts` — readiness check helpers
- `CompanySettings.hr_alerts.onboarding_draft` — in-progress draft state
- `COMPANY_SETUP_INCOMPLETE` — error code returned by API and middleware when setup is incomplete
