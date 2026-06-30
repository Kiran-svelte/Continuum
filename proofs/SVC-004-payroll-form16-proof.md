# SVC-004 Payroll Form 16 Proof

Proof identifier: `CWA-20260630-PAYROLL-FORM16`

Date: 2026-06-30

## Scope

This proof covers the Form 16 payroll/tax slice for:

- `SVC-004`: Payroll Processing
- `SVC-031`: Tax Filing

It does not mark the whole payroll or tax filing services complete.

## Implemented Files

- `web/app/api/payroll/form-16/route.ts`
- `web/tests/critical-workflow-services.test.ts`
- `CRITICAL_WORKFLOW_REMEDIATION_REPORT.md`
- `LOOP_STATE.json`
- `tasks/todo.md`
- `docs/activity.md`

## Behavior Verified

- Generates a PDF Form 16 summary for a requested financial year.
- Defaults to the current Indian financial year when `fy_start_year` is omitted.
- Enforces company context and the payroll module.
- Requires `payroll.view_own` for employee self-service downloads.
- Requires `payroll.view_all` for HR/admin downloads for another employee.
- Filters payroll slips by `company_id`, `emp_id`, and financial-year month ranges.
- Includes PAN, employee code, gross salary, allowances, deductions, professional tax, and TDS.
- Writes a `DATA_EXPORT` audit log.
- Returns PDF responses with no-store cache controls.

## Commands Run

```bash
cd web
npx tsc --noEmit --pretty false --incremental false
npx tsx --test tests/critical-workflow-stabilization.test.ts tests/critical-workflow-rbac.test.ts tests/critical-workflow-services.test.ts tests/security-channel.test.ts tests/continuum-assistant-v1-headless.test.ts
npm run build
npx eslint app/api/payroll/form-16/route.ts tests/critical-workflow-services.test.ts
```

## Result

- TypeScript: passed.
- Focused critical workflow test suite: passed 34/34.
- Production build: passed with `/api/payroll/form-16` generated.
- Scoped ESLint for the new route and regression test: passed.

## Remaining Gaps

- Payroll still needs real bank submission and acknowledgement tracking.
- Payroll still needs a CTC restructuring UI/API.
- Tax filing still needs official TRACES/digital-signature filing and acknowledgement tracking.
- Repo-wide `npm run lint` still fails on existing lint debt outside this slice.
