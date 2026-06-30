# COMPLETE SOLUTION MAPPING - Continuum HRMS
## Enterprise-Grade Implementation with Full Configurability

**Version**: 4.0 ENTERPRISE EDITION  
**Date**: 2026-06-30  
**Scope**: ALL 64 Enterprise HRMS Services  
**Architecture**: Multi-tenant, Plan-based, Fully Configurable  
**Cross-Reference**: CRITICAL_WORKFLOW_ISSUES_AUDIT.md

---

## ENTERPRISE ARCHITECTURE PRINCIPLES

### 🎯 Core Principles
1. **Everything is Configurable** - No hardcoded business rules
2. **Plan-Based Feature Gating** - Free → Starter → Growth → Enterprise
3. **Super Admin Controls** - Module enable/disable, feature flags
4. **Zero Breaking Changes** - Progressive enhancement, backwards compatible
5. **User-Friendly UX** - Guided workflows, smart defaults, contextual help
6. **Multi-tenant Isolation** - Complete data separation
7. **Progressive Disclosure** - Show complexity only when needed

### 🏗️ Configuration Layers

```
┌─────────────────────────────────────────────────────────┐
│ LAYER 1: Platform Configuration (Super Admin)          │
│ - Create companies                                      │
│ - Assign subscription plans                             │
│ - Set module entitlements                               │
│ - Configure platform-wide settings                      │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 2: Company Configuration (Admin/HR)              │
│ - Enable/disable modules                                │
│ - Configure module settings                             │
│ - Set company policies                                  │
│ - Customize workflows                                   │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 3: Department Configuration (Managers)           │
│ - Department-specific rules                             │
│ - Team workflows                                        │
│ - Approval chains                                       │
└─────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────┐
│ LAYER 4: Employee Preferences (End Users)              │
│ - Notification preferences                              │
│ - Display settings                                      │
│ - Privacy controls                                      │
└─────────────────────────────────────────────────────────┘
```

### 📦 Subscription Plans & Feature Matrix

| Feature | Free | Starter | Growth | Enterprise |
|---------|------|---------|--------|------------|
| **Max Employees** | 10 | 50 | 200 | Unlimited |
| **Leave Management** | ✅ Basic | ✅ Full | ✅ Full | ✅ Full |
| **Attendance** | ✅ Manual | ✅ Basic | ✅ Biometric | ✅ Advanced |
| **Payroll** | ❌ | ✅ Basic | ✅ Full | ✅ Multi-currency |
| **Performance** | ❌ | ❌ | ✅ Full | ✅ 360° + AI |
| **Recruitment** | ❌ | ✅ 5 jobs | ✅ Unlimited | ✅ + Careers Page |
| **LMS** | ❌ | ❌ | ✅ Basic | ✅ SCORM + Certs |
| **Compensation** | ❌ | ❌ | ❌ | ✅ Full |
| **Analytics** | Basic | Standard | Advanced | Custom + API |
| **AI Assistant** | ❌ | ✅ Limited | ✅ Full | ✅ + Custom Training |
| **WhatsApp** | ❌ | ❌ | ✅ | ✅ |
| **API Access** | ❌ | Read-only | Full | Full + Webhooks |
| **Support** | Community | Email | Priority | Dedicated |
| **Data Retention** | 1 year | 3 years | 7 years | Custom |
| **Backup** | ❌ | Weekly | Daily | Hourly + Multi-region |

---

## DOCUMENT STRUCTURE

This document maps out the complete implementation for Continuum HRMS to reach 100% enterprise functionality. Each service includes:

✅ Database schema with configuration tables  
✅ API routes (with methods, permissions & plan checks)  
✅ UI pages (with route paths & conditional rendering)  
✅ React components (with feature flags)  
✅ Backend services/engines (configurable rules)  
✅ Configuration UI for admins  
✅ Tests (including plan-based scenarios)  
✅ Documentation (setup guides)  

**Total Scope**: 64 Services | ~350 Pages | ~500 API Routes | ~800 Components | ~100 Config Settings

---

## MASTER SERVICE INVENTORY

### 🟢 COMPLETED SERVICES (9 - Keep as-is, minor fixes only)
1. [SVC-001] Employee Lifecycle Management (75%)
2. [SVC-002] Leave & Absence Management (95%)
3. [SVC-003] Attendance & Time Tracking (85%)
4. [SVC-011] Organizational Structure (80%)
5. [SVC-012] Role-Based Access Control (90%)
6. [SVC-017] Employee Portal (60%)
7. [SVC-025] Notifications (60%)
8. [SVC-026] Real-time Updates (85%)
9. [SVC-036] Authentication (90%)

### 🟡 PARTIAL SERVICES (10 - Complete missing parts)
10. [SVC-004] Payroll Processing (50%)
11. [SVC-008] Talent Acquisition/ATS (40%)
12. [SVC-013] Workflow Engine (70%)
13. [SVC-014] Document Management (45%)
14. [SVC-021] Payslip Access (40%)
15. [SVC-027] WhatsApp Integration (70%)
16. [SVC-037] Authorization/RBAC (90%)
17. [SVC-038] Audit Logging (40%)
18. [SVC-039] Data Encryption (50%)
19. [SVC-045] Leave Utilization Reports (20%)

### 🔴 MISSING SERVICES (45 - Build from scratch)
20. [SVC-005] Performance Management (5%)
21. [SVC-006] Compensation Planning (10%)
22. [SVC-007] Succession Planning (0%)
23. [SVC-009] Learning & Development/LMS (10%)
24. [SVC-010] Workforce Analytics (10%)
25. [SVC-015] Policy Management (20%)
26. [SVC-016] Compliance Tracking (35%)
27. [SVC-018] Personal Info Management (30%)
28. [SVC-019] Tax Declaration Portal (0%)
29. [SVC-020] Document Upload (25%)
30. [SVC-022] Reimbursement Claims (15%)
31. [SVC-023] Time-off Calendar (50%)
32. [SVC-024] Goal Setting (0%)
33. [SVC-028] Employee Surveys (0%)
34. [SVC-029] Announcement System (0%)
35. [SVC-030] Payroll Engine (50%)
36. [SVC-031] Tax Filing (10%)
37. [SVC-032] Expense Management (15%)
38. [SVC-033] Travel Management (15%)
39. [SVC-034] Advance & Loans (0%)
40. [SVC-035] Benefits Administration (0%)
41. [SVC-040] Backup & Recovery (0%)
42. [SVC-041] Data Retention Policies (10%)
43. [SVC-042] GDPR Compliance (25%)
44. [SVC-043] Headcount Reports (10%)
45. [SVC-044] Attrition Analysis (0%)
46. [SVC-046] Payroll Cost Reports (10%)
47. [SVC-047] Attendance Patterns (15%)
48. [SVC-048] Diversity Metrics (0%)
49. [SVC-049] Multi-tenant Management (95%)
50. [SVC-050] Company Onboarding (80%)
51. [SVC-051] User Provisioning (70%)
52. [SVC-052] Bulk Operations (20%)
53. [SVC-053] Integration Hub (30%)
54. [SVC-054] Custom Fields (0%)
55. [SVC-055] Workflow Templates (25%)
56. [SVC-056] Email Templates (40%)
57. [SVC-057] AI Assistant (70%)
58. [SVC-058] Chatbot (35%)
59. [SVC-059] Predictive Analytics (5%)
60. [SVC-060] Workforce Planning (0%)
61. [SVC-061] Sentiment Analysis (0%)
62. [SVC-062] Skill Matrix (0%)
63. [SVC-063] Career Path Planning (0%)
64. [SVC-064] Automated Scheduling (0%)

---

# COMPLETE IMPLEMENTATION BREAKDOWN



---

## 🎛️ CONFIGURATION FRAMEWORK (Foundation)

Before implementing any service, establish the configuration framework:

### CFG-001: Configuration Schema

#### Database Tables (Core Configuration)
```prisma
model PlatformConfig {
  id                String   @id @default(uuid())
  key               String   @unique
  value             Json
  description       String
  category          String   // subscription | feature | system
  updated_at        DateTime @updatedAt
  updated_by        String
}

model SubscriptionPlan {
  id                String   @id @default(uuid())
  name              String   // free | starter | growth | enterprise
  display_name      String
  max_employees     Int?     // null = unlimited
  price_monthly     Decimal
  price_annual      Decimal
  features          Json     // Feature flags
  limits            Json     // Resource limits
  active            Boolean  @default(true)
  created_at        DateTime @default(now())
}

model CompanySubscription {
  id                String   @id @default(uuid())
  company_id        String   @unique
  plan_id           String
  status            String   // trial | active | suspended | cancelled
  trial_ends_at     DateTime?
  billing_cycle     String   // monthly | annual
  next_billing_date DateTime?
  custom_limits     Json?    // Override plan limits
  
  company           Company  @relation(fields: [company_id], references: [id])
  plan              SubscriptionPlan @relation(fields: [plan_id], references: [id])
}

model ModuleConfig {
  id                String   @id @default(uuid())
  company_id        String
  module_slug       String   // leave | attendance | payroll etc.
  enabled           Boolean  @default(true)
  config            Json     // Module-specific settings
  features          Json     // Feature flags within module
  updated_at        DateTime @updatedAt
  updated_by        String
  
  company           Company  @relation(fields: [company_id], references: [id])
  
  @@unique([company_id, module_slug])
  @@index([company_id, enabled])
}

model FeatureFlag {
  id                String   @id @default(uuid())
  company_id        String?  // null = platform-wide
  flag_key          String
  enabled           Boolean  @default(false)
  rollout_percent   Int      @default(100) // Gradual rollout
  target_users      Json?    // Specific user targeting
  expires_at        DateTime?
  
  @@unique([company_id, flag_key])
  @@index([flag_key, enabled])
}
```

### CFG-002: Configuration API Routes

| Route | Method | Permission | Lines | Purpose |
|-------|--------|------------|-------|---------|
| `/api/super-admin/platform-config` | GET/PATCH | Super Admin | 120 | Platform settings |
| `/api/super-admin/subscription-plans` | GET/POST | Super Admin | 150 | Manage plans |
| `/api/super-admin/companies/[id]/subscription` | PATCH | Super Admin | 100 | Assign plan |
| `/api/admin/module-config` | GET | Admin | 80 | List available modules |
| `/api/admin/module-config/[slug]` | GET/PATCH | Admin | 120 | Configure module |
| `/api/admin/feature-flags` | GET/PATCH | Admin | 100 | Feature toggles |
| `/api/config/effective` | GET | Authenticated | 60 | Get effective config |

### CFG-003: Configuration UI Pages

| Page Path | Lines | Description |
|-----------|-------|-------------|
| `/super-admin/(main)/config/platform` | 200 | Platform-wide settings |
| `/super-admin/(main)/plans` | 250 | Subscription plan editor |
| `/super-admin/(main)/companies/[id]/subscription` | 180 | Company plan management |
| `/admin/(main)/settings/modules` | 300 | Module configuration dashboard |
| `/admin/(main)/settings/modules/[slug]` | 250 | Per-module settings |
| `/admin/(main)/settings/features` | 200 | Feature flag toggles |

### CFG-004: Configuration Components

| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/config/plan-selector.tsx` | 120 | Plan selection UI |
| `components/config/module-card.tsx` | 100 | Module enable/disable card |
| `components/config/module-config-form.tsx` | 200 | Dynamic config form |
| `components/config/feature-flag-toggle.tsx` | 80 | Feature toggle switch |
| `components/config/plan-limits-display.tsx` | 100 | Show current usage vs limits |
| `components/config/config-wizard.tsx` | 250 | Guided setup wizard |

### CFG-005: Configuration Services

```typescript
// lib/config/plan-checker.ts
export async function checkPlanFeature(
  companyId: string, 
  feature: string
): Promise<boolean> {
  const subscription = await getCompanySubscription(companyId);
  return subscription.plan.features[feature] === true;
}

export async function checkPlanLimit(
  companyId: string,
  resource: string,
  currentUsage: number
): Promise<{ allowed: boolean; limit: number; usage: number }> {
  // Check against plan limits
}

// lib/config/module-resolver.ts
export async function getModuleConfig(
  companyId: string,
  moduleSlug: string
): Promise<ModuleConfiguration | null> {
  // Returns null if module not enabled for plan
}

// lib/config/feature-flag-service.ts
export async function isFeatureEnabled(
  companyId: string,
  flagKey: string,
  userId?: string
): Promise<boolean> {
  // Check feature flags with rollout logic
}
```

---

## 📊 CORE HR SERVICES (10 Services)

All services below follow this pattern:
1. **Plan Check** - Verify subscription includes this module
2. **Module Check** - Verify module enabled for company
3. **Feature Check** - Verify specific features within module
4. **Configuration** - Load company-specific settings
5. **Execution** - Run with configured rules

---

### SVC-001: Employee Lifecycle Management [PARTIAL - 75%]
**ID**: `SVC-001`  
**Status**: 🟡 Enhance existing  
**Effort**: 8 days  
**Dependencies**: CFG-001 (Configuration Framework)  
**Plan Requirements**: Starter+  
**Configurable Settings**: 15+

#### Configuration Schema
```typescript
interface EmployeeModuleConfig {
  // Field visibility
  fields_enabled: {
    emergency_contact: boolean;
    bank_details: boolean;
    tax_ids: boolean;
    custom_fields: Record<string, CustomField>;
  };
  
  // Onboarding
  onboarding_workflow: {
    enabled: boolean;
    checklist_items: OnboardingItem[];
    auto_welcome_email: boolean;
    probation_period_days: number;
  };
  
  // Termination
  exit_workflow: {
    enabled: boolean;
    notice_period_required: boolean;
    default_notice_days: number;
    exit_interview_required: boolean;
  };
  
  // Access controls
  employee_self_edit: {
    profile_photo: boolean;
    phone: boolean;
    address: boolean;
    emergency_contact: boolean;
    bank_details: boolean; // Usually false
  };
  
  // Validation
  validation_rules: {
    email_domain_whitelist?: string[];
    phone_format: string; // regex
    require_manager: boolean;
    require_department: boolean;
  };
}
```

#### What Exists ✅
- Employee CRUD operations
- Profile management
- Manager hierarchy

#### Missing Components ❌

##### Database
| Table/Field | Purpose | Migration File |
|-------------|---------|----------------|
| `Employee.emergency_contact_name` | Emergency contact | `*_add_emergency_contacts.sql` |
| `Employee.emergency_contact_phone` | Emergency phone | Same |
| `Employee.emergency_contact_relationship` | Relationship | Same |
| `Employee.bank_account_number` | Salary account | `*_add_bank_details.sql` |
| `Employee.bank_ifsc_code` | Bank IFSC | Same |
| `Employee.bank_name` | Bank name | Same |
| `Employee.pan_number` | PAN (tax ID) | `*_add_tax_ids.sql` |
| `Employee.aadhaar_number` | Aadhaar (national ID) | Same |
| `Employee.uan_number` | UAN (PF number) | Same |
| `Employee.esic_number` | ESIC number | Same |

##### API Routes (6 new)
| Route | Method | Permission | Lines |
|-------|--------|------------|-------|
| `/api/employees/[id]/emergency-contact` | PATCH | `employee.edit_any` OR self | 80 |
| `/api/employees/[id]/bank-details` | PATCH | `employee.edit_any` OR self | 90 |
| `/api/employees/[id]/tax-ids` | PATCH | `employee.edit_any` OR self | 85 |
| `/api/employees/[id]/documents` | GET/POST | `employee.view_all` OR self | 120 |
| `/api/employees/bulk-upload` | POST | `employee.onboard` | 200 |
| `/api/employees/export` | GET | `employee.view_all` | 100 |

##### UI Pages (3 new)
| Page Path | Lines | Description |
|-----------|-------|-------------|
| `/employee/(main)/profile/emergency-contact` | 150 | Edit emergency contacts |
| `/employee/(main)/profile/bank-details` | 180 | Edit bank details |
| `/employee/(main)/profile/documents` | 220 | Upload personal documents |

##### Components (5 new)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/employee/emergency-contact-form.tsx` | 120 | Emergency contact form |
| `components/employee/bank-details-form.tsx` | 150 | Bank account form |
| `components/employee/tax-id-form.tsx` | 130 | PAN/Aadhaar form |
| `components/employee/bulk-upload-dialog.tsx` | 180 | CSV upload UI |
| `components/employee/export-dialog.tsx` | 100 | Export options |

##### Backend Services
| File | Lines | Purpose |
|------|-------|---------|
| `lib/employee/bulk-processor.ts` | 250 | CSV parsing + validation |
| `lib/employee/export-service.ts` | 150 | Export to CSV/Excel |

##### Tests
| File | Lines |
|------|-------|
| `tests/employee/bulk-upload.test.ts` | 200 |
| `tests/employee/profile-updates.test.ts` | 150 |

---

### SVC-002: Leave & Absence Management [COMPLETE - 95%]
**ID**: `SVC-002`  
**Status**: ✅ Minor fixes only  
**Effort**: 2 days (bug fixes)

#### Existing Components ✅
- 15 API routes
- 12 UI pages
- 25+ components
- Constraint engine integration
- Multi-level approval

#### Minor Fixes Required
| Issue | File | Lines |
|-------|------|-------|
| Add half-day validation | `lib/leave-workflow.ts` | 20 |
| Fix date timezone issues | `lib/leave-constraint-evaluator.ts` | 30 |
| Add leave cancellation reason | `components/leave/cancel-dialog.tsx` | 40 |

---

### SVC-003: Attendance & Time Tracking [PARTIAL - 85%]
**ID**: `SVC-003`  
**Status**: 🟡 Add integrations  
**Effort**: 12 days  
**Dependencies**: SVC-064 (Scheduling)

#### What Exists ✅
- Check-in/check-out
- Regularization workflows
- Late detection
- Overtime calculation

#### Missing Components ❌

##### Database
| Table | Fields | Purpose |
|-------|--------|---------|
| `BiometricDevice` | device_id, location, device_type, api_endpoint | Device registry |
| `AttendanceRaw` | device_id, employee_id, timestamp, biometric_data_hash | Raw punch data |
| `ShiftAssignment` | employee_id, shift_id, effective_from, effective_to | Shift mapping |
| `OvertimeRequest` | employee_id, date, hours, reason, status | OT approval |

##### API Routes (8 new)
| Route | Method | Permission | Lines |
|-------|--------|------------|-------|
| `/api/attendance/devices` | GET/POST | `attendance.override` | 150 |
| `/api/attendance/devices/[id]/sync` | POST | `attendance.override` | 120 |
| `/api/attendance/biometric/punch` | POST | Public (device webhook) | 180 |
| `/api/attendance/shifts` | GET/POST | `attendance.view_all` | 140 |
| `/api/attendance/shifts/assign` | POST | `attendance.override` | 100 |
| `/api/attendance/overtime/request` | POST | Self | 90 |
| `/api/attendance/overtime/approve/[id]` | PATCH | Manager | 80 |
| `/api/attendance/reports/monthly` | GET | `attendance.view_all` | 200 |

##### UI Pages (5 new)
| Page Path | Lines | Description |
|-----------|-------|-------------|
| `/hr/(main)/attendance/devices` | 200 | Biometric device management |
| `/hr/(main)/attendance/shifts` | 250 | Shift roster planner |
| `/hr/(main)/attendance/reports` | 300 | Monthly attendance reports |
| `/manager/(main)/attendance/overtime` | 180 | OT approval queue |
| `/employee/(main)/attendance/overtime-request` | 150 | Request overtime |

##### Components (10 new)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/attendance/device-list.tsx` | 120 | Biometric devices table |
| `components/attendance/device-sync-dialog.tsx` | 100 | Manual sync trigger |
| `components/attendance/shift-calendar.tsx` | 200 | Weekly shift planner |
| `components/attendance/shift-assignment-form.tsx` | 150 | Assign shifts |
| `components/attendance/overtime-request-form.tsx` | 120 | OT request form |
| `components/attendance/overtime-approval-card.tsx` | 100 | OT approval UI |
| `components/attendance/monthly-report-table.tsx` | 180 | Monthly summary |
| `components/attendance/geofence-map.tsx` | 150 | Location-based check-in |
| `components/attendance/attendance-heatmap.tsx` | 140 | Visual attendance patterns |
| `components/attendance/late-trend-chart.tsx` | 100 | Late arrival trends |

##### Backend Services
| File | Lines | Purpose |
|------|-------|---------|
| `lib/attendance/biometric-integration.ts` | 300 | Device API abstraction |
| `lib/attendance/shift-engine.ts` | 250 | Shift assignment logic |
| `lib/attendance/geofence-validator.ts` | 150 | Location validation |
| `lib/attendance/leave-attendance-sync.ts` | 200 | Auto-mark approved leaves |

##### Tests
| File | Lines |
|------|-------|
| `tests/attendance/biometric.test.ts` | 180 |
| `tests/attendance/shift-engine.test.ts` | 150 |
| `tests/attendance/geofence.test.ts` | 120 |



---

### SVC-004: Payroll Processing [PARTIAL - 50%]
**ID**: `SVC-004`  
**Status**: 🟡 Complete workflows  
**Effort**: 15 days  
**Dependencies**: SVC-003 (Attendance for LOP)

#### What Exists ✅
- `lib/payroll-engine.ts` (tax calculation)
- `lib/india-tax-engine.ts` (PF, ESI, PT, TDS)
- Payslip generation logic
- Database schema complete

#### Missing Components ❌

##### Database (2 new tables)
| Table | Purpose | Fields |
|-------|---------|--------|
| `PayrollApproval` | Approval workflow | run_id, approver_id, status, approved_at |
| `BankFile` | NEFT/RTGS exports | run_id, file_path, bank_format, generated_at |

##### API Routes (12 new)
| Route | Method | Permission | Lines |
|-------|--------|------------|-------|
| `/api/payroll/runs` | GET/POST | `payroll.generate` | 180 |
| `/api/payroll/runs/[id]` | GET | `payroll.view_all` | 100 |
| `/api/payroll/runs/[id]/approve` | POST | `payroll.approve` | 120 |
| `/api/payroll/runs/[id]/reject` | POST | `payroll.approve` | 80 |
| `/api/payroll/runs/[id]/disburse` | POST | `payroll.process` | 150 |
| `/api/payroll/runs/[id]/bank-file` | GET | `payroll.process` | 200 |
| `/api/payroll/slips/[empId]/[month]/[year]` | GET | Self or `payroll.view_all` | 100 |
| `/api/payroll/slips/[empId]/[month]/[year]/pdf` | GET | Self or `payroll.view_all` | 180 |
| `/api/payroll/form16/[empId]/[year]` | GET | Self or `payroll.view_all` | 250 |
| `/api/payroll/config` | GET/PATCH | `company.edit_settings` | 140 |
| `/api/payroll/salary-structures` | GET/POST | `payroll.generate` | 160 |
| `/api/payroll/salary-structures/[empId]` | PATCH | `payroll.generate` | 120 |

##### UI Pages (8 new)
| Page Path | Lines | Description |
|-----------|-------|-------------|
| `/hr/(main)/payroll` | 250 | Payroll dashboard |
| `/hr/(main)/payroll/runs` | 220 | Payroll run history |
| `/hr/(main)/payroll/generate` | 300 | Generate payroll wizard |
| `/hr/(main)/payroll/runs/[id]` | 280 | Run details + approval |
| `/hr/(main)/payroll/config` | 200 | Payroll config (PF, ESI rates) |
| `/hr/(main)/payroll/salary-structures` | 250 | CTC restructuring tool |
| `/employee/(main)/payroll/slips` | 180 | My payslips |
| `/employee/(main)/payroll/form16/[year]` | 150 | Download Form 16 |

##### Components (15 new)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/payroll/run-wizard.tsx` | 250 | Multi-step generation |
| `components/payroll/run-summary-card.tsx` | 120 | Run overview |
| `components/payroll/payslip-list.tsx` | 150 | Employee payslips table |
| `components/payroll/payslip-pdf-viewer.tsx` | 180 | PDF preview |
| `components/payroll/approval-workflow.tsx` | 140 | Approval chain UI |
| `components/payroll/bank-file-generator.tsx` | 160 | NEFT/RTGS export |
| `components/payroll/salary-structure-editor.tsx` | 200 | CTC breakup editor |
| `components/payroll/tax-config-form.tsx` | 180 | PF/ESI/PT config |
| `components/payroll/deduction-calculator.tsx` | 120 | Live calculation |
| `components/payroll/payroll-calendar.tsx` | 100 | Payment schedule |
| `components/payroll/variance-report.tsx` | 140 | Month-over-month changes |
| `components/payroll/cost-center-breakdown.tsx` | 120 | Cost allocation |
| `components/payroll/statutory-report.tsx` | 150 | PF/ESI reports |
| `components/payroll/form16-generator.tsx` | 200 | Form 16 UI |
| `components/payroll/disbursement-status.tsx` | 100 | Payment tracking |

##### Backend Services
| File | Lines | Purpose |
|------|-------|---------|
| `lib/payroll/approval-workflow.ts` | 180 | Multi-level approval |
| `lib/payroll/bank-file-generator.ts` | 300 | NEFT/RTGS format |
| `lib/payroll/form16-generator.ts` | 400 | PDF generation |
| `lib/payroll/salary-restructure.ts` | 200 | CTC optimization |
| `lib/payroll/lop-calculator.ts` | 150 | Loss of pay from attendance |

##### Tests
| File | Lines |
|------|-------|
| `tests/payroll/approval-workflow.test.ts` | 180 |
| `tests/payroll/bank-file.test.ts` | 150 |
| `tests/payroll/form16.test.ts` | 200 |

---

### SVC-005: Performance Management [NEW - 5%]
**ID**: `SVC-005`  
**Status**: 🔴 Build from scratch  
**Effort**: 20 days  
**Dependencies**: SVC-001 (Employees), SVC-012 (RBAC)

#### Database Schema (4 tables)
| Table | Records | Purpose |
|-------|---------|---------|
| `Goal` | Per employee | OKRs, KPIs |
| `ReviewCycle` | Annual/quarterly | Review periods |
| `ReviewInstance` | Per employee per cycle | Individual reviews |
| `PerformanceReviewComment` | Per review | Feedback comments |

**Migration**: `*_performance_management.sql` (~300 lines)

#### API Routes (18 new)
| Route | Method | Permission | Lines |
|-------|--------|------------|-------|
| `/api/performance/goals` | GET/POST | `performance.manage_goals` | 150 |
| `/api/performance/goals/[id]` | GET/PATCH/DELETE | `performance.manage_goals` | 120 |
| `/api/performance/goals/[id]/progress` | PATCH | Self or manager | 80 |
| `/api/performance/goals/my` | GET | Self | 60 |
| `/api/performance/goals/team` | GET | Team lead+ | 80 |
| `/api/performance/goals/cascade` | POST | Director+ | 100 |
| `/api/performance/cycles` | GET/POST | `performance.manage_reviews` | 140 |
| `/api/performance/cycles/[id]` | GET/PATCH | HR/Admin | 100 |
| `/api/performance/cycles/[id]/start` | POST | HR/Admin | 90 |
| `/api/performance/cycles/[id]/close` | POST | HR/Admin | 80 |
| `/api/performance/reviews` | GET | Based on role | 100 |
| `/api/performance/reviews/[id]` | GET/PATCH | Reviewer | 120 |
| `/api/performance/reviews/[id]/submit` | POST | Reviewer | 100 |
| `/api/performance/reviews/[id]/acknowledge` | POST | Employee | 70 |
| `/api/performance/reviews/my` | GET | Self | 60 |
| `/api/performance/reviews/pending` | GET | Manager | 80 |
| `/api/performance/calibration/[cycleId]` | GET/POST | Director+ | 150 |
| `/api/performance/reports/goal-completion` | GET | HR/Admin | 90 |

#### UI Pages (12 new)
| Page Path | Lines | Portal | Description |
|-----------|-------|--------|-------------|
| `/hr/(main)/performance` | 200 | HR | Performance dashboard |
| `/hr/(main)/performance/goals` | 250 | HR | Company goals |
| `/hr/(main)/performance/goals/new` | 180 | HR | Create goal |
| `/hr/(main)/performance/cycles` | 220 | HR | Review cycles |
| `/hr/(main)/performance/cycles/new` | 200 | HR | Create cycle |
| `/hr/(main)/performance/cycles/[id]` | 280 | HR | Cycle monitoring |
| `/hr/(main)/performance/calibration/[cycleId]` | 300 | HR | 9-box calibration |
| `/manager/(main)/performance` | 180 | Manager | Team performance |
| `/manager/(main)/performance/reviews/[id]` | 250 | Manager | Complete review |
| `/employee/(main)/performance` | 200 | Employee | My performance |
| `/employee/(main)/performance/goals` | 180 | Employee | My goals |
| `/employee/(main)/performance/reviews/[id]` | 220 | Employee | Self-review |

#### Components (25 new)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/performance/goal-card.tsx` | 80 | Goal display |
| `components/performance/goal-form.tsx` | 150 | Create/edit goal |
| `components/performance/goal-tree.tsx` | 120 | Hierarchical OKRs |
| `components/performance/goal-progress-bar.tsx` | 60 | Progress indicator |
| `components/performance/goal-alignment-diagram.tsx` | 100 | Cascade view |
| `components/performance/review-form.tsx` | 200 | Review submission |
| `components/performance/rating-selector.tsx` | 80 | 1-5 star rating |
| `components/performance/review-timeline.tsx` | 100 | Cycle timeline |
| `components/performance/review-status-badge.tsx` | 40 | Status indicator |
| `components/performance/review-comments.tsx` | 120 | Comment thread |
| `components/performance/calibration-grid.tsx` | 180 | 9-box grid |
| `components/performance/rating-distribution-chart.tsx` | 100 | Bell curve |
| `components/performance/performance-summary.tsx` | 120 | KPI summary |
| `components/performance/goal-completion-chart.tsx` | 80 | Pie chart |
| `components/performance/review-progress-tracker.tsx` | 100 | Completion % |
| `components/performance/peer-feedback-form.tsx` | 150 | 360° feedback |
| `components/performance/pip-form.tsx` | 180 | Performance improvement plan |
| `components/performance/one-on-one-notes.tsx` | 120 | 1:1 meeting notes |
| `components/performance/competency-matrix.tsx` | 140 | Skill assessment |
| `components/performance/succession-planning.tsx` | 160 | Talent pipeline |
| `components/performance/potential-performance-grid.tsx` | 100 | 9-box plot |
| `components/performance/development-plan-form.tsx` | 140 | Career development |
| `components/performance/rating-guide-sidebar.tsx` | 80 | Rating definitions |
| `components/performance/review-reminder-banner.tsx` | 60 | Deadline alerts |
| `components/performance/goal-template-selector.tsx` | 100 | Pre-built goals |

#### Backend Services
| File | Lines | Purpose |
|------|-------|---------|
| `lib/performance/goal-engine.ts` | 250 | Goal CRUD + alignment |
| `lib/performance/review-engine.ts` | 300 | Cycle management |
| `lib/performance/rating-calculator.ts` | 150 | Rating aggregation |
| `lib/performance/calibration-engine.ts` | 200 | Cross-team calibration |
| `lib/performance/goal-cascade.ts` | 180 | Top-down goal flow |
| `lib/performance/notification-service.ts` | 120 | Review reminders |

#### Tests
| File | Lines |
|------|-------|
| `tests/performance/goal-engine.test.ts` | 200 |
| `tests/performance/review-engine.test.ts` | 250 |
| `tests/performance/calibration.test.ts` | 150 |
| `tests/performance/api-routes.test.ts` | 300 |

#### Documentation
| File | Lines |
|------|-------|
| `docs/modules/performance-management.md` | 600 |
| `docs/user-guides/goal-setting.md` | 400 |
| `docs/user-guides/performance-reviews.md` | 500 |



---

### SVC-006: Compensation Planning [NEW - 10%]
**ID**: `SVC-006`  
**Status**: 🔴 Build from scratch  
**Effort**: 16 days  
**Dependencies**: SVC-004 (Payroll), SVC-005 (Performance)

#### Database Schema (3 tables)
```prisma
model CompensationCycle {
  id               String
  company_id       String
  name             String
  fiscal_year      Int
  budget_allocated Decimal
  status           CompensationCycleStatus
  review_start_date DateTime
  review_end_date   DateTime
  effective_date    DateTime
  created_by       String
  created_at       DateTime
  recommendations  CompensationRecommendation[]
}

model CompensationRecommendation {
  id               String
  cycle_id         String
  employee_id      String
  current_salary   Decimal
  proposed_salary  Decimal
  increase_percent Decimal
  increase_type    String // merit | promotion | market_adjustment
  bonus_amount     Decimal?
  recommended_by   String
  status           CompensationRecoStatus
  comments         String?
  approved_by      String?
  approved_at      DateTime?
}

model BonusDistribution {
  id               String
  company_id       String
  fiscal_year      Int
  total_pool       Decimal
  distribution_type String // performance | profit_sharing | spot
  distributed_amount Decimal
  distributed_at   DateTime
  created_by       String
}
```

**Migration**: `*_compensation_planning.sql` (~250 lines)

#### API Routes (12 new)
| Route | Method | Permission | Lines |
|-------|--------|------------|-------|
| `/api/compensation/cycles` | GET/POST | `compensation.manage_cycles` | 150 |
| `/api/compensation/cycles/[id]` | GET/PATCH | `compensation.manage_cycles` | 120 |
| `/api/compensation/cycles/[id]/start` | POST | HR/Admin | 80 |
| `/api/compensation/cycles/[id]/close` | POST | HR/Admin | 90 |
| `/api/compensation/cycles/[id]/budget` | PATCH | HR/Admin | 100 |
| `/api/compensation/recommendations` | GET/POST | Manager+ | 160 |
| `/api/compensation/recommendations/[id]` | PATCH | Manager+ | 120 |
| `/api/compensation/recommendations/[id]/approve` | POST | `compensation.approve` | 100 |
| `/api/compensation/recommendations/[id]/reject` | POST | `compensation.approve` | 80 |
| `/api/compensation/bonus/pools` | GET/POST | HR/Admin | 140 |
| `/api/compensation/bonus/distribute` | POST | HR/Admin | 180 |
| `/api/compensation/reports/budget-utilization` | GET | HR/Admin | 120 |

#### UI Pages (10 new)
| Page Path | Lines | Portal | Description |
|-----------|-------|--------|-------------|
| `/hr/(main)/compensation` | 220 | HR | Compensation dashboard |
| `/hr/(main)/compensation/cycles` | 200 | HR | Cycles list |
| `/hr/(main)/compensation/cycles/new` | 180 | HR | Create cycle |
| `/hr/(main)/compensation/cycles/[id]` | 300 | HR | Cycle details + monitoring |
| `/hr/(main)/compensation/cycles/[id]/budget` | 200 | HR | Budget allocation |
| `/hr/(main)/compensation/bonus` | 220 | HR | Bonus management |
| `/hr/(main)/compensation/reports` | 250 | HR | Comp analytics |
| `/manager/(main)/compensation/team` | 250 | Manager | Team comp review |
| `/manager/(main)/compensation/recommend/[empId]` | 200 | Manager | Submit recommendation |
| `/employee/(main)/compensation/history` | 150 | Employee | My comp history |

#### Components (12 new)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/compensation/cycle-wizard.tsx` | 200 | Create cycle |
| `components/compensation/budget-allocator.tsx` | 180 | Dept budget split |
| `components/compensation/recommendation-form.tsx` | 200 | Manager submits increase |
| `components/compensation/recommendation-list.tsx` | 150 | HR approval queue |
| `components/compensation/merit-matrix.tsx` | 160 | Performance vs salary grid |
| `components/compensation/market-comparison.tsx` | 140 | Benchmark data |
| `components/compensation/bonus-calculator.tsx` | 120 | Bonus allocation tool |
| `components/compensation/salary-range-editor.tsx` | 150 | Job level ranges |
| `components/compensation/increase-simulator.tsx` | 130 | What-if analysis |
| `components/compensation/budget-tracker.tsx` | 100 | Utilization gauge |
| `components/compensation/compa-ratio-chart.tsx` | 90 | Pay equity analysis |
| `components/compensation/compensation-history-timeline.tsx` | 120 | Employee comp history |

#### Backend Services
| File | Lines | Purpose |
|------|-------|---------|
| `lib/compensation/cycle-engine.ts` | 250 | Cycle management |
| `lib/compensation/recommendation-processor.ts` | 200 | Approval workflow |
| `lib/compensation/budget-allocator.ts` | 180 | Budget distribution |
| `lib/compensation/market-data-integration.ts` | 150 | External benchmarking |
| `lib/compensation/equity-analyzer.ts` | 140 | Pay gap detection |

#### Tests
| File | Lines |
|------|-------|
| `tests/compensation/cycle-engine.test.ts` | 180 |
| `tests/compensation/recommendation.test.ts` | 150 |

---

### SVC-007: Succession Planning [NEW - 0%]
**ID**: `SVC-007`  
**Status**: 🔴 Build from scratch  
**Effort**: 14 days  
**Dependencies**: SVC-005 (Performance), SVC-062 (Skill Matrix)

#### Database Schema (2 tables)
```prisma
model SuccessionPlan {
  id               String
  company_id       String
  position_id      String // Critical role
  incumbent_id     String? // Current holder
  readiness_timeline String // immediate | 1-2yr | 3-5yr
  risk_level       String // high | medium | low
  last_reviewed    DateTime
  next_review      DateTime
  created_at       DateTime
  successors       Successor[]
}

model Successor {
  id               String
  plan_id          String
  employee_id      String
  readiness        String // ready | ready_soon | development_needed
  readiness_percent Int
  development_plan String?
  mentor_id        String?
  target_date      DateTime?
}
```

**Migration**: `*_succession_planning.sql` (~180 lines)

#### API Routes (8 new)
| Route | Method | Permission | Lines |
|-------|--------|------------|-------|
| `/api/succession/plans` | GET/POST | Director+ | 150 |
| `/api/succession/plans/[id]` | GET/PATCH/DELETE | Director+ | 120 |
| `/api/succession/plans/[id]/successors` | POST | Director+ | 100 |
| `/api/succession/plans/[id]/successors/[successorId]` | PATCH/DELETE | Director+ | 80 |
| `/api/succession/critical-roles` | GET | Director+ | 100 |
| `/api/succession/talent-pool` | GET | HR | 120 |
| `/api/succession/readiness-matrix` | GET | Director+ | 140 |
| `/api/succession/reports/bench-strength` | GET | Director+ | 120 |

#### UI Pages (6 new)
| Page Path | Lines | Description |
|-----------|-------|-------------|
| `/hr/(main)/succession` | 250 | Succession dashboard |
| `/hr/(main)/succession/plans` | 220 | All succession plans |
| `/hr/(main)/succession/plans/[id]` | 280 | Plan details |
| `/hr/(main)/succession/talent-pool` | 240 | High-potential employees |
| `/hr/(main)/succession/readiness-matrix` | 200 | Org-wide readiness |
| `/hr/(main)/succession/bench-strength` | 180 | Depth analysis |

#### Components (8 new)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/succession/succession-plan-card.tsx` | 100 | Plan overview |
| `components/succession/successor-list.tsx` | 150 | Candidate list |
| `components/succession/readiness-matrix.tsx` | 180 | 9-box grid (readiness vs performance) |
| `components/succession/development-plan-form.tsx` | 150 | Successor training plan |
| `components/succession/org-chart-succession.tsx` | 200 | Visual org chart with succession |
| `components/succession/risk-heatmap.tsx` | 120 | Critical role risks |
| `components/succession/talent-pipeline.tsx` | 140 | Funnel visualization |
| `components/succession/bench-strength-gauge.tsx` | 80 | Depth indicator |

#### Backend Services
| File | Lines | Purpose |
|------|-------|---------|
| `lib/succession/plan-engine.ts` | 200 | Plan management |
| `lib/succession/readiness-calculator.ts` | 150 | Readiness scoring |
| `lib/succession/critical-role-identifier.ts` | 120 | Auto-identify critical roles |

---

### SVC-008: Talent Acquisition/ATS [PARTIAL - 40%]
**ID**: `SVC-008`  
**Status**: 🟡 Build UI  
**Effort**: 18 days  
**Dependencies**: None

#### What Exists ✅
- Database schema complete
- `lib/recruitment/pipeline-engine.ts` (business logic)
- API stub routes

#### Missing Components ❌

#### API Routes (10 new/complete)
| Route | Method | Permission | Lines |
|-------|--------|------------|-------|
| `/api/recruitment/postings` | GET/POST | `recruitment.create_posting` | 160 |
| `/api/recruitment/postings/[id]` | GET/PATCH/DELETE | `recruitment.create_posting` | 140 |
| `/api/recruitment/postings/[id]/publish` | POST | `recruitment.create_posting` | 80 |
| `/api/recruitment/applications` | GET/POST | `recruitment.manage_applications` | 150 |
| `/api/recruitment/applications/[id]` | GET/PATCH | `recruitment.manage_applications` | 120 |
| `/api/recruitment/applications/[id]/advance` | POST | `recruitment.manage_pipeline` | 100 |
| `/api/recruitment/interviews` | GET/POST | `recruitment.manage_pipeline` | 140 |
| `/api/recruitment/interviews/[id]/feedback` | POST | Interviewer | 120 |
| `/api/recruitment/offers` | GET/POST | `recruitment.create_offer` | 160 |
| `/api/recruitment/offers/[id]/send` | POST | `recruitment.create_offer` | 100 |

#### UI Pages (15 new)
| Page Path | Lines | Portal | Description |
|-----------|-------|--------|-------------|
| `/hr/(main)/recruitment` | 250 | HR | Recruitment dashboard |
| `/hr/(main)/recruitment/postings` | 220 | HR | Job postings list |
| `/hr/(main)/recruitment/postings/new` | 280 | HR | Create job posting |
| `/hr/(main)/recruitment/postings/[id]` | 300 | HR | Posting details |
| `/hr/(main)/recruitment/pipeline` | 320 | HR | Kanban pipeline |
| `/hr/(main)/recruitment/applications` | 240 | HR | All applications |
| `/hr/(main)/recruitment/applications/[id]` | 300 | HR | Candidate profile |
| `/hr/(main)/recruitment/interviews` | 220 | HR | Interview schedule |
| `/hr/(main)/recruitment/interviews/[id]` | 200 | HR | Interview details |
| `/hr/(main)/recruitment/offers` | 240 | HR | Offers list |
| `/hr/(main)/recruitment/offers/[id]` | 250 | HR | Offer letter editor |
| `/careers/[postingId]` | 300 | Public | Job details (candidate) |
| `/careers/[postingId]/apply` | 280 | Public | Application form |
| `/candidate-portal/applications` | 200 | Candidate | My applications |
| `/candidate-portal/applications/[id]` | 220 | Candidate | Application status |

#### Components (20 new)
| Component | Lines | Purpose |
|-----------|-------|---------|
| `components/recruitment/job-posting-form.tsx` | 250 | Create/edit posting |
| `components/recruitment/job-posting-card.tsx` | 120 | Posting display |
| `components/recruitment/pipeline-board.tsx` | 280 | Kanban board |
| `components/recruitment/application-card.tsx` | 150 | Candidate card |
| `components/recruitment/candidate-profile.tsx` | 220 | Full profile view |
| `components/recruitment/resume-viewer.tsx` | 180 | PDF/DOCX resume display |
| `components/recruitment/screening-questions.tsx` | 140 | Custom questions |
| `components/recruitment/interview-scheduler.tsx` | 200 | Calendar integration |
| `components/recruitment/interview-feedback-form.tsx` | 180 | Interviewer feedback |
| `components/recruitment/scorecard.tsx` | 140 | Evaluation form |
| `components/recruitment/offer-letter-editor.tsx` | 220 | Rich text editor |
| `components/recruitment/offer-approval-workflow.tsx` | 150 | Approval chain |
| `components/recruitment/candidate-communication.tsx` | 160 | Email templates |
| `components/recruitment/application-form.tsx` | 250 | Public form |
| `components/recruitment/stage-timeline.tsx` | 100 | Application progress |
| `components/recruitment/recruiter-assignment.tsx` | 80 | Assign recruiter |
| `components/recruitment/source-tracker.tsx` | 100 | Application sources |
| `components/recruitment/time-to-hire-chart.tsx` | 120 | Analytics |
| `components/recruitment/funnel-chart.tsx` | 100 | Conversion funnel |
| `components/recruitment/diversity-dashboard.tsx` | 140 | DEI metrics |

#### Backend Services
| File | Lines | Purpose |
|------|-------|---------|
| `lib/recruitment/application-parser.ts` | 200 | Resume parsing (OCR) |
| `lib/recruitment/email-service.ts` | 180 | Candidate communication |
| `lib/recruitment/calendar-integration.ts` | 150 | Google Cal/Outlook sync |
| `lib/recruitment/offer-generator.ts` | 200 | PDF offer letter |

#### Tests
| File | Lines |
|------|-------|
| `tests/recruitment/pipeline-engine.test.ts` | 200 |
| `tests/recruitment/application-parser.test.ts` | 150 |

