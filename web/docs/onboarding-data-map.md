# Onboarding Data Map

This map follows `chunks/l5/01-company-lifecycle-L5.md` and is the G2 proof that every wizard step has a defined runtime storage target.

| Step | Product Area | Primary DB Fields | Draft Key |
|------|--------------|-------------------|-----------|
| 1 | Company basics | `Company.name`, `Company.timezone`, `Company.work_start`, `Company.work_end`, `Company.grace_period_minutes`, `Company.half_day_hours` | `CompanySettings.hr_alerts.onboarding_draft.steps.1` |
| 2 | Org structure | `Employee.department`, organization defaults in `CompanySettings.hr_alerts` | `onboarding_draft.steps.2` |
| 3 | Approval mapping | `ApprovalHierarchy`, approval config in `CompanySettings.hr_alerts` | `onboarding_draft.steps.3` |
| 4 | Active modules | `CompanySettings.hr_alerts.enabled_modules`, `module_features` | `onboarding_draft.steps.4` |
| 5 | Role structure | `CompanyRole`, role metadata in `CompanySettings.hr_alerts` | `onboarding_draft.steps.5` |
| 6 | Leave types | `LeaveType`, `LeaveBalance` defaults | `onboarding_draft.steps.6` |
| 7 | Role quotas | `CompanySettings.hr_alerts.role_quotas` | `onboarding_draft.steps.7` |
| 8 | Attendance rules | `Company.work_start`, `Company.work_end`, `Company.grace_period_minutes`, `Company.half_day_hours`, attendance policy JSON | `onboarding_draft.steps.8` |
| 9 | Holidays | `Holiday` rows for company | `onboarding_draft.steps.9` |
| 10 | AI and automation | `CompanySettings.hr_alerts.ai`, automation flags | `onboarding_draft.steps.10` |
| 11 | Payroll defaults | payroll defaults in `CompanySettings.hr_alerts` and payroll config tables | `onboarding_draft.steps.11` |
| 12 | Notifications | `CompanySettings.notification_*`, `CompanySettings.hr_alerts.messaging` | `onboarding_draft.steps.12` |
| 13 | Finalize | `Company.onboarding_completed = true`, `Employee.employee_onboarding_completed` where applicable, audit `COMPANY_ONBOARDING_COMPLETE` | none |

API contract:

- `POST /api/onboarding/step/[step]` validates and persists draft state.
- `POST /api/onboarding/finalize` runs the final transaction and flips `Company.onboarding_completed`.
- Mutating HR APIs return `COMPANY_SETUP_INCOMPLETE` while setup is incomplete.
