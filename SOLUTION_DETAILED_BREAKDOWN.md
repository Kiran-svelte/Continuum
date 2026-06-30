# SOLUTION DETAILED BREAKDOWN
## Every Component Needed for Each Issue

**Cross-Reference**: CRITICAL_WORKFLOW_ISSUES_AUDIT.md, SOLUTION_MASTER_INDEX.md

---

# SEC-001: CSP Fix (Content Security Policy)

## Components Required

### Backend
| File | Type | Action | Lines | Description |
|------|------|--------|-------|-------------|
| `web/middleware.ts` | Modify | Update | ~30 | Fix CSP directives, remove conflicts |
| `web/next.config.ts` | Modify | Add | ~20 | Add CSP report-only header |
| `web/lib/csp-nonce.ts` | Create | New | ~40 | Nonce generation utility |

### Configuration
| File | Type | Action | Lines |
|------|------|--------|-------|
| `web/.env.example` | Modify | Add | ~5 |
| `.env` | Update | Add | ~5 |

### Testing
| File | Type | Lines |
|------|------|-------|
| `web/tests/security/csp.test.ts` | Create | ~80 |

### Documentation
| File | Type | Lines |
|------|------|-------|
| `docs/security/csp-configuration.md` | Create | ~100 |

**Affected Routes**: ALL (global middleware)  
**Affected Pages**: ALL (CSP applies to all pages)

---

# SEC-002: RBAC Permission Enforcement

## Components Required

### Backend Services
| File | Type | Action | Lines | Description |
|------|------|--------|-------|-------------|
| `web/lib/api-permission-guard.ts` | Create | New | ~120 | Permission check middleware |
| `web/lib/rbac.ts` | Modify | Enhance | ~50 | Add permission resolution logic |
| `web/lib/audit-logger.ts` | Modify | Add | ~40 | Log permission failures |

### API Routes to Update (15 files)
| Route | Add Guard | Permission Required |
|-------|-----------|---------------------|
| `web/app/api/payroll/route.ts` | ✅ | `payroll.view_all` |
| `web/app/api/payroll/generate/route.ts` | ✅ | `payroll.generate` |
| `web/app/api/payroll/approve/[id]/route.ts` | ✅ | `payroll.approve` |
| `web/app/api/hr/settings/route.ts` | ✅ | `company.edit_settings` |
| `web/app/api/hr/policy/route.ts` | ✅ | `company.manage_policies` |
| `web/app/api/hr/adjust-balance/route.ts` | ✅ | `leave.adjust_balance` |
| `web/app/api/employees/[id]/route.ts` | ✅ | `employee.edit_any` |
| `web/app/api/attendance/override/route.ts` | ✅ | `attendance.override` |
| `web/app/api/performance/goals/route.ts` | ✅ | `performance.manage_goals` |
| `web/app/api/performance/reviews/route.ts` | ✅ | `performance.manage_reviews` |
| `web/app/api/compensation/cycles/route.ts` | ✅ | `compensation.manage_cycles` |
| `web/app/api/recruitment/postings/route.ts` | ✅ | `recruitment.create_posting` |
| `web/app/api/lms/courses/route.ts` | ✅ | `lms.manage_courses` |
| `web/app/api/expenses/approve/[id]/route.ts` | ✅ | `expenses.approve` |
| `web/app/api/reports/export/route.ts` | ✅ | `reports.export` |

### Middleware Enhancement
| File | Type | Lines | Description |
|------|------|-------|-------------|
| `web/middleware.ts` | Modify | ~60 | Add module-level gating |
| `web/lib/middleware-module-paths.ts` | Enhance | ~30 | Map paths to modules |

### UI Components
| File | Type | Lines | Description |
|------|------|-------|-------------|
| `web/app/(portals)/access-denied/page.tsx` | Create | ~80 | Access denied page |
| `web/components/permission-gate.tsx` | Create | ~50 | Client-side permission check |

### Testing
| File | Lines |
|------|-------|
| `web/tests/security/rbac-enforcement.test.ts` | ~200 |
| `web/tests/security/api-permission-guards.test.ts` | ~150 |

**Affected Routes**: 15+ API routes  
**Affected Pages**: ALL (module gating)

---

# SEC-003: Environment Configuration

## Components Required

### Backend
| File | Type | Lines | Description |
|------|------|-------|-------------|
| `web/lib/env-validator.ts` | Create | ~180 | Zod-based validation |
| `web/lib/startup-checks.ts` | Create | ~120 | Health checks |
| `web/instrumentation.ts` | Create | ~40 | Server startup hook |

### Configuration
| File | Type | Lines |
|------|------|-------|
| `web/.env.example` | Rewrite | ~200 |
| `docs/deployment/env-vars.md` | Create | ~300 |

### Testing
| File | Lines |
|------|-------|
| `web/tests/config/env-validation.test.ts` | ~100 |

**Affected**: Entire application startup

---

# DATA-001: Database Concurrency Fix

## Components Required

### Backend Services
| File | Type | Action | Lines | Description |
|------|------|--------|-------|-------------|
| `web/lib/services/leave-submit.ts` | Modify | Fix | ~50 | Add transaction + lock |
| `web/lib/services/leave-approve.ts` | Modify | Verify | ~30 | Ensure locking works |
| `web/lib/services/leave-balance-update.ts` | Create | New | ~100 | Centralized balance updates |

### Database
| File | Type | Lines |
|------|------|-------|
| `web/prisma/migrations/*_add_balance_locks.sql` | Create | ~20 |

### Testing
| File | Lines | Description |
|------|-------|-------------|
| `web/tests/concurrency/leave-balance.test.ts` | ~150 | Race condition tests |

**Affected API Routes**:
- `POST /api/leaves`
- `PATCH /api/leaves/[id]/approve`
- `POST /api/hr/adjust-balance`

---

# DATA-002: Backup & Disaster Recovery

## Components Required

### Backend Services
| File | Type | Lines | Description |
|------|------|-------|-------------|
| `web/lib/enterprise/backup-service.ts` | Rewrite | ~400 | Core backup logic |
| `web/lib/enterprise/backup-scheduler.ts` | Create | ~150 | Cron scheduling |
| `web/lib/enterprise/backup-encryption.ts` | Create | ~200 | AES-256-GCM encryption |
| `web/lib/enterprise/backup-storage.ts` | Create | ~180 | S3-compatible storage |
| `web/lib/enterprise/restore-service.ts` | Create | ~350 | Point-in-time restore |

### Database Schema
| Migration | Lines | Description |
|-----------|-------|-------------|
| `*_backup_records.sql` | ~80 | BackupRecord table |
| `*_backup_metadata.sql` | ~60 | BackupMetadata table |
| `*_restore_logs.sql` | ~70 | RestoreLog table |

### API Routes
| Route | Method | Lines | Description |
|-------|--------|-------|-------------|
| `web/app/api/admin/backups/route.ts` | GET/POST | ~120 | List/create backups |
| `web/app/api/admin/backups/[id]/route.ts` | GET | ~80 | Get backup details |
| `web/app/api/admin/backups/[id]/restore/route.ts` | POST | ~150 | Restore from backup |
| `web/app/api/admin/backups/verify/route.ts` | POST | ~100 | Test restore |
| `web/app/api/cron/backup-daily/route.ts` | POST | ~80 | Scheduled backup |

### UI Pages
| Page | Lines | Description |
|------|-------|-------------|
| `web/app/(portals)/admin/(main)/backups/page.tsx` | ~250 | Backup dashboard |
| `web/app/(portals)/admin/(main)/backups/[id]/page.tsx` | ~180 | Backup details |

### Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `web/components/admin/backup-list.tsx` | ~120 | Backup list table |
| `web/components/admin/backup-create-dialog.tsx` | ~100 | Manual backup trigger |
| `web/components/admin/restore-dialog.tsx` | ~150 | Restore confirmation |

### Configuration
| File | Lines |
|------|-------|
| `.env.example` (backup section) | ~25 |
| `docs/admin/backup-restore.md` | ~500 |

### Testing
| File | Lines |
|------|-------|
| `web/tests/enterprise/backup-service.test.ts` | ~250 |
| `web/tests/enterprise/restore-service.test.ts` | ~200 |

**Affected Routes**: 5 new API routes  
**Affected Pages**: 2 new admin pages

---

# CORE-001: Performance Management Module (COMPLETE)

## Database Schema

### Migrations Required
| Migration | Tables | Lines |
|-----------|--------|-------|
| `*_performance_mgmt.sql` | Goal, ReviewCycle, ReviewInstance, PerformanceReviewComment | ~300 |

### Schema Changes (verify in schema.prisma)
```prisma
model Goal { ... } // Already exists - verify fields
model ReviewCycle { ... } // Already exists
model ReviewInstance { ... } // Already exists
model PerformanceReviewComment { ... } // Already exists
```

## Backend Services

### Core Logic
| File | Lines | Description |
|------|-------|-------------|
| `web/lib/performance/goal-engine.ts` | ~250 | Goal CRUD + alignment |
| `web/lib/performance/review-engine.ts` | ~300 | Review cycle management |
| `web/lib/performance/rating-calculator.ts` | ~150 | Rating aggregation |
| `web/lib/performance/calibration-engine.ts` | ~200 | Cross-team calibration |

### API Routes (18 routes)
| Route | Method | Lines | Permission |
|-------|--------|-------|------------|
| `web/app/api/performance/goals/route.ts` | GET/POST | ~150 | `performance.manage_goals` |
| `web/app/api/performance/goals/[id]/route.ts` | GET/PATCH/DELETE | ~120 | `performance.manage_goals` |
| `web/app/api/performance/goals/[id]/progress/route.ts` | PATCH | ~80 | Self or manager |
| `web/app/api/performance/goals/my/route.ts` | GET | ~60 | Self |
| `web/app/api/performance/goals/team/route.ts` | GET | ~80 | Team lead+ |
| `web/app/api/performance/cycles/route.ts` | GET/POST | ~140 | `performance.manage_reviews` |
| `web/app/api/performance/cycles/[id]/route.ts` | GET/PATCH | ~100 | HR/Admin |
| `web/app/api/performance/cycles/[id]/start/route.ts` | POST | ~90 | HR/Admin |
| `web/app/api/performance/cycles/[id]/close/route.ts` | POST | ~80 | HR/Admin |
| `web/app/api/performance/reviews/route.ts` | GET | ~100 | Based on role |
| `web/app/api/performance/reviews/[id]/route.ts` | GET/PATCH | ~120 | Reviewer |
| `web/app/api/performance/reviews/[id]/submit/route.ts` | POST | ~100 | Reviewer |
| `web/app/api/performance/reviews/[id]/acknowledge/route.ts` | POST | ~70 | Employee |
| `web/app/api/performance/reviews/my/route.ts` | GET | ~60 | Self |
| `web/app/api/performance/reviews/pending/route.ts` | GET | ~80 | Manager |
| `web/app/api/performance/calibration/[cycleId]/route.ts` | GET/POST | ~150 | Director+ |
| `web/app/api/performance/reports/distribution/route.ts` | GET | ~100 | HR/Admin |
| `web/app/api/performance/reports/goal-completion/route.ts` | GET | ~90 | HR/Admin |

## UI Pages (12 pages)

### HR Portal Pages
| Page | Lines | Description |
|------|-------|-------------|
| `web/app/(portals)/hr/(main)/performance/page.tsx` | ~200 | Performance dashboard |
| `web/app/(portals)/hr/(main)/performance/goals/page.tsx` | ~250 | Company goals list |
| `web/app/(portals)/hr/(main)/performance/goals/new/page.tsx` | ~180 | Create goal |
| `web/app/(portals)/hr/(main)/performance/cycles/page.tsx` | ~220 | Review cycles list |
| `web/app/(portals)/hr/(main)/performance/cycles/new/page.tsx` | ~200 | Create review cycle |
| `web/app/(portals)/hr/(main)/performance/cycles/[id]/page.tsx` | ~280 | Cycle details + monitoring |
| `web/app/(portals)/hr/(main)/performance/calibration/[cycleId]/page.tsx` | ~300 | Rating calibration UI |

### Manager Portal Pages
| Page | Lines | Description |
|------|-------|-------------|
| `web/app/(portals)/manager/(main)/performance/page.tsx` | ~180 | Team performance dashboard |
| `web/app/(portals)/manager/(main)/performance/reviews/[id]/page.tsx` | ~250 | Complete review form |

### Employee Portal Pages
| Page | Lines | Description |
|------|-------|-------------|
| `web/app/(portals)/employee/(main)/performance/page.tsx` | ~200 | My performance |
| `web/app/(portals)/employee/(main)/performance/goals/page.tsx` | ~180 | My goals |
| `web/app/(portals)/employee/(main)/performance/reviews/[id]/page.tsx` | ~220 | Self-review form |

## Components (25+ components)

### Goal Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `web/components/performance/goal-card.tsx` | ~80 | Goal display card |
| `web/components/performance/goal-form.tsx` | ~150 | Create/edit goal |
| `web/components/performance/goal-tree.tsx` | ~120 | Hierarchical goal view |
| `web/components/performance/goal-progress-bar.tsx` | ~60 | Progress indicator |
| `web/components/performance/goal-alignment-diagram.tsx` | ~100 | OKR cascade view |

### Review Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `web/components/performance/review-form.tsx` | ~200 | Review submission form |
| `web/components/performance/rating-selector.tsx` | ~80 | 1-5 star rating |
| `web/components/performance/review-timeline.tsx` | ~100 | Cycle timeline |
| `web/components/performance/review-status-badge.tsx` | ~40 | Status indicator |
| `web/components/performance/review-comments.tsx` | ~120 | Comment thread |

### Calibration Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `web/components/performance/calibration-grid.tsx` | ~180 | 9-box grid |
| `web/components/performance/rating-distribution-chart.tsx` | ~100 | Bell curve chart |
| `web/components/performance/calibration-employee-card.tsx` | ~90 | Employee in grid |

### Dashboard Components
| Component | Lines | Description |
|-----------|-------|-------------|
| `web/components/performance/performance-summary.tsx` | ~120 | KPI summary |
| `web/components/performance/goal-completion-chart.tsx` | ~80 | Recharts pie chart |
| `web/components/performance/review-progress-tracker.tsx` | ~100 | Cycle progress |

## Testing
| File | Lines |
|------|-------|
| `web/tests/performance/goal-engine.test.ts` | ~200 |
| `web/tests/performance/review-engine.test.ts` | ~250 |
| `web/tests/performance/calibration.test.ts` | ~150 |
| `web/tests/performance/api-routes.test.ts` | ~300 |

## Documentation
| File | Lines |
|------|-------|
| `docs/modules/performance-management.md` | ~600 |
| `docs/user-guides/goal-setting.md` | ~400 |
| `docs/user-guides/performance-reviews.md` | ~500 |

**Summary**: 18 API routes, 12 pages, 25+ components, 900+ tests, 1500+ docs

