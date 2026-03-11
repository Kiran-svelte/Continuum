-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'hr', 'director', 'manager', 'team_lead', 'employee');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('male', 'female', 'other');

-- CreateEnum
CREATE TYPE "GenderFilter" AS ENUM ('male', 'female', 'all');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('onboarding', 'probation', 'active', 'on_notice', 'suspended', 'resigned', 'terminated', 'exited');

-- CreateEnum
CREATE TYPE "LeaveCategory" AS ENUM ('common', 'statutory', 'special', 'unpaid');

-- CreateEnum
CREATE TYPE "LeaveRequestStatus" AS ENUM ('draft', 'pending', 'approved', 'rejected', 'cancelled', 'escalated');

-- CreateEnum
CREATE TYPE "EncashmentStatus" AS ENUM ('pending', 'approved', 'processed', 'rejected');

-- CreateEnum
CREATE TYPE "RuleCategory" AS ENUM ('validation', 'business', 'compliance');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('present', 'absent', 'half_day', 'late', 'on_leave', 'holiday', 'weekend');

-- CreateEnum
CREATE TYPE "RegularizationStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "OrgUnitType" AS ENUM ('department', 'division', 'team', 'branch');

-- CreateEnum
CREATE TYPE "SalaryComponentType" AS ENUM ('earning', 'deduction', 'statutory');

-- CreateEnum
CREATE TYPE "PayrollRunStatus" AS ENUM ('draft', 'generated', 'under_review', 'approved', 'processed', 'paid', 'rejected');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('pending', 'verified', 'rejected', 'expired');

-- CreateEnum
CREATE TYPE "ReimbursementStatus" AS ENUM ('pending', 'approved', 'rejected', 'processed');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('transfer', 'promotion', 'role_change', 'department_change');

-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ExitChecklistStatus" AS ENUM ('not_started', 'in_progress', 'completed');

-- CreateEnum
CREATE TYPE "NotificationChannel" AS ENUM ('email', 'push', 'in_app');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('free', 'starter', 'growth', 'enterprise');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('active', 'cancelled', 'expired', 'trial');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed', 'refunded');

-- CreateEnum
CREATE TYPE "IncidentStatus" AS ENUM ('investigating', 'identified', 'monitoring', 'resolved');

-- CreateEnum
CREATE TYPE "IncidentSeverity" AS ENUM ('minor', 'major', 'critical');

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT,
    "size" TEXT,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "join_code" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "negative_balance" BOOLEAN NOT NULL DEFAULT false,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "work_start" TEXT NOT NULL DEFAULT '09:00',
    "work_end" TEXT NOT NULL DEFAULT '18:00',
    "work_days" JSONB NOT NULL DEFAULT '[1,2,3,4,5]',
    "grace_period_minutes" INTEGER NOT NULL DEFAULT 15,
    "half_day_hours" DOUBLE PRECISION NOT NULL DEFAULT 4,
    "leave_year_start" TEXT NOT NULL DEFAULT '01-01',
    "probation_period_days" INTEGER NOT NULL DEFAULT 180,
    "notice_period_days" INTEGER NOT NULL DEFAULT 90,
    "sla_hours" INTEGER NOT NULL DEFAULT 48,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "auth_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "phone" TEXT,
    "org_id" TEXT NOT NULL,
    "primary_role" "Role" NOT NULL DEFAULT 'employee',
    "secondary_roles" JSONB,
    "department" TEXT,
    "designation" TEXT,
    "date_of_joining" TIMESTAMP(3) NOT NULL,
    "gender" "Gender" NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "status" "EmployeeStatus" NOT NULL DEFAULT 'onboarding',
    "probation_end_date" TIMESTAMP(3),
    "probation_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "notice_period_days" INTEGER,
    "resignation_date" TIMESTAMP(3),
    "last_working_date" TIMESTAMP(3),
    "manager_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "emergency_contact_relationship" TEXT,
    "bank_name" TEXT,
    "bank_account_number" TEXT,
    "ifsc_code" TEXT,
    "current_address" TEXT,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveType" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "LeaveCategory" NOT NULL,
    "default_quota" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carry_forward" BOOLEAN NOT NULL DEFAULT false,
    "max_carry_forward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encashment_enabled" BOOLEAN NOT NULL DEFAULT false,
    "encashment_max_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paid" BOOLEAN NOT NULL DEFAULT true,
    "gender_specific" "GenderFilter",
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LeaveType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveBalance" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annual_entitlement" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "carried_forward" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "used_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pending_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "encashed_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "remaining" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "company_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRequest" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "total_days" DOUBLE PRECISION NOT NULL,
    "is_half_day" BOOLEAN NOT NULL DEFAULT false,
    "reason" TEXT,
    "status" "LeaveRequestStatus" NOT NULL DEFAULT 'draft',
    "approved_by" TEXT,
    "approved_at" TIMESTAMP(3),
    "approver_comments" TEXT,
    "cancel_reason" TEXT,
    "attachment_url" TEXT,
    "sla_deadline" TIMESTAMP(3),
    "sla_breached" BOOLEAN NOT NULL DEFAULT false,
    "escalation_count" INTEGER NOT NULL DEFAULT 0,
    "constraint_result" JSONB,
    "ai_recommendation" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeaveRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveEncashment" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "leave_type" TEXT NOT NULL,
    "days" DOUBLE PRECISION NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "EncashmentStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaveEncashment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeaveRule" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "rule_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" "RuleCategory" NOT NULL,
    "is_blocking" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "config" JSONB NOT NULL,
    "effective_from" TIMESTAMP(3),
    "effective_to" TIMESTAMP(3),
    "applies_to_all" BOOLEAN NOT NULL DEFAULT true,
    "departments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "LeaveRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConstraintPolicy" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "rules" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConstraintPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "check_in" TIMESTAMP(3),
    "check_out" TIMESTAMP(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'present',
    "is_wfh" BOOLEAN NOT NULL DEFAULT false,
    "total_hours" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendanceRegularization" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "attendance_id" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RegularizationStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceRegularization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalHierarchy" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "level1_approver" TEXT,
    "level2_approver" TEXT,
    "level3_approver" TEXT,
    "level4_approver" TEXT,
    "hr_partner" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalHierarchy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationUnit" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgUnitType" NOT NULL,
    "parent_id" TEXT,
    "head_id" TEXT,
    "cost_center" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "OrganizationUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLevel" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rank" INTEGER NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryStructure" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "ctc" DOUBLE PRECISION NOT NULL,
    "basic" DOUBLE PRECISION NOT NULL,
    "hra" DOUBLE PRECISION NOT NULL,
    "da" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "special_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professional_tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryStructure_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryComponent" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SalaryComponentType" NOT NULL,
    "is_taxable" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalaryRevision" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "old_ctc" DOUBLE PRECISION NOT NULL,
    "new_ctc" DOUBLE PRECISION NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalaryRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollRun" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "status" "PayrollRunStatus" NOT NULL DEFAULT 'draft',
    "total_gross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_net" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_pf" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_esi" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "employee_count" INTEGER NOT NULL DEFAULT 0,
    "generated_by" TEXT,
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayrollRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayrollSlip" (
    "id" TEXT NOT NULL,
    "payroll_run_id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "month" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "basic" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "hra" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "da" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "special_allowance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gross" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "pf_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "esi_employer" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "professional_tax" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tds" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lop_deduction" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "total_deductions" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "net_pay" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "working_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "present_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "leave_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "absent_days" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PayrollSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'pending',
    "verified_by" TEXT,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reimbursement" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "description" TEXT,
    "receipt_url" TEXT,
    "status" "ReimbursementStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reimbursement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeMovement" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" "MovementType" NOT NULL,
    "from_value" TEXT NOT NULL,
    "to_value" TEXT NOT NULL,
    "effective_date" TIMESTAMP(3) NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'pending',
    "approved_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeStatusHistory" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "from_status" TEXT NOT NULL,
    "to_status" TEXT NOT NULL,
    "changed_by" TEXT,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExitChecklist" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "custom_items" JSONB,
    "status" "ExitChecklistStatus" NOT NULL DEFAULT 'not_started',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExitChecklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeShift" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "shift_id" TEXT NOT NULL,
    "effective_from" TIMESTAMP(3) NOT NULL,
    "effective_to" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeShift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "channel" "NotificationChannel" NOT NULL DEFAULT 'in_app',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationTemplate" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email_enabled" BOOLEAN NOT NULL DEFAULT true,
    "push_enabled" BOOLEAN NOT NULL DEFAULT true,
    "in_app_enabled" BOOLEAN NOT NULL DEFAULT true,
    "reminder_timing" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "previous_state" JSONB,
    "new_state" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "integrity_hash" TEXT NOT NULL,
    "prev_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SettingsAuditLog" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_email" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "setting_name" TEXT NOT NULL,
    "previous_value" JSONB,
    "new_value" JSONB,
    "otp_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SettingsAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublicHoliday" (
    "id" TEXT NOT NULL,
    "company_id" TEXT,
    "name" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "country_code" TEXT NOT NULL DEFAULT 'IN',
    "is_custom" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PublicHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanySettings" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "custom_holidays" JSONB,
    "check_in_reminders" JSONB,
    "check_out_reminders" JSONB,
    "email_notifications" JSONB,
    "hr_alerts" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL DEFAULT 'free',
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'trial',
    "razorpay_subscription_id" TEXT,
    "stripe_subscription_id" TEXT,
    "current_period_start" TIMESTAMP(3),
    "current_period_end" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "subscription_id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "razorpay_payment_id" TEXT,
    "stripe_payment_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UsageRecord" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DOUBLE PRECISION NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UsageRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiKey" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "permissions" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_used" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingPlan" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "price_monthly" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "price_annual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "features" JSONB NOT NULL,
    "employee_limit" INTEGER NOT NULL DEFAULT 0,
    "hr_limit" INTEGER NOT NULL DEFAULT 0,
    "api_rate_limit" INTEGER NOT NULL DEFAULT 0,
    "data_retention_years" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpToken" (
    "id" TEXT NOT NULL,
    "emp_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "is_used" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "company_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemIncident" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "IncidentStatus" NOT NULL DEFAULT 'investigating',
    "severity" "IncidentSeverity" NOT NULL DEFAULT 'minor',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SystemIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UptimeRecord" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "response_time_ms" DOUBLE PRECISION NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UptimeRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlatformStats" (
    "id" TEXT NOT NULL,
    "total_companies" INTEGER NOT NULL DEFAULT 0,
    "total_employees" INTEGER NOT NULL DEFAULT 0,
    "total_leaves_processed" INTEGER NOT NULL DEFAULT 0,
    "uptime_percentage" DOUBLE PRECISION NOT NULL DEFAULT 99.9,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlatformStats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeInvite" (
    "id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'employee',
    "department" TEXT,
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Permission" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permission_id" TEXT NOT NULL,
    "company_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Company_join_code_key" ON "Company"("join_code");

-- CreateIndex
CREATE INDEX "Company_deleted_at_idx" ON "Company"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_auth_id_key" ON "Employee"("auth_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_email_key" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "Employee_org_id_idx" ON "Employee"("org_id");

-- CreateIndex
CREATE INDEX "Employee_manager_id_idx" ON "Employee"("manager_id");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "Employee_primary_role_idx" ON "Employee"("primary_role");

-- CreateIndex
CREATE INDEX "Employee_deleted_at_idx" ON "Employee"("deleted_at");

-- CreateIndex
CREATE INDEX "Employee_email_idx" ON "Employee"("email");

-- CreateIndex
CREATE INDEX "LeaveType_company_id_idx" ON "LeaveType"("company_id");

-- CreateIndex
CREATE INDEX "LeaveType_is_active_idx" ON "LeaveType"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveType_company_id_code_key" ON "LeaveType"("company_id", "code");

-- CreateIndex
CREATE INDEX "LeaveBalance_company_id_idx" ON "LeaveBalance"("company_id");

-- CreateIndex
CREATE INDEX "LeaveBalance_emp_id_idx" ON "LeaveBalance"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveBalance_emp_id_leave_type_year_key" ON "LeaveBalance"("emp_id", "leave_type", "year");

-- CreateIndex
CREATE INDEX "LeaveRequest_company_id_idx" ON "LeaveRequest"("company_id");

-- CreateIndex
CREATE INDEX "LeaveRequest_emp_id_idx" ON "LeaveRequest"("emp_id");

-- CreateIndex
CREATE INDEX "LeaveRequest_status_idx" ON "LeaveRequest"("status");

-- CreateIndex
CREATE INDEX "LeaveRequest_created_at_idx" ON "LeaveRequest"("created_at");

-- CreateIndex
CREATE INDEX "LeaveEncashment_company_id_idx" ON "LeaveEncashment"("company_id");

-- CreateIndex
CREATE INDEX "LeaveEncashment_emp_id_idx" ON "LeaveEncashment"("emp_id");

-- CreateIndex
CREATE INDEX "LeaveRule_company_id_idx" ON "LeaveRule"("company_id");

-- CreateIndex
CREATE INDEX "LeaveRule_is_active_idx" ON "LeaveRule"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "LeaveRule_company_id_rule_id_key" ON "LeaveRule"("company_id", "rule_id");

-- CreateIndex
CREATE INDEX "ConstraintPolicy_company_id_idx" ON "ConstraintPolicy"("company_id");

-- CreateIndex
CREATE INDEX "ConstraintPolicy_is_active_idx" ON "ConstraintPolicy"("is_active");

-- CreateIndex
CREATE INDEX "Attendance_company_id_idx" ON "Attendance"("company_id");

-- CreateIndex
CREATE INDEX "Attendance_emp_id_idx" ON "Attendance"("emp_id");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_emp_id_date_key" ON "Attendance"("emp_id", "date");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_company_id_idx" ON "AttendanceRegularization"("company_id");

-- CreateIndex
CREATE INDEX "AttendanceRegularization_emp_id_idx" ON "AttendanceRegularization"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalHierarchy_emp_id_key" ON "ApprovalHierarchy"("emp_id");

-- CreateIndex
CREATE INDEX "ApprovalHierarchy_company_id_idx" ON "ApprovalHierarchy"("company_id");

-- CreateIndex
CREATE INDEX "OrganizationUnit_company_id_idx" ON "OrganizationUnit"("company_id");

-- CreateIndex
CREATE INDEX "OrganizationUnit_parent_id_idx" ON "OrganizationUnit"("parent_id");

-- CreateIndex
CREATE INDEX "JobLevel_company_id_idx" ON "JobLevel"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "SalaryStructure_emp_id_key" ON "SalaryStructure"("emp_id");

-- CreateIndex
CREATE INDEX "SalaryStructure_company_id_idx" ON "SalaryStructure"("company_id");

-- CreateIndex
CREATE INDEX "SalaryComponent_company_id_idx" ON "SalaryComponent"("company_id");

-- CreateIndex
CREATE INDEX "SalaryRevision_company_id_idx" ON "SalaryRevision"("company_id");

-- CreateIndex
CREATE INDEX "SalaryRevision_emp_id_idx" ON "SalaryRevision"("emp_id");

-- CreateIndex
CREATE INDEX "PayrollRun_company_id_idx" ON "PayrollRun"("company_id");

-- CreateIndex
CREATE INDEX "PayrollRun_status_idx" ON "PayrollRun"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollRun_company_id_month_year_key" ON "PayrollRun"("company_id", "month", "year");

-- CreateIndex
CREATE INDEX "PayrollSlip_company_id_idx" ON "PayrollSlip"("company_id");

-- CreateIndex
CREATE INDEX "PayrollSlip_emp_id_idx" ON "PayrollSlip"("emp_id");

-- CreateIndex
CREATE UNIQUE INDEX "PayrollSlip_payroll_run_id_emp_id_key" ON "PayrollSlip"("payroll_run_id", "emp_id");

-- CreateIndex
CREATE INDEX "Document_company_id_idx" ON "Document"("company_id");

-- CreateIndex
CREATE INDEX "Document_emp_id_idx" ON "Document"("emp_id");

-- CreateIndex
CREATE INDEX "Reimbursement_company_id_idx" ON "Reimbursement"("company_id");

-- CreateIndex
CREATE INDEX "Reimbursement_emp_id_idx" ON "Reimbursement"("emp_id");

-- CreateIndex
CREATE INDEX "EmployeeMovement_company_id_idx" ON "EmployeeMovement"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeMovement_emp_id_idx" ON "EmployeeMovement"("emp_id");

-- CreateIndex
CREATE INDEX "EmployeeStatusHistory_company_id_idx" ON "EmployeeStatusHistory"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeStatusHistory_emp_id_idx" ON "EmployeeStatusHistory"("emp_id");

-- CreateIndex
CREATE INDEX "ExitChecklist_company_id_idx" ON "ExitChecklist"("company_id");

-- CreateIndex
CREATE INDEX "ExitChecklist_emp_id_idx" ON "ExitChecklist"("emp_id");

-- CreateIndex
CREATE INDEX "Shift_company_id_idx" ON "Shift"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeShift_company_id_idx" ON "EmployeeShift"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeShift_emp_id_idx" ON "EmployeeShift"("emp_id");

-- CreateIndex
CREATE INDEX "Notification_company_id_idx" ON "Notification"("company_id");

-- CreateIndex
CREATE INDEX "Notification_emp_id_idx" ON "Notification"("emp_id");

-- CreateIndex
CREATE INDEX "Notification_is_read_idx" ON "Notification"("is_read");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- CreateIndex
CREATE INDEX "NotificationTemplate_company_id_idx" ON "NotificationTemplate"("company_id");

-- CreateIndex
CREATE INDEX "NotificationPreference_company_id_idx" ON "NotificationPreference"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_emp_id_company_id_key" ON "NotificationPreference"("emp_id", "company_id");

-- CreateIndex
CREATE INDEX "AuditLog_company_id_idx" ON "AuditLog"("company_id");

-- CreateIndex
CREATE INDEX "AuditLog_actor_id_idx" ON "AuditLog"("actor_id");

-- CreateIndex
CREATE INDEX "AuditLog_entity_type_entity_id_idx" ON "AuditLog"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "AuditLog_created_at_idx" ON "AuditLog"("created_at");

-- CreateIndex
CREATE INDEX "SettingsAuditLog_company_id_idx" ON "SettingsAuditLog"("company_id");

-- CreateIndex
CREATE INDEX "SettingsAuditLog_created_at_idx" ON "SettingsAuditLog"("created_at");

-- CreateIndex
CREATE INDEX "PublicHoliday_company_id_idx" ON "PublicHoliday"("company_id");

-- CreateIndex
CREATE INDEX "PublicHoliday_date_idx" ON "PublicHoliday"("date");

-- CreateIndex
CREATE INDEX "PublicHoliday_country_code_idx" ON "PublicHoliday"("country_code");

-- CreateIndex
CREATE UNIQUE INDEX "CompanySettings_company_id_key" ON "CompanySettings"("company_id");

-- CreateIndex
CREATE INDEX "Subscription_company_id_idx" ON "Subscription"("company_id");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "Subscription"("status");

-- CreateIndex
CREATE INDEX "Payment_company_id_idx" ON "Payment"("company_id");

-- CreateIndex
CREATE INDEX "Payment_subscription_id_idx" ON "Payment"("subscription_id");

-- CreateIndex
CREATE INDEX "UsageRecord_company_id_idx" ON "UsageRecord"("company_id");

-- CreateIndex
CREATE INDEX "UsageRecord_recorded_at_idx" ON "UsageRecord"("recorded_at");

-- CreateIndex
CREATE INDEX "ApiKey_company_id_idx" ON "ApiKey"("company_id");

-- CreateIndex
CREATE INDEX "ApiKey_key_hash_idx" ON "ApiKey"("key_hash");

-- CreateIndex
CREATE UNIQUE INDEX "PricingPlan_slug_key" ON "PricingPlan"("slug");

-- CreateIndex
CREATE INDEX "OtpToken_company_id_idx" ON "OtpToken"("company_id");

-- CreateIndex
CREATE INDEX "OtpToken_emp_id_idx" ON "OtpToken"("emp_id");

-- CreateIndex
CREATE INDEX "OtpToken_expires_at_idx" ON "OtpToken"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "Waitlist_email_key" ON "Waitlist"("email");

-- CreateIndex
CREATE INDEX "UptimeRecord_service_idx" ON "UptimeRecord"("service");

-- CreateIndex
CREATE INDEX "UptimeRecord_checked_at_idx" ON "UptimeRecord"("checked_at");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeInvite_token_key" ON "EmployeeInvite"("token");

-- CreateIndex
CREATE INDEX "EmployeeInvite_company_id_idx" ON "EmployeeInvite"("company_id");

-- CreateIndex
CREATE INDEX "EmployeeInvite_token_idx" ON "EmployeeInvite"("token");

-- CreateIndex
CREATE INDEX "EmployeeInvite_email_idx" ON "EmployeeInvite"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_code_key" ON "Permission"("code");

-- CreateIndex
CREATE INDEX "RolePermission_role_idx" ON "RolePermission"("role");

-- CreateIndex
CREATE INDEX "RolePermission_company_id_idx" ON "RolePermission"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_role_permission_id_company_id_key" ON "RolePermission"("role", "permission_id", "company_id");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_manager_id_fkey" FOREIGN KEY ("manager_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveType" ADD CONSTRAINT "LeaveType_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveBalance" ADD CONSTRAINT "LeaveBalance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRequest" ADD CONSTRAINT "LeaveRequest_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashment" ADD CONSTRAINT "LeaveEncashment_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashment" ADD CONSTRAINT "LeaveEncashment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveEncashment" ADD CONSTRAINT "LeaveEncashment_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeaveRule" ADD CONSTRAINT "LeaveRule_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConstraintPolicy" ADD CONSTRAINT "ConstraintPolicy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_attendance_id_fkey" FOREIGN KEY ("attendance_id") REFERENCES "Attendance"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AttendanceRegularization" ADD CONSTRAINT "AttendanceRegularization_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level1_approver_fkey" FOREIGN KEY ("level1_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level2_approver_fkey" FOREIGN KEY ("level2_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level3_approver_fkey" FOREIGN KEY ("level3_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_level4_approver_fkey" FOREIGN KEY ("level4_approver") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalHierarchy" ADD CONSTRAINT "ApprovalHierarchy_hr_partner_fkey" FOREIGN KEY ("hr_partner") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "OrganizationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationUnit" ADD CONSTRAINT "OrganizationUnit_head_id_fkey" FOREIGN KEY ("head_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobLevel" ADD CONSTRAINT "JobLevel_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryStructure" ADD CONSTRAINT "SalaryStructure_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryComponent" ADD CONSTRAINT "SalaryComponent_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRevision" ADD CONSTRAINT "SalaryRevision_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRevision" ADD CONSTRAINT "SalaryRevision_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalaryRevision" ADD CONSTRAINT "SalaryRevision_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollRun" ADD CONSTRAINT "PayrollRun_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_payroll_run_id_fkey" FOREIGN KEY ("payroll_run_id") REFERENCES "PayrollRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayrollSlip" ADD CONSTRAINT "PayrollSlip_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_verified_by_fkey" FOREIGN KEY ("verified_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reimbursement" ADD CONSTRAINT "Reimbursement_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeMovement" ADD CONSTRAINT "EmployeeMovement_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatusHistory" ADD CONSTRAINT "EmployeeStatusHistory_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatusHistory" ADD CONSTRAINT "EmployeeStatusHistory_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeStatusHistory" ADD CONSTRAINT "EmployeeStatusHistory_changed_by_fkey" FOREIGN KEY ("changed_by") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitChecklist" ADD CONSTRAINT "ExitChecklist_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExitChecklist" ADD CONSTRAINT "ExitChecklist_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeShift" ADD CONSTRAINT "EmployeeShift_shift_id_fkey" FOREIGN KEY ("shift_id") REFERENCES "Shift"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationTemplate" ADD CONSTRAINT "NotificationTemplate_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotificationPreference" ADD CONSTRAINT "NotificationPreference_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SettingsAuditLog" ADD CONSTRAINT "SettingsAuditLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublicHoliday" ADD CONSTRAINT "PublicHoliday_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanySettings" ADD CONSTRAINT "CompanySettings_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "Subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UsageRecord" ADD CONSTRAINT "UsageRecord_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpToken" ADD CONSTRAINT "OtpToken_emp_id_fkey" FOREIGN KEY ("emp_id") REFERENCES "Employee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OtpToken" ADD CONSTRAINT "OtpToken_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeInvite" ADD CONSTRAINT "EmployeeInvite_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

