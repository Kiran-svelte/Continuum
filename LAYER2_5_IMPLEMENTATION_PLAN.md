# 🏗️ LAYERS 2–5 IMPLEMENTATION PLAN
## Continuum Enterprise HR — Layered Build Strategy

> **Layer 1** is declared ~85% complete in `LAYER1_IMPLEMENTATION_PLAN.md`.
> This document defines Layers 2–5, maps each to README requirements, and
> tracks implementation status so every chunk can be verified independently.

---

## How To Use This Document

1. Pick the next ☐ item in the current layer.
2. Implement **only** that item.
3. Run the test suite and compare against the checklist.
4. Mark ✅ when the item is verified end-to-end.
5. Move to the next item.

---

## LAYER 2 — Complete Leave Management Workflows

> **Goal**: Every leave-lifecycle event (apply → approve/reject → cancel) works
> correctly, with accurate balances at all times.

### 2.1 Pro-Rata Balance Seeding on Join
| # | Requirement | File | Status |
|---|-------------|------|--------|
| 2.1.1 | Mid-year joins receive balance = `annual_quota × days_remaining_in_year / days_in_year`, rounded to nearest 0.5-day | `web/app/api/auth/join/route.ts` | ✅ |
| 2.1.2 | Unpaid (LWP) leave types are **not** pro-rated — full quota always granted | `web/app/api/auth/join/route.ts` | ✅ |
| 2.1.3 | Quota of 0 returns 0 (no minimum override) | `web/app/api/auth/join/route.ts` | ✅ |
| 2.1.4 | Gender-filtered leave types skip types not matching the employee gender | `web/app/api/auth/join/route.ts` | ✅ |
| 2.1.5 | `annual_entitlement` column stores the **full** annual quota for reference | `web/app/api/auth/join/route.ts` | ✅ |
| 2.1.6 | `remaining` column stores the **pro-rated** opening balance | `web/app/api/auth/join/route.ts` | ✅ |
| 2.1.7 | Audit log records `balances_pro_rated: true` and the join date | `web/app/api/auth/join/route.ts` | ✅ |
| 2.1.8 | Unit tests: Jan 1 join = full quota, mid-year join < full quota, unpaid = full, 0 quota = 0 | `web/tests/layer2-5.test.ts` | ✅ |

### 2.2 Monthly Leave Accrual (Cron)
| # | Requirement | File | Status |
|---|-------------|------|--------|
| 2.2.1 | EL / PL leave types accrue `annual_entitlement / 12` per month | `web/app/api/cron/leave-accrual/route.ts` | ✅ |
| 2.2.2 | Accrual rounds to nearest 0.5 day | `web/app/api/cron/leave-accrual/route.ts` | ✅ |
| 2.2.3 | Only employees with `status: active | probation` receive accrual | `web/app/api/cron/leave-accrual/route.ts` | ✅ |
| 2.2.4 | Does not over-accrue beyond `annual_entitlement + carried_forward` cap | `web/app/api/cron/leave-accrual/route.ts` | ✅ |
| 2.2.5 | Requires `x-cron-secret` header for security | `web/app/api/cron/leave-accrual/route.ts` | ✅ |
| 2.2.6 | Runs on 1st of each month via Vercel Cron (`0 0 1 * *`) | `web/vercel.json` | ✅ |
| 2.2.7 | Audit log per balance update | `web/app/api/cron/leave-accrual/route.ts` | ✅ |
| 2.2.8 | Errors per employee are collected; others continue | `web/app/api/cron/leave-accrual/route.ts` | ✅ |
| 2.2.9 | Unit tests: rounding, max-cap, zero-quota | `web/tests/layer2-5.test.ts` | ✅ |

### 2.3 Year-End Carry-Forward (Cron)
| # | Requirement | File | Status |
|---|-------------|------|--------|
| 2.3.1 | Creates new-year `LeaveBalance` rows for every active employee | `web/app/api/cron/year-end-carry-forward/route.ts` | ✅ |
| 2.3.2 | Carry-forward amount = `min(effective_remaining, max_carry_forward)` | `web/app/api/cron/year-end-carry-forward/route.ts` | ✅ |
| 2.3.3 | Leave types with `carry_forward = false` contribute 0 carry | `web/app/api/cron/year-end-carry-forward/route.ts` | ✅ |
| 2.3.4 | Pending days are **excluded** from effective remaining before carry-forward | `web/app/api/cron/year-end-carry-forward/route.ts` | ✅ |
| 2.3.5 | Previous-year `remaining` zeroed; `used_days`/`pending_days` preserved | `web/app/api/cron/year-end-carry-forward/route.ts` | ✅ |
| 2.3.6 | Idempotent — skips if new-year balance already exists | `web/app/api/cron/year-end-carry-forward/route.ts` | ✅ |
| 2.3.7 | Runs Jan 1 via Vercel Cron (`0 1 1 1 *`) | `web/vercel.json` | ✅ |
| 2.3.8 | Audit log per carry-forward | `web/app/api/cron/year-end-carry-forward/route.ts` | ✅ |
| 2.3.9 | Unit tests: cap, disabled carry, pending-day subtraction, zero-remaining | `web/tests/layer2-5.test.ts` | ✅ |

### 2.4 Leave Submission — Remaining Work
| # | Requirement | Status |
|---|-------------|--------|
| 2.4.1 | Constraint rule preview shown before submit (UI) | ✅ Already in `request-leave/page.tsx` |
| 2.4.2 | Dynamic leave type list from DB (not hardcoded) | ✅ Already in `request-leave/page.tsx` (`/api/company/leave-types`) |
| 2.4.3 | Half-day support in submit flow | ✅ Already implemented |
| 2.4.4 | Balance validation before submission | ✅ Constraint engine RULE002 |
| 2.4.5 | Manager auto-fill from approval hierarchy | ☐ TODO: implement approval-hierarchy query in submit |

---

## LAYER 3 — Notifications & Post-Onboarding Setup

> **Goal**: Companies get fully initialised with billing, notification templates,
> and settings the moment onboarding completes.

### 3.1 Free-Tier Subscription on Register
| # | Requirement | File | Status |
|---|-------------|------|--------|
| 3.1.1 | `Subscription` record created with `plan: free`, `status: trial` on company register | `web/app/api/auth/register/route.ts` | ✅ |
| 3.1.2 | 30-day trial period: `current_period_start` = now, `current_period_end` = now + 30d | `web/app/api/auth/register/route.ts` | ✅ |
| 3.1.3 | Subscription is linked to `company_id` | `web/app/api/auth/register/route.ts` | ✅ |
| 3.1.4 | Plan-gating middleware / billing APIs can read this record | Via `prisma.subscription.findFirst` | ☐ TODO: billing gate middleware |

### 3.2 Default Notification Templates on Onboarding
| # | Requirement | File | Status |
|---|-------------|------|--------|
| 3.2.1 | `NotificationTemplate` rows seeded for all core events when onboarding completes | `web/app/api/onboarding/complete/route.ts` | ✅ |
| 3.2.2 | Seeding is idempotent — skipped if templates already exist | `web/app/api/onboarding/complete/route.ts` | ✅ |
| 3.2.3 | Templates defined in a typed config file | `web/lib/notification-templates-config.ts` | ✅ |
| 3.2.4 | Core events covered: `LEAVE_SUBMITTED`, `LEAVE_APPROVED`, `LEAVE_REJECTED`, `LEAVE_CANCELLED`, `LEAVE_SLA_BREACH`, `LEAVE_PENDING_MANAGER` | `web/lib/notification-templates-config.ts` | ✅ |
| 3.2.5 | Employee events: `EMPLOYEE_REGISTRATION_PENDING`, `EMPLOYEE_REGISTRATION_APPROVED` | `web/lib/notification-templates-config.ts` | ✅ |
| 3.2.6 | Channels: `email`, `push`, `in_app` for appropriate events | `web/lib/notification-templates-config.ts` | ✅ |
| 3.2.7 | Templates use `{{variable}}` placeholders | `web/lib/notification-templates-config.ts` | ✅ |
| 3.2.8 | HR can edit templates at `/hr/notification-templates` | `web/app/hr/(main)/` | ☐ TODO: notification-templates page |
| 3.2.9 | Unit tests: all required events present, no duplicates, valid channels | `web/tests/layer2-5.test.ts` | ✅ |

### 3.3 Email Notifications — Wiring to Templates
| # | Requirement | Status |
|---|-------------|--------|
| 3.3.1 | Email service reads `NotificationTemplate` from DB instead of hardcoded strings | ☐ TODO |
| 3.3.2 | Placeholder interpolation: `{{employee_name}}` → actual name | ☐ TODO |
| 3.3.3 | Email sent on `LEAVE_APPROVED` and `LEAVE_REJECTED` events | ☐ TODO: wire into approve/reject routes |

### 3.4 Real-Time Pusher Events
| # | Requirement | Status |
|---|-------------|--------|
| 3.4.1 | Pusher event fired on `LEAVE_SUBMITTED` to HR channel | ☐ TODO |
| 3.4.2 | Pusher event fired on `LEAVE_APPROVED/REJECTED` to employee user channel | ☐ TODO |
| 3.4.3 | Notification bell count incremented via Pusher in employee dashboard | Pusher client partially wired |

---

## LAYER 4 — Advanced HR Features

> **Goal**: HR users have the full toolbox: payroll, attendance, reports, bulk actions.

### 4.1 Payroll Run
| # | Requirement | Status |
|---|-------------|--------|
| 4.1.1 | `POST /api/hr/payroll/generate` — generate `PayrollRun` for a month | ☐ TODO |
| 4.1.2 | Per-employee `PayrollSlip` created with CTC breakdown (basic + HRA + PF + ESI) | ☐ TODO |
| 4.1.3 | India tax calculations applied (TDS, PF, ESI) using `lib/india-tax.ts` | `lib/india-tax.ts` exists |
| 4.1.4 | LWP (Leave Without Pay) days deducted from salary | ☐ TODO |
| 4.1.5 | HR can view payslips at `/hr/payroll` | Page exists, API incomplete |
| 4.1.6 | Employee can view own payslip at `/employee/payslips` | Page exists |

### 4.2 Reports & Analytics
| # | Requirement | Status |
|---|-------------|--------|
| 4.2.1 | `GET /api/reports/leave-summary` — company-wide leave stats | ☐ TODO |
| 4.2.2 | `GET /api/reports/attendance` — attendance summary by department | ☐ TODO |
| 4.2.3 | CSV/PDF export of leave records | `lib/report-export.ts` exists |
| 4.2.4 | HR dashboard team availability heatmap | ☐ TODO: UI component |

### 4.3 Document Management
| # | Requirement | Status |
|---|-------------|--------|
| 4.3.1 | Employee uploads medical certificate / supporting doc via `/employee/documents` | Page exists |
| 4.3.2 | `POST /api/documents/upload` — store file reference in DB | ☐ TODO: verify endpoint |
| 4.3.3 | HR can verify / reject documents | ☐ TODO |

### 4.4 Bulk Leave Operations
| # | Requirement | Status |
|---|-------------|--------|
| 4.4.1 | `POST /api/leaves/bulk-approve` — batch approve with audit trail | `/api/leaves/bulk-approve` exists |
| 4.4.2 | HR can cancel any pending leave with reason | `/api/leaves/cancel` exists |
| 4.4.3 | Balance adjustment UI for HR (`leave.adjust_balance` permission) | ☐ TODO: UI form |

---

## LAYER 5 — Enterprise Polish & Production Readiness

> **Goal**: The system is production-grade: hardened, observable, SEO-friendly,
> and mobile-responsive.

### 5.1 UI/UX Polish
| # | Requirement | Status |
|---|-------------|--------|
| 5.1.1 | Skeleton screens on all data-heavy pages | Partially done |
| 5.1.2 | Optimistic UI on leave submit / approve | Partially done |
| 5.1.3 | Mobile-responsive layouts (sidebar collapse, touch targets) | ☐ TODO |
| 5.1.4 | Empty states with helpful guidance (not just "No data") | ☐ TODO |
| 5.1.5 | Error boundaries on all portal pages | Some exist |

### 5.2 Security Hardening
| # | Requirement | Status |
|---|-------------|--------|
| 5.2.1 | OTP verification for critical HR settings changes | `lib/otp-service.ts` exists |
| 5.2.2 | API key management for external integrations | ☐ TODO |
| 5.2.3 | GDPR export endpoint (`GET /api/hr/compliance/export`) | ☐ TODO |
| 5.2.4 | Audit log SHA-256 chain verified on export | ☐ TODO |

### 5.3 Observability
| # | Requirement | Status |
|---|-------------|--------|
| 5.3.1 | Prometheus metrics endpoint (`/api/enterprise/metrics`) | `lib/enterprise/metrics.ts` exists |
| 5.3.2 | Structured JSON logs for all API errors | `lib/enterprise/logger.ts` exists |
| 5.3.3 | Health endpoint at `/api/health` returns DB, engine, email status | `/api/health` exists |

### 5.4 SEO & Marketing
| # | Requirement | Status |
|---|-------------|--------|
| 5.4.1 | `sitemap.ts` covering all public pages | `app/sitemap.ts` exists |
| 5.4.2 | `robots.txt` correctly excludes portal routes | ☐ TODO |
| 5.4.3 | Landing page Open Graph meta tags | ☐ TODO |
| 5.4.4 | Status page at `/status` shows service health | `/status` page exists |

### 5.5 Performance
| # | Requirement | Status |
|---|-------------|--------|
| 5.5.1 | Database queries use `select` to limit columns (no `SELECT *`) | Mostly done |
| 5.5.2 | API responses use `Cache-Control` for public / semi-public data | ☐ TODO |
| 5.5.3 | Images optimised with Next.js `<Image>` | ☐ TODO |

---

## Verification Checklist Summary

Run after each chunk to confirm it is enterprise-ready:

- [ ] Unit tests pass: `cd web && npx tsx --test tests/*.test.ts`
- [ ] Python engine tests pass: `cd web/backend && python -m pytest test_constraint_rules.py -v`
- [ ] No TypeScript errors (install `typescript` and run `tsc --noEmit`)
- [ ] Cron routes return 401 without `x-cron-secret`
- [ ] New database rows appear in correct tables after relevant API calls
- [ ] Audit log entries are created for every state-changing action
- [ ] Pro-rata calculation gives expected values for Jan 1, Jul 1, Dec 30 join dates
- [ ] Notification templates exist for all 8 core events after onboarding
- [ ] Subscription record exists with `plan: free` after company register
